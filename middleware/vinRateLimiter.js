// middleware/vinRateLimiter.js
const db = require("../client");

let tableInitialized = false;

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress;
};

const initTable = async () => {
  if (tableInitialized) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS vin_requests (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_vin_requests_ip_time ON vin_requests(ip, request_time)
    `);
    tableInitialized = true;
  } catch (err) {
    console.error("Failed to initialize vin_requests table:", err);
  }
};

async function vinRateLimiter(req, res, next) {
  try {
    await initTable();
    const ip = getClientIp(req);

    // 1. Delete requests older than 24 hours to keep the table size small
    await db.query(`
      DELETE FROM vin_requests 
      WHERE request_time < NOW() - INTERVAL '24 hours'
    `);

    // 2. Count requests from this IP in the last 24 hours
    const checkResult = await db.query(`
      SELECT COUNT(*) AS count 
      FROM vin_requests 
      WHERE ip = $1 AND request_time > NOW() - INTERVAL '24 hours'
    `, [ip]);

    const requestCount = parseInt(checkResult.rows[0].count, 10);

    if (requestCount >= 5) {
      return res.status(429).json({
        message: "Too many requests. Maximum limit is 5 requests per day."
      });
    }

    // 3. Log the new request
    await db.query(`
      INSERT INTO vin_requests (ip) 
      VALUES ($1)
    `, [ip]);

    next();
  } catch (error) {
    console.error("Error in VIN rate limiter:", error);
    // Graceful fallback: If DB query fails, allow the request so service is not interrupted
    next();
  }
}

module.exports = vinRateLimiter;
