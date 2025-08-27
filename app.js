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

const app = express();
const port = 3000;

// CORS Configuration - FIXED (removed problematic app.options line)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// REMOVED: app.options('*', cors()); // This was causing the path-to-regexp error

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
app.use('/', apiV1);

// Health check endpoint
app.get("/app/health", (req, res) => {
  res.send("app is healthy");
});

// Start server
app.listen(port, () => {
  console.log(`app is running on port no ${port}`);
});