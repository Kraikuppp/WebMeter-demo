-- Add date and time columns to export_schedules table manually
-- Run this in your PostgreSQL database

-- First, check if the table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'export_schedules';

-- Add new columns if they don't exist
ALTER TABLE export_schedules 
ADD COLUMN IF NOT EXISTS date_from DATE,
ADD COLUMN IF NOT EXISTS date_to DATE,
ADD COLUMN IF NOT EXISTS time_from VARCHAR(5),
ADD COLUMN IF NOT EXISTS time_to VARCHAR(5);

-- Add comments for documentation
COMMENT ON COLUMN export_schedules.date_from IS 'Start date for data export (optional)';
COMMENT ON COLUMN export_schedules.date_to IS 'End date for data export (optional)';
COMMENT ON COLUMN export_schedules.time_from IS 'Start time for data export (optional, format: HH:MM)';
COMMENT ON COLUMN export_schedules.time_to IS 'End time for data export (optional, format: HH:MM)';

-- Update existing records to have default values if needed
UPDATE export_schedules 
SET time_from = '00:00', time_to = '23:59' 
WHERE time_from IS NULL OR time_to IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'export_schedules' 
AND column_name IN ('date_from', 'date_to', 'time_from', 'time_to');
