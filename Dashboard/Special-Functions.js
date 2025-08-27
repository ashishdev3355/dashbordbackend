const client = require("../client");

const SpecialFunctions = async (req,res) => {
    try {
        const {email,make,module,model,function_type,command_type,item_number,variant, license_plate,scan_ended,hard_coded,scan_start_time,scan_end_time, limit = 30,page = 1} = req.query;

        const filters = [];
        const values = [];

        if(email){
            values.push(`%${email}%`);
            filters.push(`u.email ILIKE $${values.length}`);
        }
        if (make) {
        values.push(`%${make}%`);
        filters.push(`sp.make ILIKE $${values.length}`);
        }
        if (module) {
        values.push(`%${module}%`);
        filters.push(`sp.module ILIKE $${values.length}`);
        }
        if(model){
            values.push(`%${model}%`);
            filters.push(`sp.model ILIKE $${values.length}`);
        }
        if(function_type){
            values.push(`%${function_type}%`);
            filters.push(`sp.function_type ILIKE $${values.length}`);
        }
        if(command_type){
            values.push(`%${command_type}%`);
            filters.push(`sp.command_type ILIKE $${values.length}`);
        }
        if(item_number){
            values.push(item_number);
            filters.push(`sp.item_number = $${values.length}`);
        }
        if(variant){
            values.push(`%${variant}%`);
            filters.push(`sp.variant ILIKE $${values.length}`);
        }

        if (license_plate) {
        values.push(`%${license_plate}%`);
        filters.push(`sp.license_plate ILIKE $${values.length}`);
        }
        if (scan_ended) {
        values.push(`%${scan_ended}%`);
        filters.push(`sp.scan_ended ILIKE $${values.length}`);
        }
    
         if (hard_coded) {
        values.push(hard_coded);
        filters.push(`sp.hard_coded = $${values.length}`);
        }
         if (scan_start_time) {
        values.push(scan_start_time);
        filters.push(`sp.scan_start_time >= $${values.length}`);
        }
        if (scan_end_time) {
        values.push(scan_end_time);
        filters.push(`sp.scan_end_time <= $${values.length}`);
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        // values.push(limit,offset);
        const limitIndex = values.push(limit);
        const offsetIndex = values.push(offset);

        const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

        const query = `
        SELECT 
          sp.*,
          u.email AS user_email
          FROM mode_alls_spf sp
          LEFT JOIN users u 
          ON u.id = sp.user_id
          ${whereClause}
          ORDER BY sp.scan_start_time DESC
          LIMIT $${limitIndex} OFFSET $${offsetIndex}
          `;

        const result = await client.query(query,values);

        const countQuery = `
        SELECT COUNT(*) AS total
        FROM users u 
        LEFT JOIN mode_alls_SPF sp
        ON u.id = sp.user_id
        ${whereClause}`;

        const countResult = await client.query(countQuery,values.slice(0,values.length - 2));

        const sanitizedSP = result.rows.map(({id,scan_id,user_id,...rest}) => rest);

        res.status(200).json({
            scans : sanitizedSP,
            total : parseInt(countResult.rows[0].total,10)
        })

        
    } catch (error) {
        console.error("Error fetching scan details:",error);
        res.status(500).json({error : "Internal Server Error"});
    }
}

module.exports = SpecialFunctions;