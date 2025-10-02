const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const db = require('../config/database');

const router = express.Router();

// Middleware สำหรับตรวจสอบ JWT token
async function authenticateToken(req, res, next) {
  console.log('🔍 === AUTHENTICATION MIDDLEWARE DEBUG ===');
  console.log('📝 Request headers:', req.headers);
  console.log('📝 Authorization header:', req.headers['authorization']);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  console.log('📝 Extracted token:', token ? token.substring(0, 20) + '...' : 'none');

  if (!token) {
    console.log('❌ No token found in request');
    return res.status(401).json({
      success: false,
      error: 'No authentication token'
    });
  }

  const jwt = require('jsonwebtoken');
  
  // ตรวจสอบ mock token
  if (token.startsWith('mock.')) {
    console.log('🔧 Processing mock token...');
    try {
      const parts = token.split('.');
      console.log('📝 Token parts count:', parts.length);
      
      if (parts.length !== 3) {
        throw new Error('Invalid mock token format');
      }
      
      const payload = JSON.parse(atob(parts[1]));
      console.log('📝 Mock token payload:', payload);
      
      // ตรวจสอบ payload
      if (!payload.username || !payload.role) {
        throw new Error('Invalid payload: missing username or role');
      }
      
      // ใช้ mock payload เป็น decoded
      const mockDecoded = {
        userId: payload.userId,
        username: payload.username,
        role: payload.role
      };
      
      console.log('📝 Mock decoded user:', mockDecoded);
      
      // ดำเนินการต่อด้วย mock decoded
      return await processAuthenticatedUser(mockDecoded, req, res, next);
    } catch (error) {
      console.error('❌ Mock token error:', error);
      console.error('❌ Error details:', error.message);
      return res.status(403).json({
        success: false,
        error: `Invalid mock token: ${error.message}`
      });
    }
  }
  
  // ตรวจสอบ JWT token ปกติ
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    return await processAuthenticatedUser(decoded, req, res, next);
  });
  
  // ฟังก์ชันสำหรับประมวลผล authenticated user (ย้ายขึ้นมาก่อน)
  async function processAuthenticatedUser(decoded, req, res, next) {

    try {
      // สำหรับ mock token ให้ใช้ username แทน userId
      let userQuery, queryParams;
      
      if (token.startsWith('mock.')) {
        userQuery = `
          SELECT 
            u.id, u.username, u.email, u.name, u.surname, 
            COALESCE(r.role_name, 'Guest') as level, u.status,
            u.role_id, r.role_name
          FROM users.users u
          LEFT JOIN users.roles r ON u.role_id = r.id
          WHERE u.username = $1 AND u.status = 'active'
        `;
        queryParams = [decoded.username];
      } else {
        userQuery = `
          SELECT 
            u.id, u.username, u.email, u.name, u.surname, 
            COALESCE(r.role_name, 'Guest') as level, u.status,
            u.role_id, r.role_name
          FROM users.users u
          LEFT JOIN users.roles r ON u.role_id = r.id
          WHERE u.id = $1 AND u.status = 'active'
        `;
        queryParams = [decoded.userId];
      }
      
      const result = await db.query(userQuery, queryParams);
      
      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'User not found or inactive'
        });
      }

      req.user = result.rows[0];
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }
}

// Validation schemas
const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(), // Allow any domain including .local
  password: Joi.string().min(6).required(),
  name: Joi.string().min(1).max(100).required(),
  surname: Joi.string().max(100).allow('', null).default(''),
  address: Joi.string().max(500).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  lineId: Joi.string().max(50).allow('', null),
  level: Joi.string().min(1).max(50).required(), // Allow any role name from database
  status: Joi.string().valid('active', 'inactive').default('active'),
  note: Joi.string().max(1000).allow('', null),
  groupId: Joi.number().integer().min(1).allow(null)
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).optional(),
  email: Joi.string().email({ tlds: { allow: false } }).optional(), // Allow any domain including .local
  name: Joi.string().min(1).max(100).optional(),
  surname: Joi.string().max(100).allow('', null).optional(),
  address: Joi.string().max(500).allow('', null).optional(),
  phone: Joi.string().max(20).allow('', null).optional(),
  lineId: Joi.string().max(50).allow('', null).optional(),
  level: Joi.string().min(1).max(50).optional(), // Allow any role name from database
  status: Joi.string().valid('active', 'inactive').optional(),
  note: Joi.string().max(1000).allow('', null).optional(),
  groupId: Joi.number().integer().min(1).allow(null).optional(),
  lineGroupId: Joi.number().integer().min(1).allow(null).optional()
});

