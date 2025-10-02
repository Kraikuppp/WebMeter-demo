-- Fix permissions for event table and sequence
-- This script grants necessary permissions to webmeter_app user

-- Connect as superuser (postgres) and run these commands:

-- Grant usage on sequence
GRANT USAGE, SELECT ON SEQUENCE public.event_id_seq TO webmeter_app;

-- Grant all privileges on event table
GRANT ALL PRIVILEGES ON TABLE public.event TO webmeter_app;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO webmeter_app;

-- Grant create privileges on public schema (if needed)
GRANT CREATE ON SCHEMA public TO webmeter_app;

-- Alternative: If the sequence doesn't exist, create it
-- CREATE SEQUENCE IF NOT EXISTS public.event_id_seq OWNED BY public.event.id;

-- Set the sequence ownership to the table column
-- ALTER SEQUENCE public.event_id_seq OWNED BY public.event.id;

-- Update the table to use the sequence as default
-- ALTER TABLE public.event ALTER COLUMN id SET DEFAULT nextval('public.event_id_seq');

-- Verify permissions
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasinserts,
    hasupdates,
    hasdeletes,
    hasselects
FROM pg_tables 
WHERE tablename = 'event';

-- Check sequence permissions
SELECT 
    sequence_name,
    sequence_schema,
    data_type,
    start_value,
    increment,
    max_value,
    min_value
FROM information_schema.sequences 
WHERE sequence_name LIKE '%event%';

-- Test insert (run as webmeter_app user)
-- INSERT INTO public.event (timestamp, username, ip, lognet, event, created_at)
-- VALUES (NOW(), 'test_user', '127.0.0.1', '127.0.0.1', 'Test event', NOW());

COMMENT ON TABLE public.event IS 'Event logging table with proper permissions for webmeter_app user';
