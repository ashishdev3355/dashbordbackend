const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const db = require('../client');

const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/uplodeactivationcode', upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  if (!filePath) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext !== '.xlsx') {
    fs.unlink(filePath, () => {});
    return res.status(400).json({ message: 'Only .xlsx files are supported' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    const rows = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const rowData = {
        ActivationCode: row.getCell(2).value?.toString(),
        Plan: row.getCell(3).value?.toString(),
        Duration: row.getCell(4).value?.toString(),
        Vehicle: row.getCell(5).value?.toString(),
      };
      rows.push(rowData);
    });

    for (const row of rows) {
      const { ActivationCode, Plan, Duration, Vehicle } = row;

      if (!ActivationCode || !Plan || !Duration || !Vehicle) {
        throw new Error('All fields (ActivationCode, Plan, Duration, Vehicle) are required!');
      }

      await db.query(
        `INSERT INTO activation_codes_new (activation_code, plan, duration, vehicle) VALUES ($1, $2, $3, $4)`,
        [ActivationCode, Plan, Duration, Vehicle]
      );
    }

    fs.unlink(filePath, () => {});
    res.status(200).json({ message: 'Excel file imported successfully!' });

  } catch (error) {
    console.error('Excel Import Error:', error.message || error);
    fs.unlink(filePath, () => {});
    res.status(500).json({ message: error.message || 'Excel import failed' });
  }
});

module.exports = router;
