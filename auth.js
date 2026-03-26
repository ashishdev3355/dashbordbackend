const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const pool = require("./client");
const requireAuth = require("./middleware/tokenverfy.js");

const router = express.Router();

// ----------------- SIGNUP -----------------
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;



  
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM deshbord_users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      "INSERT INTO deshbord_users (email, password_hash, role_id) VALUES ($1, $2, '2') RETURNING id, email, role_id",
      [email, hashedPassword]
    );

    const user = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Signup successful",
      user: { id: user.id, email: user.email, role_id: user.role_id },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------- LOGIN -----------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await pool.query(
      "SELECT * FROM deshbord_users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      user: { 
        id: user.id, 
        email: user.email, 
        role_id: user.role_id,
        must_change_password: user.must_change_password
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------- ADMIN ROUTES -----------------
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role_id === '1') {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Admin permissions required." });
  }
};

router.get("/admin/users", requireAuth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.role_id, r.name as role_name 
       FROM deshbord_users u 
       LEFT JOIN roles r ON u.role_id = r.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/users/:id/role", requireAuth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { role_id } = req.body;
  
  if (!role_id) {
    return res.status(400).json({ error: "role_id is required" });
  }

  try {
    const result = await pool.query(
      "UPDATE deshbord_users SET role_id = $1 WHERE id = $2 RETURNING id, email, role_id",
      [role_id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ message: "User role updated successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 1. Send OTP
router.post("/admin/send-otp", requireAuth, isAdmin, async (req, res) => {
  let { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  email = email.trim();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes

  try {
    // Upsert OTP
    await pool.query(
      `INSERT INTO otp_verifications (email, otp, expires_at, is_verified, attempts) 
       VALUES ($1, $2, $3, false, 0) 
       ON CONFLICT (email) DO UPDATE SET otp = $2, expires_at = $3, is_verified = false, attempts = 0`,
      [email, otp, expiresAt]
    );

    // Send email
    await sendEmail(
      email,
      "Your Verification Code",
      `Your verification code is: ${otp}`,
      `<h3>Verification Code</h3><p>Your verification code is: <strong>${otp}</strong></p><p>This code will expire in 5 minutes.</p>`
    );

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    // If table doesn't have unique constraint, fallback to simple insert
    if (err.code === '23505' || err.message.includes('unique constraint')) {
       // Should have handled with ON CONFLICT, but if missing constraint:
       await pool.query("DELETE FROM otp_verifications WHERE email = $1", [email]);
       await pool.query(
         "INSERT INTO otp_verifications (email, otp, expires_at) VALUES ($1, $2, $3)",
         [email, otp, expiresAt]
       );
       res.json({ message: "OTP sent successfully" });
    } else {
      console.error("Send OTP error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// 2. Verify OTP
router.post("/admin/verify-otp", requireAuth, isAdmin, async (req, res) => {
  let { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });
  email = email.trim();

  try {
    const result = await pool.query(
      "SELECT * FROM otp_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No OTP found for this email" });
    }

    const record = result.rows[0];

    if (record.attempts >= 3) {
      return res.status(400).json({ error: "Too many attempts. Please request a new OTP." });
    }

    if (new Date() > record.expires_at) {
      return res.status(400).json({ error: "OTP expired" });
    }

    if (record.otp !== otp) {
      await pool.query("UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1", [record.id]);
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await pool.query("UPDATE otp_verifications SET is_verified = true WHERE id = $1", [record.id]);
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Create User (Secure)
router.post("/admin/create-user", requireAuth, isAdmin, async (req, res) => {
  let { email, password, role_id } = req.body;
  if (!email || !role_id) {
    return res.status(400).json({ error: "Email and role_id are required" });
  }
  email = email.trim();

  try {
    // Check if email is verified
    const otpResult = await pool.query(
      "SELECT * FROM otp_verifications WHERE email = $1 AND is_verified = true ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: "Email not verified. Please verify via OTP first." });
    }

    // Check if user already exists
    const existingUser = await pool.query("SELECT id FROM deshbord_users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Check if role exists
    const roleCheck = await pool.query("SELECT id FROM roles WHERE id = $1", [role_id]);
    if (roleCheck.rows.length === 0) {
      return res.status(400).json({ error: "Invalid role_id" });
    }

    // Generate random 8 char password if none provided
    const userPassword = password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    const result = await pool.query(
      "INSERT INTO deshbord_users (email, password_hash, role_id, must_change_password) VALUES ($1, $2, $3, true) RETURNING id, email, role_id",
      [email, hashedPassword, role_id]
    );

    // Send credentials via email
    await sendEmail(
      email,
      "Your Account Credentials",
      `Hello, your account has been created. Email: ${email}, Password: ${userPassword}. Please change your password on first login.`,
      `<h3>Account Created</h3><p>Hello, your account has been created.</p><p><strong>Email:</strong> ${email}</p><p><strong>Password:</strong> ${userPassword}</p><p>Please login and change your password.</p>`
    );

    // Cleanup OTP
    await pool.query("DELETE FROM otp_verifications WHERE email = $1", [email]);

    res.status(201).json({
      message: "User created successfully",
      credentials: { email, password: userPassword, role_id },
      user: result.rows[0]
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to fetch all roles
router.get("/admin/roles", requireAuth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name FROM roles ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch roles error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Change Password (Forced)
router.post("/auth/change-password", requireAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE deshbord_users SET password_hash = $1, must_change_password = false WHERE id = $2",
      [hashedPassword, req.user.id] // req.user.id comes from requireAuth middleware
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. Delete User
router.delete("/admin/users/:id", requireAuth, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user is trying to delete themselves
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ error: "You cannot delete your own admin account" });
    }

    const result = await pool.query(
      "DELETE FROM deshbord_users WHERE id = $1 RETURNING id, email",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
