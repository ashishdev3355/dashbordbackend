const client = require("../client");

const ScanDetail = async (req, res) => {
  try {
    const {
      email,
      make,
      model,
      license_plate,
      country_id,
      type,
      app_version,
      scan_start_time,
      scan_end_time,
      limit = 30,
      page = 1
    } = req.query;

    const filters = [];
    const values = [];

    // Optional filters
    if (email) {
      values.push(`%${email}%`);
      filters.push(`u.email ILIKE $${values.length}`);
    }
    if (make) {
      values.push(`%${make}%`);
      filters.push(`scan.make ILIKE $${values.length}`);
    }
    if (model) {
      values.push(`%${model}%`);
      filters.push(`scan.model ILIKE $${values.length}`);
    }
    if (license_plate) {
      values.push(`%${license_plate}%`);
      filters.push(`scan.license_plate ILIKE $${values.length}`);
    }
    if (country_id) {
      values.push(country_id);
      filters.push(`u.country_id = $${values.length}`);
    }
    if (type) {
      values.push(type);
      filters.push(`scan.type = $${values.length}`);
    }
    if (app_version) {
      values.push(app_version);
      filters.push(`scan.app_version = $${values.length}`);
    }
    if (scan_start_time) {
      values.push(scan_start_time);
      filters.push(`scan.scan_start_time >= $${values.length}`);
    }
    if (scan_end_time) {
      values.push(scan_end_time);
      filters.push(`scan.scan_end_time <= $${values.length}`);
    }

    // not undesting this 
    // Pagination logic
    const offset = (parseInt(page) - 1) * parseInt(limit);
    values.push(limit, offset);

    // Base query with filters
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
      SELECT
        scan.*,
        u.email,
        u.country_id
      FROM users u
      LEFT JOIN mode_alls_new scan
        ON u.id = scan.user_id
      ${whereClause}
      ORDER BY scan.user_id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await client.query(query, values);

    // Total count for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM users u
      LEFT JOIN mode_alls_new scan
        ON u.id = scan.user_id
      ${whereClause}
    `;

    const countResult = await client.query(countQuery, values.slice(0, values.length - 2));

    // Remove unnecessary fields
    const sanitizedScan = result.rows.map(({ id, scan_id, user_id, ...rest }) => rest);

    res.status(200).json({
      scans: sanitizedScan,
      total: parseInt(countResult.rows[0].total, 10)
    });

  } catch (error) {
    console.error('Error fetching scan details:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = ScanDetail;




