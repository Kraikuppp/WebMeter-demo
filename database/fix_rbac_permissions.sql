-- แก้ไขปัญหา permission denied สำหรับ RBAC tables
-- รันไฟล์นี้เพื่อแก้ไขปัญหาสิทธิ์การเข้าถึง

-- 1. สร้าง schema users ถ้ายังไม่มี
CREATE SCHEMA IF NOT EXISTS users;

-- 2. สร้างตาราง roles ถ้ายังไม่มี
CREATE TABLE IF NOT EXISTS users.roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. สร้างตาราง role_permissions ถ้ายังไม่มี
CREATE TABLE IF NOT EXISTS users.role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES users.roles(id) ON DELETE CASCADE,
    module VARCHAR(100) NOT NULL,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    can_report BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, module)
);

-- 4. สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON users.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON users.role_permissions(module);

-- 5. Grant สิทธิ์ให้ webmeter_app
GRANT USAGE ON SCHEMA users TO webmeter_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users.roles TO webmeter_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users.role_permissions TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE users.roles_id_seq TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE users.role_permissions_id_seq TO webmeter_app;

-- 6. Insert Admin role ถ้ายังไม่มี
INSERT INTO users.roles (role_name, description) VALUES 
    ('Admin', 'System Administrator with full access')
ON CONFLICT (role_name) DO NOTHING;

-- 7. Insert Admin permissions
INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
SELECT 
    r.id,
    module_name,
    true,
    true,
    true
FROM users.roles r
CROSS JOIN (
    VALUES 
    ('Dashboard'),
    ('Online Data'),
    ('Table Data'),
    ('Graph Data'),
    ('Compare Graph'),
    ('Energy Graph'),
    ('Demand Graph'),
    ('Line Graph'),
    ('TOU Compare'),
    ('TOU Energy'),
    ('TOU Demand'),
    ('Export'),
    ('Event'),
    ('Meter Tree'),
    ('Config'),
    ('Email - Email List'),
    ('Email - Setup & Edit'),
    ('User Management'),
    ('User Permissions')
) AS modules(module_name)
WHERE r.role_name = 'Admin'
ON CONFLICT (role_id, module) DO NOTHING;

-- 8. ตรวจสอบผลลัพธ์
SELECT 'Setup completed successfully!' as status;

SELECT 'Roles in database:' as info;
SELECT id, role_name, description, created_at FROM users.roles ORDER BY role_name;

SELECT 'Admin permissions count:' as info;
SELECT COUNT(*) as permission_count FROM users.role_permissions rp
JOIN users.roles r ON r.id = rp.role_id
WHERE r.role_name = 'Admin';

-- 9. ตรวจสอบสิทธิ์
SELECT 'Checking permissions for webmeter_app:' as info;
SELECT 
    schemaname,
    tablename,
    has_table_privilege('webmeter_app', schemaname||'.'||tablename, 'SELECT') as can_select,
    has_table_privilege('webmeter_app', schemaname||'.'||tablename, 'INSERT') as can_insert,
    has_table_privilege('webmeter_app', schemaname||'.'||tablename, 'UPDATE') as can_update,
    has_table_privilege('webmeter_app', schemaname||'.'||tablename, 'DELETE') as can_delete
FROM pg_tables 
WHERE schemaname = 'users' 
AND tablename IN ('roles', 'role_permissions')
ORDER BY tablename;
