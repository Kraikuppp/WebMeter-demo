-- Phase 1: Complete Migration from level to role_name
-- ขั้นตอนการ migrate อย่างปลอดภัย

-- 1. ตรวจสอบสถานะปัจจุบัน
SELECT '=== CURRENT STATUS ===' as info;
SELECT 
    COUNT(*) as total_users,
    COUNT(role_id) as users_with_role_id,
    COUNT(*) - COUNT(role_id) as users_without_role_id
FROM users.users;

-- 2. แสดง users ที่ยังไม่มี role_id
SELECT '=== USERS WITHOUT ROLE_ID ===' as info;
SELECT id, username, level, role_id, status
FROM users.users 
WHERE role_id IS NULL
ORDER BY username;

-- 3. สร้าง roles สำหรับ level ที่ยังไม่มี role
INSERT INTO users.roles (role_name, description)
SELECT DISTINCT 
    u.level as role_name,
    CONCAT('Auto-created role for level: ', u.level) as description
FROM users.users u
LEFT JOIN users.roles r ON r.role_name = u.level
WHERE u.role_id IS NULL 
AND u.level IS NOT NULL
AND r.id IS NULL
ON CONFLICT (role_name) DO NOTHING;

-- 4. อัปเดต role_id สำหรับ users ที่ยังไม่มี
UPDATE users.users 
SET role_id = (
    SELECT r.id 
    FROM users.roles r 
    WHERE r.role_name = users.users.level
)
WHERE role_id IS NULL 
AND level IS NOT NULL;

-- 5. สร้าง default permissions สำหรับ roles ใหม่
DO $$
DECLARE
    role_record RECORD;
    modules TEXT[] := ARRAY[
        'Dashboard', 'Table Data', 'Online Data', 'Graph Data', 'Line Graph',
        'Demand Graph', 'Energy Graph', 'Compare Graph', 'TOU', 'TOU Demand Graph',
        'TOU Energy Graph', 'TOU Compare Graph', 'Charge', 'Event', 'Config',
        'Export Data', 'Email Line', 'User Management', 'Meter Tree', 'Holiday'
    ];
    module_name TEXT;
BEGIN
    -- สำหรับแต่ละ role ที่ไม่มี permissions
    FOR role_record IN 
        SELECT r.id, r.role_name 
        FROM users.roles r
        LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
        WHERE rp.role_id IS NULL
    LOOP
        RAISE NOTICE 'Creating permissions for role: %', role_record.role_name;
        
        -- สร้าง permissions ตาม role type
        FOREACH module_name IN ARRAY modules LOOP
            IF role_record.role_name IN ('Admin', 'Administrator') THEN
                -- Admin มีสิทธิ์ทุกอย่าง
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, true, true, true);
            ELSIF role_record.role_name IN ('Manager', 'Supervisor') THEN
                -- Manager มีสิทธิ์เกือบทุกอย่าง ยกเว้น User Management
                IF module_name = 'User Management' THEN
                    INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                    VALUES (role_record.id, module_name, false, false, false);
                ELSE
                    INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                    VALUES (role_record.id, module_name, true, true, true);
                END IF;
            ELSIF role_record.role_name IN ('Test', 'Engineer', 'Operator') THEN
                -- Test/Engineer มีสิทธิ์พื้นฐาน
                IF module_name IN ('Dashboard', 'Table Data', 'Online Data', 'Graph Data', 'Config', 'TOU') THEN
                    INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                    VALUES (role_record.id, module_name, true, true, true);
                ELSE
                    INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                    VALUES (role_record.id, module_name, false, false, false);
                END IF;
            ELSE
                -- Default: เฉพาะ Dashboard
                IF module_name = 'Dashboard' THEN
                    INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                    VALUES (role_record.id, module_name, true, false, false);
                ELSE
                    INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                    VALUES (role_record.id, module_name, false, false, false);
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 6. ตรวจสอบผลลัพธ์
SELECT '=== AFTER MIGRATION ===' as info;
SELECT 
    u.id, u.username, u.level, u.role_id, r.role_name,
    COUNT(rp.id) as permissions_count
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
GROUP BY u.id, u.username, u.level, u.role_id, r.role_name
ORDER BY u.username;

-- 7. เพิ่มคอลัมน์ใหม่สำหรับ backup (optional)
-- ALTER TABLE users.users ADD COLUMN legacy_level VARCHAR(50);
-- UPDATE users.users SET legacy_level = level;

-- 8. สรุปสถิติ
SELECT '=== MIGRATION SUMMARY ===' as info;
SELECT 
    'Total users' as metric,
    COUNT(*) as count
FROM users.users;

SELECT 
    'Users with role_id' as metric,
    COUNT(*) as count
FROM users.users 
WHERE role_id IS NOT NULL;

SELECT 
    'Roles created' as metric,
    COUNT(*) as count
FROM users.roles;

SELECT 
    'Total permissions' as metric,
    COUNT(*) as count
FROM users.role_permissions;
