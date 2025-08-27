const client = require('../client');

const OdometerAPI = async (req, res) => {
  try {
    console.info('Execution start');

    // Ensure 'year' is an integer
    if (req.query.year) {
      req.query.year = parseInt(req.query.year, 10);
      if (isNaN(req.query.year)) {
        return res.status(400).send({ message: 'Year must be a number' });
      }
    }

    const {
      make,
      model,
      year,
      limit = 30,
      page = 1
    } = req.query;

    const filters = [];
    const values = [];

    if (make) {
      values.push(make.toLowerCase());
      filters.push(`LOWER(car_companies.name) = $${values.length}`);
    }
    if (model) {
      values.push(model.toLowerCase());
      filters.push(`LOWER(cars.name) = $${values.length}`);
    }
    if (year) {
      values.push(year, year);
      filters.push(`(odometer_api.from_year IS NULL OR odometer_api.from_year <= $${values.length - 1})`);
      filters.push(`(odometer_api.to_year IS NULL OR odometer_api.to_year >= $${values.length})`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitIndex = values.push(limit);
    const offsetIndex = values.push(offset);

    // Main query
    const query = `
      SELECT 
        odometer_api.formula_metric,
        odometer_api.formula_imperial,
        odometer_api."formulaBased",
        odometer_api.generic,
        odometer_api."header",
        odometer_api.init,
        odometer_api.pid,
        odometer_api.protocol,
        odometer_api."subHeader",
        odometer_api."system",
        odometer_api.unit_metric,
        odometer_api.unit_imperial
      FROM odometer_api
      INNER JOIN car_companies ON car_companies.id = odometer_api.make_id
      LEFT JOIN cars ON cars.id = odometer_api.model_group_id
      ${whereClause}
      ORDER BY odometer_api.id
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const result = await client.query(query, values);

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM odometer_api
      INNER JOIN car_companies ON car_companies.id = odometer_api.make_id
      LEFT JOIN cars ON cars.id = odometer_api.model_group_id
      ${whereClause};
    `;
    const countResult = await client.query(countQuery, values.slice(0, values.length - 2));
    const total = parseInt(countResult.rows[0].total, 10);

    if (result.rows.length === 0) {
      return res.status(200).send({ data: [], total });
    }

    return res.status(200).send({
      data: result.rows,
      total
    });

  } catch (err) {
    console.error('Error encountered: ', err);
    return res.status(500).send({
      code: 500,
      message: 'Something went wrong'
    });
  }
};

module.exports = OdometerAPI;
