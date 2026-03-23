const { Pool } = require('pg');
const pool = new Pool(
  {
    //  connectionString: `postgressql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@localhost:5432/${process.env.DB_NAME}`

    connectionString: `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@13.202.193.4:15432/${process.env.DB_NAME}`


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

