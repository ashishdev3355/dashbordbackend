
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
const FetchMakeList = require("./Dashboard/FetchMakeList.js");
const ModelList = require("./Dashboard/ModelList.js");
const uplodeactivationcode = require("./Dashboard/UplodeActivationCode.js");
const CommandAPI = require("./Dashboard/CommandAPI.js");
const UpdatesCommands = require("./Dashboard/UpdatesCommands.js");

const path = require('path');
const fs = require('fs');

// -------------------------------
// Router for file uploads (FaultUplodes exports a router)
// -------------------------------
router.use('/FaultUplodes', FaultUplodes);
router.use('/uplodeactivationcode', uplodeactivationcode);
router.use('/UpdatesCommands', UpdatesCommands);

// -------------------------------
// Function Handlers (export functions directly)
// -------------------------------
router.get('/users', getUsers);
router.get('/ScanDetail', ScanDetail);
router.get('/CommandAPI', CommandAPI);
router.get('/SpecialFunctions', SpecialFunctions);
router.get('/ActuationsDetail', ActuationsDetail);
router.get('/getCoverage', getCoverage);
router.get('/ActuationCommands', ActuationCommands);
router.get('/CustomCommands', CustomCommands);
router.get('/OdometerAPI', OdometerAPI);
router.get('/SPFCommands', SPFCommands);
router.get('/FetchMakeList', FetchMakeList);
router.get('/ModelList', ModelList);





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