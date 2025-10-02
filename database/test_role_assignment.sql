-- Test Script: ทดสอบการ assign role และ permissions

-- 1. ตรวจสอบสถานะปัจจุบัน
SELECT '=== CURRENT STATUS ===' as info;
SELECT 
    u.id, u.username, u.level, u.role_id,
    r.role_name as current_role_name,
    COUNT(rp.id) as permissions_count
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE u.username IN ('Jakkrit', 'amptron06', 'gaii')
GROUP BY u.id, u.username, u.level, u.role_id, r.role_name
ORDER BY u.username;

-- 2. ตรวจสอบ roles ที่มีอยู่
SELECT '=== AVAILABLE ROLES ===' as info;
SELECT 
    r.id, r.role_name, r.description,
    COUNT(rp.id) as permissions_count
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.role_name, r.description
ORDER BY r.role_name;

-- 3. ทดสอบ: กำหนด role Admin ให้ Jakkrit
UPDATE users.users 
SET role_id = (SELECT id FROM users.roles WHERE role_name = 'Admin')
WHERE username = 'Jakkrit';

-- 4. ทดสอบ: กำหนด role Test ให้ gaii
UPDATE users.users 
SET role_id = (SELECT id FROM users.roles WHERE role_name = 'Test')
WHERE username = 'gaii';

-- 5. ตรวจสอบผลลัพธ์หลัง update
SELECT '=== AFTER UPDATE ===' as info;
SELECT 
    u.id, u.username, u.level, u.role_id,
    r.role_name as new_role_name,
    COUNT(rp.id) as available_permissions
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE u.username IN ('Jakkrit', 'amptron06', 'gaii')
GROUP BY u.id, u.username, u.level, u.role_id, r.role_name
ORDER BY u.username;

-- 6. แสดง permissions ที่แต่ละคนจะได้รับ
SELECT '=== JAKKRIT PERMISSIONS ===' as info;
SELECT 
    rp.module, rp.can_read, rp.can_write, rp.can_report
FROM users.users u
JOIN users.roles r ON u.role_id = r.id
JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE u.username = 'Jakkrit'
ORDER BY rp.module;

SELECT '=== GAII PERMISSIONS ===' as info;
SELECT 
    rp.module, rp.can_read, rp.can_write, rp.can_report
FROM users.users u
JOIN users.roles r ON u.role_id = r.id
JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE u.username = 'gaii'
ORDER BY rp.module;

-- 7. ทดสอบ query ที่ใช้ใน authentication
SELECT '=== AUTH QUERY TEST ===' as info;
SELECT 
    u.id, u.username, u.email, u.level, u.status,
    u.role_id, r.role_name
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit';

-- 8. สรุปผลการทดสอบ
SELECT '=== SUMMARY ===' as info;
SELECT 
    'Total users with roles' as metric,
    COUNT(*) as count
FROM users.users u
WHERE u.role_id IS NOT NULL;

SELECT 
    'Total users without roles' as metric,
    COUNT(*) as count
FROM users.users u
WHERE u.role_id IS NULL;
