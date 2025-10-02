-- แก้ไขปัญหาความขconflict ระหว่าง level และ role_id/role_name

-- 1. ตรวจสอบปัญหาปัจจุบัน
SELECT '=== CURRENT CONFLICTS ===' as info;
SELECT 
    u.id, u.username, u.level, u.role_id,
    r.role_name,
    CASE 
        WHEN u.level != r.role_name THEN 'CONFLICT'
        WHEN u.role_id IS NULL THEN 'NO_ROLE_ID'
        ELSE 'OK'
    END as status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username IN ('Jakkrit', 'amptron06', 'gaii', 'Amptron Support06')
ORDER BY u.username;

-- 2. แสดง roles ที่มีอยู่
SELECT '=== AVAILABLE ROLES ===' as info;
SELECT id, role_name, description FROM users.roles ORDER BY id;

-- 3. แก้ไข Jakkrit: ให้ level และ role_name ตรงกัน
-- ถ้าต้องการให้เป็น Admin
UPDATE users.users 
SET 
    role_id = (SELECT id FROM users.roles WHERE role_name = 'Admin'),
    level = 'Admin'
WHERE username = 'Jakkrit';

-- 4. แก้ไข users อื่นๆ ให้ level ตรงกับ role_name
UPDATE users.users 
SET level = (
    SELECT r.role_name 
    FROM users.roles r 
    WHERE r.id = users.users.role_id
)
WHERE role_id IS NOT NULL;

-- 5. สำหรับ users ที่ไม่มี role_id ให้สร้าง role ตาม level
UPDATE users.users 
SET role_id = (
    SELECT r.id 
    FROM users.roles r 
    WHERE r.role_name = users.users.level
)
WHERE role_id IS NULL 
AND level IN (SELECT role_name FROM users.roles);

-- 6. ตรวจสอบผลลัพธ์หลังแก้ไข
SELECT '=== AFTER FIX ===' as info;
SELECT 
    u.id, u.username, u.level, u.role_id,
    r.role_name,
    CASE 
        WHEN u.level = r.role_name THEN 'FIXED'
        WHEN u.role_id IS NULL THEN 'STILL_NO_ROLE'
        ELSE 'STILL_CONFLICT'
    END as status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username IN ('Jakkrit', 'amptron06', 'gaii', 'Amptron Support06')
ORDER BY u.username;

-- 7. แสดง permissions ที่ Jakkrit จะได้รับ
SELECT '=== JAKKRIT FINAL PERMISSIONS ===' as info;
SELECT 
    u.username, u.level, r.role_name,
    rp.module, rp.can_read, rp.can_write, rp.can_report
FROM users.users u
JOIN users.roles r ON u.role_id = r.id
JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE u.username = 'Jakkrit'
ORDER BY rp.module
LIMIT 10;

-- 8. สรุปสถานะ
SELECT '=== SUMMARY ===' as info;
SELECT 
    'Users with matching level and role_name' as metric,
    COUNT(*) as count
FROM users.users u
JOIN users.roles r ON u.role_id = r.id
WHERE u.level = r.role_name;

SELECT 
    'Users with conflicts' as metric,
    COUNT(*) as count
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.level != r.role_name OR u.role_id IS NULL;
