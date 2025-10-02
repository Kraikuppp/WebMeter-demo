-- Setup Complete Permissions System for WebMeter
-- This script will create a comprehensive permissions system that works with both role_id and level fallback

-- 1. Create roles table if not exists
CREATE TABLE IF NOT EXISTS users.roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create role_permissions table if not exists
CREATE TABLE IF NOT EXISTS users.role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES users.roles(id) ON DELETE CASCADE,
    module VARCHAR(100) NOT NULL,
    can_read BOOLEAN DEFAULT false,
    can_write BOOLEAN DEFAULT false,
    can_report BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, module)
);

-- 3. Insert default roles
INSERT INTO users.roles (role_name, description) VALUES
    ('Admin', 'Full system administrator with all permissions'),
    ('Manager', 'Manager with most permissions except user management'),
    ('Supervisor', 'Supervisor with limited administrative access'),
    ('Engineer', 'Engineer with technical access but no admin functions'),
    ('Operator', 'Basic operator with dashboard and export access'),
    ('Test', 'Test role with basic permissions for testing'),
    ('Guest', 'Guest user with minimal read-only access')
ON CONFLICT (role_name) DO NOTHING;

-- 4. Define all system modules
DO $$
DECLARE
    modules TEXT[] := ARRAY[
        'Dashboard', 'Table Data', 'Online Data', 'Graph Data', 'Line Graph',
        'Demand Graph', 'Energy Graph', 'Compare Graph', 'TOU', 'TOU Demand Graph',
        'TOU Energy Graph', 'TOU Compare Graph', 'Charge', 'Event', 'Config',
        'Export Data', 'Email Line', 'User Management', 'Meter Tree', 'Holiday'
    ];
    module_name TEXT;
    role_record RECORD;
BEGIN
    -- 5. Setup permissions for each role
    
    -- Admin: Full access to everything
    SELECT id INTO role_record FROM users.roles WHERE role_name = 'Admin';
    IF FOUND THEN
        FOREACH module_name IN ARRAY modules LOOP
            INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
            VALUES (role_record.id, module_name, true, true, true)
            ON CONFLICT (role_id, module) DO UPDATE SET
                can_read = true, can_write = true, can_report = true, updated_at = CURRENT_TIMESTAMP;
        END LOOP;
    END IF;
    
    -- Manager: Almost everything except User Management
    SELECT id INTO role_record FROM users.roles WHERE role_name = 'Manager';
    IF FOUND THEN
        FOREACH module_name IN ARRAY modules LOOP
            IF module_name = 'User Management' THEN
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, false, false, false)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = false, can_write = false, can_report = false, updated_at = CURRENT_TIMESTAMP;
            ELSE
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, true, true, true)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = true, can_write = true, can_report = true, updated_at = CURRENT_TIMESTAMP;
            END IF;
        END LOOP;
    END IF;
    
    -- Supervisor: No User Management and Config
    SELECT id INTO role_record FROM users.roles WHERE role_name = 'Supervisor';
    IF FOUND THEN
        FOREACH module_name IN ARRAY modules LOOP
            IF module_name IN ('User Management', 'Config') THEN
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, false, false, false)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = false, can_write = false, can_report = false, updated_at = CURRENT_TIMESTAMP;
            ELSE
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, true, true, true)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = true, can_write = true, can_report = true, updated_at = CURRENT_TIMESTAMP;
            END IF;
        END LOOP;
    END IF;
    
    -- Engineer: No User Management, Config, Meter Tree
    SELECT id INTO role_record FROM users.roles WHERE role_name = 'Engineer';
    IF FOUND THEN
        FOREACH module_name IN ARRAY modules LOOP
            IF module_name IN ('User Management', 'Config', 'Meter Tree') THEN
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, false, false, false)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = false, can_write = false, can_report = false, updated_at = CURRENT_TIMESTAMP;
            ELSE
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, true, true, true)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = true, can_write = true, can_report = true, updated_at = CURRENT_TIMESTAMP;
            END IF;
        END LOOP;
    END IF;
    
    -- Operator: Only Dashboard and Export Data
    SELECT id INTO role_record FROM users.roles WHERE role_name = 'Operator';
    IF FOUND THEN
        FOREACH module_name IN ARRAY modules LOOP
            IF module_name IN ('Dashboard', 'Export Data') THEN
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, true, false, true)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = true, can_write = false, can_report = true, updated_at = CURRENT_TIMESTAMP;
            ELSE
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, false, false, false)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = false, can_write = false, can_report = false, updated_at = CURRENT_TIMESTAMP;
            END IF;
        END LOOP;
    END IF;
    
    -- Test: Basic permissions for testing
    SELECT id INTO role_record FROM users.roles WHERE role_name = 'Test';
    IF FOUND THEN
        FOREACH module_name IN ARRAY modules LOOP
            IF module_name IN ('Dashboard', 'Table Data', 'Online Data', 'Graph Data') THEN
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, true, false, true)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = true, can_write = false, can_report = true, updated_at = CURRENT_TIMESTAMP;
            ELSE
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, false, false, false)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = false, can_write = false, can_report = false, updated_at = CURRENT_TIMESTAMP;
            END IF;
        END LOOP;
    END IF;
    
    -- Guest: Only Dashboard read-only
    SELECT id INTO role_record FROM users.roles WHERE role_name = 'Guest';
    IF FOUND THEN
        FOREACH module_name IN ARRAY modules LOOP
            IF module_name = 'Dashboard' THEN
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, true, false, false)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = true, can_write = false, can_report = false, updated_at = CURRENT_TIMESTAMP;
            ELSE
                INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
                VALUES (role_record.id, module_name, false, false, false)
                ON CONFLICT (role_id, module) DO UPDATE SET
                    can_read = false, can_write = false, can_report = false, updated_at = CURRENT_TIMESTAMP;
            END IF;
        END LOOP;
    END IF;
