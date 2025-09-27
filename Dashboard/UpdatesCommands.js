const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const pool = require('../client');

const router = express.Router();

// Multer configuration - using memory storage for better performance
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory instead of disk
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Helper function to convert values to boolean
const toBool = (val) => {
  // Handle null/undefined/empty
  if (val === null || val === undefined || val === '') return null;
  
  // Handle boolean values directly
  if (typeof val === 'boolean') return val;
  
  // Handle numeric values
  if (typeof val === 'number') return val === 1;
  
  // Convert to string and check
  const str = String(val).toUpperCase().trim();
  
  // Excel TRUE should become string "TRUE"
  if (str === 'TRUE' || str === '1' || str === 'YES') return true;
  if (str === 'FALSE' || str === '0' || str === 'NO') return false;
  
  // Default to false for unknown values
  return false;
};

// Helper function to process rows in batches
const processBatch = async (batch, makeId) => {
  if (batch.length === 0) return { inserted: 0, skipped: 0 };

  try {
    // Create bulk insert query
    const placeholders = batch.map((_, index) => {
      const offset = index * 9;
      return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9})`;
    }).join(',');

    const query = `
      INSERT INTO mechanic_commands (
        created_at, updated_at, id, command, full_scan,
        function_type, make_id, module, make_group_id
      ) VALUES ${placeholders}
      ON CONFLICT (id) DO NOTHING
    `;

    const values = batch.flatMap(row => [
      row[0] || null,                // created_at
      row[1] || null,                // updated_at  
      row[2] || null,                // id
      row[3] || null,                // command
      toBool(row[4]),                // full_scan - FIXED
      row[5] || null,                // function_type
      makeId,                        // make_id
      row[7] || null,                // module
      row[8] ? Number(row[8]) : null // make_group_id
    ]);

    const result = await pool.query(query, values);
    return { inserted: result.rowCount, skipped: batch.length - result.rowCount };

  } catch (error) {
    console.error('Batch insert error:', error.message);
    // Fallback to individual inserts for this batch
    return await processBatchIndividually(batch, makeId);
  }
};

// Fallback function for individual processing if batch fails
const processBatchIndividually = async (batch, makeId) => {
  let inserted = 0, skipped = 0;
  
  for (const row of batch) {
    try {
      if (!row[2]) { // Skip if ID is missing
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO mechanic_commands (
          created_at, updated_at, id, command, full_scan,
          function_type, make_id, module, make_group_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING`,
        [
          row[0] || null,              // created_at
          row[1] || null,              // updated_at
          row[2] || null,              // id
          row[3] || null,              // command
          toBool(row[4]),              // full_scan - FIXED: Use the toBool function consistently
          row[5] || null,              // function_type
          makeId,                      // make_id
          row[7] || null,              // module
          row[8] ? Number(row[8]) : null // make_group_id
        ]
      );
      inserted++;
    } catch (insertError) {
      console.error(`Error inserting row with ID ${row[2]}:`, insertError.message);
      skipped++;
    }
  }
  
  return { inserted, skipped };
};

