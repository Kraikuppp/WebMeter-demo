// API Routes สำหรับจัดการ User Permissions
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

// Middleware สำหรับตรวจสอบ JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    try {
      // ดึงข้อมูล user ล่าสุดจาก database พร้อม role
      const userQuery = `
        SELECT 
          u.id, u.username, u.name, u.surname, u.email, r.role_name as level, u.line_id, u.role_id,
          r.role_name
        FROM users.users u
        LEFT JOIN users.roles r ON u.role_id = r.id
        WHERE u.id = $1
      `;
      const userResult = await db.query(userQuery, [decoded.userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }
      
      req.user = userResult.rows[0]; // ใช้ข้อมูลล่าสุดจาก database
      next();
    } catch (error) {
      console.error('Error fetching user data:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  });
}

// ดึง permissions ของ role จาก database
async function getRolePermissions(roleName) {
  try {
    const query = `
      SELECT 
        rp.module,
        rp.can_read,
        rp.can_write,
        rp.can_report
      FROM users.roles r
      JOIN users.role_permissions rp ON r.id = rp.role_id
      WHERE r.role_name = $1
    `;
    
    const result = await db.query(query, [roleName]);
    const permissions = {};
    
    result.rows.forEach(row => {
      permissions[row.module] = {
        read: row.can_read,
        write: row.can_write,
        report: row.can_report
      };
    });
    
    return permissions;
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return {};
  }
}

// Default permissions สำหรับ roles ที่ไม่มีใน database
function getDefaultPermissions(role) {
  const allModules = [
    'Dashboard', 'Table Data', 'Online Data', 'Graph Data', 'Line Graph',
    'Demand Graph', 'Energy Graph', 'Compare Graph', 'TOU', 'TOU Demand Graph',
    'TOU Energy Graph', 'TOU Compare Graph', 'Charge', 'Event', 'Config',
    'Export Data', 'Email Line', 'User Management', 'Meter Tree', 'Holiday'
  ];
  
  const permissions = {};
  
  switch (role?.toLowerCase()) {   
    case 'test':
      // Test role มีสิทธิ์เกือบทุกอย่าง (copy from admin) ยกเว้น User Management
      allModules.forEach(module => {
        if (module === 'User Management') {
          permissions[module] = { read: false, write: false, report: false };
        } else {
          permissions[module] = { read: true, write: true, report: true };
        }
      });
      break;
      
    case 'guest':
    default:
      // Guest สามารถ view หน้าต่างๆ ได้ แต่ไม่สามารถ write หรือ report
      const guestAllowedModules = [
        'Dashboard', 'Table Data', 'Graph Data', 'Line Graph', 
        'Demand Graph', 'Energy Graph', 'Compare Graph'
      ];
      
      allModules.forEach(module => {
        if (guestAllowedModules.includes(module)) {
          permissions[module] = { read: true, write: false, report: false };
        } else {
          permissions[module] = { read: false, write: false, report: false };
        }
      });
      break;
  }
  
  console.log(`📋 Generated default permissions for role "${role}":`, Object.keys(permissions).filter(m => permissions[m].read));
  return permissions;
}

// GET /api/permissions/me - ดึง permissions ของ user ปัจจุบัน
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    // ใช้ role_name เป็นหลัก (จาก role_id -> roles.role_name)
    // ถ้าไม่มี role_name ให้ใช้ level เป็น fallback
    let userRole = user.role_name || user.level || 'Guest';
    
    // Debug: ตรวจสอบ role assignment logic
    console.log('🔍 === ROLE DETECTION DEBUG ===');
    console.log('📝 user.role_id:', user.role_id);
    console.log('📝 user.role_name (from JOIN):', user.role_name);
    console.log('📝 user.level (fallback):', user.level);
    console.log('📝 Final userRole:', userRole);
    
    console.log(`📋 Getting permissions for user: ${user.username}`);
    console.log(`📝 User level: ${user.level}`);
    console.log(`📝 User role_name: ${user.role_name}`);
    console.log(`📝 Final role used: ${userRole}`);
    
    // Admin มีสิทธิ์ทุกอย่าง
    if (userRole === 'Admin') {
      const allModules = [
        'Dashboard', 'Table Data', 'Online Data', 'Graph Data', 'Line Graph',
        'Demand Graph', 'Energy Graph', 'Compare Graph', 'TOU', 'TOU Demand Graph',
        'TOU Energy Graph', 'TOU Compare Graph', 'Charge', 'Event', 'Config',
        'Export Data', 'Email Line', 'User Management', 'Meter Tree', 'Holiday'
      ];
      
      const adminPermissions = {};
      allModules.forEach(module => {
        adminPermissions[module] = { read: true, write: true, report: true };
      });
      
      return res.json({
        success: true,
        data: {
          user: {
            username: user.username,
            role: userRole
          },
          permissions: adminPermissions,
          isAdmin: true
        }
      });
    }
    
    // ดึง permissions จาก database
    let permissions = await getRolePermissions(userRole);
    
    // ถ้าไม่มี permissions ใน database ให้ใช้ default permissions
    if (Object.keys(permissions).length === 0) {
      console.log(`⚠️ No role permissions found for ${userRole}, using default permissions`);
      permissions = getDefaultPermissions(userRole);
    }
    
    console.log(`🔍 Final permissions for ${userRole}:`, permissions);
    console.log(`📊 Available modules:`, Object.keys(permissions));
    
    res.json({
      success: true,
      data: {
        user: {
          username: user.username,
          role: userRole
        },
        permissions,
        isAdmin: false
      }
    });
    
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user permissions'
    });
  }
});

// GET /api/permissions/check/:module/:action - ตรวจสอบสิทธิ์เฉพาะ
router.get('/check/:module/:action', authenticateToken, async (req, res) => {
  try {
    const { module, action } = req.params;
    const user = req.user;
    const userRole = user.role_name || user.level;
    
    // Admin มีสิทธิ์ทุกอย่าง
    if (userRole === 'Admin') {
      return res.json({
        success: true,
        hasPermission: true,
        reason: 'Admin access'
      });
    }
    
    // ตรวจสอบ permissions
    const permissions = await getRolePermissions(userRole);
    const hasPermission = permissions[module] && permissions[module][action];
    
    res.json({
      success: true,
      hasPermission,
      reason: hasPermission ? 'Permission granted' : 'Permission denied',
      details: {
        module,
        action,
        userRole,
        available: permissions[module] || null
      }
    });
    
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check permission'
    });
  }
});

module.exports = router;
