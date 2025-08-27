// const express = require('express');
// const router = express.Router();
// const client = require('../client'); // PostgreSQL client


// router.get('/users', async (req, res) => {
//   try {
//   const { email, plan, status,limit = 30, page = 1} = req.query;

//         const filters = [];
//         const values = [];

//         if(email){
//             values.push(`%${email}%`);
//             filters.push(`u.email ILIKE $${values.length}`);
//         }

//         if(plan){
//             values.push(`%${plan}%`);
//             filters.push(`p.plan =  $${values.length}`);
//         }
//         if(status){
//             values.push(`%${status}%`);
//             filters.push(`us.status =  $${values.length}`);
//         }


//          const offset = (parseInt(page) - 1) * parseInt(limit);
//         // values.push(limit,offset);
//         const limitIndex = values.push(limit);
//         const offsetIndex = values.push(offset);

//         const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

//     const query = `
//       SELECT 
//         u.*, 
//         us.*, 
//         p.plan AS subscription_plan
//       FROM users u
//       LEFT JOIN user_subscriptions us 
//         ON u.id = us.user_id
//       LEFT JOIN subscription_plans p 
//         ON us.plan_id = p.id
//       ${whereClause}
//       ORDER BY u.email ASC
//       LIMIT $${limitIndex} OFFSET $${offsetIndex}
//     `;

//     const result = await client.query(query, values);

//     // Exclude specific fields from each user record
//     const sanitizedUsers = result.rows.map(user => {
//       const {
//         token,
//         purchase_token,
//         photo_url,
//         user_type,
//         id,
//         acknowledged,
//         cancel_reason,
//         google_uid,
//         ...rest
//       } = user;

//       return rest;
//     });


//     const countQuery = `
//     SELECT COUNT(*) AS total FROM 
//     users u
//       LEFT JOIN user_subscriptions us 
//         ON u.id = us.user_id
//       LEFT JOIN subscription_plans p 
//         ON us.plan_id = p.id
//         ${whereClause}`

//       const countResult = await client.query(countQuery,values.slice(0,values.length - 2));

//     res.status(200).json({
//        users: sanitizedUsers,
//         total : parseInt(countResult.rows[0].total,10)
//        });

//   } catch (error) {
//     console.error('Error fetching users:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// module.exports = router;









// Dashboard/user-detail.js
const client = require('../client'); // PostgreSQL client

const getUsers = async (req, res) => {
  try {
    const { email, plan, status, limit = 30, page = 1 } = req.query;

    const filters = [];
    const values = [];

    if (email) {
      values.push(`%${email}%`);
      filters.push(`u.email ILIKE $${values.length}`);
    }

    if (plan) {
      values.push(`%${plan}%`);
      filters.push(`p.plan =  $${values.length}`);
    }

    if (status) {
      values.push(`%${status}%`);
      filters.push(`us.status =  $${values.length}`);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitIndex = values.push(limit);
    const offsetIndex = values.push(offset);

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Main query
    const query = `
      SELECT 
        u.*, 
        us.*, 
        p.plan AS subscription_plan
      FROM users u
      LEFT JOIN user_subscriptions us 
        ON u.id = us.user_id
      LEFT JOIN subscription_plans p 
        ON us.plan_id = p.id
      ${whereClause}
      ORDER BY u.email ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await client.query(query, values);

    // Exclude specific fields
    const sanitizedUsers = result.rows.map(user => {
      const {
        token,
        purchase_token,
        photo_url,
        user_type,
        id,
        acknowledged,
        cancel_reason,
        google_uid,
        ...rest
      } = user;
      return rest;
    });

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM users u
      LEFT JOIN user_subscriptions us 
        ON u.id = us.user_id
      LEFT JOIN subscription_plans p 
        ON us.plan_id = p.id
      ${whereClause}
    `;

    const countResult = await client.query(
      countQuery,
      values.slice(0, values.length - 2) // exclude limit/offset
    );

    res.status(200).json({
      users: sanitizedUsers,
      total: parseInt(countResult.rows[0].total, 10)
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = getUsers;
