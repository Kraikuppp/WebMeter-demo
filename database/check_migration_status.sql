-- ตรวจสอบสถานะ database migration

-- 1. ตรวจสอบว่า level column ยังมีอยู่หรือไม่
SELECT '=== COLUMN CHECK ===' as info;
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'users' 
AND table_name = 'users' 
AND column_name IN ('level', 'role_id');

-- 2. ตรวจสอบ views ที่สร้างใหม่
SELECT '=== VIEWS CHECK ===' as info;
SELECT 
    schemaname, 
    viewname,
    viewowner
FROM pg_views 
WHERE schemaname = 'users'
ORDER BY viewname;

-- 3. ตรวจสอบ users และ roles
SELECT '=== USERS AND ROLES ===' as info;
SELECT 
    u.id,
    u.username,
    u.role_id,
    r.role_name,
    u.status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username IN ('Jakkrit', 'amptron06', 'gaii', 'Amptron Support06')
ORDER BY u.username;

-- 4. ตรวจสอบ roles ที่มีอยู่
SELECT '=== AVAILABLE ROLES ===' as info;
SELECT 
    r.id,
    r.role_name,
    r.description,
    COUNT(u.id) as user_count
FROM users.roles r
LEFT JOIN users.users u ON u.role_id = r.id
GROUP BY r.id, r.role_name, r.description
ORDER BY r.role_name;

-- 5. ตรวจสอบ permissions
SELECT '=== ROLE PERMISSIONS ===' as info;
SELECT 
    r.role_name,
    COUNT(rp.id) as permission_count,
    STRING_AGG(rp.module, ', ' ORDER BY rp.module) as modules
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
GROUP BY r.role_name
ORDER BY r.role_name;
