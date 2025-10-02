const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all FT configurations with optional filters
router.get('/', async (req, res) => {
  try {
    const { year, name, limit = 100, offset = 0 } = req.query;
    
         let query = `
       SELECT 
         id, year, name, value, unit, description, 
         start_month, end_month, start_day, end_day,
         is_active, created_by, created_at, updated_by, updated_at
       FROM ft_config 
       WHERE 1=1
     `;
    
    const params = [];
    let paramIndex = 1;
    
    if (year) {
      query += ` AND year = $${paramIndex}`;
      params.push(parseInt(year));
      paramIndex++;
    }
    
    if (name) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${name}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY year DESC, name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching FT configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get FT configuration by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
         const query = `
       SELECT 
         id, year, name, value, unit, description, 
         start_month, end_month, start_day, end_day,
         is_active, created_by, created_at, updated_by, updated_at
       FROM ft_config 
       WHERE id = $1
     `;
    
    const result = await db.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FT configuration not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching FT configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new FT configuration
router.post('/', async (req, res) => {
  try {
    const { 
      year, name, value, unit, description, 
      start_month, end_month, start_day, end_day, created_by 
    } = req.body;
    
    // Validate required fields
    if (!year || !name || value === undefined || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: year, name, value, unit'
      });
    }
    
    // Validate year
    if (year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year. Must be between 1900 and 2100'
      });
    }
    
    // Validate value
    if (isNaN(value) || value < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid value. Must be a non-negative number'
      });
    }
    
    // Validate date ranges
    if (start_day < 1 || start_day > 31 || end_day < 1 || end_day > 31) {
      return res.status(400).json({
        success: false,
        message: 'Invalid day values. Must be between 1 and 31'
      });
    }
    
    const query = `
      INSERT INTO ft_config (
        year, name, value, unit, description, 
        start_month, end_month, start_day, end_day, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, year, name, value, unit, description, 
                start_month, end_month, start_day, end_day, created_by, created_at
    `;
    
    const result = await db.pool.query(query, [
      year, name, value, unit, description || '',
      start_month || 'Jan', end_month || 'Dec',
      start_day || 1, end_day || 31, created_by || 'system'
    ]);
    
    res.status(201).json({
      success: true,
      message: 'FT configuration created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating FT configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update FT configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      year, name, value, unit, description, 
      start_month, end_month, start_day, end_day, is_active, updated_by 
    } = req.body;
    
         // Check if FT configuration exists
     const existingQuery = 'SELECT id FROM ft_config WHERE id = $1';
     const existingResult = await db.pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FT configuration not found'
      });
    }
    
    // Build update query dynamically
    let updateFields = [];
    let params = [];
    let paramIndex = 1;
    
    if (year !== undefined) {
      if (year < 1900 || year > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year. Must be between 1900 and 2100'
        });
      }
      updateFields.push(`year = $${paramIndex}`);
      params.push(year);
      paramIndex++;
    }
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    
    if (value !== undefined) {
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid value. Must be a non-negative number'
        });
      }
      updateFields.push(`value = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
    
    if (unit !== undefined) {
      updateFields.push(`unit = $${paramIndex}`);
      params.push(unit);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    
    if (start_month !== undefined) {
      updateFields.push(`start_month = $${paramIndex}`);
      params.push(start_month);
      paramIndex++;
    }
    
    if (end_month !== undefined) {
      updateFields.push(`end_month = $${paramIndex}`);
      params.push(end_month);
      paramIndex++;
    }
    
    if (start_day !== undefined) {
      if (start_day < 1 || start_day > 31) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start_day. Must be between 1 and 31'
        });
      }
      updateFields.push(`start_day = $${paramIndex}`);
      params.push(start_day);
      paramIndex++;
    }
    
    if (end_day !== undefined) {
      if (end_day < 1 || end_day > 31) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end_day. Must be between 1 and 31'
        });
      }
      updateFields.push(`end_day = $${paramIndex}`);
      params.push(end_day);
      paramIndex++;
    }
    
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }
    
    updateFields.push(`updated_by = $${paramIndex}`);
    params.push(updated_by || 'system');
    paramIndex++;
    
    params.push(id); // For WHERE clause
    
    const query = `
      UPDATE ft_config 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, year, name, value, unit, description, 
                start_month, end_month, start_day, end_day, updated_by, updated_at
    `;
    
    const result = await db.pool.query(query, params);
    
    res.json({
      success: true,
      message: 'FT configuration updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating FT configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete FT configuration (hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      DELETE FROM ft_config 
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FT configuration not found'
      });
    }
    
    res.json({
      success: true,
      message: 'FT configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting FT configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get FT configurations by year
router.get('/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { name } = req.query;
    
         let query = `
       SELECT 
         id, year, name, value, unit, description, 
         start_month, end_month, start_day, end_day,
         is_active, created_by, created_at, updated_by, updated_at
       FROM ft_config 
       WHERE year = $1
     `;
    
    const params = [parseInt(year)];
    let paramIndex = 2;
    
    if (name) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${name}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY name';
    
    const result = await db.pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching FT configurations by year:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get FT configurations by year range
router.get('/year-range/:startYear/:endYear', async (req, res) => {
  try {
    const { startYear, endYear } = req.params;
    const { name } = req.query;
    
         let query = `
       SELECT 
         id, year, name, value, unit, description, 
         start_month, end_month, start_day, end_day,
         is_active, created_by, created_at, updated_by, updated_at
       FROM ft_config 
       WHERE year BETWEEN $1 AND $2
     `;
    
    const params = [parseInt(startYear), parseInt(endYear)];
    let paramIndex = 3;
    
    if (name) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${name}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY year DESC, name';
    
    const result = await db.pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching FT configurations by year range:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Bulk create FT configurations for a year
router.post('/bulk/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { configurations, created_by } = req.body;
    
    if (!Array.isArray(configurations) || configurations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Configurations must be a non-empty array'
      });
    }
    
    // Validate year
    if (year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year. Must be between 1900 and 2100'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < configurations.length; i++) {
      const config = configurations[i];
      
      try {
        // Validate required fields
        if (!config.name || config.value === undefined || !config.unit) {
          errors.push(`Configuration ${i + 1}: Missing required fields`);
          continue;
        }
        
        // Validate value
        if (isNaN(config.value) || config.value < 0) {
          errors.push(`Configuration ${i + 1}: Invalid value`);
          continue;
        }
        
        const query = `
          INSERT INTO ft_config (
            year, name, value, unit, description, 
            start_month, end_month, start_day, end_day, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, year, name, value, unit, description, 
                    start_month, end_month, start_day, end_day, created_by, created_at
        `;
        
        const result = await db.pool.query(query, [
          year, config.name, config.value, config.unit, config.description || '',
          config.start_month || 'Jan', config.end_month || 'Dec',
          config.start_day || 1, config.end_day || 31, created_by || 'system'
        ]);
        
        results.push(result.rows[0]);
      } catch (error) {
        errors.push(`Configuration ${i + 1}: ${error.message}`);
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Created ${results.length} configurations successfully`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error bulk creating FT configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get active FT configuration for current date
router.get('/active/current', async (req, res) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentDay = currentDate.getDate();
    
    console.log('🚀 === FT CONFIG: GET ACTIVE FOR CURRENT DATE ===');
    console.log(`🚀 Current date: ${currentDate.toISOString()}`);
    console.log(`🚀 Current year: ${currentYear}`);
    console.log(`🚀 Current month: ${currentMonth}`);
    console.log(`🚀 Current day: ${currentDay}`);
    
    const query = `
      SELECT 
        id, year, name, value, unit, description, 
        start_month, end_month, start_day, end_day,
        is_active, created_by, created_at, updated_by, updated_at
      FROM ft_config 
      WHERE is_active = true 
        AND year = $1
        AND (
          (start_month <= $2 AND end_month >= $2) OR
          (start_month = $2 AND start_day <= $3) OR
          (end_month = $2 AND end_day >= $3)
        )
      ORDER BY 
        CASE 
          WHEN start_month = $2 AND end_month = $2 THEN 1
          WHEN start_month = $2 THEN 2
          WHEN end_month = $2 THEN 3
          ELSE 4
        END,
        start_day ASC
      LIMIT 1
    `;
    
    const params = [currentYear, currentMonth, currentDay];
    
    console.log(`🚀 Executing query for current date`);
    console.log(`🚀 SQL Query:`, query);
    console.log(`🚀 Query params:`, params);
    
    const result = await db.pool.query(query, params);
    
    console.log(`🚀 Query executed successfully`);
    console.log(`🚀 Rows returned: ${result.rows.length}`);
    console.log(`🚀 Active FT config:`, result.rows[0]);
    
    if (result.rows.length === 0) {
      console.log(`🚀 No active FT config found for current date`);
      return res.json({
        success: true,
        data: null,
        message: 'No active FT configuration found for current date'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Active FT configuration retrieved successfully'
    });
    
    console.log('================================');
    
  } catch (error) {
    console.error('❌ === FT CONFIG ERROR ===');
    console.error('❌ Error fetching active FT configuration:', error);
    console.error('❌ Error stack:', error.stack);
    console.log('================================');
    
    res.status(500).json({
      success: false,
      error: 'Database error occurred while fetching active FT configuration',
      message: error.message,
      data: null
    });
  }
});

module.exports = router;
