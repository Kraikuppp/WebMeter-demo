-- สร้าง Admin role และ permissions ถ้ายังไม่มี
-- รันไฟล์นี้เพื่อให้แน่ใจว่ามี Admin role ใน database

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

-- 4. Insert Admin role ถ้ายังไม่มี
INSERT INTO users.roles (role_name, description) VALUES 
    ('Admin', 'System Administrator with full access')
ON CONFLICT (role_name) DO NOTHING;

-- 5. Insert Admin permissions
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

-- 6. ตรวจสอบผลลัพธ์
SELECT 'Current roles in database:' as info;
SELECT id, role_name, description, created_at FROM users.roles ORDER BY role_name;

SELECT 'Admin permissions count:' as info;
SELECT COUNT(*) as permission_count FROM users.role_permissions rp
JOIN users.roles r ON r.id = rp.role_id
WHERE r.role_name = 'Admin';

-- 7. แสดง Admin permissions
SELECT 'Admin permissions:' as info;
SELECT rp.module, rp.can_read, rp.can_write, rp.can_report
FROM users.role_permissions rp
JOIN users.roles r ON r.id = rp.role_id
WHERE r.role_name = 'Admin'
ORDER BY rp.module;
