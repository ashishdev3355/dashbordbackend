


const client = require("../client");

const FetchMakeList = async (req, res) => {
  try {
    const { segement } = req.query;

    if (!segement) {
      return res.status(400).json({
        message: "segement is required",
      });
    }

    const query = `SELECT "name" FROM car_companies WHERE test=false AND segement=$1`;
    const values = [segement];

    console.log("query =", query);
    console.log("values =", values);

    const result = await client.query(query, values);

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
