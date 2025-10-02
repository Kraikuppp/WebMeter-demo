-- Add date and time columns to export_schedules table
-- This migration adds support for custom date and time ranges in export schedules

-- Add new columns
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
