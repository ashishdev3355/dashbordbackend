const client = require("../client");

const SPFCommands = async (req, res) => {
  try {
    const { make, model, year, limit = 30, page = 1 } = req.query;

    

    const filters = [];
    const values = [];

    // Apply filters
    if (make) {
      values.push(make);
      filters.push(`cc.name = $${values.length}`);
    }
    if (model) {
      values.push(model);
      filters.push(`c.name = $${values.length}`);
    }
    if (year) {
      values.push(parseInt(year, 10));
      filters.push(`mac.from_year <= $${values.length} AND mac.to_year >= $${values.length}`);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitIndex = values.push(limit);
    const offsetIndex = values.push(offset);

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
      SELECT mac.pid, mac.command_type, mac.function_name, mac.variant_id, mac.subfunction,
             mac.message, mac.loop_flag, mac.loop_num, mac.input_format,
             mac.loop_pid_array, mac.input_map, mac.wait_pid,
             mac.input_encoding_formula, mac.hard_coded
      FROM "mechanic_SPF_commands_new" mac
      INNER JOIN cars c ON c.model_group_id = ANY(mac.model_group_id)
      INNER JOIN car_companies cc ON cc.id = mac.make_id
      ${whereClause}
      ORDER BY mac.function_name ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await client.query(query, values);

    // Group the results by function_name
    const groupedData = result.rows.reduce((acc, item) => {
      if (!acc[item.function_name]) {
        acc[item.function_name] = {
          hard_coded: item.hard_coded,
          details: [],
        };
      }
      acc[item.function_name].details.push(item);
      return acc;
    }, {});

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM "mechanic_SPF_commands_new" mac
      INNER JOIN cars c ON c.model_group_id = ANY(mac.model_group_id)
      INNER JOIN car_companies cc ON cc.id = mac.make_id
      ${whereClause}
    `;

    const countResult = await client.query(
      countQuery,
      values.slice(0, values.length - 2) // remove limit & offset
    );

    res.status(200).json({
      data: Object.keys(groupedData).map((function_name) => ({
        function_name,
        hard_coded: groupedData[function_name].hard_coded,
        details: groupedData[function_name].details,
      })),
      total: parseInt(countResult.rows[0].total, 10),
    });
  } catch (error) {
    console.error("Error fetching SPF commands:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = SPFCommands;
