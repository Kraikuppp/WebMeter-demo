// Import dependencies
const express = require('express');
const cors = require('cors');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables robustly from root .env and server/.env (server/.env overrides)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chargeDataRoutes = require('./routes/charge-data');
const calculationEmailRoutes = require('./routes/calculation-email');
const eventRoutes = require('./routes/events');
const meterTreeRoutes = require('./routes/meter-tree');
const emailRoutes = require('./routes/email');
const exportSchedulesRoutes = require('./routes/export-schedules');
const rolesRoutes = require('./routes/roles');
const permissionsRoutes = require('./routes/permissions');

// Import missing routes
const tableDataRoutes = require('./routes/table-data');
const realtimeDataRoutes = require('./routes/realtime-data');
const dashboardRoutes = require('./routes/dashboard');
const signupRoutes = require('./routes/signup');
const holidayRoutes = require('./routes/holiday');
const ftConfigRoutes = require('./routes/ft-config');
const parameterRoutes = require('./routes/parameters');
const groupRoutes = require('./routes/groups');

// Import database and utilities
const db = require('./config/database');
const { logEvent } = require('./routes/events');
// Import export scheduler
const exportScheduler = require('./services/exportScheduler');

// Initialize Express app
const app = express();

// CORS configuration - moved after app initialization
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Define PORT
const PORT = process.env.PORT || 3001;

// LINE Configuration
const LINE_CONFIG = {
  CHANNEL_ID: '2008116224',
  CHANNEL_SECRET: '59ba9ab9777ac92bc8c0156a48557aaa',
  // Force a single source of truth for redirect_uri to avoid mismatch
  CALLBACK_URL: `http://localhost:${PORT}/api/auth/line/callback`,
  REDIRECT_URL: process.env.CORS_ORIGIN || 'http://localhost:8080'
};

// Startup diagnostics for LINE configuration (non-secret)
console.log('[LINE] Using CHANNEL_ID:', LINE_CONFIG.CHANNEL_ID || '(missing)');
console.log('[LINE] Using CALLBACK_URL:', LINE_CONFIG.CALLBACK_URL);
if (!process.env.LINE_REDIRECT_URI) {
  console.warn('[LINE] Warning: LINE_REDIRECT_URI not set in environment; falling back to default:', LINE_CONFIG.CALLBACK_URL);
}

// Disable duplicate LINE login handlers here to prevent mismatched flows

