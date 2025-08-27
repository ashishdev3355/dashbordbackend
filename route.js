
// route.js - Complete with all your routes
const express = require('express');
const router = express.Router();

const getUsers = require("./Dashboard/user-detail");
const ScanDetail = require("./Dashboard/Scan-detail");
const SpecialFunctions = require("./Dashboard/Special-Functions");
const ActuationsDetail = require("./Dashboard/actuations-detail");
const FaultUplodes = require("./Dashboard/FaultUplodes.js");
const getCoverage = require("./Dashboard/getCoverage.js");
const ActuationCommands = require("./Dashboard/ActuationCommands.js");
const CustomCommands = require("./Dashboard/CustomCommands.js");
const OdometerAPI = require("./Dashboard/OdometerAPI.js");
const SPFCommands = require("./Dashboard/SPFCommands.js");

const path = require('path');
const fs = require('fs');

// -------------------------------
// Router for file uploads (FaultUplodes exports a router)
// -------------------------------
router.use('/api', FaultUplodes);

// -------------------------------
// Function Handlers (export functions directly)
// -------------------------------
router.get('/api/users', getUsers);
router.get('/api/ScanDetail', ScanDetail);
router.get('/api/SpecialFunctions', SpecialFunctions);
router.get('/api/ActuationsDetail', ActuationsDetail);
router.get('/api/getCoverage', getCoverage);
router.get('/api/ActuationCommands', ActuationCommands);
router.get('/api/CustomCommands', CustomCommands);
router.get('/api/OdometerAPI', OdometerAPI);
router.get('/api/SPFCommands', SPFCommands);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// -------------------------------
// Ensure uploads directory exists
// -------------------------------
const uploadsDir = path.join(__dirname, './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

module.exports = router;