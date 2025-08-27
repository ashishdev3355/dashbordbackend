const client = require("../client");

const ActuationCommands = async (req, res) => {
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

    console.log("make, model, year" , make, model, year);
    

    const filters = [];
    const values = [];

    // Required filters
    if (make) {
      values.push(make);
      filters.push(`cc.name = $${values.length}`);
    }
    if (model) {
      values.push(model);
      filters.push(`c.name = $${values.length}`);
    }
    if (year) {
      values.push(year);
      filters.push(`mac.from_year <= $${values.length} AND mac.to_year >= $${values.length}`);
    }


    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitIndex = values.push(limit);
    const offsetIndex = values.push(offset);

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Query with paging
    const query = `
      SELECT 
        mac.actuation_type, 
        mac.pid, 
        mac.actuation_subtype, 
        mac.last_subtype, 
        mac.seed_key_variant, 
        mac.message, 
        mac.message_item, 
        mac.success_check
      FROM mechanic_actuation_command mac
      INNER JOIN cars c ON mac.model_group_id && ARRAY[c.model_group_id]
      INNER JOIN car_companies cc ON cc.id = mac.make_id
      ${whereClause}
      ORDER BY mac.id
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const result = await client.query(query, values);

    // Count query (without limit/offset)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM mechanic_actuation_command mac
      INNER JOIN cars c ON mac.model_group_id && ARRAY[c.model_group_id]
      INNER JOIN car_companies cc ON cc.id = mac.make_id
      ${whereClause};
    `;
    const countResult = await client.query(countQuery, values.slice(0, values.length - 2));
    const total = parseInt(countResult.rows[0].total, 10);

    if (result.rows.length === 0) {
      return res.status(404).send({ message: 'No data found' });
    }

    // Group data like original API
    const groupedData = result.rows.reduce((acc, item) => {
      if (!acc[item.actuation_type]) {
        acc[item.actuation_type] = {
          actuation_type: item.actuation_type,
          actuation_subtype: new Set(),
          message: '',
          details: []
        };
      }

      acc[item.actuation_type].details.push(item);

      if (item.actuation_subtype) {
        acc[item.actuation_type].actuation_subtype.add(item.actuation_subtype);
      }

      if (item.message_item === true) {
        acc[item.actuation_type].message = item.message;
      }

      return acc;
    }, {});

    const formattedData = Object.values(groupedData).map(group => ({
      actuation_type: group.actuation_type,
      actuation_subtype: Array.from(group.actuation_subtype),
      message: group.message,
      details: group.details
    }));

    return res.status(200).send({
      data: formattedData,
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

module.exports = ActuationCommands ;
