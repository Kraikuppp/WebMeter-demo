-- Add group_id column to users.users table
-- This script adds a group_id column to link users to groups

-- Add group_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'users' 
        AND table_name = 'users' 
        AND column_name = 'group_id'
    ) THEN
        ALTER TABLE users.users ADD COLUMN group_id INTEGER;
        
        -- Add foreign key constraint to users.groups table
        ALTER TABLE users.users 
        ADD CONSTRAINT fk_users_group_id 
        FOREIGN KEY (group_id) 
        REFERENCES users.groups(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added group_id column to users.users table';
    ELSE
        RAISE NOTICE 'group_id column already exists in users.users table';
    END IF;
END $$;
