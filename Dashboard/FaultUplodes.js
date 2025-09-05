// const express = require('express');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const ExcelJS = require('exceljs');

// const client = require("../client");

// const router = express.Router();

      
// async function importToTable(workbook, sheetName, tableName, columnsMapping, dbClient, uniqueColumns = []) {
//   const worksheet = workbook.getWorksheet(sheetName);
//   if (!worksheet) {
//     console.log(`Worksheet ${sheetName} not found`);
//     return { inserted: 0, skipped: 0, duplicates: 0 };
//   }

//   const rows = [];
//   worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//     if (rowNumber > 1) { // Skip header row
//       // Remove the first undefined element from row.values

//       rows.push(row.values.slice(1));
//     }
//   });

//   console.log(`Processing ${rows.length} rows for table ${tableName}`);

//   let insertedCount = 0;
//   let skippedCount = 0;
//   let duplicateCount = 0;

//   for (const row of rows) {
//     try {
//       const values = columnsMapping(row);
      
//       // Skip empty rows - check if all values are null, undefined, or empty string
//       if (!values || Object.values(values).every(v => v === null || v === undefined || v === '')) {
//         skippedCount++;
//         continue;
//       }

//       // Check for duplicates before insertion
//       if (uniqueColumns.length > 0) {
//         const whereConditions = uniqueColumns.map(col => `${col} = $${uniqueColumns.indexOf(col) + 1}`).join(' AND ');
//         const checkValues = uniqueColumns.map(col => values[col]);
        
//         const existingCheck = await dbClient.query(
//           `SELECT id FROM ${tableName} WHERE ${whereConditions}`,
//           checkValues
//         );
        
//         if (existingCheck.rows.length > 0) {
//           console.log(` Duplicate found for: ${JSON.stringify(checkValues)}`);
//           duplicateCount++;
//           continue;
//         }
//       }

//       const keys = Object.keys(values);
//       const vals = Object.values(values);
      
//       console.log('Inserting row:', values);

//       // Enhanced conflict resolution with specific columns
//       let conflictClause = 'ON CONFLICT DO NOTHING';
//       if (uniqueColumns.length > 0) {
//         conflictClause = `ON CONFLICT (${uniqueColumns.join(', ')}) DO NOTHING`;
//       }

//       const result = await dbClient.query(
//         `INSERT INTO ${tableName} (${keys.join(', ')})
//          VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})
//          ${conflictClause}
//          RETURNING id`,
//         vals
//       );
      
//       if (result && result.rowCount > 0) {
//         insertedCount++;
//         console.log(`✓ Inserted row with ID: ${result.rows[0].id}`);
//       } else {
//         console.log(`⚠ Row skipped (duplicate or conflict)`);
//         duplicateCount++;
//       }
//     } catch (insertError) {
//       console.error('❌ Insert error for row:', row, insertError.message);
//       skippedCount++;
//     }
//   }

//   console.log(`Import completed: ${insertedCount} inserted, ${skippedCount} skipped, ${duplicateCount} duplicates`);
//   return { inserted: insertedCount, skipped: skippedCount, duplicates: duplicateCount };
// }

// // --------------------------------------------------
// // Enhanced data validation and cleaning
// // --------------------------------------------------
// function cleanAndValidateData(mappedData, requiredFields = []) {
//   // Remove null/undefined values and trim strings
//   const cleaned = {};
//   for (const [key, value] of Object.entries(mappedData)) {
//     if (value !== null && value !== undefined && value !== '') {
//       if (typeof value === 'string') {
//         cleaned[key] = value.trim();
//       } else {
//         cleaned[key] = value;
//       }
//     } else if (requiredFields.includes(key)) {
//       // If required field is missing, return null to skip this row
//       return null;
//     }
//   }
  
//   return cleaned;
// }



// // possible to make this code is reused
// // ------------------------------------------
// // ----------------------------------------------
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = path.join(__dirname, '../uploads');
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   }
// });

// const upload = multer({ 
//   storage,
//   fileFilter: (req, file, cb) => {
//     const allowedMimes = [
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       'application/vnd.ms-excel'
//     ];
//     if (allowedMimes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only Excel files are allowed'), false);
//     }
//   }
// });

