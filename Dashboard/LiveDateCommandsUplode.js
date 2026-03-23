const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const client = require('../client');

const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });

    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);

  }

})

// File filter to accept only supported formats
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx, .xls, and .csv files are supported'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});








// Main route handler
router.post('/', upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  if (!filePath) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const ext = path.extname(filePath).toLowerCase();
  let rows = [];

  try {
    console.log(`Processing ${ext} file: ${filePath}`);

    // Parse file based on extension
    switch (ext) {
      case '.csv':
        rows = await parseCSV(filePath);
        break;
      case '.xlsx':
      case '.xls':
        rows = await parseExcel(filePath);
        break;
      default:
        throw new Error('Unsupported file format');
    }

    if (rows.length === 0) {
      throw new Error('No valid data found in the file');
    }

    console.log(`Found ${rows.length} rows to process`);

    // Check for duplicates
    const duplicateInfo = await checkForDuplicates(rows);
    const { fileDuplicates, dbDuplicates, processedRows } = duplicateInfo;

    // Prepare response message
    let responseMessage = '';
    let warningMessages = [];

    if (fileDuplicates.length > 0) {
      warningMessages.push(`Found ${fileDuplicates.length} duplicate commands within the file`);
    }

    if (dbDuplicates.length > 0) {
      warningMessages.push(`Found ${dbDuplicates.length} commands that already exist in database`);
    }

    if (processedRows.length === 0) {
      throw new Error('No new records to import. All commands are duplicates.');
    }

    // Insert only non-duplicate data
    await insertDataBatch(processedRows);

    // Build success message
    responseMessage = `File processed successfully! ${processedRows.length} records imported.`;

    if (warningMessages.length > 0) {
      responseMessage += ` Warnings: ${warningMessages.join(', ')}.`;
    }

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    res.status(200).json({
      message: responseMessage,
      totalRows: rows.length,
      importedRows: processedRows.length,
      duplicates: {
        inFile: fileDuplicates.length,
        inDatabase: dbDuplicates.length,
        fileDuplicateDetails: fileDuplicates,
        dbDuplicateCodes: dbDuplicates
      }
    });

  } catch (error) {
    console.error('File Import Error:', error.message || error);

    // Clean up uploaded file on error
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    // Return appropriate error message
    if (error.message.includes('Row')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || 'File import failed',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});



// Helper Functions

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

const parseExcel = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  const rows = [];

  // Get headers
  const headers = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const rowData = {};
    let hasData = false;

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        // Handle rich text if necessary, though commonly it's just value
        let val = cell.value;
        if (val && typeof val === 'object' && val.text) {
          val = val.text;
        }
        rowData[header] = val;
        hasData = true;
      }
    });

    if (hasData) rows.push(rowData);
  });

  return rows;
};

const checkForDuplicates = async (rows) => {
  const fileDuplicates = [];
  const dbDuplicates = [];
  const processedRows = [];

  const seenInFile = new Set();
  const uniqueFileRows = [];

  // Check file duplicates
  for (const row of rows) {
    if (!row.model_group_id || !row.command) {
      // Skip invalid rows without key identifiers
      continue;
    }
    const key = `${row.model_group_id}-${row.command}`;
    if (seenInFile.has(key)) {
      fileDuplicates.push(key);
    } else {
      seenInFile.add(key);
      uniqueFileRows.push(row);
    }
  }

  // Check DB duplicates
  if (uniqueFileRows.length > 0) {
    const modelGroupIds = [...new Set(uniqueFileRows.map(r => r.model_group_id))];
    // Fetch existing commands for these model groups
    const queryText = `SELECT model_group_id, command FROM mechanic_live_data_commands WHERE model_group_id = ANY($1)`;

    const { rows: existingRows } = await client.query(queryText, [modelGroupIds]);

    const existingSet = new Set(existingRows.map(r => `${r.model_group_id}-${r.command}`));

    for (const row of uniqueFileRows) {
      const key = `${row.model_group_id}-${row.command}`;
      if (existingSet.has(key)) {
        dbDuplicates.push(key);
      } else {
        processedRows.push(row);
      }
    }
  }

  return { fileDuplicates, dbDuplicates, processedRows };
};

const insertDataBatch = async (rows) => {
  if (rows.length === 0) return;

  const dbClient = await client.pool.connect();

  try {
    await dbClient.query('BEGIN');

    const insertQuery = `
        INSERT INTO mechanic_live_data_commands (
            model_group_id, command, description, short_name, 
            decimals, min, max, units, type, "formulaBased", "referenceJSON"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    for (const row of rows) {
      await dbClient.query(insertQuery, [
        row.model_group_id,
        row.command,
        row.description,
        row.short_name,
        row.decimals,
        row.min,
        row.max,
        row.units,
        row.type,
        row.formulaBased,
        row.referenceJSON
      ]);
    }

    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
};


module.exports = router;
