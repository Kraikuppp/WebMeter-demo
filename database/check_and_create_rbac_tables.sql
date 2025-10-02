-- ตรวจสอบและสร้างตาราง RBAC ที่จำเป็น
-- รันไฟล์นี้เพื่อแก้ไขปัญหา permission denied และ missing tables

-- ตรวจสอบว่ามี schema users หรือไม่
CREATE SCHEMA IF NOT EXISTS users;

-- ตรวจสอบตาราง roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'users' AND table_name = 'roles') THEN
        CREATE TABLE users.roles (
            id SERIAL PRIMARY KEY,
            role_name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Insert Admin role
        INSERT INTO users.roles (role_name, description) VALUES 
            ('Admin', 'System Administrator with full access')
        ON CONFLICT (role_name) DO NOTHING;
        
        RAISE NOTICE 'Created users.roles table and inserted Admin role';
    ELSE
        RAISE NOTICE 'users.roles table already exists';
    END IF;
END $$;

-- ตรวจสอบตาราง role_permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'users' AND table_name = 'role_permissions') THEN
        CREATE TABLE users.role_permissions (
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
        
        -- Create indexes
        CREATE INDEX idx_role_permissions_role_id ON users.role_permissions(role_id);
        CREATE INDEX idx_role_permissions_module ON users.role_permissions(module);
        
        RAISE NOTICE 'Created users.role_permissions table';
    ELSE
        RAISE NOTICE 'users.role_permissions table already exists';
    END IF;
END $$;

-- Insert default permissions for Admin role
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

-- Grant permissions to webmeter_app user
GRANT USAGE ON SCHEMA users TO webmeter_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users.roles TO webmeter_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users.role_permissions TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE users.roles_id_seq TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE users.role_permissions_id_seq TO webmeter_app;

-- ตรวจสอบผลลัพธ์
SELECT 'RBAC Tables Status:' as info;
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'users' 
AND tablename IN ('roles', 'role_permissions')
ORDER BY tablename;

-- ตรวจสอบข้อมูล
SELECT 'Roles in database:' as info;
SELECT id, role_name, description FROM users.roles ORDER BY role_name;

SELECT 'Permissions count:' as info;
SELECT 
    r.role_name,
    COUNT(rp.id) as permission_count
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.role_name
ORDER BY r.role_name;
