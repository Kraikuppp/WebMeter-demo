-- Setup Favorite Meters System
-- This file creates the necessary tables for the favorite meters feature

-- Step 1: Create users table first
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Insert default admin user
INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
VALUES ('admin', 'admin@webmeter.com', '$2b$10$default_hash_placeholder', 'Admin', 'User', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Step 2: Create user_favorite_meters table
CREATE TABLE IF NOT EXISTS user_favorite_meters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    meter_id INTEGER NOT NULL,
    tree_type VARCHAR(20) NOT NULL CHECK (tree_type IN ('building', 'online')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_user_favorite_meters_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_favorite_meters_meter_id FOREIGN KEY (meter_id) REFERENCES meters(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate favorites
    CONSTRAINT unique_user_meter_tree_type UNIQUE(user_id, meter_id, tree_type)
);

-- Create index for user_favorite_meters table
CREATE INDEX IF NOT EXISTS idx_user_favorite_meters_user_id ON user_favorite_meters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_meters_tree_type ON user_favorite_meters(tree_type);
CREATE INDEX IF NOT EXISTS idx_user_favorite_meters_created_at ON user_favorite_meters(created_at);

-- Add comments
COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON COLUMN users.username IS 'Unique username for login';
COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.password_hash IS 'Hashed password';
COMMENT ON COLUMN users.role IS 'User role: admin, user, or viewer';

COMMENT ON TABLE user_favorite_meters IS 'Stores user favorite meters for different tree types (building/online)';
COMMENT ON COLUMN user_favorite_meters.user_id IS 'Reference to users table';
COMMENT ON COLUMN user_favorite_meters.meter_id IS 'Reference to meters table';
COMMENT ON COLUMN user_favorite_meters.tree_type IS 'Type of tree: building or online';
COMMENT ON COLUMN user_favorite_meters.created_at IS 'Timestamp when meter was added to favorites';

-- Verify tables were created successfully
SELECT 'Users table created successfully' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users');
SELECT 'User favorite meters table created successfully' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_favorite_meters');
