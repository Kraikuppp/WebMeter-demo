-- Migration Script: แก้ไขปัญหา level/role_name ให้ใช้ role_name เป็นหลัก
-- วิธีง่ายๆ: ย้าย level ไปเป็น role_name และลบ level ออก

-- 1. แสดงสถานะปัจจุบัน
SELECT 'Current User Status:' as info;
SELECT 
    username,
    level,
    role_id,
    (SELECT role_name FROM users.roles WHERE id = users.role_id) as current_role_name,
    status
FROM users.users 
ORDER BY username;

-- 2. สร้าง roles ใหม่ตาม level ที่มีอยู่ (ถ้ายังไม่มี)
INSERT INTO users.roles (role_name, description)
SELECT DISTINCT 
    level as role_name,
    'Migrated from level: ' || level as description
FROM users.users 
WHERE level IS NOT NULL 
AND level NOT IN (SELECT role_name FROM users.roles)
ON CONFLICT (role_name) DO NOTHING;

-- 3. อัปเดต role_id ให้ตรงกับ level
UPDATE users.users 
SET role_id = (
    SELECT r.id 
    FROM users.roles r 
    WHERE r.role_name = users.level
)
WHERE level IS NOT NULL 
AND role_id IS NULL;

-- 4. สำหรับ users ที่ไม่มี level ให้ใช้ Guest role
UPDATE users.users 
SET role_id = (
    SELECT id 
    FROM users.roles 
    WHERE role_name = 'Guest'
)
WHERE role_id IS NULL;

-- 5. แสดงผลลัพธ์หลัง migration
SELECT 'After Migration:' as info;
SELECT 
    u.username,
    u.level as old_level,
    r.role_name as new_role,
    u.status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
ORDER BY u.username;

-- 6. ตรวจสอบว่าทุกคนมี role_id แล้ว
SELECT 
    'Users without role_id:' as info,
    COUNT(*) as count
FROM users.users 
WHERE role_id IS NULL;

-- 7. แสดงสรุป roles ที่มี
SELECT 
    'Available Roles:' as info,
    r.role_name,
    COUNT(u.id) as user_count
FROM users.roles r
LEFT JOIN users.users u ON u.role_id = r.id
GROUP BY r.id, r.role_name
ORDER BY r.role_name;

-- 8. คำแนะนำสำหรับขั้นตอนต่อไป
SELECT 'Next Steps:' as info;
SELECT '1. ตรวจสอบว่าทุก user มี role_id แล้ว' as step;
SELECT '2. ลบ column level ออกจาก users table (ถ้าต้องการ)' as step;
SELECT '3. อัปเดต application code ให้ใช้ role_name เท่านั้น' as step;
SELECT '4. ตั้งค่า permissions สำหรับ roles ใหม่ที่ migrate มา' as step;
