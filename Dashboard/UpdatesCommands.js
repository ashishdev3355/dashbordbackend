const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
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

    // Flatten all batch data into single array
    const values = batch.flatMap(row => [
      row[0] || null,  // created_at
      row[1] || null,  // updated_at  
      row[2] || null,  // id
      row[3] || null,  // command
      row[4] && String(row[4]).toLowerCase().trim() === 't', // full_scan
      row[5] || null,  // function_type
      makeId,          // make_id
      row[7] || null,  // module
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
          row[0] || null,
          row[1] || null,
          row[2] || null,
          row[3] || null,
          row[4] && String(row[4]).toLowerCase().trim() === 't',
          row[5] || null,
          makeId,
          row[7] || null,
          row[8] ? Number(row[8]) : null
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
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;
      
      const rowData = row.values.slice(1); // Remove undefined first element
      
      // Skip invalid rows
      if (!rowData || rowData.length < 4 || !rowData[2]) return;
      
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