const express = require('express');
const Joi = require('joi');
const db = require('../config/database');

const router = express.Router();

// Validation schemas
const roleSchema = Joi.object({
  role_name: Joi.string().min(2).max(50).required(),
  description: Joi.string().optional()
});

// GET /api/roles - ดึงรายการ roles ทั้งหมด
router.get('/', async (req, res) => {
  try {
    console.log('🔍 === FETCHING ROLES FROM DATABASE ===');

    // First, try to check if tables exist
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'users' AND table_name = 'roles'
      ) as roles_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'users' AND table_name = 'role_permissions'
      ) as permissions_exists
    `;
    
    const tableCheck = await db.query(tableCheckQuery);
    const { roles_exists, permissions_exists } = tableCheck.rows[0];
    
    console.log('📋 Table status:', { roles_exists, permissions_exists });
    
    if (!roles_exists) {
      console.log('❌ users.roles table does not exist');
      return res.status(500).json({
        success: false,
        error: 'RBAC tables not found. Please run the setup script first.',
        setup_required: true
      });
    }
    
    let query;
    if (permissions_exists) {
      // Full query with permissions
      query = `
        SELECT 
          r.id,
          r.role_name,
          r.description,
          r.created_at,
          r.updated_at,
          (SELECT COUNT(*) FROM users.users u WHERE u.role_id = r.id) as user_count,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'module', rp.module,
                'can_read', rp.can_read,
                'can_write', rp.can_write,
                'can_report', rp.can_report
              ) ORDER BY rp.module
            ) FILTER (WHERE rp.module IS NOT NULL),
            '[]'::json
          ) as permissions
        FROM users.roles r
        LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
        GROUP BY r.id, r.role_name, r.description, r.created_at, r.updated_at
        ORDER BY r.role_name
      `;
    } else {
      // Simple query without permissions
      console.log('⚠️ role_permissions table not found, fetching roles only');
      query = `
        SELECT 
          r.id,
          r.role_name,
          r.description,
          r.created_at,
          r.updated_at,
          (SELECT COUNT(*) FROM users.users u WHERE u.role_id = r.id) as user_count,
          '[]'::json as permissions
        FROM users.roles r
        ORDER BY r.role_name
      `;
    }
    
    const result = await db.query(query);
    console.log(`✅ Found ${result.rows.length} roles`);
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        permissions: row.permissions || []
      })),
      setup_required: !permissions_exists
    });
    
  } catch (error) {
    console.error('❌ Error fetching roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles',
      details: error.message
    });
  }
});

// POST /api/roles - สร้าง role ใหม่
router.post('/', async (req, res) => {
  try {
    const { error, value } = roleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    const { role_name, description } = value;

    // ตรวจสอบว่ามี role_name นี้อยู่แล้วหรือไม่
    const existingRole = await db.query(
      'SELECT id FROM users.roles WHERE role_name = $1',
      [role_name]
    );

    if (existingRole.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Role name already exists'
      });
    }

    // สร้าง role ใหม่
    const insertRoleQuery = `
      INSERT INTO users.roles (role_name, description, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, role_name, description, created_at, updated_at
    `;

    const roleResult = await db.query(insertRoleQuery, [role_name, description]);
    const newRole = roleResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: newRole
    });

  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create role',
      details: error.message
    });
  }
});

// DELETE /api/roles/:id - ลบ role
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ === DELETING ROLE ===');
    const { id } = req.params;
    console.log('Role ID to delete:', id);

    // ตรวจสอบว่ามี role อยู่หรือไม่
    const roleCheck = await db.query('SELECT id, role_name FROM users.roles WHERE id = $1', [id]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    const roleName = roleCheck.rows[0].role_name;
    console.log('Found role:', roleName);

    // ป้องกันการลบ Admin role
    if (roleName === 'Admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete Admin role'
      });
    }

    // เริ่ม transaction
    await db.query('BEGIN');

    try {
      // ตรวจสอบว่ามีผู้ใช้ที่ใช้ role นี้อยู่หรือไม่
      const usersWithRole = await db.query(
        'SELECT COUNT(*) as count FROM users.users WHERE role_id = $1',
        [id]
      );

      if (parseInt(usersWithRole.rows[0].count) > 0) {
        await db.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: 'Cannot delete role that is assigned to users',
          message: `This role is currently assigned to ${usersWithRole.rows[0].count} user(s)`
        });
      }

      // ลบ role permissions (ถ้ามี)
      const deletePermissionsResult = await db.query('DELETE FROM users.role_permissions WHERE role_id = $1', [id]);
      console.log('Deleted permissions:', deletePermissionsResult.rowCount);

      // ลบ role
      const deleteResult = await db.query(
        'DELETE FROM users.roles WHERE id = $1 RETURNING id, role_name',
        [id]
      );

      await db.query('COMMIT');
      console.log('✅ Role deleted successfully:', deleteResult.rows[0]);

      res.json({
        success: true,
        message: 'Role deleted successfully',
        data: deleteResult.rows[0]
      });

    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('❌ Error deleting role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete role',
      details: error.message
    });
  }
});

// เพิ่ม routes สำหรับ role permissions

// PUT /api/roles/:id/permissions - อัปเดต permissions ของ role
router.put('/:id/permissions', async (req, res) => {
  const { id: roleId } = req.params;
  const { permissions } = req.body;

  try {
    console.log(`🔐 === UPDATING PERMISSIONS FOR ROLE ${roleId} ===`);
    console.log('📋 Request body:', req.body);
    console.log('📋 Permissions data:', permissions);
    console.log('📋 Permissions type:', typeof permissions);
    console.log('📋 Permissions length:', permissions?.length);

    // Validate input
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be an array'
      });
    }

    // Verify role exists
    const roleCheck = await db.query('SELECT id, role_name FROM users.roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    const roleName = roleCheck.rows[0].role_name;
    console.log(`🎯 Role found: ${roleName}`);

    // Begin transaction
    await db.query('BEGIN');
    
    try {
      // Delete existing permissions for this role
      await db.query('DELETE FROM users.role_permissions WHERE role_id = $1', [roleId]);
      console.log('🗑️ Deleted existing permissions');

      // Insert new permissions
      for (const perm of permissions) {
        const { module, read, write, report } = perm;
        
        await db.query(`
          INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [roleId, module, read, write, report]);
      }

      await db.query('COMMIT');
      console.log(`✅ Successfully updated ${permissions.length} permissions for role ${roleName}`);

      res.json({
        success: true,
        message: `Permissions updated for role ${roleName}`,
        data: {
          roleId,
          roleName,
          permissionsCount: permissions.length
        }
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error updating role permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role permissions',
      details: error.message
    });
  }
});

// GET /api/roles/:id/permissions - ดึง permissions ของ role
router.get('/:id/permissions', async (req, res) => {
  const { id: roleId } = req.params;

  try {
    console.log(`🔍 === FETCHING PERMISSIONS FOR ROLE ${roleId} ===`);

    // Get role info and permissions
    const result = await db.query(`
      SELECT 
        r.id,
        r.role_name,
        r.description,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'module', rp.module,
              'read', rp.can_read,
              'write', rp.can_write,
              'report', rp.can_report
            ) ORDER BY rp.module
          ) FILTER (WHERE rp.module IS NOT NULL),
          '[]'::json
        ) as permissions
      FROM users.roles r
      LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
      WHERE r.id = $1
      GROUP BY r.id, r.role_name, r.description
    `, [roleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    const roleData = result.rows[0];
    console.log(`✅ Found ${roleData.permissions.length} permissions for role ${roleData.role_name}`);

    res.json({
      success: true,
      data: roleData
    });

  } catch (error) {
    console.error('❌ Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role permissions',
      details: error.message
    });
  }
});

module.exports = router;
