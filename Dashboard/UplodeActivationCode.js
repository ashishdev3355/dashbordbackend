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
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

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


const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    let isFirstRow = true;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        if (isFirstRow) {
          isFirstRow = false;
          return; // Skip header row
        }
        
        // Map CSV columns to expected structure
        // Adjust these field names based on your CSV structure
        const rowData = {
          ActivationCode: data['ActivationCode'] || data['Activation Code'] || data['activation_code'] || '',
          Plan: data['Plan'] || data['plan'] || '',
          Duration: data['Duration'] || data['duration'] || '',
          Vehicle: data['Vehicle'] || data['vehicle'] || '',
        };
        
        rows.push(rowData);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Function to parse Excel files (XLSX/XLS)
const parseExcel = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  const rows = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const rowData = {
      ActivationCode: row.getCell(2).value?.toString() || '',
      Plan: row.getCell(3).value?.toString() || '',
      Duration: row.getCell(4).value?.toString() || '',
      Vehicle: row.getCell(5).value?.toString() || '',
    };
    rows.push(rowData);
  });

  return rows;
};

// Function to validate row data
const validateRowData = (row, rowIndex) => {
  const { ActivationCode, Plan, Duration, Vehicle } = row;
  
  if (!ActivationCode?.trim() || !Plan?.trim() || !Duration?.trim() || !Vehicle?.trim()) {
    throw new Error(`Row ${rowIndex + 1}: All fields (ActivationCode, Plan, Duration, Vehicle) are required and cannot be empty`);
  }
  
  // Additional validation can be added here
  return {
    ActivationCode: ActivationCode.trim(),
    Plan: Plan.trim(),
    Duration: Duration.trim(),
    Vehicle: Vehicle.trim(),
  };
};

// Function to check for duplicates in file and database
const checkForDuplicates = async (rows) => {
  const duplicateInfo = {
    fileDuplicates: [],
    dbDuplicates: [],
    processedRows: []
  };
  
  // Check for duplicates within the file
  const seenCodes = new Set();
  const fileCodeMap = new Map();
  
  rows.forEach((row, index) => {
    const code = row.ActivationCode?.trim();
    if (code) {
      if (seenCodes.has(code)) {
        duplicateInfo.fileDuplicates.push({
          code,
          rows: [fileCodeMap.get(code), index + 2] // +2 because we skip header and use 1-based indexing
        });
      } else {
        seenCodes.add(code);
        fileCodeMap.set(code, index + 2);
      }
    }
  });
  
  // Get all unique activation codes from the file
  const uniqueCodes = Array.from(seenCodes);
  
  // Check for duplicates in database
  if (uniqueCodes.length > 0) {
    const placeholders = uniqueCodes.map((_, i) => `$${i + 1}`).join(',');
    const result = await client.query(
      `SELECT activation_code FROM activation_codes_new WHERE activation_code IN (${placeholders})`,
      uniqueCodes
    );
    
    duplicateInfo.dbDuplicates = result.rows.map(row => row.activation_code);
  }
  
  // Filter out rows with duplicates (both file and database duplicates)
  const duplicateCodes = new Set([
    ...duplicateInfo.fileDuplicates.map(d => d.code),
    ...duplicateInfo.dbDuplicates
  ]);
  
  duplicateInfo.processedRows = rows.filter(row => 
    !duplicateCodes.has(row.ActivationCode?.trim())
  );
  
  return duplicateInfo;
};

// Function to insert data into database
const insertDataBatch = async (rows) => {
  // const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    for (let i = 0; i < rows.length; i++) {
      const validatedRow = validateRowData(rows[i], i);
      const { ActivationCode, Plan, Duration, Vehicle } = validatedRow;
      
      await client.query(
        `INSERT INTO activation_codes_new (activation_code, plan, duration, vehicle, redeemed) VALUES ($1, $2, $3, $4,$5)`,
        [ActivationCode, Plan, Duration, Vehicle,false]
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // client.release();
  }
};

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
      warningMessages.push(`Found ${fileDuplicates.length} duplicate activation codes within the file`);
    }

    if (dbDuplicates.length > 0) {
      warningMessages.push(`Found ${dbDuplicates.length} activation codes that already exist in database`);
    }

    if (processedRows.length === 0) {
      throw new Error('No new records to import. All activation codes are duplicates.');
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



module.exports = router;


