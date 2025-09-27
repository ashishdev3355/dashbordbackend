const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const pool = require('../client');

const router = express.Router();

// Multer configuration - using memory storage for better performance
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Helper function to safely convert to integer
const safeInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = parseInt(value);
  return isNaN(num) ? null : num;
};

// Helper function to safely convert to boolean
const safeBool = (value) => {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const str = String(value).toLowerCase().trim();
  return str === 'true' || str === 't' || str === '1' || str === 'yes';
};

// Helper function to process rows in batches
const processBatch = async (batch, companyId) => {
  if (batch.length === 0) return { inserted: 0, skipped: 0 };

  try {
    // Create bulk insert query - Don't include ID, let it auto-generate
    const placeholders = batch.map((_, index) => {
      const offset = index * 7; // 7 values per row (including company_id)
      return `(${offset + 1},${offset + 2},${offset + 3},${offset + 4},${offset + 5},${offset + 6},${offset + 7})`;
    }).join(',');

    const query = `
      INSERT INTO my_fault_codes (
        dtc, title, severity, repair_difficulty, 
        make, generic, company_id
      ) VALUES ${placeholders}
      ON CONFLICT (dtc, company_id) DO NOTHING
    `;

    // Flatten all batch data into single array
    const values = batch.flatMap(row => {
      const genericValue = safeBool(row[6]);
      console.log(`Debug: row[6]="${row[6]}" -> safeBool=${genericValue} (type: ${typeof genericValue})`);
      
      return [
        row[0] || null,  // dtc
        row[1] || null,  // title
        safeInt(row[2]), // severity
        safeInt(row[3]), // repair_difficulty
        row[4] || null,  // make
        genericValue,    // generic (row[5] is company_id, row[6] is generic)
        companyId        // company_id parameter
      ];
    });

    const result = await pool.query(query, values);
    return { inserted: result.rowCount, skipped: batch.length - result.rowCount };

  } catch (error) {
    console.error('Batch insert error:', error.message);
    // Fallback to individual inserts for this batch
    return await processBatchIndividually(batch, companyId);
  }
};

// Fallback function for individual processing if batch fails
const processBatchIndividually = async (batch, companyId) => {
  let inserted = 0, skipped = 0;
  
  for (const [index, row] of batch.entries()) {
    try {
      if (!row[0]) { // Skip if DTC is missing (should be row[0], not row[1])
        console.log(`Skipping row ${index + 1}: Missing DTC`);
        skipped++;
        continue;
      }

      const result = await pool.query(
        `INSERT INTO my_fault_codes (
          dtc, title, severity, repair_difficulty, 
          make, generic, company_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (dtc, company_id) DO NOTHING`,
        [
          row[0] || null,  // dtc
          row[1] || null,  // title
          safeInt(row[2]), // severity
          safeInt(row[3]), // repair_difficulty
          row[4] || null,  // make
          safeBool(row[6]), // generic (row[5] is company_id)
          companyId        // company_id parameter
        ]
      );
      
      if (result.rowCount > 0) {
        inserted++;
        console.log(`✅ Inserted row ${index + 1}: DTC ${row[0]}`);
      } else {
        skipped++; // Record already exists
        console.log(`⏭️ Skipped row ${index + 1}: DTC ${row[0]} already exists`);
      }
    } catch (insertError) {
      console.error(`❌ Error inserting row ${index + 1} with DTC ${row[0]}:`, insertError.message);
      skipped++;
    }
  }
  
  return { inserted, skipped };
};

router.post('/', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const fileBuffer = req.file?.buffer;
    
    if (!fileBuffer) return res.status(400).json({ message: 'No file uploaded' });

    console.log(`Processing file: ${req.file.originalname} (${fileBuffer.length} bytes)`);

    // Start transaction
    await pool.query('BEGIN');

    // Extract company_id from Excel data (will be set from first valid row)

    // Parse Excel from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    // Get first worksheet (since no sheet name provided)
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: `No worksheet found in Excel file.` });
    }

    console.log(`📋 Processing worksheet: ${worksheet.name}`);

    // Optimized row processing - collect all valid rows first
    const validRows = [];
    const processedDtcs = new Set();
    let headerSkipped = false;
    let companyId = null; // Will be extracted from Excel data
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1 && !headerSkipped) {
        headerSkipped = true;
        console.log(`📊 Header row: ${row.values.slice(1).join(' | ')}`);
        return;
      }
      
      const rowData = row.values.slice(1); // Remove undefined first element
      
      // Skip invalid rows - check for DTC (index 0, not 1)
      if (!rowData || rowData.length < 2 || !rowData[0]) {
        console.log(`⚠️ Skipping row ${rowNumber}: Missing DTC or insufficient data`);
        return;
      }
      
      const dtc = String(rowData[0]).trim();
      
      // Skip duplicates within the file (based on DTC)
      if (processedDtcs.has(dtc)) {
        console.log(`🔄 Skipping duplicate DTC in file: ${dtc}`);
        return;
      }
      
      processedDtcs.add(dtc);
      validRows.push(rowData);
      
      // Set companyId from first valid row's data
      if (companyId === null && rowData[5]) {
        companyId = safeInt(rowData[5]);
        console.log(`📍 Company ID extracted from Excel: ${companyId}`);
      }
      
      // Log first few rows for debugging
      if (validRows.length <= 3) {
        console.log(`📝 Row ${rowNumber} data:`, {
          dtc: rowData[0],
          title: rowData[1],
          severity: rowData[2],
          repair_difficulty: rowData[3],
          make: rowData[4],
          companyId: rowData[5], // row[5] is company_id from Excel
          generic: rowData[6]
        });
      }
    });

    console.log(`📈 Total valid rows to process: ${validRows.length}`);

    if (validRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'No valid data rows found in Excel file' });
    }

    // Ensure we have a company ID
    if (!companyId) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'No company ID found in Excel data' });
    }

    // Bulk insert with batching - only new entries will be inserted
    const BATCH_SIZE = 500; // Reduced batch size for better error handling
    let totalInserted = 0;
    let totalSkipped = 0;

    // Process in batches for optimal performance
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
      
      console.log(`🔄 Processing batch ${batchNumber} (${batch.length} rows)...`);
      
      const batchResult = await processBatch(batch, companyId);
      
      totalInserted += batchResult.inserted;
      totalSkipped += batchResult.skipped;
      
      console.log(`✅ Batch ${batchNumber} completed: Inserted ${batchResult.inserted}, Skipped ${batchResult.skipped}`);
    }

    // Commit transaction
    await pool.query('COMMIT');
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`🎉 Transaction committed in ${processingTime}ms`);
    console.log(`📊 Final stats - Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);

    res.status(200).json({
      message: `Excel imported with company_id: ${companyId} - Only new entries added`,
      stats: {
        totalRowsProcessed: validRows.length,
        insertedCount: totalInserted,
        skippedCount: totalSkipped,
        deletedCount: 0, // No deletions performed
        processingTimeMs: processingTime,
        rowsPerSecond: validRows.length > 0 ? Math.round((validRows.length / processingTime) * 1000) : 0,
        fileName: req.file.originalname,
        fileSize: fileBuffer.length,
        companyId: companyId,
        worksheetName: worksheet.name
      }
    });

  } catch (err) {
    // Rollback transaction on error
    try {
      await pool.query('ROLLBACK');
      console.log('🔄 Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('❌ Error during rollback:', rollbackError);
    }
    
    console.error('💥 Excel Import Error:', err);
    
    res.status(500).json({ 
      message: 'Excel import failed',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;