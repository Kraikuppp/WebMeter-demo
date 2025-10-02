const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'webmeter_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

/**
 * @route PUT /api/roles/:roleId/permissions
 * @desc Update permissions for a specific role
 * @access Private
 */
router.put('/:roleId/permissions', async (req, res) => {
  const { roleId } = req.params;
  const { permissions } = req.body;

  try {
    console.log(`🔐 === UPDATING PERMISSIONS FOR ROLE ${roleId} ===`);
    console.log('📋 Permissions data:', permissions);

    // Validate input
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be an array'
      });
    }

    // Verify role exists
    const roleCheck = await pool.query('SELECT id, role_name FROM users.roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    const roleName = roleCheck.rows[0].role_name;
    console.log(`🎯 Role found: ${roleName}`);

    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete existing permissions for this role
      await client.query('DELETE FROM users.role_permissions WHERE role_id = $1', [roleId]);
      console.log('🗑️ Deleted existing permissions');

      // Insert new permissions
      for (const perm of permissions) {
        const { module, read, write, report } = perm;
        
        await client.query(`
          INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [roleId, module, read, write, report]);
      }

      await client.query('COMMIT');
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
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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

/**
 * @route GET /api/roles/:roleId/permissions
 * @desc Get permissions for a specific role
 * @access Private
 */
router.get('/:roleId/permissions', async (req, res) => {
  const { roleId } = req.params;

  try {
    console.log(`🔍 === FETCHING PERMISSIONS FOR ROLE ${roleId} ===`);

    // Get role info and permissions
    const result = await pool.query(`
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

/**
 * @route GET /api/roles/permissions/all
 * @desc Get all roles with their permissions
 * @access Private
 */
router.get('/permissions/all', async (req, res) => {
  try {
    console.log('🔍 === FETCHING ALL ROLES WITH PERMISSIONS ===');

    const result = await pool.query(`
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
              'read', rp.can_read,
              'write', rp.can_write,
              'report', rp.can_report
            ) ORDER BY rp.module
          ) FILTER (WHERE rp.module IS NOT NULL),
          '[]'::json
        ) as permissions
      FROM users.roles r
      LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.role_name, r.description, r.created_at, r.updated_at
      ORDER BY r.role_name
    `);

    console.log(`✅ Found ${result.rows.length} roles with permissions`);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching all role permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role permissions',
      details: error.message
    });
  }
});

/**
 * @route POST /api/roles/:roleId/permissions/copy
 * @desc Copy permissions from one role to another
 * @access Private
 */
router.post('/:roleId/permissions/copy', async (req, res) => {
  const { roleId } = req.params;
  const { sourceRoleId } = req.body;

  try {
    console.log(`🔄 === COPYING PERMISSIONS FROM ROLE ${sourceRoleId} TO ROLE ${roleId} ===`);

    // Validate input
    if (!sourceRoleId) {
      return res.status(400).json({
        success: false,
        error: 'Source role ID is required'
      });
    }

    if (roleId === sourceRoleId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot copy permissions to the same role'
      });
    }

    // Verify both roles exist
    const rolesCheck = await pool.query(
      'SELECT id, role_name FROM users.roles WHERE id = $1 OR id = $2',
      [roleId, sourceRoleId]
    );

    if (rolesCheck.rows.length !== 2) {
      return res.status(404).json({
        success: false,
        error: 'One or both roles not found'
      });
    }

    const targetRole = rolesCheck.rows.find(r => r.id == roleId);
    const sourceRole = rolesCheck.rows.find(r => r.id == sourceRoleId);

    console.log(`🎯 Copying from ${sourceRole.role_name} to ${targetRole.role_name}`);

    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get source permissions
      const sourcePermissions = await client.query(
        'SELECT module, can_read, can_write, can_report FROM users.role_permissions WHERE role_id = $1',
        [sourceRoleId]
      );

      if (sourcePermissions.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Source role has no permissions to copy'
        });
      }

      // Delete existing permissions for target role
      await client.query('DELETE FROM users.role_permissions WHERE role_id = $1', [roleId]);

      // Copy permissions
      for (const perm of sourcePermissions.rows) {
        await client.query(`
          INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [roleId, perm.module, perm.can_read, perm.can_write, perm.can_report]);
      }

      await client.query('COMMIT');
      console.log(`✅ Successfully copied ${sourcePermissions.rows.length} permissions`);

      res.json({
        success: true,
        message: `Permissions copied from ${sourceRole.role_name} to ${targetRole.role_name}`,
        data: {
          sourceRole: sourceRole.role_name,
          targetRole: targetRole.role_name,
          permissionsCopied: sourcePermissions.rows.length
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error copying role permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to copy role permissions',
      details: error.message
    });
  }
});

/**
 * @route GET /api/permissions/modules
 * @desc Get all available permission modules
 * @access Private
 */
router.get('/modules', async (req, res) => {
  try {
    console.log('🔍 === FETCHING AVAILABLE PERMISSION MODULES ===');

    // Default modules that should be available
    const defaultModules = [
      'Dashboard',
      'Online Data',
      'Table Data',
      'Graph Data',
      'Compare Graph',
      'Energy Graph',
      'Demand Graph',
      'Line Graph',
      'TOU Compare',
      'TOU Energy',
      'TOU Demand',
      'Export',
      'Event',
      'Meter Tree',
      'Config',
      'Email - Email List',
      'Email - Setup & Edit',
      'User Management',
      'User Permissions'
    ];

    // Get modules that are currently in use
    const usedModules = await pool.query(`
      SELECT DISTINCT module 
      FROM users.role_permissions 
      ORDER BY module
    `);

    // Combine and deduplicate
    const allModules = [...new Set([
      ...defaultModules,
      ...usedModules.rows.map(row => row.module)
    ])].sort();

    console.log(`✅ Found ${allModules.length} available modules`);

    res.json({
      success: true,
      data: allModules
    });

  } catch (error) {
    console.error('❌ Error fetching permission modules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permission modules',
      details: error.message
    });
  }
});

module.exports = router;
