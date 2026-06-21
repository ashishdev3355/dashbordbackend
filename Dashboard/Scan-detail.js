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

    // 🔍 Dynamic filters
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

    // 🔢 Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    values.push(limit);
    values.push(offset);

    // WHERE clause
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // ✅ Main query
    const query = `
      SELECT
        scan.*,
        u.email,
        u.country_id,
        bt.device_name AS bluetooth_device
      FROM mode_alls_new scan
      LEFT JOIN users u ON u.id = scan.user_id
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) user_id, device_name
        FROM bluetooth_devices
        ORDER BY user_id, created_at DESC
      ) bt ON bt.user_id = scan.user_id
      ${whereClause}
      ORDER BY scan.id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await client.query(query, values);

    // ✅ Count query (without limit & offset)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM mode_alls_new scan
      LEFT JOIN users u ON u.id = scan.user_id
      ${whereClause}
    `;

    const countValues = values.slice(0, values.length - 2);
    const countResult = await client.query(countQuery, countValues);

    // ✅ Sanitize output
    // const sanitizedScan = result.rows.map(({ id, scan_id, user_id, ...rest }) => rest);
    const sanitizedScan = result.rows.map(({ user_id, ...rest }) => rest);
    // console.log("sanitizedScan",sanitizedScan);
    

    res.status(200).json({
      scans: sanitizedScan,
      total: parseInt(countResult.rows[0].total, 10),
      currentPage: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (error) {
    console.error('Error fetching scan details:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = ScanDetail;
