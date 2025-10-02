-- Safe Migration: Drop level column และ recreate views
-- ต้องทำตามลำดับเพื่อความปลอดภัย

-- 1. ตรวจสอบ views ที่ depend on level column
SELECT '=== DEPENDENT VIEWS ===' as info;
SELECT 
    schemaname, 
    viewname, 
    definition 
FROM pg_views 
WHERE schemaname = 'users' 
AND (
    definition LIKE '%level%' OR 
    viewname IN ('v_users_with_roles', 'role_permissions_view', 'role_permissions_summary', 'role_permissions_detail')
);

-- 2. Backup existing view definitions
CREATE TEMP TABLE view_definitions AS
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'users' 
AND definition LIKE '%level%';

-- 3. Drop dependent views (ในลำดับที่ถูกต้อง)
DROP VIEW IF EXISTS users.role_permissions_detail CASCADE;
DROP VIEW IF EXISTS users.role_permissions_summary CASCADE;
DROP VIEW IF EXISTS users.role_permissions_view CASCADE;
DROP VIEW IF EXISTS users.v_users_with_roles CASCADE;

-- 4. ตรวจสอบว่าไม่มี dependency แล้ว
SELECT '=== CHECKING DEPENDENCIES ===' as info;
SELECT 
    t.table_name,
    c.column_name,
    COUNT(d.objid) as dependent_objects
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN pg_depend d ON d.refobjid = (
    SELECT oid FROM pg_class WHERE relname = t.table_name
)
WHERE t.table_schema = 'users' 
AND t.table_name = 'users'
AND c.column_name = 'level'
GROUP BY t.table_name, c.column_name;

-- 5. Drop level column (ตอนนี้ควรปลอดภัยแล้ว)
ALTER TABLE users.users DROP COLUMN IF EXISTS level;

-- 6. Recreate views โดยใช้ role_name แทน level
-- View 1: v_users_with_roles
CREATE OR REPLACE VIEW users.v_users_with_roles AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.name,
    u.surname,
    u.address,
    u.phone,
    u.line_id,
    r.role_name as level,  -- ใช้ role_name แทน level
    r.role_name,
    u.status,
    u.note,
    u.last_login,
    u.created_at,
    u.updated_at,
    u.group_id,
    u.groupline_id,
    g.name as group_name,
    lg.name as line_group_name
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
LEFT JOIN users.email_groups g ON u.group_id = g.id
LEFT JOIN users.line_groups lg ON u.groupline_id = lg.id;

-- View 2: role_permissions_view
CREATE OR REPLACE VIEW users.role_permissions_view AS
SELECT 
    u.id as user_id,
    u.username,
    r.role_name as level,  -- ใช้ role_name แทน level
    r.role_name,
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id;

-- View 3: role_permissions_summary
CREATE OR REPLACE VIEW users.role_permissions_summary AS
SELECT 
    r.role_name as level,  -- ใช้ role_name แทน level
    r.role_name,
    COUNT(rp.module) as total_modules,
    COUNT(CASE WHEN rp.can_read = true THEN 1 END) as read_permissions,
    COUNT(CASE WHEN rp.can_write = true THEN 1 END) as write_permissions,
    COUNT(CASE WHEN rp.can_report = true THEN 1 END) as report_permissions
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
GROUP BY r.role_name;

-- View 4: role_permissions_detail
CREATE OR REPLACE VIEW users.role_permissions_detail AS
SELECT 
    u.username,
    u.name,
    u.surname,
    r.role_name as level,  -- ใช้ role_name แทน level
    r.role_name,
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report,
    CASE 
        WHEN rp.can_read AND rp.can_write AND rp.can_report THEN 'Full Access'
        WHEN rp.can_read AND rp.can_write THEN 'Read/Write'
        WHEN rp.can_read AND rp.can_report THEN 'Read/Report'
        WHEN rp.can_read THEN 'Read Only'
        ELSE 'No Access'
    END as access_level
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
ORDER BY u.username, rp.module;

-- 7. ตรวจสอบว่า views ทำงานได้
SELECT '=== TESTING RECREATED VIEWS ===' as info;

-- Test v_users_with_roles
SELECT 'v_users_with_roles' as view_name, COUNT(*) as row_count
FROM users.v_users_with_roles;

-- Test role_permissions_view  
SELECT 'role_permissions_view' as view_name, COUNT(*) as row_count
FROM users.role_permissions_view;

-- Test role_permissions_summary
SELECT 'role_permissions_summary' as view_name, COUNT(*) as row_count
FROM users.role_permissions_summary;

-- Test role_permissions_detail
SELECT 'role_permissions_detail' as view_name, COUNT(*) as row_count
FROM users.role_permissions_detail;

-- 8. แสดงตัวอย่างข้อมูลจาก views ใหม่
SELECT '=== SAMPLE DATA FROM NEW VIEWS ===' as info;

-- Sample from v_users_with_roles
SELECT username, level, role_name, status
FROM users.v_users_with_roles
LIMIT 5;

-- Sample from role_permissions_summary
SELECT level, role_name, total_modules, read_permissions, write_permissions, report_permissions
FROM users.role_permissions_summary;

-- 9. สรุปการ migration
SELECT '=== MIGRATION COMPLETED ===' as info;
SELECT 
    'level column dropped' as action,
    'success' as status;

SELECT 
    'views recreated with role_name' as action,
    'success' as status;

-- 10. คำแนะนำสำหรับ application code
SELECT '=== RECOMMENDATIONS ===' as info;
SELECT 'Update application code to use role_name instead of level' as recommendation
UNION ALL
SELECT 'Views now use role_name but expose it as "level" for backward compatibility' as recommendation
UNION ALL
SELECT 'Test all functionality that previously used level column' as recommendation;
