const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all holidays with optional filters
router.get('/', async (req, res) => {
  console.log('🎯 Holiday API called with query:', req.query);
  console.log('🔗 Database pool:', db.pool ? 'Available' : 'Not available');
  try {
    const { year, category, type, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        id, date, name_holiday, category, created_by, created_at
      FROM holiday 
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (year) {
      query += ` AND EXTRACT(YEAR FROM date) = $${paramIndex}`;
      params.push(parseInt(year));
      paramIndex++;
    }
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    query += ` ORDER BY date LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('🔍 Executing query:', query);
    console.log('📝 Query params:', params);
    
    const result = await db.pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error fetching holidays:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get holiday by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id, date, name_holiday, category, created_by, created_at
      FROM holiday 
      WHERE id = $1
    `;
    
    const result = await db.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new holiday
router.post('/', async (req, res) => {
  try {
    const { date, name_holiday, category, created_by } = req.body;
    
    // Validate required fields
    if (!date || !name_holiday || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date, name_holiday, category'
      });
    }
    
    // Validate category
    const validCategories = ['special', 'annual'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: special, annual'
      });
    }
    
    // Check if holiday already exists for this date
    const existingQuery = 'SELECT id FROM holiday WHERE date = $1';
    const existingResult = await db.pool.query(existingQuery, [date]);
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Holiday already exists for this date'
      });
    }
    
    const query = `
      INSERT INTO holiday (date, name_holiday, category, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, date, name_holiday, category, created_by, created_at
    `;
    
    const result = await db.pool.query(query, [
      date, name_holiday, category, created_by || 'system'
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update holiday
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name_holiday, category } = req.body;
    
    // Check if holiday exists
    const existingQuery = 'SELECT id FROM holiday WHERE id = $1';
    const existingResult = await db.pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    // Build update query dynamically
    let updateFields = [];
    let params = [];
    let paramIndex = 1;
    
    if (date !== undefined) {
      updateFields.push(`date = $${paramIndex}`);
      params.push(date);
      paramIndex++;
    }
    
    if (name_holiday !== undefined) {
      updateFields.push(`name_holiday = $${paramIndex}`);
      params.push(name_holiday);
      paramIndex++;
    }
    
    if (category !== undefined) {
      const validCategories = ['special', 'annual'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Must be one of: special, annual'
        });
      }
      updateFields.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    params.push(id); // For WHERE clause
    
    const query = `
      UPDATE holiday 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, date, name_holiday, category, created_by, created_at
    `;
    
    const result = await db.pool.query(query, params);
    
    res.json({
      success: true,
      message: 'Holiday updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete holiday (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleted_by } = req.body;
    
    const query = `
      DELETE FROM holiday 
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found or already deleted'
      });
    }
    
    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get holidays by year range
router.get('/range/:startYear/:endYear', async (req, res) => {
  try {
    const { startYear, endYear } = req.params;
    const { category, type } = req.query;
    
    let query = `
      SELECT 
        id, date, name_holiday, category, created_by, created_at
      FROM holiday 
      WHERE EXTRACT(YEAR FROM date) BETWEEN $1 AND $2
    `;
    
    const params = [parseInt(startYear), parseInt(endYear)];
    let paramIndex = 3;
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    query += ' ORDER BY date';
    
    const result = await db.pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching holidays by range:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
