-- Fix user role assignment for Jakkrit
-- This script checks and fixes the role assignment issue

-- 1. Check current user data
SELECT 
  'CURRENT USER DATA' as check_type,
  u.id,
  u.username,
  u.name,
  u.level,
  u.role_id,
  r.role_name,
  u.status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit' OR u.name = 'Jakkrit';

-- 2. Check available roles
SELECT 
  'AVAILABLE ROLES' as check_type,
  id,
  role_name,
  created_at
FROM users.roles
ORDER BY id;

-- 3. Fix: Update Jakkrit's role_id to Test role
UPDATE users.users 
SET role_id = (
  SELECT id 
  FROM users.roles 
  WHERE role_name = 'Test'
)
WHERE username = 'Jakkrit' OR name = 'Jakkrit';

-- 4. Verify the fix
SELECT 
  'AFTER FIX' as check_type,
  u.id,
  u.username,
  u.name,
  u.level,
  u.role_id,
  r.role_name,
  u.status,
  'Fixed: ' || COALESCE(r.role_name, 'No Role') as result
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit' OR u.name = 'Jakkrit';

-- 5. Check role permissions for Test role
SELECT 
  'TEST ROLE PERMISSIONS' as check_type,
  rp.module,
  rp.read_permission,
  rp.write_permission,
  rp.report_permission
FROM users.role_permissions rp
JOIN users.roles r ON rp.role_id = r.id
WHERE r.role_name = 'Test'
ORDER BY rp.module;

-- 6. Show final verification query
SELECT 
  'FINAL VERIFICATION' as check_type,
  u.username,
  u.email,
  u.name,
  u.surname,
  u.level,
  u.status,
  u.role_id,
  r.role_name,
  CASE 
    WHEN r.role_name IS NOT NULL THEN 'Role assigned correctly'
    ELSE 'Role assignment failed'
  END as status_message
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit' OR u.name = 'Jakkrit';