// GET /api/users - ดึงรายชื่อผู้ใช้ทั้งหมด
router.get('/', async (req, res) => {
  try {
    const { 
      search = '', 
      level = '', 
      status = '', 
      sortBy = 'id', 
      sortOrder = 'ASC',
      page = 1,
      limit = 100
    } = req.query;

    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.name,
        u.surname,
        u.address,
        u.phone,
        u.line_id as "lineId",
        r.role_name as level,
        r.role_name,
        u.status,
        u.note,
        u.last_login,
        u.created_at,
        u.updated_at,
        u.group_id,
        u.groupline_id,
        g.name as group_name,
        lg.name as line_group_name
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      LEFT JOIN users.email_groups g ON u.group_id = g.id
      LEFT JOIN users.line_groups lg ON u.groupline_id = lg.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    // Search filter
    if (search) {
      query += ` AND (
        u.name ILIKE $${paramIndex} OR 
        u.surname ILIKE $${paramIndex} OR 
        u.username ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR
        u.address ILIKE $${paramIndex} OR
        u.note ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Level filter (now using role_name)
    if (level) {
      query += ` AND r.role_name = $${paramIndex}`;
      queryParams.push(level);
      paramIndex++;
    }

    // Status filter
    if (status) {
      query += ` AND u.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Sorting
    const validSortFields = ['id', 'username', 'email', 'name', 'surname', 'level', 'status', 'created_at'];
    const validSortOrder = ['ASC', 'DESC'];
    
    if (validSortFields.includes(sortBy) && validSortOrder.includes(sortOrder.toUpperCase())) {
      if (sortBy === 'level') {
        query += ` ORDER BY 
          CASE r.role_name 
            WHEN 'Admin' THEN 1
            WHEN 'Manager' THEN 2
            WHEN 'Supervisor' THEN 3
            WHEN 'Engineer' THEN 4
            WHEN 'Operator' THEN 5
            ELSE 6
          END ${sortOrder.toUpperCase()}`;
      } else {
        query += ` ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}`;
      }
    } else {
      query += ' ORDER BY u.id ASC';
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);

    const result = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (
        u.name ILIKE $${countParamIndex} OR 
        u.surname ILIKE $${countParamIndex} OR 
        u.username ILIKE $${countParamIndex} OR 
        u.email ILIKE $${countParamIndex} OR
        u.address ILIKE $${countParamIndex} OR
        u.note ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (level) {
      countQuery += ` AND r.role_name = $${countParamIndex}`;
      countParams.push(level);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND u.status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// GET /api/users/:id - ดึงข้อมูลผู้ใช้ตาม ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.name,
        u.surname,
        u.address,
        u.phone,
        u.line_id as "lineId",
        r.role_name as level,
        r.role_name,
        r.description as role_description,
        u.status,
        u.note,
        u.last_login,
        u.failed_login_attempts,
        u.created_at,
        u.updated_at,
        u.group_id,
        u.groupline_id,
        g.name as group_name,
        lg.name as line_group_name,
        creator.username as created_by_username,
        updater.username as updated_by_username
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      LEFT JOIN users.email_groups g ON u.group_id = g.id
      LEFT JOIN users.line_groups lg ON u.groupline_id = lg.id
      LEFT JOIN users.users creator ON u.created_by = creator.id
      LEFT JOIN users.users updater ON u.updated_by = updater.id
      WHERE u.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

// POST /api/users - สร้างผู้ใช้ใหม่
router.post('/', async (req, res) => {
  try {
    console.log('🔍 === USER CREATION REQUEST DEBUG ===');
    console.log('🔍 Request body:', req.body);
    
    // Validate input
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      console.error('❌ Validation failed:', error.details);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    
    console.log('✅ Validation passed, processed value:', value);

    const { username, email, password, name, surname, address, phone, lineId, level, status, note, groupId } = value;

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

    // Insert new user
    const insertQuery = `
      INSERT INTO users.users (
        username, email, password_hash, name, surname, address, phone, line_id,
        role_id, status, note, created_at, updated_at, group_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $12
      ) RETURNING id, username, email, name, surname, address, phone, line_id as "lineId", status, note, group_id, created_at
    `;

    const insertResult = await db.query(insertQuery, [
      username, email, hashedPassword, name, surname, 
      address || null, phone || null, lineId || null, roleId, status, note || null, groupId || null
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
        lineId: newUser.lineId,
        level: newUser.level,
        status: newUser.status,
        note: newUser.note,
        group_id: newUser.group_id,
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

// PUT /api/users/:id - แก้ไขข้อมูลผู้ใช้
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Validate input
    console.log('📝 === UPDATE USER VALIDATION DEBUG ===');
    console.log('📝 Request body:', req.body);
    console.log('📝 Request body keys:', Object.keys(req.body));
    
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation failed:', error.details);
      console.log('❌ Failed validation details:');
      error.details.forEach((detail, index) => {
        console.log(`  ${index + 1}. Field: ${detail.path.join('.')}, Message: ${detail.message}, Value: ${detail.context?.value}`);
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => `${detail.path.join('.')}: ${detail.message}`)
      });
    }
    
    console.log('✅ Validation passed, processed value:', value);

    // If level is being updated, check if the role exists in database
    if (value.level) {
      console.log('🔍 Checking if role exists:', value.level);
      
      // First, let's see what roles are available
      const allRolesQuery = 'SELECT id, role_name FROM users.roles ORDER BY role_name';
      const allRolesResult = await db.query(allRolesQuery);
      console.log('📋 Available roles in database:', allRolesResult.rows);
      
      const roleCheckQuery = 'SELECT id, role_name FROM users.roles WHERE role_name = $1';
      const roleCheckResult = await db.query(roleCheckQuery, [value.level]);
      
      if (roleCheckResult.rows.length === 0) {
        console.log('❌ Role not found:', value.level);
        console.log('💡 Available roles:', allRolesResult.rows.map(r => r.role_name));
        return res.status(400).json({
          success: false,
          error: 'Invalid role',
          details: [`Role '${value.level}' does not exist in the system. Available roles: ${allRolesResult.rows.map(r => r.role_name).join(', ')}`]
        });
      }
      console.log('✅ Role found:', roleCheckResult.rows[0]);
    }

    // Check if user exists
    const userCheckQuery = 'SELECT id FROM users.users WHERE id = $1';
    const userCheckResult = await db.query(userCheckQuery, [id]);

    if (userCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check for username/email conflicts (exclude current user)
    if (value.username || value.email) {
      const checkQuery = `
        SELECT id, username, email 
        FROM users.users 
        WHERE (username = $1 OR email = $2) AND id != $3
      `;
      const checkResult = await db.query(checkQuery, [
        value.username || '', 
        value.email || '', 
        id
      ]);

      if (checkResult.rows.length > 0) {
        const existingUser = checkResult.rows[0];
        const conflictField = existingUser.username === value.username ? 'username' : 'email';
        return res.status(409).json({
          success: false,
          error: `${conflictField} already exists`,
          conflictField
        });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    console.log('Updating user with data:', value); // Debug log

    for (const [key, fieldValue] of Object.entries(value)) {
      // Skip level field - we'll handle role update separately
      if (key === 'level') {
        continue;
      }
      
      // Convert camelCase to snake_case for database fields
      let dbField = key;
      if (key === 'groupId') {
        dbField = 'group_id';
      } else if (key === 'lineGroupId') {
        dbField = 'groupline_id';
      } else if (key === 'lineId') {
        dbField = 'line_id';
      }
      updateFields.push(`${dbField} = $${paramIndex}`);
      updateValues.push(fieldValue);
      paramIndex++;
    }
    
    // Handle role update separately if level is provided
    if (value.level) {
      console.log('🔄 Processing role update for level:', value.level);
      
      // Get role ID based on level
      const roleQuery = 'SELECT id FROM users.roles WHERE role_name = $1';
      const roleResult = await db.query(roleQuery, [value.level]);
      
      if (roleResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Role '${value.level}' not found`
        });
      }
      
      const roleId = roleResult.rows[0].id;
      updateFields.push(`role_id = $${paramIndex}`);
      updateValues.push(roleId);
      paramIndex++;
      
      console.log('✅ Added role_id update:', roleId, 'for level:', value.level);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Add updated_at field
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateQuery = `
      UPDATE users.users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, name, surname, address, phone, line_id as "lineId", status, note, group_id, updated_at
    `;

    updateValues.push(id);

    console.log('Update query:', updateQuery); // Debug log
    console.log('Update values:', updateValues); // Debug log

    const updateResult = await db.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message
    });
  }
});

// DELETE /api/users/:id - ลบผู้ใช้
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Check if user exists
    const userCheckQuery = 'SELECT id, username FROM users.users WHERE id = $1';
    const userCheckResult = await db.query(userCheckQuery, [id]);

    if (userCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete user
    const deleteQuery = 'DELETE FROM users.users WHERE id = $1 RETURNING id, username';
    const deleteResult = await db.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: deleteResult.rows[0]
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

// PATCH /api/users/:id/status - เปลี่ยนสถานะผู้ใช้
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "active" or "inactive"'
      });
    }

    const updateQuery = `
      UPDATE users.users 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, status, updated_at
    `;

    const result = await db.query(updateQuery, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      message: error.message
    });
  }
});

// GET /api/users/stats/summary - สถิติสรุปผู้ใช้
router.get('/stats/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.role_name as level,
        COUNT(*) as user_count,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN u.status = 'inactive' THEN 1 END) as inactive_count
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      GROUP BY r.role_name
      ORDER BY 
        CASE r.role_name 
          WHEN 'Admin' THEN 1
          WHEN 'Manager' THEN 2
          WHEN 'Supervisor' THEN 3
          WHEN 'Control Room Operator' THEN 4
          ELSE 5
        END
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      message: error.message
    });
  }
});

// GET /api/users/group/:groupId - Get users by email group
router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    const result = await db.query(`
      SELECT u.id, u.username, u.email, u.name, u.surname, u.phone, u.status, eg.name as group_name
      FROM users.users u
      LEFT JOIN users.email_groups eg ON u.group_id = eg.id
      WHERE u.group_id = $1 AND u.status = 'active'
      ORDER BY u.id ASC
    `, [groupId]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching users by group:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users by group', message: err.message });
  }
});

// GET /api/users/line-group/:groupId - Get users by line group
router.get('/line-group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    const result = await db.query(`
      SELECT u.id, u.username, u.email, u.name, u.surname, u.phone, u.line_id, u.status, lg.name as group_name
      FROM users.users u
      LEFT JOIN users.line_groups lg ON u.groupline_id = lg.id
      WHERE u.groupline_id = $1 AND u.status = 'active' AND u.line_id IS NOT NULL AND u.line_id != ''
      ORDER BY u.id ASC
    `, [groupId]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching users by line group:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users by line group', message: err.message });
  }
});

// GET /api/users/debug-roles - Debug endpoint to check roles
router.get('/debug-roles', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking roles table');
    
    // Check if roles table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'users' AND table_name = 'roles'
      ) as table_exists
    `;
    const tableResult = await db.query(tableExistsQuery);
    console.log('📋 Roles table exists:', tableResult.rows[0].table_exists);
    
    if (!tableResult.rows[0].table_exists) {
      return res.json({
        success: false,
        error: 'Roles table does not exist',
        table_exists: false
      });
    }
    
    // Get all roles
    const rolesQuery = 'SELECT id, role_name, description FROM users.roles ORDER BY role_name';
    const rolesResult = await db.query(rolesQuery);
    console.log('📋 Found roles:', rolesResult.rows);
    
    res.json({
      success: true,
      table_exists: true,
      roles_count: rolesResult.rows.length,
      roles: rolesResult.rows
    });
    
  } catch (error) {
    console.error('❌ Debug roles error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/users/available-roles - ดึงรายการ roles ที่มีใน database
router.get('/available-roles', async (req, res) => {
  try {
    console.log('🔍 Fetching available roles from database');
    
    const query = `
      SELECT 
        id,
        role_name,
        description,
        created_at,
        (SELECT COUNT(*) FROM users.users u WHERE u.role_id = r.id) as user_count
      FROM users.roles r
      ORDER BY r.role_name
    `;
    
    const result = await db.query(query);
    console.log(`✅ Found ${result.rows.length} available roles`);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('❌ Error fetching available roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available roles',
      details: error.message
    });
  }
});

// PUT /api/users/:id/role - อัปเดต role ของ user
router.put('/:id/role', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { roleId, roleName } = req.body;
    
    console.log('🔄 === UPDATING USER ROLE ===');
    console.log('📝 Requesting User:', req.user.username, '(ID:', req.user.id, ')');
    console.log('📝 Requesting User Role:', req.user.role_name);
    console.log('📝 Target User ID:', userId);
    console.log('📝 New Role ID:', roleId);
    console.log('📝 New Role Name:', roleName);
    
    // Validate input
    if (!userId || (!roleId && !roleName)) {
      return res.status(400).json({
        success: false,
        error: 'User ID and either roleId or roleName is required'
      });
    }
    
    // Check permissions - only Admin can change roles
    const requestingUserRole = req.user.role_name || req.user.level;
    console.log('🔐 Permission check - Requesting user role:', requestingUserRole);
    
    if (requestingUserRole !== 'Admin') {
      console.log('❌ Permission denied - User is not Admin');
      return res.status(403).json({
        success: false,
        error: 'Only Admin users can change user roles'
      });
    }
    
    console.log('✅ Permission granted - User is Admin');
    
    // ถ้าส่ง roleName มา ให้หา roleId
    let finalRoleId = roleId;
    if (!roleId && roleName) {
      const roleResult = await db.query(
        'SELECT id FROM users.roles WHERE role_name = $1',
        [roleName]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Role "${roleName}" not found`
        });
      }
      
      finalRoleId = roleResult.rows[0].id;
      console.log('📝 Found role ID:', finalRoleId, 'for role name:', roleName);
    }
    
    // ตรวจสอบว่า user มีอยู่จริง
    const userCheck = await db.query(`
      SELECT u.id, u.username, r.role_name as level 
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userCheck.rows[0];
    console.log('📝 Current user:', user);
    
    // อัปเดต role_id ของ user
    const updateResult = await db.query(`
      UPDATE users.users 
      SET role_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, role_id
    `, [finalRoleId, userId]);
    
    // ดึงข้อมูล role ใหม่
    const updatedUserResult = await db.query(`
      SELECT 
        u.id, u.username, u.email, u.name, r.role_name as level, u.status,
        u.role_id, r.role_name
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);
    
    const updatedUser = updatedUserResult.rows[0];
    
    console.log('✅ User role updated successfully:', {
      userId: updatedUser.id,
      username: updatedUser.username,
      oldLevel: user.level,
      newRoleId: updatedUser.role_id,
      newRoleName: updatedUser.role_name
    });
    
    res.json({
      success: true,
      message: `User role updated successfully`,
      data: {
        user: updatedUser,
        changes: {
          roleId: finalRoleId,
          roleName: updatedUser.role_name
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
      details: error.message
    });
  }
});

module.exports = router;
