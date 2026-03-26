
// route.js - Complete with all your routes
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const requireAuth = require("./middleware/authMiddleware.js");
const rbacMiddleware = require("./middleware/rbac.js");
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
const faultCodesList = require("./Dashboard/faultCodesList.js");
const FaultCodeCauses = require("./Dashboard/FaultCodeCauses.js");
const FaultCodeSolutions = require("./Dashboard/FaultCodeSolutions.js");
const FaultCodeSymptoms = require("./Dashboard/FaultCodeSymptoms.js");


const LiveDateCommandsUplode = require("./Dashboard/LiveDateCommandsUplode.js");

// -------------------------------
// Router for file uploads (FaultUplodes exports a router)
// -------------------------------
// router.use('/FaultUplodes',requireAuth, rbacMiddleware, FaultUplodes);
router.use('/faultCodes', faultCodes);
router.use('/uplodeactivationcode', requireAuth, rbacMiddleware, uplodeactivationcode);
router.use('/UpdatesCommands', requireAuth, rbacMiddleware, UpdatesCommands);
// router.use('/LiveDateCommandsUplode', requireAuth, rbacMiddleware, LiveDateCommandsUplode);
router.use('/LiveDateCommandsUplode', LiveDateCommandsUplode);
// router.use('/UpdatesCommands', UpdatesCommands);


// -------------------------------
// Function Handlers (export functions directly)
// -------------------------------
router.get('/users', requireAuth, rbacMiddleware, getUsers);
router.get('/ScanDetail', requireAuth, rbacMiddleware, ScanDetail);
router.get('/CommandAPI', requireAuth, rbacMiddleware, CommandAPI);
router.get('/SpecialFunctions', requireAuth, rbacMiddleware, SpecialFunctions);
router.get('/ActuationsDetail', requireAuth, rbacMiddleware, ActuationsDetail);
router.get('/getCoverage', requireAuth, rbacMiddleware, getCoverage);
router.get('/ActuationCommands', requireAuth, rbacMiddleware, ActuationCommands);
router.get('/CustomCommands', requireAuth, rbacMiddleware, CustomCommands);
router.get('/OdometerAPI', requireAuth, rbacMiddleware, OdometerAPI);
router.get('/SPFCommands', requireAuth, rbacMiddleware, SPFCommands);
router.get('/FetchMakeList', requireAuth, rbacMiddleware, FetchMakeList);
router.get('/ModelList', requireAuth, rbacMiddleware, ModelList);
router.get('/LiveDataCommands', requireAuth, rbacMiddleware, LiveDataCommands);
router.get('/faultCodesList', requireAuth, rbacMiddleware, faultCodesList);
router.get('/FaultCodeCauses', requireAuth, rbacMiddleware, FaultCodeCauses);
router.get('/FaultCodeSolutions', requireAuth, rbacMiddleware, FaultCodeSolutions);
router.get('/FaultCodeSymptoms', requireAuth, rbacMiddleware, FaultCodeSymptoms);





// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});


const uploadsDir = path.join(__dirname, './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

module.exports = router;