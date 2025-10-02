-- Create line_groups table
CREATE TABLE IF NOT EXISTS users.line_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default line groups
INSERT INTO users.line_groups (name) VALUES 
    ('Emergency'),
    ('BackOffice'),
    ('Engineer'),
    ('Routine')
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION users.update_line_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_line_groups_updated_at
    BEFORE UPDATE ON users.line_groups
    FOR EACH ROW
    EXECUTE FUNCTION users.update_line_groups_updated_at();
