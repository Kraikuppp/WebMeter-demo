const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const axios = require('axios');
const db = require('../config/database');
const { logEvent } = require('./events');

// Initialize router
const router = express.Router();

// LINE Login Configuration (force single source of truth for callback URL)
const API_PORT = process.env.PORT || 3001;
const LINE_CONFIG = {
  CHANNEL_ID: '2008116224',
  CHANNEL_SECRET: '59ba9ab9777ac92bc8c0156a48557aaa',
  CALLBACK_URL: `http://localhost:${API_PORT}/api/auth/line/callback`,
  REDIRECT_URL: process.env.CORS_ORIGIN || 'http://localhost:8080'
};

// Diagnostics (non-secret)
console.log('[AUTH] LINE CHANNEL_ID:', LINE_CONFIG.CHANNEL_ID || '(missing)');
console.log('[AUTH] LINE CALLBACK_URL:', LINE_CONFIG.CALLBACK_URL);
if (process.env.LINE_CHANNEL_SECRET) {
  const sec = process.env.LINE_CHANNEL_SECRET;
  const masked = sec.length > 8 ? `${sec.slice(0,4)}...${sec.slice(-4)}` : '********';
  console.log(`[AUTH] LINE CHANNEL_SECRET length: ${sec.length}, preview: ${masked}`);
} else {
  console.warn('[AUTH] LINE CHANNEL_SECRET is missing');
}