END $$;

-- 6. Update existing users to have proper role_id based on their level
UPDATE users.users 
SET role_id = (
    SELECT r.id 
    FROM users.roles r 
    WHERE r.role_name = users.users.level
)
WHERE role_id IS NULL 
AND level IS NOT NULL 
AND EXISTS (
    SELECT 1 
    FROM users.roles r 
    WHERE r.role_name = users.users.level
);

-- 7. Set default role for users without matching level
UPDATE users.users 
SET role_id = (
    SELECT id 
    FROM users.roles 
    WHERE role_name = 'Guest'
)
WHERE role_id IS NULL;

-- 8. Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to roles table
DROP TRIGGER IF EXISTS update_roles_updated_at ON users.roles;
CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON users.roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to role_permissions table
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON users.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at 
    BEFORE UPDATE ON users.role_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Create useful views for permissions management
CREATE OR REPLACE VIEW users.user_permissions_view AS
SELECT 
    u.id as user_id,
    u.username,
    u.name,
    u.email,
    u.level,
    u.status,
    r.role_name,
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE u.status = 'active'
ORDER BY u.username, rp.module;

-- 10. Show summary of what was created
SELECT 'Setup Summary:' as info;

SELECT 
    'Roles Created:' as info,
    COUNT(*) as count
FROM users.roles;

SELECT 
    'Role Permissions Created:' as info,
    COUNT(*) as count
FROM users.role_permissions;

SELECT 
    'Users with Role ID:' as info,
    COUNT(*) as count
FROM users.users 
WHERE role_id IS NOT NULL;

SELECT 
    'Users by Role:' as info,
    r.role_name,
    COUNT(u.id) as user_count
FROM users.roles r
LEFT JOIN users.users u ON u.role_id = r.id
GROUP BY r.role_name
ORDER BY r.role_name;

-- 11. Show sample permissions for verification
SELECT 
    'Sample Permissions for Test Role:' as info,
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report
FROM users.roles r
JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE r.role_name = 'Test'
ORDER BY rp.module;
