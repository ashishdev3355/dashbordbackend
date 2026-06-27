


const client = require("../client");

const FetchMakeList = async (req, res) => {
  try {
    const { segement } = req.query;

    if (!segement) {
      return res.status(400).json({
        message: "segement is required",
      });
    }

    // Parse segment: could be a JSON array string like '["car","bike","hcv"]' or a plain string like 'car'
    let segments = [];
    try {
      const parsed = JSON.parse(segement);
      if (Array.isArray(parsed)) {
        segments = parsed;
      } else {
        segments = [parsed.toString()];
      }
    } catch (e) {
      segments = [segement];
    }

    // Build safe SQL without parameterized placeholders (required due to PgBouncer/protocol constraints)
    const safeParts = segments.map(s => `'${String(s).replace(/'/g, "''")}'`).join(', ');
    const query = `SELECT "name" FROM car_companies WHERE test=false AND segement IN (${safeParts})`;

    console.log("query =", query);

    const result = await client.query(query);

    if (result.rows.length > 0) {
      return res.status(200).json({
        data: result.rows,
      });
    } else {
      return res.status(404).json({
        message: "This segment doesn't exist",
      });
    }
  } catch (error) {
    console.error("Error fetching Coverage:", error);
    return res.status(500).json({
      code: 500,
      message: "Something went wrong",
    });
  }
};

module.exports = FetchMakeList;

