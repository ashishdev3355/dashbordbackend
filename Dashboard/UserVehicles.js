const client = require('../client');

// Lists the vehicles counted against a user's plan, found by the user's email
const getUserVehicles = async (req, res) => {
  const email = String(req.query.email ?? '').trim();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const users = await client.query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    if (users.rows.length === 0) {
      return res.status(404).json({ error: 'No user found with this email' });
    }

    const user = users.rows[0];
    const vehicles = await client.query(
      `SELECT id, vehicle_type, plan_kind, vin, make, model, year, created_at, last_used_at, removed_at, removed_by
       FROM user_vehicles
       WHERE user_id = $1
       ORDER BY removed_at IS NOT NULL, vehicle_type, plan_kind, id`,
      [user.id]
    );

    return res.status(200).json({ user, vehicles: vehicles.rows });
  } catch (error) {
    console.error('Error fetching user vehicles:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Frees the vehicle's slot. The row stays as a record of who removed it and when.
const removeUserVehicle = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid vehicle id' });
  }

  try {
    const result = await client.query(
      `UPDATE user_vehicles SET removed_at = NOW(), removed_by = $2
       WHERE id = $1 AND removed_at IS NULL
       RETURNING id`,
      [id, req.user.email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or already removed' });
    }
    return res.status(200).json({ message: 'Vehicle removed' });
  } catch (error) {
    console.error('Error removing user vehicle:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getUserVehicles, removeUserVehicle };
