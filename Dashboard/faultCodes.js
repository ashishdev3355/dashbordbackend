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
const processBatch = async (batch) => {
  if (batch.length === 0) return { inserted: 0, skipped: 0 };

  try {
    // Create bulk insert query - Don't include ID, let it auto-generate
    const placeholders = batch.map((_, index) => {
      const offset = index * 7; // 7 values per row (including company_id)
      return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7})`;
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
        safeInt(row[5])  // company_id parameter (individual)
      ];
    });

    const result = await pool.query(query, values);
    return { inserted: result.rowCount, skipped: batch.length - result.rowCount };

  } catch (error) {
    console.error('Batch insert error:', error.message);
    // Fallback to individual inserts for this batch
    return await processBatchIndividually(batch);
  }
};

// Fallback function for individual processing if batch fails
const processBatchIndividually = async (batch) => {
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
          safeInt(row[5])  // company_id parameter (individual)
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

    // Fetch existing records from database for duplicate checking/logging
    const existingResult = await pool.query('SELECT dtc, company_id FROM my_fault_codes');
    const existingDbKeys = new Set();
    existingResult.rows.forEach(r => {
      if (r.dtc && r.company_id) {
        existingDbKeys.add(`${String(r.dtc).trim()}|${r.company_id}`);
      }
    });

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
    const processedKeys = new Set();
    const duplicateDetails = [];
    let headerSkipped = false;
    let companyId = null; // Will be extracted from Excel data for UI response
    let totalExcelRowsParsed = 0;
    let skippedRowsCount = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      totalExcelRowsParsed++;
      // Skip header row
      if (rowNumber === 1 && !headerSkipped) {
        headerSkipped = true;
        console.log(`📊 Header row: ${row.values.slice(1).join(' | ')}`);
        return;
      }

      const rowData = row.values.slice(1); // Remove undefined first element

      // Skip invalid rows - check for DTC (index 0, not 1)
      if (!rowData || rowData.length < 2 || !rowData[0]) {
        console.log(`⚠️ Skipping row ${rowNumber}: Missing DTC or insufficient data (Row length: ${rowData ? rowData.length : 0})`);
        skippedRowsCount++;
        return;
      }

      const dtc = String(rowData[0]).trim();
      const rowCompanyId = safeInt(rowData[5]);

      if (rowCompanyId === null) {
        console.log(`⚠️ Skipping row ${rowNumber}: Missing or invalid company_id (DTC: "${dtc}", company_id in Excel: "${rowData[5]}")`);
        skippedRowsCount++;
        return;
      }

      const duplicateKey = `${dtc}|${rowCompanyId}`;

      // Check if it already exists in the database to log as a duplicate and skip in-memory
      if (existingDbKeys.has(duplicateKey)) {
        console.log(`⚠️ Skipping row ${rowNumber}: Duplicate DTC and Company ID already exists in database (DTC: "${dtc}", company_id: "${rowCompanyId}")`);
        duplicateDetails.push({
          rowNumber,
          dtc,
          companyId: rowCompanyId,
          reason: 'Already exists in database'
        });
        skippedRowsCount++;
        return;
      }

      // Skip duplicates within the file (based on DTC and company_id)
      if (processedKeys.has(duplicateKey)) {
        console.log(`🔄 Skipping row ${rowNumber}: Duplicate DTC and Company ID within Excel file (DTC: "${dtc}", company_id: "${rowCompanyId}")`);
        duplicateDetails.push({
          rowNumber,
          dtc,
          companyId: rowCompanyId,
          reason: 'Duplicate in Excel file'
        });
        skippedRowsCount++;
        return;
      }

      processedKeys.add(duplicateKey);
      validRows.push(rowData);

      // Log the row number, DTC, and company_id for every row before it is inserted
      console.log(`📝 Row ${rowNumber}: DTC="${dtc}", company_id=${rowCompanyId}`);

      // Set companyId (for stats / compatibility with UI response) from first valid row's data
      if (companyId === null) {
        companyId = rowCompanyId;
        console.log(`📍 Company ID extracted from Excel: ${companyId}`);
      }

      // Log first few rows for debugging
      if (validRows.length <= 3) {
        console.log(`📝 Row ${rowNumber} full data:`, {
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

    console.log(`📊 --- Excel Parsing Diagnostics ---`);
    console.log(`📊 Total rows parsed (including header): ${totalExcelRowsParsed}`);
    console.log(`📊 Total data rows read (excluding header): ${totalExcelRowsParsed - 1}`);
    console.log(`📊 Total valid rows gathered: ${validRows.length}`);
    console.log(`📊 Total skipped rows: ${skippedRowsCount}`);
    console.log(`📊 --------------------------------`);

    if (validRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'No valid data rows found in Excel file' });
    }

    // Ensure we have a company ID
    if (!companyId) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'No company ID found in Excel data' });
    }

    console.log(`🚀 Sent ${validRows.length} rows to batch insertion.`);

    // Bulk insert with batching - only new entries will be inserted
    const BATCH_SIZE = 500; // Reduced batch size for better error handling
    let totalInserted = 0;
    let totalSkipped = 0;

    // Process in batches for optimal performance
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`🔄 Processing batch ${batchNumber} (${batch.length} rows)...`);

      const batchResult = await processBatch(batch);

      totalInserted += batchResult.inserted;
      totalSkipped += batchResult.skipped;

      console.log(`✅ Batch ${batchNumber} completed: Inserted ${batchResult.inserted}, Skipped ${batchResult.skipped}`);
    }

    // Commit transaction
    await pool.query('COMMIT');

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`🎉 Transaction committed in ${processingTime}ms`);
    console.log(`📊 Final DB execution stats:`);
    console.log(`   - Total rows sent for insertion: ${validRows.length}`);
    console.log(`   - Total rows successfully inserted into DB: ${totalInserted}`);
    console.log(`   - Total rows skipped as DB-level duplicates (ON CONFLICT): ${totalSkipped}`);

     res.status(200).json({
      message: `Excel imported with company_id: ${companyId} - Only new entries added`,
      stats: {
        totalRowsProcessed: totalExcelRowsParsed - 1,
        insertedCount: totalInserted,
        skippedCount: skippedRowsCount,
        deletedCount: 0, // No deletions performed
        processingTimeMs: processingTime,
        rowsPerSecond: validRows.length > 0 ? Math.round((validRows.length / processingTime) * 1000) : 0,
        fileName: req.file.originalname,
        fileSize: fileBuffer.length,
        companyId: companyId,
        worksheetName: worksheet.name,
        duplicateDetails: duplicateDetails
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