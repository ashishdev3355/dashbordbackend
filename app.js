// app.js - CORRECTED VERSION
const dotenv = require('dotenv-safe');
dotenv.config({ allowEmptyValues: true });

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./client.js');
const apiV1 = require('./route.js');

const authRoutes = require("./auth.js");

const app = express();
const port = 5000;




app.use(cors({
  origin: "*",  // allow all
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));




// Setup sessions using PostgreSQL
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  }
}));

// Parse JSON and form data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use main router
app.use("/api", authRoutes);
app.use('/api', apiV1);

const path = require('path');
const { initProductTables } = require('./Dashboard/ProductModel.js');

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get("/app/health", (req, res) => {
  res.send("app is healthy");
});

// Start server
app.listen(port, async () => {
  console.log(`app is running on port no ${port}`);
  await initProductTables();
});