-- Add groupline_id column to users table
ALTER TABLE users.users ADD COLUMN groupline_id INTEGER;

-- Add foreign key constraint for groupline_id referencing line_groups table
ALTER TABLE users.users 
ADD CONSTRAINT fk_users_groupline_id 
FOREIGN KEY (groupline_id) REFERENCES users.line_groups(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_users_groupline_id ON users.users(groupline_id);
