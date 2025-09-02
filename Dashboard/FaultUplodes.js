const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const client = require("../client");

const router = express.Router();

      
async function importToTable(workbook, sheetName, tableName, columnsMapping, dbClient, uniqueColumns = []) {
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    console.log(`Worksheet ${sheetName} not found`);
    return { inserted: 0, skipped: 0, duplicates: 0 };
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) { // Skip header row
      // Remove the first undefined element from row.values
      rows.push(row.values.slice(1));
    }
  });

  console.log(`Processing ${rows.length} rows for table ${tableName}`);

  let insertedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;

  for (const row of rows) {
    try {
      const values = columnsMapping(row);
      
      // Skip empty rows - check if all values are null, undefined, or empty string
      if (!values || Object.values(values).every(v => v === null || v === undefined || v === '')) {
        skippedCount++;
        continue;
      }

      // Check for duplicates before insertion
      if (uniqueColumns.length > 0) {
        const whereConditions = uniqueColumns.map(col => `${col} = $${uniqueColumns.indexOf(col) + 1}`).join(' AND ');
        const checkValues = uniqueColumns.map(col => values[col]);
        
        const existingCheck = await dbClient.query(
          `SELECT id FROM ${tableName} WHERE ${whereConditions}`,
          checkValues
        );
        
        if (existingCheck.rows.length > 0) {
          console.log(` Duplicate found for: ${JSON.stringify(checkValues)}`);
          duplicateCount++;
          continue;
        }
      }

      const keys = Object.keys(values);
      const vals = Object.values(values);
      
      console.log('Inserting row:', values);

      // Enhanced conflict resolution with specific columns
      let conflictClause = 'ON CONFLICT DO NOTHING';
      if (uniqueColumns.length > 0) {
        conflictClause = `ON CONFLICT (${uniqueColumns.join(', ')}) DO NOTHING`;
      }

      const result = await dbClient.query(
        `INSERT INTO ${tableName} (${keys.join(', ')})
         VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})
         ${conflictClause}
         RETURNING id`,
        vals
      );
      
      if (result && result.rowCount > 0) {
        insertedCount++;
        console.log(`✓ Inserted row with ID: ${result.rows[0].id}`);
      } else {
        console.log(`⚠ Row skipped (duplicate or conflict)`);
        duplicateCount++;
      }
    } catch (insertError) {
      console.error('❌ Insert error for row:', row, insertError.message);
      skippedCount++;
    }
  }

  console.log(`Import completed: ${insertedCount} inserted, ${skippedCount} skipped, ${duplicateCount} duplicates`);
  return { inserted: insertedCount, skipped: skippedCount, duplicates: duplicateCount };
}

// --------------------------------------------------
// Enhanced data validation and cleaning
// --------------------------------------------------
function cleanAndValidateData(mappedData, requiredFields = []) {
  // Remove null/undefined values and trim strings
  const cleaned = {};
  for (const [key, value] of Object.entries(mappedData)) {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'string') {
        cleaned[key] = value.trim();
      } else {
        cleaned[key] = value;
      }
    } else if (requiredFields.includes(key)) {
      // If required field is missing, return null to skip this row
      return null;
    }
  }
  
  return cleaned;
}



// possible to make this code is reused
// ------------------------------------------
// ----------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------