// LINE Login URL Generator
router.get('/line/login', (req, res) => {
  try {
    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7);
    // For now, we'll skip session storage and use a simpler approach
    // In production, you should implement proper session management
    const authUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code&` +
      `client_id=${LINE_CONFIG.CHANNEL_ID}&` +
      `redirect_uri=${encodeURIComponent(LINE_CONFIG.CALLBACK_URL)}&` +
      `state=${state}&` +
      `scope=profile%20openid&` +
      `nonce=${nonce}`;
    res.json({ authUrl });
  } catch (error) {
    console.error('LINE Login error:', error);
    res.status(500).json({ error: 'Failed to get LINE login URL' });
  }
});

// LINE Login Callback
router.get('/line/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    // Verify state parameter
    // In production, use session/cookie to store state
    if (error) {
      return res.status(400).json({ error: 'LINE Login failed' });
    }
    // Exchange code for access token
    console.log('[AUTH] Exchanging token with redirect_uri:', LINE_CONFIG.CALLBACK_URL);
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
    // Verify ID token
    const idTokenPayload = jwt.decode(id_token);
    // Get user profile
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    const userProfile = profileResponse.data;
    // Create or update user in database
    const user = await createOrUpdateUser({
      lineId: userProfile.userId,
      name: userProfile.displayName,
      email: idTokenPayload.email || null,
      picture: userProfile.pictureUrl,
      provider: 'line'
    });
    // ดึง role_name จาก database
    const userWithRole = await db.query(`
      SELECT u.*, r.role_name 
      FROM users.users u 
      LEFT JOIN users.roles r ON u.role_id = r.id 
      WHERE u.id = $1
    `, [user.id]);
    
    const userRole = userWithRole.rows[0]?.role_name || 'Guest';
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, lineId: user.line_id, email: user.email, name: user.name, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Prepare user data for callback
    const username = user.name || user.email || `LINE_${user.line_id?.slice(0,8)}`;
    const level = userRole;
    
    console.log('🔗 LINE Login Success - Redirecting with:', {
      username,
      level,
      hasToken: !!token
    });
    
    // Redirect to frontend with token, username, and level
    const callbackUrl = `${LINE_CONFIG.REDIRECT_URL}/auth/callback?token=${token}&username=${encodeURIComponent(username)}&level=${encodeURIComponent(level)}`;
    res.redirect(callbackUrl);
  } catch (error) {
    console.error('LINE Login error:', error);
    res.redirect(`${LINE_CONFIG.REDIRECT_URL}/auth/error?message=Login failed`);
  }
});

// Helper function to create or update user (aligned with existing schema)
async function createOrUpdateUser(userData) {
  const { lineId, name, email } = userData;
  const safeName = name && name.trim() ? name.trim() : `LINE_${lineId.slice(0,8)}`;
  const safeSurname = '';
  const safeEmail = email && email.trim() ? email.trim() : `${lineId}@line.local`;
  const existing = await db.query('SELECT * FROM users.users WHERE line_id = $1', [lineId]);
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE users.users 
       SET name = $1, surname = $2, email = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE line_id = $4`,
      [safeName, safeSurname, safeEmail, lineId]
    );
    const updated = await db.query('SELECT * FROM users.users WHERE line_id = $1', [lineId]);
    return updated.rows[0];
  } else {
    // Ensure password_hash NOT NULL by creating a default hashed password
    const defaultPassword = `LineLogin#${lineId.slice(0,6)}`;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    // สร้าง user ใหม่และ assign Guest role
    const guestRoleResult = await db.query('SELECT id FROM users.roles WHERE role_name = $1', ['Guest']);
    const guestRoleId = guestRoleResult.rows.length > 0 ? guestRoleResult.rows[0].id : null;
    
    const inserted = await db.query(
      `INSERT INTO users.users (name, surname, email, line_id, username, password_hash, role_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [safeName, safeSurname, safeEmail, lineId, safeName, passwordHash, guestRoleId]
    );
    return inserted.rows[0];
  }
}

// New route for frontend to handle LINE login token exchange
router.post('/line-login', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    // Exchange code for access token
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
    // Get user profile from LINE
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    const userProfile = profileResponse.data;
    const decodedIdToken = jwt.decode(id_token);
    
    console.log('🔍 LINE Login Debug:');
    console.log('- User ID from profile:', userProfile.userId);
    console.log('- Display Name:', userProfile.displayName);
    console.log('- Email from token:', decodedIdToken.email);
    console.log('- Channel ID:', LINE_CONFIG.CHANNEL_ID);
    
    // Store the login ID as messaging ID initially
    // The correct messaging ID will be updated via webhook or manual update
    let messagingId = userProfile.userId;
    
    console.log('🔍 LINE Login ID:', userProfile.userId);
    console.log('⚠️ Using Login ID as initial Messaging ID');
    console.log('💡 Correct messaging ID can be updated via webhook or manual update');
    
    // Find or create user in the database
    const userResult = await db.query('SELECT * FROM users.users WHERE line_id = $1', [userProfile.userId]);
    let user;
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      console.log('✅ Existing user found:', user.name);
      // Update user info and set the correct messaging ID
      await db.query(
        'UPDATE users.users SET name = $1, line_messaging_id = $2 WHERE id = $3', 
        [userProfile.displayName, messagingId, user.id]
      );
      console.log('✅ Updated messaging ID to:', messagingId);
    } else {
      console.log('🆕 Creating new user:', userProfile.displayName);
      const insertUser = await db.query(
        'INSERT INTO users.users (name, email, line_id, line_messaging_id, username) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userProfile.displayName, decodedIdToken.email, userProfile.userId, messagingId, userProfile.displayName]
      );
      user = insertUser.rows[0];
      console.log('✅ Created user with messaging ID:', messagingId);
    }
    // Generate JWT token for our application
    const appToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    // Log the LINE login event
    await logEvent(user.username || user.name, req.ip, `User logged in via LINE`, 'LINE');
    res.json({
      success: true,
      message: 'LINE login successful',
      token: appToken,
      user
    });
  } catch (error) {
    console.error('LINE Login callback error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    // Check if environment variables are loaded
    if (!process.env.LINE_CHANNEL_ID || !process.env.LINE_CHANNEL_SECRET || !process.env.LINE_REDIRECT_URI) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'One or more required LINE environment variables are missing on the server.'
      });
    }
    // Provide more specific error feedback to the client
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

// Update LINE Messaging ID Endpoint
router.post('/update-line-messaging-id', async (req, res) => {
  try {
    const { lineId, messagingId } = req.body;
    
    if (!lineId || !messagingId) {
      return res.status(400).json({ 
        success: false, 
        error: 'LINE ID and Messaging ID are required' 
      });
    }
    
    // Update the messaging ID for the user
    const updateResult = await db.query(
      'UPDATE users.users SET line_messaging_id = $1 WHERE line_id = $2 RETURNING *',
      [messagingId, lineId]
    );
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    console.log('✅ Updated LINE messaging ID:', {
      lineId: lineId,
      messagingId: messagingId,
      userName: updateResult.rows[0].name
    });
    
    res.json({
      success: true,
      message: 'LINE messaging ID updated successfully',
      user: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Update LINE messaging ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update LINE messaging ID',
      details: error.message
    });
  }
});

// LINE Message Send Endpoint
router.post('/send-line-message', async (req, res) => {
  try {
    const { lineId, message } = req.body;
    if (!lineId || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'LINE ID and message are required' 
      });
    }
    const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
    
    console.log('🔑 === LINE TOKEN DEBUG ===');
    console.log('🔑 LINE_ACCESS_TOKEN exists:', !!LINE_ACCESS_TOKEN);
    console.log('🔑 LINE_ACCESS_TOKEN length:', LINE_ACCESS_TOKEN ? LINE_ACCESS_TOKEN.length : 0);
    console.log('🔑 LINE_ACCESS_TOKEN preview:', LINE_ACCESS_TOKEN ? `${LINE_ACCESS_TOKEN.substring(0, 10)}...` : 'undefined');
    
    if (!LINE_ACCESS_TOKEN) {
      console.error('❌ LINE_ACCESS_TOKEN is not set in environment variables');
      return res.status(500).json({
        success: false,
        error: 'LINE_ACCESS_TOKEN not configured'
      });
    }
    
    const lineMessage = {
      to: lineId,
      messages: [{ type: 'text', text: message }]
    };
    
    console.log('📱 Sending to LINE API:', {
      url: 'https://api.line.me/v2/bot/message/push',
      to: lineId,
      messageLength: message.length
    });
    
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

// Validation schemas
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// POST /api/auth/login - เข้าสู่ระบบ
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { username, password } = value;

    console.log('🔍 === LOGIN ATTEMPT ===');
    console.log('📝 Login attempt for:', username);
    console.log('📝 Request IP:', req.ip);

    // Find user by username or email (case-insensitive)
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.password_hash,
        u.name,
        u.surname,
        r.role_name as level,
        u.status,
        u.failed_login_attempts,
        u.locked_until,
        u.role_id,
        r.role_name
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)
    `;

    const userResult = await db.query(userQuery, [username]);

    console.log('🔍 === USER QUERY RESULT ===');
    console.log('📝 Query found users:', userResult.rows.length);
    if (userResult.rows.length > 0) {
      console.log('📝 User data:', {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        email: userResult.rows[0].email,
        name: userResult.rows[0].name,
        level: userResult.rows[0].level,
        role_id: userResult.rows[0].role_id,
        role_name: userResult.rows[0].role_name,
        status: userResult.rows[0].status
      });
    }

    if (userResult.rows.length === 0) {
      console.log('❌ No user found for:', username);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const timeRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        error: 'Account is temporarily locked due to multiple failed login attempts.',
        lockoutTime: timeRemaining,
        message: `Please try again in ${timeRemaining} seconds.`
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      
      // Lock account for 60 seconds if 3 or more failed attempts
      if (newFailedAttempts >= 3) {
        await db.query(
          'UPDATE users.users SET failed_login_attempts = $1, locked_until = CURRENT_TIMESTAMP + INTERVAL \'60 seconds\' WHERE id = $2',
          [newFailedAttempts, user.id]
        );
        
        return res.status(429).json({
          success: false,
          error: 'Too many failed login attempts. Account locked for 60 seconds.',
          lockoutTime: 60
        });
      } else {
        await db.query(
          'UPDATE users.users SET failed_login_attempts = $1 WHERE id = $2',
          [newFailedAttempts, user.id]
        );
        
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          remainingAttempts: 3 - newFailedAttempts
        });
      }
    }

    // Reset failed login attempts and update last login
    await db.query(`
      UPDATE users.users 
      SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    console.log('🔍 === LOGIN SUCCESS DEBUG ===');
    console.log('📝 User data from database:', {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      surname: user.surname,
      level: user.level,
      role_name: user.role_name,
      status: user.status
    });

    // Handle null role_name - use level as fallback
    const finalRole = user.role_name || user.level || 'Guest';
    
    console.log('🔧 === ROLE ASSIGNMENT LOGIC ===');
    console.log('📝 role_name from DB:', user.role_name);
    console.log('📝 level from DB:', user.level);
    console.log('📝 Final role assigned:', finalRole);
    console.log('⚠️ Note: If role_name is null, using level as fallback');

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        level: user.level,  // Keep for backward compatibility
        role: finalRole,    // This is the actual role to use
        role_name: finalRole // Clear indication of current role
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'webmeter-api',
        audience: 'webmeter-app'
      }
    );

    console.log('🔑 JWT Token payload:', {
      userId: user.id,
      username: user.username,
      email: user.email,
      level: user.level,
      role: finalRole
    });

    // Create session record
    const sessionQuery = `
      INSERT INTO users.user_sessions (
        user_id, session_token, ip_address, user_agent, expires_at
      ) VALUES (
        $1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours'
      ) RETURNING id
    `;

    await db.query(sessionQuery, [
      user.id,
      token,
      req.ip,
      req.get('User-Agent') || 'Unknown'
    ]);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          surname: user.surname,
          level: user.level,
          role: finalRole  // Use finalRole instead of user.role_name
        }
      }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

// POST /api/auth/logout - ออกจากระบบ
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Deactivate session
      await db.query(`
        UPDATE users.user_sessions 
        SET is_active = false, logout_time = CURRENT_TIMESTAMP
        WHERE session_token = $1
      `, [token]);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
});

// POST /api/auth/check-duplicate - ตรวจสอบข้อมูลซ้ำ
router.post('/check-duplicate', async (req, res) => {
  try {
    const { field, value } = req.body;

    if (!field || !value) {
      return res.status(400).json({
        success: false,
        error: 'Field and value are required'
      });
    }

    let query = '';
    let params = [value];

    switch (field) {
      case 'username':
        query = 'SELECT id FROM users.users WHERE username = $1';
        break;
      case 'email':
        query = 'SELECT id FROM users.users WHERE email = $1';
        break;
      case 'lineId':
        query = 'SELECT id FROM users.users WHERE line_id = $1';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid field'
        });
    }

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      exists: result.rows.length > 0,
      field,
      value
    });

  } catch (error) {
    console.error('Error checking duplicate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check duplicate',
      message: error.message
    });
  }
});

// GET /api/auth/verify - ตรวจสอบ token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session is still active
    const sessionQuery = `
      SELECT s.id, s.is_active, s.expires_at, u.status
      FROM users.user_sessions s
      JOIN users.users u ON s.user_id = u.id
      WHERE s.session_token = $1 AND s.is_active = true
    `;

    const sessionResult = await db.query(sessionQuery, [token]);

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }

    const session = sessionResult.rows[0];

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      return res.status(401).json({
        success: false,
        error: 'Session expired'
      });
    }

    // Check if user is still active
    if (session.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive'
      });
    }

    // Update last activity
    await db.query(`
      UPDATE users.user_sessions 
      SET last_activity = CURRENT_TIMESTAMP
      WHERE session_token = $1
    `, [token]);

    res.json({
      success: true,
      data: {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        level: decoded.level,
        role: decoded.role
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
      message: error.message
    });
  }
});

// POST /api/auth/google - Google Login
router.post('/google', async (req, res) => {
  try {
    console.log('🔍 === GOOGLE LOGIN API ===');
    console.log('📝 Request body:', {
      googleId: req.body.googleId,
      email: req.body.email,
      name: req.body.name,
      surname: req.body.surname,
      hasCredential: !!req.body.credential
    });

    const { googleId, email, name, surname, picture, credential } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Google ID and email are required'
      });
    }

    // Find user by Google ID or email
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.name,
        u.surname,
        r.role_name as level,
        u.status,
        r.role_name
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      WHERE u.id = $1 OR u.google_id = $1 OR u.email = $2
    `;

    const userResult = await db.query(userQuery, [googleId, googleId, email]);

    let user;
    if (userResult.rows.length > 0) {
      // User exists - update Google ID if needed
      user = userResult.rows[0];
      console.log('✅ Existing user found:', user.username);
      
      // Update Google ID if not set
      if (!user.google_id) {
        await db.query(
          'UPDATE users.users SET google_id = $1 WHERE id = $2',
          [googleId, user.id]
        );
        console.log('✅ Updated Google ID for existing user');
      }
    } else {
      console.log('❌ User not found with Google ID or email');
      return res.status(404).json({
        success: false,
        error: 'User not found. Please register first.'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    // Update last login
    await db.query(`
      UPDATE users.users 
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        level: user.level,
        role: user.role_name
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'webmeter-api',
        audience: 'webmeter-app'
      }
    );

    // Create session record
    const sessionQuery = `
      INSERT INTO users.user_sessions (
        user_id, session_token, ip_address, user_agent, expires_at
      ) VALUES (
        $1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours'
      ) RETURNING id
    `;

    await db.query(sessionQuery, [
      user.id,
      token,
      req.ip,
      req.get('User-Agent') || 'Google Login'
    ]);

    console.log('✅ Google login successful for user:', user.username);
    console.log('- Role:', user.role_name);
    console.log('- Level:', user.level);

    res.json({
      success: true,
      message: 'Google login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          surname: user.surname,
          level: user.level,
          role: user.role_name
        }
      }
    });

  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(500).json({
      success: false,
      error: 'Google login failed',
      message: error.message
    });
  }
});

module.exports = router;
