const client = require("../client");

const ModelList = async (req, res) => {
  try {
    const { make } = req.query;

    if (!make) {
      return res.status(400).json({ message: "Make is required" });
    }

    const query = `
      SELECT cars.name
      FROM cars
      INNER JOIN car_companies ON car_companies.id = cars.car_company_id
      WHERE car_companies.name = $1
    `;

    const values = [make];

    console.log("query =", query);
    console.log("values =", values);

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      return res.status(200).json({
        data: result.rows,
      });
    } else {
      return res.status(404).json({
        message: "This make doesn't exist",
      });
    }
  } catch (error) {
    console.error("Error fetching coverage:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

module.exports = ModelList;
