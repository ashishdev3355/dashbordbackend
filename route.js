
// route.js - Complete with all your routes
const express = require('express');
const router = express.Router();
const requireAuth = require("./middleware/tokenverfy.js");

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
const LiveDataCommands = require("./Dashboard/LiveDataCommands.js");
const faultCodes = require("./Dashboard/faultCodes.js");

const path = require('path');
const fs = require('fs');

// -------------------------------
// Router for file uploads (FaultUplodes exports a router)
// -------------------------------
// router.use('/FaultUplodes',requireAuth, FaultUplodes);
router.use('/faultCodes', faultCodes);
router.use('/uplodeactivationcode',requireAuth, uplodeactivationcode);
router.use('/UpdatesCommands',requireAuth, UpdatesCommands);
// router.use('/UpdatesCommands', UpdatesCommands);

// -------------------------------
// Function Handlers (export functions directly)
// -------------------------------
router.get('/users',requireAuth, getUsers);
router.get('/ScanDetail',requireAuth, ScanDetail);
router.get('/CommandAPI',requireAuth, CommandAPI);
router.get('/SpecialFunctions',requireAuth, SpecialFunctions);
router.get('/ActuationsDetail',requireAuth, ActuationsDetail);
router.get('/getCoverage',requireAuth, getCoverage);
router.get('/ActuationCommands',requireAuth, ActuationCommands);
router.get('/CustomCommands',requireAuth, CustomCommands);
router.get('/OdometerAPI', requireAuth,OdometerAPI);
router.get('/SPFCommands',requireAuth, SPFCommands);
router.get('/FetchMakeList',requireAuth, FetchMakeList);
router.get('/ModelList',requireAuth, ModelList);
router.get('/LiveDataCommands', requireAuth,LiveDataCommands);





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