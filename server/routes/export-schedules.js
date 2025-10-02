const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const parametersPool = new Pool({
  host: 'dpg-d3f1hphr0fns73d4ts0g-a.singapore-postgres.render.com',
  port: 5432,
  database: 'webmeter_db',
  user: 'webmeter_db_user',
  password: 'daWOGvyNuUBHDDRtwv8sLxisuHrwdnoL',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL configuration for Render PostgreSQL
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

// Create export schedules table if not exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS export_schedules (
    id SERIAL PRIMARY KEY,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    time VARCHAR(5) NOT NULL,
    day_of_week VARCHAR(10),
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    export_type VARCHAR(50) NOT NULL,
    export_format VARCHAR(20) NOT NULL,
    read_time VARCHAR(10) NOT NULL,
    meters JSONB NOT NULL,
    parameters JSONB NOT NULL,
    file_path TEXT,
    email_list JSONB,
    line_list JSONB,
    date_from DATE,
    date_to DATE,
    time_from VARCHAR(5),
    time_to VARCHAR(5),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    run_count INTEGER DEFAULT 0
  );
`;

// Initialize table
parametersPool.query(createTableQuery).catch(console.error);

// GET /api/export-schedules - Get all export schedules
router.get('/', async (req, res) => {
  try {
    console.log('📋 Fetching all export schedules');
    
    const result = await parametersPool.query(`
      SELECT * FROM export_schedules 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} export schedules`);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching export schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export schedules'
    });
  }
});

// POST /api/export-schedules - Create new export schedule
router.post('/', async (req, res) => {
  try {
    const {
      frequency,
      time,
      day_of_week,
      day_of_month,
      export_type,
      export_format,
      read_time,
      meters,
      parameters,
      file_path,
      email_list,
      line_list,
      date_from,
      date_to,
      time_from,
      time_to,
      created_by
    } = req.body;

    console.log('📝 Creating new export schedule:', {
      frequency,
      time,
      export_type,
      export_format,
      meters_count: meters?.length || 0,
      parameters_count: parameters?.length || 0
    });

    // Validate required fields
    if (!frequency || !time || !export_type || !export_format || !read_time || !meters || !parameters || !created_by) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Calculate next run time
    const nextRun = calculateNextRun(frequency, time, day_of_week, day_of_month);

    const result = await parametersPool.query(`
      INSERT INTO export_schedules (
        frequency, time, day_of_week, day_of_month, export_type, export_format,
        read_time, meters, parameters, file_path, email_list, line_list, 
        date_from, date_to, time_from, time_to, created_by, next_run
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      frequency, time, day_of_week, day_of_month, export_type, export_format,
      read_time, JSON.stringify(meters), JSON.stringify(parameters), file_path,
      email_list ? JSON.stringify(email_list) : null,
      line_list ? JSON.stringify(line_list) : null,
      date_from, date_to, time_from, time_to, created_by, nextRun
    ]);

    console.log('✅ Export schedule created successfully:', result.rows[0].id);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating export schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create export schedule'
    });
  }
});

// PUT /api/export-schedules/:id - Update export schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    console.log(`🔄 Updating export schedule ${id}:`, { enabled });

    // Get current schedule to calculate next run time
    let nextRunTime = null;
    if (enabled) {
      const currentSchedule = await parametersPool.query('SELECT * FROM export_schedules WHERE id = $1', [id]);
      if (currentSchedule.rows.length > 0) {
        const schedule = currentSchedule.rows[0];
        nextRunTime = calculateNextRun(
          schedule.frequency, 
          schedule.time, 
          schedule.day_of_week, 
          schedule.day_of_month
        );
      }
    }

    const result = await parametersPool.query(`
      UPDATE export_schedules 
      SET enabled = $1, next_run = $2
      WHERE id = $3
      RETURNING *
    `, [enabled, nextRunTime, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Export schedule not found'
      });
    }

    console.log('✅ Export schedule updated successfully');

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating export schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update export schedule'
    });
  }
});

// DELETE /api/export-schedules/:id - Delete export schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting export schedule ${id}`);

    const result = await parametersPool.query(`
      DELETE FROM export_schedules WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Export schedule not found'
      });
    }

    console.log('✅ Export schedule deleted successfully');

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error deleting export schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete export schedule'
    });
  }
});

// GET /api/export-schedules/due - Get schedules that are due to run
router.get('/due', async (req, res) => {
  try {
    console.log('⏰ Checking for due export schedules');
    
    const result = await parametersPool.query(`
      SELECT * FROM export_schedules 
      WHERE enabled = true 
      AND next_run <= NOW()
      ORDER BY next_run ASC
    `);
    
    console.log(`📋 Found ${result.rows.length} due schedules`);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching due schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch due schedules'
    });
  }
});

// POST /api/export-schedules/:id/run - Mark schedule as run and update next run time
router.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const { success: runSuccess, error: runError } = req.body;

    console.log(`🏃 Marking schedule ${id} as run:`, { runSuccess, runError });

    // Get current schedule to calculate next run
    const currentSchedule = await parametersPool.query('SELECT * FROM export_schedules WHERE id = $1', [id]);
    
    if (currentSchedule.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Export schedule not found'
      });
    }

    const schedule = currentSchedule.rows[0];
    const nextRun = calculateNextRun(
      schedule.frequency, 
      schedule.time, 
      schedule.day_of_week, 
      schedule.day_of_month
    );

    const result = await parametersPool.query(`
      UPDATE export_schedules 
      SET last_run = NOW(), 
          next_run = $1, 
          run_count = run_count + 1
      WHERE id = $2
      RETURNING *
    `, [nextRun, id]);

    console.log('✅ Schedule run status updated');

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating schedule run status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule run status'
    });
  }
});

// Helper function to calculate next run time
function calculateNextRun(frequency, time, dayOfWeek, dayOfMonth) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  switch (frequency) {
    case 'daily':
      // If time has passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case 'weekly':
      const dayMap = {
        'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
        'friday': 5, 'saturday': 6, 'sunday': 0
      };
      const targetDay = dayMap[dayOfWeek];
      const currentDay = nextRun.getDay();
      
      let daysUntilTarget = (targetDay - currentDay + 7) % 7;
      if (daysUntilTarget === 0 && nextRun <= now) {
        daysUntilTarget = 7; // Next week
      }
      
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;
      
    case 'monthly':
      nextRun.setDate(dayOfMonth);
      
      // If the date has passed this month or is today but time has passed
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(dayOfMonth);
      }
      
      // Handle months with fewer days
      if (nextRun.getDate() !== dayOfMonth) {
        nextRun.setDate(0); // Last day of previous month
      }
      break;
  }
  
  return nextRun;
}

module.exports = router;
