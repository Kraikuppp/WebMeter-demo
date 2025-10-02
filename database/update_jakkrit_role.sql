-- อัปเดต role_id สำหรับ user Jakkrit ให้ใช้ role ที่มี permissions จริง

-- 1. ตรวจสอบ roles ที่มีอยู่
SELECT 'Available roles:' as info;
SELECT id, role_name, description FROM users.roles ORDER BY id;

-- 2. ตรวจสอบสถานะปัจจุบันของ Jakkrit
SELECT 'Current Jakkrit status:' as info;
SELECT 
    u.id, u.username, u.level, u.role_id,
    r.role_name as current_role_name
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit';

-- 3. หา role_id ของ Test (ที่มี permissions แล้ว)
SELECT 'Test role info:' as info;
SELECT 
    r.id, r.role_name,
    COUNT(rp.id) as permissions_count
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE r.role_name = 'Test'
GROUP BY r.id, r.role_name;

-- 4. อัปเดต role_id สำหรับ Jakkrit
UPDATE users.users 
SET role_id = (
    SELECT id FROM users.roles WHERE role_name = 'Test'
)
WHERE username = 'Jakkrit';

-- 5. ตรวจสอบผลลัพธ์
SELECT 'After update:' as info;
SELECT 
    u.username, u.level, u.role_id,
    r.role_name,
    COUNT(rp.id) as available_permissions
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE u.username = 'Jakkrit'
GROUP BY u.username, u.level, u.role_id, r.role_name;

-- 6. แสดง permissions ที่ Jakkrit จะได้รับ
SELECT 'Jakkrit permissions:' as info;
SELECT 
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report
FROM users.users u
JOIN users.roles r ON u.role_id = r.id
JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE u.username = 'Jakkrit'
ORDER BY rp.module;