// Helper function to create or update user
async function createOrUpdateUser(userData) {
  const { lineId, name, email, picture, provider } = userData;
  const userResult = await db.query('SELECT * FROM users.users WHERE line_id = $1', [lineId]);
  if (userResult.rows.length > 0) {
    await db.query(
      `UPDATE users.users SET name = $1, email = $2, picture = $3, updated_at = CURRENT_TIMESTAMP WHERE line_id = $4`,
      [name, email, picture, lineId]
    );
    const updatedUser = await db.query('SELECT * FROM users.users WHERE line_id = $1', [lineId]);
    return updatedUser.rows[0];
  } else {
    const insertUser = await db.query(
      `INSERT INTO users.users (line_id, name, email, picture, provider, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
      [lineId, name, email, picture, provider]
    );
    return insertUser.rows[0];
  }
}

// New route for frontend to handle LINE login token exchange
app.post('/api/line-login', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: LINE_CONFIG.CALLBACK_URL,
      client_id: LINE_CONFIG.CHANNEL_ID,
      client_secret: LINE_CONFIG.CHANNEL_SECRET
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const { access_token, id_token } = tokenResponse.data;
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    const userProfile = profileResponse.data;
    const decodedIdToken = jwt.decode(id_token);
    
    console.log('🔍 LINE Login Debug (server.js):');
    console.log('- User ID from profile:', userProfile.userId);
    console.log('- Display Name:', userProfile.displayName);
    console.log('- Email from token:', decodedIdToken.email);
    console.log('- Channel ID:', LINE_CONFIG.CHANNEL_ID);
    
    const userResult = await db.query('SELECT * FROM users.users WHERE line_id = $1', [userProfile.userId]);
    let user;
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      console.log('✅ Existing user found:', user.name);
      // Update user info and ensure line_messaging_id is set
      await db.query(
        'UPDATE users.users SET name = $1, line_messaging_id = $2 WHERE id = $3', 
        [userProfile.displayName, userProfile.userId, user.id]
      );
    } else {
      console.log('🆕 Creating new user:', userProfile.displayName);
      const insertUser = await db.query(
        'INSERT INTO users.users (name, email, line_id, line_messaging_id, username) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userProfile.displayName, decodedIdToken.email, userProfile.userId, userProfile.userId, userProfile.displayName]
      );
      user = insertUser.rows[0];
    }
    const appToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    await logEvent(user.username || user.name, req.ip, `User logged in via LINE`, 'LINE');
    res.json({
      success: true,
      message: 'LINE login successful',
      token: appToken,
      user
    });
  } catch (error) {
    console.error('LINE Login callback error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    if (!process.env.LINE_CHANNEL_ID || !process.env.LINE_CHANNEL_SECRET || !process.env.LINE_REDIRECT_URI) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'One or more required LINE environment variables are missing on the server.'
      });
    }
    if (error.response) {
      return res.status(500).json({ 
        error: 'Error from LINE API',
        message: 'The server received an error while communicating with the LINE API.',
        details: error.response.data 
      });
    } else if (error.request) {
      return res.status(500).json({ 
        error: 'No response from LINE API',
        message: 'The server could not reach the LINE API. Check server network connectivity.'
      });
    } else {
      return res.status(500).json({ 
        error: 'Internal server error during LINE login',
        message: error.message 
      });
    }
  }
});

// Test endpoint for debugging
app.post('/api/test-body', (req, res) => {
  console.log('🧪 === TEST ENDPOINT ===');
  console.log('🧪 Body:', req.body);
  console.log('🧪 Headers:', req.headers);
  res.json({ 
    success: true, 
    receivedBody: req.body,
    bodyType: typeof req.body 
  });
});

// LINE Message Send Endpoint
app.post('/api/send-line-message', async (req, res) => {
  try {
    console.log('📱 === LINE API ENDPOINT DEBUG ===');
    console.log('📱 Request body:', req.body);
    console.log('📱 Request headers:', req.headers);
    console.log('📱 Content-Type:', req.headers['content-type']);
    
    const { lineId, message } = req.body;
    console.log('📱 Extracted lineId:', lineId);
    console.log('📱 Extracted message:', message ? `${message.substring(0, 50)}...` : 'undefined');
    
    if (!lineId || !message) {
      console.log('❌ Missing lineId or message');
      return res.status(400).json({ 
        success: false, 
        error: 'LINE ID and message are required' 
      });
    }
    const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
    const lineMessage = {
      to: lineId,
      messages: [{ type: 'text', text: message }]
    };
    const response = await axios.post(
      'https://api.line.me/v2/bot/message/push',
      lineMessage,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
        }
      }
    );
    res.json({
      success: true,
      message: 'LINE message sent successfully',
      data: response.data
    });
  } catch (error) {
    console.error('LINE API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send LINE message',
      details: error.response?.data || error.message
    });
  }
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware for all requests
app.use((req, res, next) => {
  if (req.url.includes('send-line-message') || req.url.includes('test-body')) {
    console.log('🔍 === GLOBAL MIDDLEWARE DEBUG ===');
    console.log('🔍 Method:', req.method);
    console.log('🔍 URL:', req.url);
    console.log('🔍 Content-Type:', req.headers['content-type']);
    console.log('🔍 Body (after parsing):', req.body);
    console.log('🔍 Body type:', typeof req.body);
    console.log('================================');
  }
  next();
});

// API Routes
app.use('/api/email', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/roles', roleRoutes); // Removed - using rolesRoutes instead
app.use('/api/table-data', tableDataRoutes);
app.use('/', realtimeDataRoutes); // ใช้ root path เพราะ route เริ่มต้นด้วย /api
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/signup', signupRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/meter-tree', meterTreeRoutes);
app.use('/api/holiday', holidayRoutes);
app.use('/api/ft-config', ftConfigRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/charge-data', chargeDataRoutes);
app.use('/api/calculation-email', calculationEmailRoutes);
app.use('/api/export-schedules', exportSchedulesRoutes);
app.use('/api/roles', rolesRoutes); // This handles all /api/roles routes including permissions
app.use('/api/permissions', permissionsRoutes);

// Test event endpoint without authentication
app.get('/api/test-events', (req, res) => {
  res.json({
    success: true,
    message: 'Event API is working!',
    timestamp: new Date().toISOString()
  });
});
app.use('/api/groups', groupRoutes);

// Export Scheduler endpoints
app.get('/api/scheduler/status', (req, res) => {
  res.json({
    success: true,
    data: exportScheduler.getStatus()
  });
});

app.post('/api/scheduler/start', (req, res) => {
  try {
    exportScheduler.start();
    res.json({
      success: true,
      message: 'Export scheduler started successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/scheduler/stop', (req, res) => {
  try {
    exportScheduler.stop();
    res.json({
      success: true,
      message: 'Export scheduler stopped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'WebMeter API Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON format',
      message: 'Please check your request body format'
    });
  }
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WebMeter API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  
  // Start export scheduler
  try {
    exportScheduler.start();
    console.log('📅 Export Scheduler started automatically');
  } catch (error) {
    console.error('❌ Failed to start Export Scheduler:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  // Stop export scheduler
  try {
    exportScheduler.stop();
    console.log('📅 Export Scheduler stopped');
  } catch (error) {
    console.error('❌ Error stopping Export Scheduler:', error);
  }
  
  process.exit(0);
});
