-- Add google_id column to users table for Google Login support
-- This script adds the google_id column if it doesn't exist

DO $$
BEGIN
    -- Check if google_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'users' 
        AND table_name = 'users' 
        AND column_name = 'google_id'
    ) THEN
        -- Add google_id column
        ALTER TABLE users.users 
        ADD COLUMN google_id VARCHAR(255) UNIQUE;
        
        RAISE NOTICE 'Added google_id column to users.users table';
    ELSE
        RAISE NOTICE 'google_id column already exists in users.users table';
    END IF;
END $$;

-- Create index on google_id for better performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users.users(google_id);

-- Show the updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'users' 
AND table_name = 'users'
ORDER BY ordinal_position;
