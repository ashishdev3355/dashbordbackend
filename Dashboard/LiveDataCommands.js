const client = require("../client");

const LiveDataCommands = async (req, res) => {
  try {
    console.info("Execution start");
    console.log("Query params:", req.query); // Debug log
    
    const { make, model, module, limit = 30, page = 1 } = req.query;

    const filters = [];
    const values = [];

    if (make && make.trim()) {
      values.push(`%${make.trim()}%`);
      filters.push(`car_companies.name ILIKE $${values.length}`);
    }

    if (model && model.trim()) {
      values.push(`%${model.trim()}%`);
      filters.push(`cars.name ILIKE $${values.length}`);
    }

    if (module && module.trim()) {
      values.push(module.trim());
      filters.push(`mldc.system = $${values.length}`); // Make sure this column exists
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Pagination - fix potential issues
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 30);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    // Store filter values length before adding pagination params
    const filterValuesLength = values.length;
    
    values.push(parsedLimit);
    values.push(offset);
    
    const limitIndex = values.length - 1;
    const offsetIndex = values.length;

    const query = `
      SELECT 
        mldc.name,
        mldc.pid,
        mldc.header,
        mldc."subHeader",
        mldc.protocol,
        mldc.formula_metric,
        mldc.formula_imperial,
        mldc.unit_metric,
        mldc.unit_imperial,
        mldc."formulaBased",
        mldc."referenceJSON",
        cars.name AS model,
        car_companies.name AS make
      FROM mechanic_live_data_commands mldc
      INNER JOIN cars ON cars.model_group_id = mldc.model_group_id
      INNER JOIN car_companies ON car_companies.id = cars.car_company_id
      ${whereClause}
      ORDER BY mldc.id
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    console.log("Query:", query);
    console.log("Values:", values);

    const result = await client.query(query, values);

    // Count query (use only filter values, not pagination params)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM mechanic_live_data_commands mldc
      INNER JOIN cars ON cars.model_group_id = mldc.model_group_id
      INNER JOIN car_companies ON car_companies.id = cars.car_company_id
      ${whereClause};
    `;
    
    const countValues = values.slice(0, filterValuesLength);
    console.log("Count query:", countQuery);
    console.log("Count values:", countValues);
    
    const countResult = await client.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total, 10);

    console.log(`Found ${result.rows.length} items out of ${total} total`);

    return res.status(200).send({
      data: result.rows,
      total,
      page: parsedPage,
      limit: parsedLimit,
      filters: { make, model, module } // Debug info
    });
  } catch (error) {
    console.error("Error encountered: ", error);
    return res.status(500).send({
      code: 500,
      message: "Something went wrong",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = LiveDataCommands;