// // ---------------------------------------------------------------------------------
// // ---------------------------------------------------------------------------------------

// router.post('/', upload.single('file'), async (req, res) => {
//   let dbClient;
  
//   try {
//     const filePath = req.file?.path;
//     if (!filePath) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'No file uploaded' 
//       });
//     }

//     console.log(`Processing file: ${filePath}`);

//     // Get database client from pool
//     try {
//       dbClient = await client.pool.connect();
//       console.log('✓ Database connection established');
//     } catch (dbError) {
//       console.error('❌ Database connection failed:', dbError);
//       throw new Error(`Database connection failed: ${dbError.message}`);
//     }
    
//     // Start transaction
//     await dbClient.query('BEGIN');
//     console.log('✓ Transaction started');

//     // Read Excel file
//     const workbook = new ExcelJS.Workbook();
//     await workbook.xlsx.readFile(filePath);

//     console.log('Available worksheets:', workbook.worksheets.map(w => w.name));

//     // Import fault_descriptions to dtc_codes table
//     const importResult1 = await importToTable(
//       workbook, 
//       'fault_descriptions', // 
//       'my_fault_codes', 
//       (row) => {
//         console.log('Raw row data:', row);
        
//         const mappedData = {
//           dtc: row[0] ? String(row[0]).trim() : null,
//           title: row[1] ? String(row[1]).trim() : null,
//           severity: row[2] !== null && row[2] !== undefined && !isNaN(Number(row[2])) ? Number(row[2]) : null,
//           repair_difficulty: row[3] !== null && row[3] !== undefined && !isNaN(Number(row[3])) ? Number(row[3]) : null,
//           make: row[4] ? String(row[4]).trim() : null,
//           company_id: row[5] !== null && row[5] !== undefined && !isNaN(Number(row[5])) ? Number(row[5]) : null,
//           generic: row[6] !== null && row[6] !== undefined ? 
//             (String(row[6]).toLowerCase().trim() === 'true' ||
//              String(row[6]).toLowerCase().trim() === 't' ||
//              Number(row[6]) === 1) : false
//         };
        
//         // Clean and validate data
//         const cleanedData = cleanAndValidateData(mappedData, ['dtc']); // dtc is required
//         console.log('Mapped data:', cleanedData);
//         return cleanedData;
//       }, 
//       dbClient,
//       ['dtc', 'company_id'] // Unique columns for dtc_codes
//     );

//     // Import causes to my_fault_code_causes table
//     const importResult2 = await importToTable(
//       workbook, 
//       'causes', 
//       'my_fault_code_causes', 
//       (row) => {
//         console.log('Raw row data:', row);
        
//         const mappedData = {
//           dtc: row[0] ? String(row[0]).trim() : null,
//           causes: row[1] ? String(row[1]).trim() : null,
//           language: row[2] ? String(row[2]).trim() : null,
//           make: row[3] ? String(row[3]).trim() : null,
//           company_id: row[4] !== null && row[4] !== undefined && !isNaN(Number(row[4])) ? Number(row[4]) : null,
//         };
        
//         // Clean and validate data
//         const cleanedData = cleanAndValidateData(mappedData, ['dtc', 'causes']); // dtc and causes are required
//         console.log('Mapped data:', cleanedData);
//         return cleanedData;
//       }, 
//       dbClient,
//       ['dtc', 'company_id'] // Unique columns for causes
//     );
//     const importResult3 = await importToTable(
//       workbook, 
//       'symptoms', //tata
//       'my_fault_code_symptoms', 
//       (row) => {
//         console.log('Raw row data:', row);
        
//         const mappedData = {
//           dtc: row[0] ? String(row[0]).trim() : null,
//           symptom: row[1] ? String(row[1]).trim() : null,
//           language: row[2] ? String(row[2]).trim() : null,
//           make: row[3] ? String(row[3]).trim() : null,
//           company_id: row[4] !== null && row[4] !== undefined && !isNaN(Number(row[4])) ? Number(row[4]) : null,
//         };
        
