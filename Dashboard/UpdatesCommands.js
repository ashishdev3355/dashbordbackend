const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const pool = require('../client');

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res) => {
  let filePath;
  try {
    filePath = req.file?.path;
    const sheetName = req.body.sheetName;

    if (!sheetName) return res.status(400).json({ message: 'sheetName is required' });
    if (!filePath) return res.status(400).json({ message: 'No file uploaded' });

    // ✅ Start transaction
    await pool.query('BEGIN');

    // 1️⃣ Find company
    const companyRes = await pool.query(
      `SELECT id FROM car_companies WHERE name = $1 LIMIT 1`,
      [sheetName]
    );
    if (companyRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: `Company "${sheetName}" not found` });
    }
    const makeId = companyRes.rows[0].id;

    // 2️⃣ Delete old rows
    const delRes = await pool.query(`DELETE FROM mechanic_commands WHERE make_id = $1`, [makeId]);
    console.log(`Deleted rows: ${delRes.rowCount}`);

    // 3️⃣ Parse Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: `Worksheet "${sheetName}" not found in Excel file.` });
    }

    // ✅ Better row processing - avoid duplicates and empty rows
    const rows = [];
    const processedIds = new Set(); // Track processed IDs to avoid duplicates
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;
      
      // Get row values (skip index 0 which is undefined in ExcelJS)
      const rowData = row.values.slice(1); // Remove the undefined first element
      
      // Skip if row is completely empty or missing required fields
      if (!rowData || rowData.length < 4) return;
      if (!rowData[2]) return; // Skip if ID is missing (assuming ID is in column 3)
      
      const recordId = rowData[2];
      
      // Skip duplicates
      if (processedIds.has(recordId)) {
        console.log(`Skipping duplicate ID: ${recordId}`);
        return;
      }
      
      processedIds.add(recordId);
      rows.push(rowData);
    });

    console.log(`Total rows to process: ${rows.length}`);

    // 4️⃣ Insert with better error handling
    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      try {
        // Validate required fields
        if (!row[2]) { // ID field
          skippedCount++;
          continue;
        }

        const fullScanValue = row[4] && String(row[4]).toLowerCase().trim() === 't';
        const makeGroupIdValue = row[8] ? Number(row[8]) : null;

        await pool.query(
          `INSERT INTO mechanic_commands (
            created_at, updated_at, id, command, full_scan,
            function_type, make_id, module, make_group_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            row[0] || null,  // created_at
            row[1] || null,  // updated_at  
            row[2] || null,  // id
            row[3] || null,  // command
            fullScanValue,   // full_scan
            row[5] || null,  // function_type
            makeId,          // make_id
            row[7] || null,  // module
            makeGroupIdValue // make_group_id
          ]
        );
        insertedCount++;
      } catch (insertError) {
        console.error(`Error inserting row with ID ${row[2]}:`, insertError.message);
        skippedCount++;
        // Continue with next row instead of failing entire operation
      }
    }

    await pool.query('COMMIT');

    // Clean up file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => { 
        if (err) console.error('Error deleting file:', err); 
      });
    }

    res.status(200).json({
      message: `Excel imported for company "${sheetName}"`,
      totalRowsProcessed: rows.length,
      insertedCount: insertedCount,
      skippedCount: skippedCount,
      deletedCount: delRes.rowCount
    });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Excel Import Error:', err);
    
    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, (unlinkErr) => { 
        if (unlinkErr) console.error('Error deleting file on error:', unlinkErr); 
      });
    }
    
    res.status(500).json({ 
      message: 'Excel import failed',
      error: err.message 
    });
  }
});

module.exports = router;