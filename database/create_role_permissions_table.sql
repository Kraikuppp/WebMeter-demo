-- Create role_permissions table for storing role-based permissions
-- This table links roles to specific module permissions

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
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON users.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON users.role_permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permissions ON users.role_permissions(can_read, can_write, can_report);

-- Insert default permissions for existing roles
-- Admin role - full access to everything
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

-- Note: Other roles will be created dynamically by Admin as needed
-- No default roles except Admin will be inserted

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON users.role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_role_permissions_updated_at();

-- Create view for easier querying of role permissions
CREATE OR REPLACE VIEW users.role_permissions_view AS
SELECT 
    r.id as role_id,
    r.role_name,
    r.description as role_description,
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report,
    rp.created_at,
    rp.updated_at,
    (SELECT COUNT(*) FROM users.users u WHERE u.level = r.role_name) as user_count
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id
ORDER BY r.role_name, rp.module;

COMMENT ON TABLE users.role_permissions IS 'Stores permissions for each role and module combination in the RBAC system';
COMMENT ON COLUMN users.role_permissions.role_id IS 'Foreign key reference to users.roles table';
COMMENT ON COLUMN users.role_permissions.module IS 'Name of the module/page (e.g., Dashboard, Online Data, etc.)';
COMMENT ON COLUMN users.role_permissions.can_read IS 'Whether the role can view/read the module';
COMMENT ON COLUMN users.role_permissions.can_write IS 'Whether the role can edit/modify in the module';
COMMENT ON COLUMN users.role_permissions.can_report IS 'Whether the role can generate reports from the module';
COMMENT ON VIEW users.role_permissions_view IS 'Convenient view for querying role permissions with role details';
