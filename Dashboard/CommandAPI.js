const client = require('../client');

const CommandAPI = async (req, res) => {
  try {
    console.info('Execution start');
    const {
      make,
      function_type,
      module,
      full_scan = 'false'
    } = req.query;

    if (!make || !function_type) {
      return res.status(400).send({
        message: 'Both "make" and "function_type" are required'
      });
    }

    let query;
    let values = [];

    if (full_scan === 'false') {
      // Convert module into array if passed as string
      let modulesArray = module;
      if (typeof modulesArray === 'string') {
        try {
          modulesArray = JSON.parse(modulesArray);
        } catch {
          modulesArray = [modulesArray];
        }
      }

      query = `
        SELECT command, module
        FROM mechanic_commands
        INNER JOIN car_companies ON car_companies.id = mechanic_commands.make_id
        WHERE mechanic_commands.function_type = $2
        AND LOWER(car_companies.name) = $1
        AND mechanic_commands.module = ANY($3::text[])
        AND mechanic_commands.full_scan = $4
        ORDER BY mechanic_commands.id
      `;
      values = [make.toLowerCase(), function_type, modulesArray, full_scan];
    } else {
      // Full scan mode, ignore modules
      query = `
        SELECT command, module
        FROM mechanic_commands
        INNER JOIN car_companies ON car_companies.id = mechanic_commands.make_id
        WHERE mechanic_commands.function_type = $2
        AND LOWER(car_companies.name) = $1
        AND mechanic_commands.full_scan = $3
        ORDER BY mechanic_commands.id
      `;
      values = [make.toLowerCase(), function_type, full_scan];
    }

    console.log('query = ', query);
    console.log('values = ', values);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(200).send({ data: [] });
    }

    return res.status(200).send({
      data: result.rows
    });

  } catch (err) {
    console.error('Error encountered: ', err);
    return res.status(500).send({
      code: 500,
      message: 'Something went wrong'
    });
  }
};

module.exports = CommandAPI;
