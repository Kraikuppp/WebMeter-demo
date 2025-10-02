// RBAC Middleware สำหรับตรวจสอบสิทธิ์การเข้าถึง
const db = require('../config/database');

// Cache สำหรับ role permissions เพื่อลด database queries
const permissionsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * ดึง permissions ของ role จาก database หรือ cache
 */
async function getRolePermissions(roleName) {
  const cacheKey = `role_${roleName}`;
  const cached = permissionsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.permissions;
  }
  
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
    
    // Cache the result
    permissionsCache.set(cacheKey, {
      permissions,
      timestamp: Date.now()
    });
    
    return permissions;
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return {};
  }
}

/**
 * Middleware สำหรับตรวจสอบสิทธิ์การเข้าถึงโมดูล
 * @param {string} module - ชื่อโมดูล (เช่น 'Dashboard', 'User Management')
 * @param {string} action - การกระทำ ('read', 'write', 'report')
 */
function requirePermission(module, action = 'read') {
  return async (req, res, next) => {
    try {
      // ตรวจสอบว่า user login แล้วหรือไม่
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }
      
      const user = req.session.user;
      const userRole = user.level || user.role;
      
      console.log(`🔐 Checking permission: ${userRole} -> ${module} (${action})`);
      
      // Admin มีสิทธิ์ทุกอย่าง
      if (userRole === 'Admin') {
        console.log('✅ Admin access granted');
        return next();
      }
      
      // ดึง permissions ของ role
      const permissions = await getRolePermissions(userRole);
      
      // ตรวจสอบว่ามี permission สำหรับโมดูลนี้หรือไม่
      if (!permissions[module]) {
        console.log(`❌ No permission found for module: ${module}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied - Module not accessible',
          code: 'MODULE_ACCESS_DENIED',
          details: {
            module,
            action,
            userRole
          }
        });
      }
      
      // ตรวจสอบสิทธิ์การกระทำ
      const hasPermission = permissions[module][action];
      
      if (!hasPermission) {
        console.log(`❌ Permission denied: ${userRole} cannot ${action} ${module}`);
        return res.status(403).json({
          success: false,
          error: `Access denied - Cannot ${action} ${module}`,
          code: 'ACTION_ACCESS_DENIED',
          details: {
            module,
            action,
            userRole,
            available: permissions[module]
          }
        });
      }
      
      console.log(`✅ Permission granted: ${userRole} can ${action} ${module}`);
      next();
      
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed',
        code: 'RBAC_ERROR'
      });
    }
  };
}

/**
 * Middleware สำหรับตรวจสอบว่าเป็น Admin หรือไม่
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  const userRole = req.session.user.level || req.session.user.role;
  
  if (userRole !== 'Admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  next();
}

/**
 * API สำหรับดึง permissions ของ user ปัจจุบัน
 */
async function getUserPermissions(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const user = req.session.user;
    const userRole = user.level || user.role;
    
    console.log(`📋 Getting permissions for user: ${user.username} (${userRole})`);
    
    // Admin มีสิทธิ์ทุกอย่าง
    if (userRole === 'Admin') {
      const allModules = [
        'Dashboard', 'Online Data', 'Table Data', 'Graph Data', 'Compare Graph',
        'Energy Graph', 'Demand Graph', 'Line Graph', 'TOU Compare', 'TOU Energy',
        'TOU Demand', 'Export', 'Event', 'Meter Tree', 'Config',
        'Email - Email List', 'Email - Setup & Edit', 'User Management', 'User Permissions'
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
    const permissions = await getRolePermissions(userRole);
    
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
}

/**
 * ล้าง permissions cache
 */
function clearPermissionsCache() {
  permissionsCache.clear();
  console.log('🧹 Permissions cache cleared');
}

module.exports = {
  requirePermission,
  requireAdmin,
  getUserPermissions,
  clearPermissionsCache,
  getRolePermissions
};
