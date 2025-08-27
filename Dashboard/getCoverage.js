const client = require('../client');

const getCoverage = async (req, res) => {
  try {
    const { make, limit = 30, page = 1 } = req.query;

    let whereClause = '';
    const values = [];

    if (make) {
      whereClause = 'WHERE make ILIKE $1';
      values.push(`%${make}%`);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    values.push(limit);
    values.push(offset);

    const query = `
      SELECT function_name, function_type
      FROM coverages ${whereClause}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    console.log('query =', query);
    console.log('values =', values);

    const queryRes = await client.query(query, values);

    // Count query (without limit/offset)
    const countValues = make ? [`%${make}%`] : [];
    const countQuery = `SELECT COUNT(*) AS total FROM coverages ${whereClause}`;
    const countResult = await client.query(countQuery, countValues);

    res.status(200).json({
      coverages: queryRes.rows,
      total: parseInt(countResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error fetching Get Coverage:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = getCoverage;