//         // Clean and validate data
//         const cleanedData = cleanAndValidateData(mappedData, ['dtc', 'causes']); // dtc and causes are required
//         console.log('Mapped data:', cleanedData);
//         return cleanedData;
//       }, 
//       dbClient,
//       ['dtc','company_id'] // Unique columns for causes
//     );
//     const importResult4 = await importToTable(
//       workbook, 
//       'solutions', 
//       'my_fault_code_solutions', 
//       (row) => {
//         console.log('Raw row data:', row);
        
//         const mappedData = {
//           dtc: row[0] ? String(row[0]).trim() : null,
//           solution: row[1] ? String(row[1]).trim() : null,
//           language: row[2] ? String(row[2]).trim() : null,
//           make: row[3] ? String(row[3]).trim() : null,
//           company_id: row[4] !== null && row[4] !== undefined && !isNaN(Number(row[4])) ? Number(row[4]) : null,
//         };
        
//         // Clean and validate data
//         const cleanedData = cleanAndValidateData(mappedData, ['dtc', 'causes']); // dtc and causes are required
//         console.log('Mapped data:', cleanedData);
//         return cleanedData;
//       }, 
//       dbClient,
//       ['dtc',  'company_id'] // Unique columns for causes
//     );

//     // Commit transaction
//     await dbClient.query('COMMIT');
//     console.log('✅ Transaction committed successfully');

//     // Delete uploaded file
//     fs.unlink(filePath, (err) => {
//       if (err) console.error('Error deleting file:', err);
//       else console.log('✓ Uploaded file deleted');
//     });

//     res.status(200).json({ 
//       success: true,
//       message: 'Excel file imported into table successfully!',
//       stats: {
//         my_fault_codes: importResult1,
//         fault_code_causes: importResult2,
//         my_fault_code_symptoms: importResult3,
//         my_fault_code_solutions: importResult4,

//         // totalInserted: importResult1.inserted + importResult2.inserted,
//         // totalDuplicates: importResult1.duplicates + importResult2.duplicates,
//         // totalSkipped: importResult1.skipped + importResult2.skipped
//       }
//     });

//   } catch (err) {
//     console.error('❌ Import Error:', err);
    
//     // Rollback transaction if dbClient exists
//     if (dbClient) {
//       try {
//         await dbClient.query('ROLLBACK');
//         console.log('🔄 Transaction rolled back');
//       } catch (rollbackErr) {
//         console.error('Rollback error:', rollbackErr);
//       }
//     }

//     // Delete file if it exists
//     if (req.file?.path) {
//       fs.unlink(req.file.path, () => {});
//     }

//     res.status(500).json({ 
//       success: false,
//       message: 'Import failed', 
//       error: err.message 
//     });
//   } finally {
//     // Release dbClient back to pool
//     if (dbClient) {
//       try {
//         dbClient.release();
//         console.log('✓ Database client released');
//       } catch (releaseErr) {
//         console.error('Client release error:', releaseErr);
//       }
//     }
//   }
// });

// module.exports = router;

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const pool = require("../client");

const router = express.Router();

// Import Excel rows into a table
async function importToTable(workbook, sheetName, tableName, columnsMapping, uniqueColumns = []) {
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    console.log(`❌ Worksheet ${sheetName} not found`);
    return { inserted: 0, skipped: 0, duplicates: 0, duplicateDetails: [] };
  }

  let insertedCount = 0;
  let duplicateCount = 0;
  const duplicateDetails = [];

  // Skip header row
  const rows = worksheet.getSheetValues().slice(2); 

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    try {
      const values = columnsMapping(row);

      // Skip empty rows
      if (!values || Object.values(values).every(v => v === null || v === undefined || v === '')) {
        continue;
      }

      const keys = Object.keys(values);
      const vals = Object.values(values);

      let conflictClause = 'ON CONFLICT DO NOTHING';
      if (uniqueColumns.length > 0) {
        conflictClause = `ON CONFLICT (${uniqueColumns.join(', ')}) DO NOTHING`;
      }

      const result = await pool.query(
        `INSERT INTO ${tableName} (${keys.join(', ')})
         VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})
         ${conflictClause}
         RETURNING id`,
        vals
      );

      if (result.rowCount > 0) {
        insertedCount++;
        console.log(`✓ Inserted row into ${tableName}, ID = ${result.rows[0].id}`);
      } else {
        duplicateCount++;
        duplicateDetails.push({ rowNumber: i + 2, data: values });
        console.log(`⚠ Duplicate skipped in ${tableName}:`, values);
      }

    } catch (err) {
      console.error(`❌ Insert error in ${tableName}, row ${i + 2}:`, err.message);
    }
  }

  return { inserted: insertedCount, skipped: 0, duplicates: duplicateCount, duplicateDetails };
}

