const client = require("../client");

const fetch_coverage = async (req, res) => {
  try {
    const { make } = req.query;

    if (!make || typeof make !== 'string' || make.trim().length === 0) {
      return res.status(400).json({
        message: "must have required property 'make' and it must be a non-empty string"
      });
    }

    const query = `SELECT function_name, function_type FROM coverages WHERE make=$1`;
    const values = [make];

    console.log('query = ', query);
    console.log('values =', values);

    const queryRes = await client.query(query, values);
    
    if (queryRes.rows.length > 0) {
      return res.status(200).json({
        data: queryRes.rows
      });
    } else {
      return res.status(404).json({
        message: "This make doesn't exist"
      });
    }
  } catch (err) {
    console.error("Error in fetch_coverage:", err);
    return res.status(500).json({
      code: 500,
      message: 'something went wrong'
    });
  }
};

module.exports = fetch_coverage;
