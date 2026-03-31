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
      `SELECT id, password_hash, role FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { id, password_hash, role } = result.rows[0];

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
      token
    });

  } catch (error) {
    next(error); // Pass to global error handler
  }
};

module.exports = {
  registerUser,
  loginUser
};
