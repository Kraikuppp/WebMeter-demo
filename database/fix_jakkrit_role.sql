-- Fix Jakkrit role assignment issue
-- This script will check and fix the role_id for user Jakkrit

-- 1. Show current state
SELECT 
  'BEFORE FIX' as status,
  u.id,
  u.username,
  u.email,
  u.name,
  u.level,
  u.role_id,
  r.role_name,
  u.status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE LOWER(u.username) = LOWER('Jakkrit') 
   OR LOWER(u.email) = LOWER('jakkrit.2520@gmail.com')
   OR LOWER(u.name) = LOWER('Jakkrit');

-- 2. Show available roles
SELECT 
  'AVAILABLE ROLES' as info,
  id,
  role_name,
  created_at
FROM users.roles
ORDER BY id;

-- 3. Fix the role_id for Jakkrit
UPDATE users.users 
SET role_id = (
  SELECT id 
  FROM users.roles 
  WHERE role_name = 'Test'
)
WHERE LOWER(username) = LOWER('Jakkrit') 
   OR LOWER(email) = LOWER('jakkrit.2520@gmail.com')
   OR LOWER(name) = LOWER('Jakkrit');

-- 4. Verify the fix
SELECT 
  'AFTER FIX' as status,
  u.id,
  u.username,
  u.email,
  u.name,
  u.level,
  u.role_id,
  r.role_name,
  u.status,
  CASE 
    WHEN r.role_name = 'Test' THEN '✅ Fixed successfully'
    WHEN r.role_name IS NULL THEN '❌ Still no role assigned'
    ELSE '⚠️ Different role: ' || r.role_name
  END as fix_status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE LOWER(u.username) = LOWER('Jakkrit') 
   OR LOWER(u.email) = LOWER('jakkrit.2520@gmail.com')
   OR LOWER(u.name) = LOWER('Jakkrit');

-- 5. Test the login query that API uses
SELECT 
  'LOGIN API QUERY TEST' as test_type,
  u.id,
  u.username,
  u.email,
  u.name,
  u.surname,
  u.level,
  u.status,
  u.role_id,
  r.role_name,
  'This is what login API will return' as note
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE LOWER(u.username) = LOWER('Jakkrit') OR LOWER(u.email) = LOWER('Jakkrit');

-- 6. Show role permissions for Test role
SELECT 
  'TEST ROLE PERMISSIONS' as info,
  rp.module,
  rp.read_permission,
  rp.write_permission,
  rp.report_permission
FROM users.role_permissions rp
JOIN users.roles r ON rp.role_id = r.id
WHERE r.role_name = 'Test'
ORDER BY rp.module;
