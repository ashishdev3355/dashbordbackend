const client = require("../client");

const ActuationsDetail = async(req,res) => {
    try {
        
        const {email,make,model,input,actuation_option,actuation_type,user_car_model_id, limit = 30, page = 1} = req.query;

        const filters = [];
        const values = [];

        if(email){
            values.push(`%${email}%`);
            filters.push(`u.email ILIKE $${values.length}`);
        }
        if(make){
            values.push(`%${make}%`);
            filters.push(`ma.make ILIKE $${values.length}`);
        }
        if(model){
            values.push(`%${model}%`);
            filters.push(`ma.model ILIKE $${values.length}`);
        }
        if(input){
            values.push(`%${input}%`);
            filters.push(`ma.input ILIKE $${values.length}`);
        }
        if(actuation_type){
            values.push(`%${actuation_type}%`);
            filters.push(`ma.actuation_type ILIKE $${values.length}`);
        }
        if(actuation_option){
            values.push(`%${actuation_option}%`);
            filters.push(`ma.actuation_option ILIKE $${values.length}`);
        }
        if(user_car_model_id){
            values.push(user_car_model_id);
            filters.push(`ma.user_car_model_id = $${values.length}`);     
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const limitIndex = values.push(limit);
        const offsetIndex = values.push(offset);

        const whereClause = filters.length ? `WHERE ${filters.join(" AND ")} ` : "";

        const query = `
        SELECT
        ma.*,
        u.email AS user_email
        FROM mechanic_actuations ma
        LEFT JOIN users u
        ON u.id =  ma.user_id
        ${whereClause}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `;

        const result = await client.query(query,values);

        const countQuery = `
        SELECT COUNT(*) AS total 
        FROM mechanic_actuations ma
        LEFT JOIN users u
        ON u.id = ma.user_id
        ${whereClause}
        `;

        const countResult = await client.query(countQuery,values.slice(0,
            values.length - 2));
        
        const sanitizedMA = result.rows.map(({id,user_id,...rest}) => rest)

        res.status(200).json({
            actuations : sanitizedMA,
            total : parseInt(countResult.rows[0].total,10)
        })

    } catch (error) {
        console.error("Error fetching Actuations Detail :",error);
        res.status(500).json({error : "Internal Server Error"});
    }
}

module.exports = ActuationsDetail;
