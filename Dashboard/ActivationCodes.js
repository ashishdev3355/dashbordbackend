const client = require('../client'); // PostgreSQL client

const getActivationCodes = async (req, res) => {
  try {
    const { user_id, plan, limit = 50, page = 1 } = req.query;

    const filters = [];
    const values = [];

    if (user_id) {
      values.push(user_id);
      filters.push(`user_id = $${values.length}`);
    }

    if (plan) {
      values.push(`%${plan}%`);
      filters.push(`plan ILIKE $${values.length}`);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitIndex = values.push(limit);
    const offsetIndex = values.push(offset);

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Main query
    const query = `
      SELECT *
      FROM activation_codes_new
      ${whereClause}
      ORDER BY serial DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await client.query(query, values);

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM activation_codes_new
      ${whereClause}
    `;

    const countResult = await client.query(
      countQuery,
      values.slice(0, values.length - 2) // exclude limit/offset
    );

    res.status(200).json({
      activation_codes: result.rows,
      total: parseInt(countResult.rows[0].total, 10)
    });

  } catch (error) {
    console.error('Error fetching activation codes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = getActivationCodes;
