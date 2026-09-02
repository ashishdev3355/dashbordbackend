const { Pool } = require('pg');

const dbHost = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? process.env.DB_HOST : '127.0.0.1';
const dbPort = process.env.DB_PORT || '15432';

const pool = new Pool({
  connectionString: `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${dbHost}:${dbPort}/${process.env.DB_NAME}`
});

module.exports = {
  pool,
  query: async (text, params = []) => {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('executed query', JSON.stringify({ text, duration, rows: res.rowCount }));
      return res;
    }
    catch (err) {
      console.log("Error encountered in DB query");
      console.log(err);
      throw err;
    }
  }
};