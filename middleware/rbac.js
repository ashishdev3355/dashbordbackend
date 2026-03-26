const pool = require("../client");

async function rbacMiddleware(req, res, next) {
  try {
    const userRole = req.user?.role_id;
    if (!userRole) {
      return res.status(403).json({ error: "Access denied. No role assigned." });
    }

    // Build current API string: METHOD_ROUTE
    // For Express, req.route.path gives the route pattern like /api/users/:id
    let reqPath = req.route ? req.route.path : req.path;
    // ensure we don't include base path if it's already in the route, but usually it's fine.
    // e.g., if mounted to '/api', req.originalUrl could be used. But we'll stick to mount-relative path.
    const currentApi = `${req.method}_${reqPath}`;

    // Query database for permissions
    const { rows } = await pool.query(
      "SELECT api FROM role_permissions WHERE role_id = $1",
      [userRole]
    );

    // Check if any rule matches
    const isAllowed = rows.some((row) => {
      // Allow if wildcard
      if (row.api === "*") return true;

      // Exact match
      if (row.api === currentApi) return true;

      // Handle wildcard route pattern in DB like GET_/api/users/*
      if (row.api.endsWith("/*")) {
        const prefix = row.api.slice(0, -2); // remove "/*"
        if (currentApi.startsWith(prefix)) return true;
      }

      return false;
    });

    if (isAllowed) {
      next();
    } else {
      res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
  } catch (error) {
    console.error("RBAC error:", error);
    res.status(500).json({ error: "Internal server error during authorization." });
  }
}

module.exports = rbacMiddleware;
