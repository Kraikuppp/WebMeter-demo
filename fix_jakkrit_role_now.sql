-- Fix Jakkrit role_id issue immediately
-- Based on debug logs: role_id is null, need to set it to Test role

-- 1. Check current roles available
SELECT 'Available Roles:' as info, id, role_name FROM users.roles ORDER BY id;

-- 2. Check current user status
SELECT 
  'Current User Status:' as info,
  id, username, name, level, role_id, status 
FROM users.users 
WHERE username = 'Jakkrit';

-- 3. Update Jakkrit's role_id to Test role
UPDATE users.users 
SET role_id = (
  SELECT id 
  FROM users.roles 
  WHERE role_name = 'Test'
)
WHERE username = 'Jakkrit';

-- 4. Verify the fix
SELECT 
  'After Fix:' as info,
  u.id,
  u.username,
  u.name,
  u.level,
  u.role_id,
  r.role_name,
  u.status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit';

-- 5. Show what the login API will now return
SELECT 
  'Login API will now return:' as info,
  u.username,
  u.level,
  u.role_id,
  r.role_name as role,
  'JWT token will have role: ' || COALESCE(r.role_name, 'null') as jwt_role
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit';
