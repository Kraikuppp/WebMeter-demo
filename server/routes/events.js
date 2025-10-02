const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Database-only implementation - no mock data fallback

// Test endpoint without authentication
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Event API is working!',
    timestamp: new Date().toISOString()
  });
});

// GET /api/events - Get events with date range filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      timeFrom = '00:00',
      timeTo = '23:59',
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'DESC',
      search
    } = req.query;

    // Validate required parameters
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        error: 'dateFrom and dateTo are required'
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      });
    }

    // Validate sortBy parameter
    const validSortFields = ['id', 'timestamp', 'username', 'ip', 'lognet', 'event', 'created_at'];
    
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sort field'
      });
    }

    // Build WHERE clause for database query
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Date range filter - use proper timestamp comparison
    const startDateTime = `${dateFrom} ${timeFrom}`;
    const endDateTime = `${dateTo} ${timeTo}`;
    
    whereConditions.push(`timestamp >= $${paramIndex++} AND timestamp <= $${paramIndex++}`);
    queryParams.push(startDateTime, endDateTime);

    // Search filter
    if (search) {
      whereConditions.push(`(
        username ILIKE $${paramIndex} OR 
        ip ILIKE $${paramIndex} OR 
        lognet ILIKE $${paramIndex} OR 
        event ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    try {
      // Count total records for the date range
      const countQuery = `
        SELECT COUNT(*) as total
        FROM public.event
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // If no data found for the date range, return empty result
      if (total === 0) {
        return res.json({
          success: true,
          data: {
            data: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0
            },
            dateRange: {
              from: `${dateFrom} ${timeFrom}`,
              to: `${dateTo} ${timeTo}`
            }
          }
        });
      }

      // Main query to get paginated events
      const mainQuery = `
        SELECT 
          id,
          timestamp,
          username,
          lognet,
          ip,
          event,
          created_at
        FROM public.event
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limitNum, offset);
      const result = await db.query(mainQuery, queryParams);

      // Transform data to match frontend format
      const events = result.rows.map((row, index) => ({
        no: row.id, // Use database id as no field for compatibility
        time: formatDateTime(row.timestamp),
        username: row.username,
        ip: row.ip,
        lognetIp: row.lognet,
        event: row.event,
        id: row.id,
        timestamp: row.timestamp,
        created_at: row.created_at
      }));

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          data: events,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages
          },
          dateRange: {
            from: `${dateFrom} ${timeFrom}`,
            to: `${dateTo} ${timeTo}`
          }
        }
      });

    } catch (dbError) {
      console.error('Database query failed:', dbError.message);
      
      // Return error instead of falling back to mock data
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: dbError.message
      });
    }

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/events/date-range - Get available date range for events
router.get('/date-range', async (req, res) => {
  try {
    const query = `
      SELECT 
        MIN(timestamp) as min_date,
        MAX(timestamp) as max_date
      FROM public.event
    `;
    
    const result = await db.query(query);
    const { min_date, max_date } = result.rows[0];

    res.json({
      success: true,
      data: {
        dateRange: {
          min_date: min_date ? formatDateTime(min_date) : null,
          max_date: max_date ? formatDateTime(max_date) : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching date range:', error);
    res.status(500).json({
      success: false,
      error: 'Database query failed',
      details: error.message
    });
  }
});

// POST /api/events - Create new event
router.post('/', async (req, res) => {
  try {
    const { username, ip, lognetIp, event, description } = req.body;

    // Validate required fields
    if (!username || !event) {
      return res.status(400).json({
        success: false,
        error: 'Username and event are required'
      });
    }

    console.log('🚀 === CREATING NEW EVENT ===');
    console.log('📝 Event data:', { username, ip, lognetIp, event, description });

    // Insert new event into database
    const insertQuery = `
      INSERT INTO public.event (timestamp, username, ip, lognet, event, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, timestamp, username, ip, lognet, event, created_at
    `;

    const now = new Date();
    const values = [
      now, // timestamp
      username,
      ip || '127.0.0.1',
      lognetIp || ip || '127.0.0.1',
      description ? `${event} - ${description}` : event,
      now // created_at
    ];

    const result = await db.query(insertQuery, values);
    const newEvent = result.rows[0];

    console.log('✅ Event created successfully:', newEvent);

    // Transform to match frontend format
    const transformedEvent = {
      no: newEvent.id,
      time: formatDateTime(newEvent.timestamp),
      username: newEvent.username,
      ip: newEvent.ip,
      lognetIp: newEvent.lognet,
      event: newEvent.event,
      id: newEvent.id,
      timestamp: newEvent.timestamp,
      created_at: newEvent.created_at
    };

    res.status(201).json({
      success: true,
      data: transformedEvent,
      message: 'Event created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      details: error.message
    });
  }
});

// GET /api/events/stats - Get event statistics
router.get('/stats', async (req, res) => {
  try {
    const { dateFrom, dateTo, timeFrom = '00:00', timeTo = '23:59' } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        error: 'dateFrom and dateTo are required'
      });
    }

    const startDateTime = `${dateFrom} ${timeFrom}`;
    const endDateTime = `${dateTo} ${timeTo}`;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT username) as unique_users,
        COUNT(DISTINCT ip) as unique_ips,
        COUNT(DISTINCT event) as unique_event_types
      FROM public.event
      WHERE timestamp >= $1 AND timestamp <= $2
    `;

    const result = await db.query(statsQuery, [startDateTime, endDateTime]);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        data: {
          totalEvents: parseInt(stats.total_events),
          uniqueUsers: parseInt(stats.unique_users),
          uniqueIPs: parseInt(stats.unique_ips),
          uniqueEventTypes: parseInt(stats.unique_event_types)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({
      success: false,
      error: 'Database query failed',
      details: error.message
    });
  }
});

// Helper function to format datetime
function formatDateTime(dateTime) {
  if (!dateTime) return '';
  
  const date = new Date(dateTime);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en', { month: 'long' });
  const year = date.getFullYear();
  
  return `${hours}:${minutes} ${day} ${month} ${year}`;
}

module.exports = router;
