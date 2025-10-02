const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const db = require('../config/database');

const router = express.Router();

// Validation schema for signup with all new fields
const signupSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(1).max(100).required(),
  surname: Joi.string().max(100).allow('', null).default(''),
  address: Joi.string().max(500).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  lineId: Joi.string().max(50).allow('', null),
  level: Joi.string().valid('Admin', 'Manager', 'Supervisor', 'Engineer', 'Operator').default('Operator'),
  status: Joi.string().valid('active', 'inactive').default('active')
});

// POST /api/signup - สร้างผู้ใช้ใหม่ด้วยข้อมูลสมบูรณ์
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { username, email, password, name, surname, address, phone, lineId, level, status } = value;

    // Check if username or email already exists
    const checkQuery = `
      SELECT id, username, email 
      FROM users.users 
      WHERE username = $1 OR email = $2
    `;
    const checkResult = await db.query(checkQuery, [username, email]);

    if (checkResult.rows.length > 0) {
      const existingUser = checkResult.rows[0];
      const conflictField = existingUser.username === username ? 'username' : 'email';
      return res.status(409).json({
        success: false,
        error: `${conflictField} already exists`,
        conflictField
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get role ID based on level
    const roleQuery = `
      SELECT id FROM users.roles 
      WHERE role_name = CASE 
        WHEN $1 = 'Admin' THEN 'System Administrator'
        WHEN $1 = 'Manager' THEN 'Plant Manager'
        WHEN $1 = 'Supervisor' THEN 'Operations Supervisor'
        WHEN $1 = 'Engineer' THEN 'Maintenance Engineer'
        WHEN $1 = 'Operator' THEN 'Control Room Operator'
        ELSE 'Control Room Operator'
      END
    `;
    const roleResult = await db.query(roleQuery, [level]);
    const roleId = roleResult.rows[0]?.id;

    // Insert new user with phone and lineId
    const insertQuery = `
      INSERT INTO users.users (
        username, email, password_hash, name, surname, address, phone, line_id,
        level, role_id, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, username, email, name, surname, address, phone, line_id, level, status, created_at
    `;

    const insertResult = await db.query(insertQuery, [
      username, email, hashedPassword, name, surname, 
      address || null, phone || null, lineId || null, level, roleId, status
    ]);

    const newUser = insertResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        surname: newUser.surname,
        address: newUser.address,
        phone: newUser.phone,
        lineId: newUser.line_id,
        level: newUser.level,
        status: newUser.status,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});

// POST /api/signup/send-otp - ส่ง OTP ไปยังเบอร์โทรศัพท์
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Validate phone number
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // In a real implementation, you would integrate with an SMS service here
    // For now, we'll just simulate sending an OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    
    // Store OTP in database (in a real implementation, you would use Redis or similar)
    // For now, we'll just log it
    console.log(`Sending OTP ${otp} to ${phone}`);
    
    // In a real implementation, you would send the OTP via SMS service
    // Example: await smsService.send(phone, `Your OTP is: ${otp}`);
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      // In a real implementation, you would NOT send the OTP in the response
      // This is just for demonstration purposes
      otp: otp
    });
    
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
      message: error.message
    });
  }
});

// POST /api/signup/verify-otp - ตรวจสอบ OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }
    
    // In a real implementation, you would verify the OTP against what was stored
    // For now, we'll just simulate verification
    console.log(`Verifying OTP ${otp} for ${phone}`);
    
    // In a real implementation, you would check the OTP against what was stored
    // Example: const isValid = await otpService.verify(phone, otp);
    
    // For demonstration, we'll assume the OTP is valid
    const isValid = true;
    
    if (isValid) {
      res.json({
        success: true,
        message: 'OTP verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
      message: error.message
    });
  }
});

// POST /api/signup/google - ลงทะเบียนผ่าน Google
router.post('/google', async (req, res) => {
  try {
    const { email, name, surname, googleId, accessToken } = req.body;
    
    // Validate input
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required'
      });
    }
    
    // Check if user already exists
    const checkQuery = `
      SELECT id, username, email 
      FROM users.users 
      WHERE email = $1
    `;
    const checkResult = await db.query(checkQuery, [email]);
    
    if (checkResult.rows.length > 0) {
      // User already exists, return existing user data
      const existingUser = checkResult.rows[0];
      return res.json({
        success: true,
        message: 'User already exists',
        data: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email
        },
        existing: true
      });
    }
    
    // Create username from email if not provided
    const username = email.split('@')[0];
    
    // Check if username already exists, if so, append a number
    let finalUsername = username;
    let counter = 1;
    let usernameCheck = await db.query('SELECT id FROM users.users WHERE username = $1', [finalUsername]);
    
    while (usernameCheck.rows.length > 0) {
      finalUsername = `${username}${counter}`;
      counter++;
      usernameCheck = await db.query('SELECT id FROM users.users WHERE username = $1', [finalUsername]);
    }
    
    // Generate a random password for Google users (they won't use this for login)
    const password = Math.random().toString(36).slice(-8);
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Set default level and status
    const level = 'Operator';
    const status = 'active';
    
    // Get role ID
    const roleQuery = `
      SELECT id FROM users.roles 
      WHERE role_name = 'Control Room Operator'
    `;
    const roleResult = await db.query(roleQuery);
    const roleId = roleResult.rows[0]?.id;
    
    // Insert new user
    const insertQuery = `
      INSERT INTO users.users (
        username, email, password_hash, name, surname,
        level, role_id, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, username, email, name, surname, level, status, created_at
    `;
    
    const insertResult = await db.query(insertQuery, [
      finalUsername, email, hashedPassword, name, surname || '',
      level, roleId, status
    ]);
    
    const newUser = insertResult.rows[0];
    
    res.status(201).json({
      success: true,
      message: 'User created successfully with Google',
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        surname: newUser.surname,
        level: newUser.level,
        status: newUser.status,
        created_at: newUser.created_at
      }
    });
    
  } catch (error) {
    console.error('Error creating user with Google:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user with Google',
      message: error.message
    });
  }
});

module.exports = router;