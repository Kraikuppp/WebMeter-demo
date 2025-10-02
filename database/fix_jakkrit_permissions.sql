-- แก้ไข permissions สำหรับ user Jakkrit
-- ปัญหา: role_name = null, level = 'Test'

-- 1. ตรวจสอบสถานะปัจจุบัน
SELECT 'Current status for Jakkrit:' as info;
SELECT 
    id, username, level, role_id, 
    (SELECT role_name FROM users.roles WHERE id = users.role_id) as current_role_name,
    status
FROM users.users 
WHERE username = 'Jakkrit';

-- 2. สร้าง role 'Test' ถ้ายังไม่มี
INSERT INTO users.roles (role_name, description) 
VALUES ('Test', 'Test role with basic permissions')
ON CONFLICT (role_name) DO NOTHING;

-- 3. อัปเดต role_id สำหรับ Jakkrit
UPDATE users.users 
SET role_id = (SELECT id FROM users.roles WHERE role_name = 'Test')
WHERE username = 'Jakkrit';

-- 4. ตั้งค่า permissions สำหรับ Test role
DO $$
DECLARE
    test_role_id INTEGER;
    modules TEXT[] := ARRAY['Dashboard', 'Table Data', 'Online Data', 'Graph Data'];
    module_name TEXT;
BEGIN
    -- ดึง role_id ของ Test
    SELECT id INTO test_role_id FROM users.roles WHERE role_name = 'Test';
    
    IF test_role_id IS NOT NULL THEN
        -- ลบ permissions เก่า
        DELETE FROM users.role_permissions WHERE role_id = test_role_id;
        
        -- เพิ่ม permissions ใหม่
        FOREACH module_name IN ARRAY modules LOOP
            INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
            VALUES (test_role_id, module_name, true, false, true);
        END LOOP;
        
        RAISE NOTICE 'Set permissions for Test role: %', modules;
    END IF;
END $$;

-- 5. ตรวจสอบผลลัพธ์
SELECT 'After fix:' as info;
SELECT 
    u.username,
    u.level,
    r.role_name,
    u.status
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit';

-- 6. แสดง permissions ที่ได้
SELECT 'Permissions for Jakkrit:' as info;
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
