const client = require('../client');

const CustomCommands = async (req, res) => {
  try {
    console.info('Execution start');

    const { make, model, year, limit = 30, page = 1 } = req.query;

    // Ensure year is number
    let parsedYear = null;
    if (year) {
      parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear)) {
        return res.status(400).send({ message: 'Year must be a number' });
      }
    }

    const filters = [];
    const values = [];

    if (make) {
      values.push(make.toLowerCase());
      filters.push(`LOWER(cc.name) = $${values.length}`);
    }
    if (model) {
      values.push(model.toLowerCase());
      filters.push(`LOWER(c.name) = $${values.length}`);
    }
    if (parsedYear) {
      values.push(parsedYear, parsedYear);
      filters.push(`mcc.from_year <= $${values.length - 1} AND mcc.to_year >= $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const filterValues = [...values];
    const limitIndex = values.push(limit);
    const offsetIndex = values.push(offset);

    // Main query
    const query = `
      SELECT 
        mcc.command, 
        mcc.function_name, 
        mcc.variant,
        c.name AS car_name,
        cc.name AS company_name
      FROM mechanic_custom_commands mcc
      INNER JOIN car_companies cc ON cc.id = mcc.make_id
      INNER JOIN cars c ON c.model_group_id = mcc.model_group_id
      ${whereClause}
      ORDER BY mcc.id
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const result = await client.query(query, values);

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM mechanic_custom_commands mcc
      INNER JOIN car_companies cc ON cc.id = mcc.make_id
      INNER JOIN cars c ON c.model_group_id = mcc.model_group_id
      ${whereClause};
    `;
    const countResult = await client.query(countQuery, filterValues);
    const total = parseInt(countResult.rows[0].total, 10);

    if (result.rows.length === 0) {
      return res.status(200).send({ data: [], total });
    }

    // Group by function_name
    const groupedByFunction = result.rows.reduce((acc, command) => {
      if (!acc[command.function_name]) {
        acc[command.function_name] = {
          function_name: command.function_name,
          variant: new Set(),
          commands: {},
          make: command.company_name,   // add make
          model: command.car_name       // add model
        };
      }

      acc[command.function_name].variant.add(command.variant);

      if (!acc[command.function_name].commands[command.variant]) {
        acc[command.function_name].commands[command.variant] = new Set();
      }

      acc[command.function_name].commands[command.variant].add(command.command);

      return acc;
    }, {});

    const formattedData = Object.values(groupedByFunction).map(group => ({
      function_name: group.function_name,
      make: group.make,
      model: group.model,
      variant: Array.from(group.variant),
      commands: [
        Object.fromEntries(
          Object.entries(group.commands).map(([variant, commandSet]) => [
            variant,
            Array.from(commandSet)
          ])
        )
      ]
    }));

    return res.status(200).send({ data: formattedData, total });

  } catch (err) {
    console.error('Error encountered: ', err);
    return res.status(500).send({
      code: 500,
      message: 'Something went wrong'
    });
  }
};

module.exports = CustomCommands;