// Utility: clean and validate
function cleanAndValidateData(mappedData, requiredFields = []) {
  const cleaned = {};
  for (const [key, value] of Object.entries(mappedData)) {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = typeof value === 'string' ? value.trim() : value;
    } else if (requiredFields.includes(key)) {
      return null; // skip invalid row
    }
  }
  return cleaned;
}

// Multer storage
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
    cb(null, allowedMimes.includes(file.mimetype));
  }
});

// Main import route
router.post('/', upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    console.log(`📂 Processing file: ${filePath}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Start transaction
    await pool.query('BEGIN');

    // my_fault_codes
    const importResult1 = await importToTable(
      workbook,
      'fault_descriptions',
      'my_fault_codes',
      (row) => cleanAndValidateData({
        dtc: row[1]?.toString() || null,
        title: row[2]?.toString() || null,
        severity: row[3] ? Number(row[3]) : null,
        repair_difficulty: row[4] ? Number(row[4]) : null,
        make: row[5]?.toString() || null,
        company_id: row[6] ? Number(row[6]) : null,
        generic: row[7] ? String(row[7]).toLowerCase() === 'true' : false
      }, ['dtc', 'title', 'make', 'company_id']),
      ['dtc', 'company_id']
    );

    // my_fault_code_causes
    const importResult2 = await importToTable(
      workbook,
      'causes',
      'my_fault_code_causes',
      (row) => cleanAndValidateData({
        dtc: row[1]?.toString() || null,
        causes: row[2]?.toString() || null,
        language: row[3]?.toString() || 'en',
        make: row[4]?.toString() || null,
        company_id: row[5] ? Number(row[5]) : null,
      }, ['dtc', 'causes', 'make', 'company_id']),
      ['dtc', 'company_id','causes']
    );

    // my_fault_code_symptoms
    const importResult3 = await importToTable(
      workbook,
      'symptoms',
      'my_fault_code_symptoms',
      (row) => cleanAndValidateData({
        dtc: row[1]?.toString() || null,
        symptom: row[2]?.toString() || null,
        language: row[3]?.toString() || 'en',
        make: row[4]?.toString() || null,
        company_id: row[5] ? Number(row[5]) : null,
      }, ['dtc', 'symptom', 'make', 'company_id']),
      ['dtc', 'company_id','symptom']
    );

    // my_fault_code_solutions
    const importResult4 = await importToTable(
      workbook,
      'solutions',
      'my_fault_code_solutions',
      (row) => cleanAndValidateData({
        dtc: row[1]?.toString() || null,
        solution: row[2]?.toString() || null,
        language: row[3]?.toString() || 'en',
        make: row[4]?.toString() || null,
        company_id: row[5] ? Number(row[5]) : null,
      }, ['dtc', 'solution', 'make', 'company_id']),
      ['dtc', 'company_id','solution']
    );

    // Commit transaction
    await pool.query('COMMIT');
    console.log('✅ Transaction committed');

    // Delete file
    fs.unlink(filePath, () => {});

    res.status(200).json({
      success: true,
      message: 'Excel file imported successfully!',
      summary: {
        my_fault_codes: importResult1,
        my_fault_code_causes: importResult2,
        my_fault_code_symptoms: importResult3,
        my_fault_code_solutions: importResult4
      }
    });

  } catch (err) {
    console.error('❌ Import Error:', err);
    await pool.query('ROLLBACK');
    if (filePath) fs.unlink(filePath, () => {});
    res.status(500).json({ success: false, message: 'Import failed', error: err.message });
  }
});

module.exports = router;
