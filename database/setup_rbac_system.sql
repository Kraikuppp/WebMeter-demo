-- =====================================================
-- WebMeter RBAC System Setup Script
-- =====================================================
-- This script sets up the complete Role-Based Access Control system
-- Run this after creating the basic users and roles tables

-- Step 1: Create role_permissions table if not exists
CREATE TABLE IF NOT EXISTS users.role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES users.roles(id) ON DELETE CASCADE,
    module VARCHAR(100) NOT NULL,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    can_report BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of role and module
    UNIQUE(role_id, module)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON users.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON users.role_permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permissions ON users.role_permissions(can_read, can_write, can_report);

-- Step 3: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 4: Create trigger
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON users.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON users.role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_role_permissions_updated_at();

-- Step 5: Insert only Admin role as default
INSERT INTO users.roles (role_name, description) VALUES 
    ('Admin', 'System Administrator with full access')
ON CONFLICT (role_name) DO NOTHING;

-- Step 6: Clear existing permissions to start fresh
DELETE FROM users.role_permissions;

-- Step 7: Insert Admin permissions (full access to everything)
WITH modules AS (
    SELECT unnest(ARRAY[
        'Dashboard',
        'Online Data',
        'Table Data',
        'Graph Data',
        'Compare Graph',
        'Energy Graph',
        'Demand Graph',
        'Line Graph',
        'TOU Compare',
        'TOU Energy',
        'TOU Demand',
        'Export',
        'Event',
        'Meter Tree',
        'Config',
        'Email - Email List',
        'Email - Setup & Edit',
        'User Management',
        'User Permissions'
    ]) AS module_name
)
INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
SELECT 
    r.id,
    m.module_name,
    true,
    true,
    true
FROM users.roles r
CROSS JOIN modules m
WHERE r.role_name = 'Admin';

-- Step 8: Other roles will be created dynamically by Admin
-- Admin can create new roles and assign permissions as needed
-- This provides flexibility for different organizational structures

-- Step 9: Create helpful views for role management
CREATE OR REPLACE VIEW users.role_permissions_summary AS
SELECT 
    r.id as role_id,
    r.role_name,
    r.description as role_description,
    COUNT(rp.id) as total_modules,
    COUNT(CASE WHEN rp.can_read = true THEN 1 END) as read_count,
    COUNT(CASE WHEN rp.can_write = true THEN 1 END) as write_count,
    COUNT(CASE WHEN rp.can_report = true THEN 1 END) as report_count,
    (SELECT COUNT(*) FROM users.users u WHERE u.level = r.role_name) as user_count,
    r.created_at,
    r.updated_at
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.role_name, r.description, r.created_at, r.updated_at
ORDER BY r.role_name;

-- Step 10: Create detailed permissions view
CREATE OR REPLACE VIEW users.role_permissions_detail AS
SELECT 
    r.id as role_id,
    r.role_name,
    r.description as role_description,
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report,
    rp.created_at as permission_created_at,
    rp.updated_at as permission_updated_at,
    (SELECT COUNT(*) FROM users.users u WHERE u.level = r.role_name) as user_count
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
ORDER BY r.role_name, rp.module;

-- Step 11: Insert sample admin user if not exists
INSERT INTO users.users (username, email, password, name, surname, level, status, created_at, updated_at)
VALUES (
    'admin',
    'admin@webmeter.com',
    '$2b$10$example.hash.for.password123', -- This should be properly hashed
    'System',
    'Administrator',
    'Admin',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

-- Step 12: Add comments for documentation
COMMENT ON TABLE users.role_permissions IS 'Stores permissions for each role and module combination in the RBAC system';
COMMENT ON COLUMN users.role_permissions.role_id IS 'Foreign key reference to users.roles table';
COMMENT ON COLUMN users.role_permissions.module IS 'Name of the module/page (e.g., Dashboard, Online Data, etc.)';
COMMENT ON COLUMN users.role_permissions.can_read IS 'Whether the role can view/read the module';
COMMENT ON COLUMN users.role_permissions.can_write IS 'Whether the role can edit/modify in the module';
COMMENT ON COLUMN users.role_permissions.can_report IS 'Whether the role can generate reports from the module';

-- Step 13: Display setup results
SELECT 
    '🎯 RBAC System Setup Complete!' as status,
    COUNT(DISTINCT r.role_name) as total_roles,
    COUNT(rp.id) as total_permissions,
    COUNT(DISTINCT rp.module) as total_modules
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id;

-- Step 14: Show role summary
SELECT 
    '📊 Role Summary:' as info,
    role_name,
    user_count as users,
    read_count as read_perms,
    write_count as write_perms,
    total_modules
FROM users.role_permissions_summary
ORDER BY role_name;

-- Step 15: Success message
SELECT '✅ WebMeter RBAC System has been successfully set up with Admin-only workflow!' as message;
SELECT '🔐 Only Admin role is created by default. Other roles must be created by Admin as needed.' as workflow;
SELECT '👥 New users will need to request access from Admin who can create appropriate roles and permissions.' as process;
