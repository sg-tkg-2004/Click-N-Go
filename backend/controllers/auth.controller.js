const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// @desc    Register a new user (Customer or Provider)
// @route   POST /api/auth/register
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    // 1. Basic Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Please provide name, email, password, and role' });
    }

    if (!['CUSTOMER', 'PROVIDER'].includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Role must be CUSTOMER or PROVIDER' });
    }

    // 2. Hash Password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Raw SQL Transaction: Insert into users
    // (We use _users because the 'users' view might not be updatable without a rule depending on Postgres version, but inserting directly into base table is bulletproof)
    const result = await pool.query(
      `INSERT INTO _users (name, email, password_hash, role, phone) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, role, phone`,
      [name, email.toLowerCase(), hashedPassword, role.toUpperCase(), phone]
    );

    const newUser = result.rows[0];

    // 4. Important: If role is Provider, create their empty profile securely
    if (newUser.role === 'PROVIDER') {
      await pool.query(
        `INSERT INTO _provider_profiles (user_id) VALUES ($1)`,
        [newUser.id]
      );
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    // Handling Unique Constraint Error gracefully
    if (error.code === '23505') { 
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error); // Pass to global error handler
  }
};

// @desc    Login a user
// @route   POST /api/auth/login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // 1. Check if user exists (we query the 'users' view so we NEVER fetch soft-deleted users!)
    const result = await pool.query(
      `SELECT id, name, email, phone, password_hash, role FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { id, name, phone, password_hash, role } = result.rows[0];

    // 2. Compare hashed password
    const isMatch = await bcrypt.compare(password, password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Assign JWT Token
    const token = jwt.sign(
      { id, role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id,
        name,
        email: email.toLowerCase(),
        role,
        phone
      }
    });

  } catch (error) {
    next(error); // Pass to global error handler
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, phone FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current logged in user profile
// @route   PATCH /api/auth/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowed = ['name', 'phone'];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const v = String(req.body[key]).trim();
        if (key === 'name' && v.length < 2) {
          return res.status(400).json({ error: 'Name must be at least 2 characters' });
        }
        if (key === 'phone' && v.length > 0 && v.length < 8) {
          return res.status(400).json({ error: 'Phone number looks too short' });
        }
        fields.push(`${key} = $${idx}`);
        values.push(v || null);
        idx++;
      }
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE _users
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       AND is_deleted = false
       RETURNING id, name, email, role, phone`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated', user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateMe
};
