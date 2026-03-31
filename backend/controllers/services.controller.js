const pool = require('../config/db');

// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Provider only)
const createService = async (req, res, next) => {
  try {
    if (req.user.role !== 'PROVIDER') {
      return res.status(403).json({ error: 'Only providers can create services' });
    }

    const { category_id, title, description, price, duration_minutes, tags } = req.body;

    // Notice we insert into `_services` because it's the base table
    const result = await pool.query(
      `INSERT INTO _services (provider_id, category_id, title, description, price, duration_minutes, tags) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [req.user.id, category_id, title, description, price, duration_minutes, tags || '{}']
    );

    res.status(201).json({ message: 'Service created', service: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// @desc    Search/List services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res, next) => {
  try {
    const { q, category_id } = req.query;
    let queryArgs = [];
    let queryStr = `SELECT id, provider_id, category_id, title, description, price, duration_minutes, tags 
                    FROM services WHERE 1=1`; // 'services' is the safe VIEW (is_deleted = false)

    if (category_id) {
      queryArgs.push(category_id);
      queryStr += ` AND category_id = $${queryArgs.length}`;
    }

    // Full Text Search!
    if (q) {
      queryArgs.push(q);
      const paramIndex = queryArgs.length;
      queryStr += ` AND search_vector @@ plainto_tsquery('english', $${paramIndex})`;
    }

    const result = await pool.query(queryStr, queryArgs);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in provider's services
// @route   GET /api/services/my
// @access  Private (Provider only)
const getMyServices = async (req, res, next) => {
  try {
    if (req.user.role !== 'PROVIDER') {
      return res.status(403).json({ error: 'Only providers can access their services' });
    }
    const result = await pool.query(
      `SELECT id, provider_id, category_id, title, description, price, duration_minutes, tags 
       FROM services WHERE provider_id = $1`,
      [req.user.id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, provider_id, category_id, title, description, price, duration_minutes, tags 
       FROM services WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// @desc    Update service
// @route   PATCH /api/services/:id
// @access  Private (Provider only)
const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'PROVIDER') {
      return res.status(403).json({
        error: 'Only providers can update services'
      });
    }

    // ❌ Prevent category change explicitly
    if (req.body.category_id !== undefined) {
      return res.status(400).json({
        error: 'Category cannot be changed once service is created'
      });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const allowedFields = [
      'title',
      'description',
      'price',
      'duration_minutes',
      'tags'
    ];

    // ✅ Build dynamic query
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(req.body[key]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        error: 'No valid fields provided for update'
      });
    }

    // 🔥 Validation (important)
    if (
      req.body.duration_minutes &&
      req.body.duration_minutes % 15 !== 0
    ) {
      return res.status(400).json({
        error: 'Duration must be multiple of 15 minutes'
      });
    }

    fields.push(`updated_at = NOW()`);

    values.push(id, req.user.id);

    const query = `
      UPDATE _services
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      AND provider_id = $${idx + 1}
      AND is_deleted = false
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Service not found or unauthorized'
      });
    }

    res.status(200).json({
      message: 'Service updated successfully',
      service: result.rows[0]
    });

  } catch (error) {
    console.error('🔥 Update Service Error:', error.message);
    next(error);
  }
};

// @desc    Delete service (soft delete)
// @route   DELETE /api/services/:id
// @access  Private (Provider only)
const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'PROVIDER') {
      return res.status(403).json({
        error: 'Only providers can delete services'
      });
    }

    const result = await pool.query(
      `UPDATE _services
       SET is_deleted = true,
           updated_at = NOW()
       WHERE id = $1
       AND provider_id = $2
       AND is_deleted = false
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Service not found or already deleted'
      });
    }

    res.status(200).json({
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('🔥 Delete Service Error:', error.message);
    next(error);
  }
};

module.exports = { createService, getServices, getMyServices, getServiceById,updateService, deleteService};
