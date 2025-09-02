const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const db = require('../client'); 

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// POST /import2 - Excel file import route
router.post('/import2', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file?.path;
    const sheetName = req.body.sheetName;


    if (!sheetName){
        return res.status(400).json({message : 'sheetName is requred'})
    }


    if (!filePath) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
   





    let worksheet;
    if (sheetName) {
    worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
        return res.status(400).json({ message: `Worksheet "${sheetName}" not found in Excel file.` });
    }
    } 



    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        rows.push(row.values);
      }
    });

    for (const row of rows) {



      const fullScanValue = row[5] !== undefined && row[5] !== null 
        ? String(row[5]).toLowerCase().trim() === 't'
        : false;

      const makeIdValue = row[7] !== undefined && row[7] !== null && row[7] !== '' && !isNaN(Number(row[7]))
        ? Number(row[7])
        : null;

     


      await db.query(
        `INSERT INTO mechanic_commands (
          created_at,
          updated_at,
          id,
          command,
          full_scan,
          function_type,
          make_id,
          module,
          make_group_id
          
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9)
        ON CONFLICT (id) DO NOTHING`,
        [
          row[1] || null,       // created_at
          row[2] || null,       // updated_at
          row[3] || null,       // id
          row[4] || null,       // command
          fullScanValue,        // full_scan
          row[6] || null,        // function_type
          makeIdValue,          // make_id
          row[8] || null,        // module
          row[9]  || null
        ]
      );
    }

    
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting uploaded file:', err);
      }
    });

    res.status(200).json({ message: 'Excel file imported successfully!' });
  } catch (error) {
    console.error('Excel Import Error:', error);
    res.status(500).json({ message: 'Excel import failed' });
  }
});

module.exports = router;

