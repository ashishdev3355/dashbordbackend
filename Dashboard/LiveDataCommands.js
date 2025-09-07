const client = require("../client");

const LiveDataCommands = async (req, res) => {
  try {
    console.info("Execution start");
    const { make, model, module, limit = 30, page = 1 } = req.query;

    const filters = [];
    const values = [];

    if (make) {
      values.push(`%${make}%`);
      filters.push(`car_companies.name ILIKE $${values.length}`);
    }

    if (model) {
      values.push(`%${model}%`);
      filters.push(`cars.name ILIKE $${values.length}`);
    }

    if (module) {
      values.push(module);
      filters.push(`mldc.system = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Pagination
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10) ;
    const offset = (parsedPage - 1) * parsedLimit;

    const limitIndex = values.push(parsedLimit);
    const offsetIndex = values.push(offset);

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

    const result = await client.query(query, values);

    // Count query (reuse same filters without pagination)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM mechanic_live_data_commands mldc
      INNER JOIN cars ON cars.model_group_id = mldc.model_group_id
      INNER JOIN car_companies ON car_companies.id = cars.car_company_id
      ${whereClause};
    `;
    const countResult = await client.query(countQuery, values.slice(0, values.length - 2));
    const total = parseInt(countResult.rows[0].total, 10);

    return res.status(200).send({
      data: result.rows,
      total,
      page: parsedPage,
      limit: parsedLimit
    });
  } catch (error) {
    console.error("Error encountered: ", error);
    return res.status(500).send({
      code: 500,
      message: "Something went wrong"
    });
  }
};

module.exports = LiveDataCommands;