router.post('/', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const fileBuffer = req.file?.buffer;
    const sheetName = req.body.sheetName;

    if (!sheetName) return res.status(400).json({ message: 'sheetName is required' });
    if (!fileBuffer) return res.status(400).json({ message: 'No file uploaded' });

    console.log(`Processing file: ${req.file.originalname} (${fileBuffer.length} bytes)`);

    // ✅ Start transaction
    await pool.query('BEGIN');

    // 1️⃣ Find company (using prepared statement equivalent)
    const companyRes = await pool.query(
      `SELECT id FROM car_companies WHERE name = $1 LIMIT 1`,
      [sheetName]
    );
    
    if (companyRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: `Company "${sheetName}" not found` });
    }
    const makeId = companyRes.rows[0].id;

    // 2️⃣ Delete old rows - single operation
    const delRes = await pool.query(`DELETE FROM mechanic_commands WHERE make_id = $1`, [makeId]);
    console.log(`Deleted rows: ${delRes.rowCount}`);

    // 3️⃣ Parse Excel from buffer (faster than file I/O)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer); // Load from buffer instead of file
    
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: `Worksheet "${sheetName}" not found in Excel file.` });
    }

    // ✅ Optimized row processing - collect all valid rows first
    const validRows = [];
    const processedIds = new Set();
    
    console.log('=== DEBUGGING EXCEL COLUMN MAPPING ===');
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Skip header row but log it for reference
      if (rowNumber === 1) {
        console.log('Headers:', row.values);
        return;
      }
      
      // Debug first 3 data rows to understand the structure
      if (rowNumber <= 4) {
        console.log(`\n--- Row ${rowNumber} Debug ---`);
        console.log('Raw row.values:', row.values);
        console.log('Length:', row.values.length);
        
        // Check each column
        for (let i = 1; i < row.values.length; i++) {
          console.log(`Column ${i} (${String.fromCharCode(64 + i)}):`, row.values[i], typeof row.values[i]);
        }
        
        // Test our boolean conversion on what should be the full_scan column
        console.log('Testing column 5 (E - full_scan):', row.values[5], '→', toBool(row.values[5]));
      }
      
      // Get all cell values (ExcelJS includes undefined at index 0)
      const rawValues = row.values;
      
      // Based on your Excel image, columns are:
      // A(1)=created_at, B(2)=updated_at, C(3)=id, D(4)=command, 
      // E(5)=full_scan, F(6)=function_type, G(7)=make_id, H(8)=module, I(9)=make_group_id
      const rowData = [
        rawValues[1],  // A: created_at
        rawValues[2],  // B: updated_at
        rawValues[3],  // C: id
        rawValues[4],  // D: command
        rawValues[5],  // E: full_scan ← This should be TRUE
        rawValues[6],  // F: function_type
        rawValues[7],  // G: make_id (will be replaced with our makeId)
        rawValues[8],  // H: module
        rawValues[9]   // I: make_group_id
      ];
      
      // Skip invalid rows
      if (!rowData[2]) return; // Skip if no ID
      
      const recordId = rowData[2];
      
      // Skip duplicates
      if (processedIds.has(recordId)) {
        console.log(`Skipping duplicate ID: ${recordId}`);
        return;
      }
      
      processedIds.add(recordId);
      validRows.push(rowData);
    });

    console.log(`Total valid rows to process: ${validRows.length}`);

    // 4️⃣ Bulk insert with batching
    const BATCH_SIZE = 1000; // Adjust based on your PostgreSQL settings
    let totalInserted = 0;
    let totalSkipped = 0;

    // Process in batches for optimal performance
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const batchResult = await processBatch(batch, makeId);
      
      totalInserted += batchResult.inserted;
      totalSkipped += batchResult.skipped;
      
      console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1}: Inserted ${batchResult.inserted}, Skipped ${batchResult.skipped}`);
    }

    // ✅ Commit transaction
    await pool.query('COMMIT');
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ Transaction committed in ${processingTime}ms`);
    console.log(`📊 Final stats - Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);

    res.status(200).json({
      message: `Excel imported for company "${sheetName}"`,
      stats: {
        totalRowsProcessed: validRows.length,
        insertedCount: totalInserted,
        skippedCount: totalSkipped,
        deletedCount: delRes.rowCount,
        processingTimeMs: processingTime,
        rowsPerSecond: Math.round((validRows.length / processingTime) * 1000),
        fileName: req.file.originalname,
        fileSize: fileBuffer.length
      }
    });

  } catch (err) {
    // ✅ Rollback transaction on error
    try {
      await pool.query('ROLLBACK');
      console.log('Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    
    console.error('Excel Import Error:', err);
    
    res.status(500).json({ 
      message: 'Excel import failed',
      error: err.message 
    });
  }
});

module.exports = router;