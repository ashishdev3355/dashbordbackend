
const client = require('../client');

const  FaultCodeCauses = async(req,res) =>  {
    try {

        const {dtc,make,generic,limit = 30, page = 1} = req.query;
        const filters = [];
        const values = [];

        if(dtc){
            values.push(`%${dtc}%`);
            filters.push(`f.dtc ILIKE $${values.length}`);
        }

        if(make){
            values.push(`%${make}%`);
            filters.push(`f.make ILIKE $${values.length}`);
        }

        // type is bool
        if(generic !== undefined){
            const boolVal = generic === "true";
            values.push(boolVal);
            filters.push(`f.generic = $${values.length}`)
        }

         // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        values.push(limit);
        const limitIndex = values.length;
        values.push(offset);
        const offsetIndex = values.length;


        const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
        
        const query = `
        SELECT 
        f.* FROM my_fault_code_causes f
        ${whereClause}
        ORDER BY f.make ASC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `;

        const result = await client.query(query,values); 

        const countQuery = `
         SELECT 
        COUNT(*) AS total FROM my_fault_code_causes f
        ${whereClause}
        `
        const countResult = await client.query(countQuery,values.slice(0,values.length - 2))

        res.status(200).json({
            data : result.rows,
            total : parseInt(countResult.rows[0].total,10)
        });

    } catch (error) {
        console.error("Error fetching fault codes causes", error);
        res.status(500).json({error : "Internal Server Error"});
        
    }
    
}

module.exports =  FaultCodeCauses;