router.post('/', upload.single('file'), async (req, res) => {
  let dbClient;
  
  try {
    const filePath = req.file?.path;
    if (!filePath) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    console.log(`Processing file: ${filePath}`);

    // Get database client from pool
    try {
      dbClient = await client.pool.connect();
      console.log('✓ Database connection established');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      throw new Error(`Database connection failed: ${dbError.message}`);
    }
    
    // Start transaction
    await dbClient.query('BEGIN');
    console.log('✓ Transaction started');

    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    console.log('Available worksheets:', workbook.worksheets.map(w => w.name));

    // Import fault_descriptions to dtc_codes table
    const importResult1 = await importToTable(
      workbook, 
      'fault_descriptions', // 
      'my_fault_codes', 
      (row) => {
        console.log('Raw row data:', row);
        
        const mappedData = {
          dtc: row[0] ? String(row[0]).trim() : null,
          title: row[1] ? String(row[1]).trim() : null,
          severity: row[2] !== null && row[2] !== undefined && !isNaN(Number(row[2])) ? Number(row[2]) : null,
          repair_difficulty: row[3] !== null && row[3] !== undefined && !isNaN(Number(row[3])) ? Number(row[3]) : null,
          make: row[4] ? String(row[4]).trim() : null,
          company_id: row[5] !== null && row[5] !== undefined && !isNaN(Number(row[5])) ? Number(row[5]) : null,
          generic: row[6] !== null && row[6] !== undefined ? 
            (String(row[6]).toLowerCase().trim() === 'true' ||
             String(row[6]).toLowerCase().trim() === 't' ||
             Number(row[6]) === 1) : false
        };
        
        // Clean and validate data
        const cleanedData = cleanAndValidateData(mappedData, ['dtc']); // dtc is required
        console.log('Mapped data:', cleanedData);
        return cleanedData;
      }, 
      dbClient,
      ['dtc', 'make', 'company_id'] // Unique columns for dtc_codes
    );

    // Import causes to my_fault_code_causes table
    const importResult2 = await importToTable(
      workbook, 
      'causes', 
      'my_fault_code_causes', 
      (row) => {
        console.log('Raw row data:', row);
        
        const mappedData = {
          dtc: row[0] ? String(row[0]).trim() : null,
          causes: row[1] ? String(row[1]).trim() : null,
          language: row[2] ? String(row[2]).trim() : null,
          make: row[3] ? String(row[3]).trim() : null,
          company_id: row[4] !== null && row[4] !== undefined && !isNaN(Number(row[4])) ? Number(row[4]) : null,
        };
        
        // Clean and validate data
        const cleanedData = cleanAndValidateData(mappedData, ['dtc', 'causes']); // dtc and causes are required
        console.log('Mapped data:', cleanedData);
        return cleanedData;
      }, 
      dbClient,
      ['dtc', 'causes', 'make', 'company_id'] // Unique columns for causes
    );
    const importResult3 = await importToTable(
      workbook, 
      'symptoms', //tata
      'my_fault_code_symptoms', 
      (row) => {
        console.log('Raw row data:', row);
        
        const mappedData = {
          dtc: row[0] ? String(row[0]).trim() : null,
          symptom: row[1] ? String(row[1]).trim() : null,
          language: row[2] ? String(row[2]).trim() : null,
          make: row[3] ? String(row[3]).trim() : null,
          company_id: row[4] !== null && row[4] !== undefined && !isNaN(Number(row[4])) ? Number(row[4]) : null,
        };
        
        // Clean and validate data
        const cleanedData = cleanAndValidateData(mappedData, ['dtc', 'causes']); // dtc and causes are required
        console.log('Mapped data:', cleanedData);
        return cleanedData;
      }, 
      dbClient,
      ['dtc', 'symptom', 'make', 'company_id'] // Unique columns for causes
    );
    const importResult4 = await importToTable(
      workbook, 
      'solutions', 
      'my_fault_code_solutions', 
      (row) => {
        console.log('Raw row data:', row);
        
        const mappedData = {
          dtc: row[0] ? String(row[0]).trim() : null,
          solution: row[1] ? String(row[1]).trim() : null,
          language: row[2] ? String(row[2]).trim() : null,
          make: row[3] ? String(row[3]).trim() : null,
          company_id: row[4] !== null && row[4] !== undefined && !isNaN(Number(row[4])) ? Number(row[4]) : null,
        };
        
        // Clean and validate data
        const cleanedData = cleanAndValidateData(mappedData, ['dtc', 'causes']); // dtc and causes are required
        console.log('Mapped data:', cleanedData);
        return cleanedData;
      }, 
      dbClient,
      ['dtc', 'solution', 'make', 'company_id'] // Unique columns for causes
    );

    // Commit transaction
    await dbClient.query('COMMIT');
    console.log('✅ Transaction committed successfully');

    // Delete uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
      else console.log('✓ Uploaded file deleted');
    });

    res.status(200).json({ 
      success: true,
      message: 'Excel file imported into table successfully!',
      stats: {
        my_fault_codes: importResult1,
        fault_code_causes: importResult2,
        my_fault_code_symptoms: importResult3,
        my_fault_code_solutions: importResult4,

        // totalInserted: importResult1.inserted + importResult2.inserted,
        // totalDuplicates: importResult1.duplicates + importResult2.duplicates,
        // totalSkipped: importResult1.skipped + importResult2.skipped
      }
    });

  } catch (err) {
    console.error('❌ Import Error:', err);
    
    // Rollback transaction if dbClient exists
    if (dbClient) {
      try {
        await dbClient.query('ROLLBACK');
        console.log('🔄 Transaction rolled back');
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
    }

    // Delete file if it exists
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({ 
      success: false,
      message: 'Import failed', 
      error: err.message 
    });
  } finally {
    // Release dbClient back to pool
    if (dbClient) {
      try {
        dbClient.release();
        console.log('✓ Database client released');
      } catch (releaseErr) {
        console.error('Client release error:', releaseErr);
      }
    }
  }
});

// --------------------------------------------------
// Route to clear all data (useful for testing)
// --------------------------------------------------
router.delete('/clear-data', async (req, res) => {
  let dbClient;
  
  try {
    dbClient = await client.pool.connect();
    await dbClient.query('BEGIN');
    
    await dbClient.query('DELETE FROM my_fault_code_causes');
    await dbClient.query('DELETE FROM dtc_codes');
    
    await dbClient.query('COMMIT');
    
    res.json({
      success: true,
      message: 'All data cleared successfully'
    });
  } catch (err) {
    if (dbClient) {
      await dbClient.query('ROLLBACK');
    }
    
    console.error('Clear data error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
});

// --------------------------------------------------
// Additional route to check table data (unchanged)
// --------------------------------------------------
router.get('/check-dtc-codes', async (req, res) => {
  try {
    const result = await client.query('SELECT COUNT(*) as count FROM dtc_codes');
    const sampleData = await client.query('SELECT * FROM dtc_codes ORDER BY id DESC LIMIT 5');
    
    res.json({
      success: true,
      totalRows: result ? parseInt(result.rows[0].count) : 0,
      sampleData: sampleData ? sampleData.rows : []
    });
  } catch (err) {
    console.error('Check dtc_codes error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// --------------------------------------------------
// Test database connection route (unchanged)
// --------------------------------------------------
router.get('/test-db', async (req, res) => {
  try {
    const result = await client.query('SELECT NOW() as current_time');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      serverTime: result ? result.rows[0].current_time : 'No result'
    });
  } catch (err) {
    console.error('Database test error:', err);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: err.message
    });
  }
});

module.exports = router;