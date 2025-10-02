-- Create holiday and FT configuration tables for WebMeter system
-- This file creates tables for managing holidays and FT rates

-- Create holiday table
CREATE TABLE IF NOT EXISTS holiday (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name_holiday VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('special', 'annual')),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create FT configuration table
CREATE TABLE IF NOT EXISTS ft_config (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    value DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    unit VARCHAR(50) NOT NULL DEFAULT 'Baht/Unit',
    description TEXT,
    start_month VARCHAR(10) NOT NULL,
    end_month VARCHAR(10) NOT NULL,
    start_day INTEGER NOT NULL,
    end_day INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_holiday_date ON holiday(date);
CREATE INDEX IF NOT EXISTS idx_holiday_year ON holiday(EXTRACT(YEAR FROM date));
CREATE INDEX IF NOT EXISTS idx_holiday_category ON holiday(category);

CREATE INDEX IF NOT EXISTS idx_ft_config_year ON ft_config(year);
CREATE INDEX IF NOT EXISTS idx_ft_config_active ON ft_config(is_active);
CREATE INDEX IF NOT EXISTS idx_ft_config_name ON ft_config(name);

-- Insert Thai holidays data for past 3 years and future 10 years
-- Function to generate Thai holidays
CREATE OR REPLACE FUNCTION generate_thai_holidays(start_year INTEGER, end_year INTEGER)
RETURNS VOID AS $$
DECLARE
    current_year INTEGER;
    makha_bucha DATE;
    visakha_bucha DATE;
    asarnha_bucha DATE;
    buddhist_lent DATE;
BEGIN
    FOR current_year IN start_year..end_year LOOP
        -- New Year's Day - Annual
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            DATE(current_year || '-01-01'),
            'วันขึ้นปีใหม่',
            'annual',
            'system'
        );

        -- Makha Bucha Day - Annual (approximate date, usually February)
        makha_bucha := DATE(current_year || '-02-15'); -- Approximate
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            makha_bucha,
            'วันมาฆบูชา',
            'annual',
            'system'
        );

        -- Chakri Memorial Day - Annual
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            DATE(current_year || '-04-06'),
            'วันจักรี',
            'annual',
            'system'
        );

        -- Songkran Festival - Annual
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            DATE(current_year || '-04-13'),
            'วันสงกรานต์',
            'annual',
            'system'
        );

        -- Labour Day - Annual
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            DATE(current_year || '-05-01'),
            'วันแรงงานแห่งชาติ',
            'annual',
            'system'
        );

        -- Coronation Day - Annual
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            DATE(current_year || '-05-05'),
            'วันฉัตรมงคล',
            'annual',
            'system'
        );

        -- Visakha Bucha Day - Annual (approximate date, usually May)
        visakha_bucha := DATE(current_year || '-05-15'); -- Approximate
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            visakha_bucha,
            'วันวิสาขบูชา',
            'annual',
            'system'
        );

        -- Asarnha Bucha Day - Annual (approximate date, usually July)
        asarnha_bucha := DATE(current_year || '-07-15'); -- Approximate
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            asarnha_bucha,
            'วันอาสาฬหบูชา',
            'annual',
            'system'
        );

        -- Buddhist Lent Day - Annual (approximate date, usually July)
        buddhist_lent := DATE(current_year || '-07-16'); -- Approximate
        INSERT INTO holiday (date, name_holiday, category, created_by)
        VALUES (
            buddhist_lent,
            'วันเข้าพรรษา',
            'Buddhist Lent Day',
            'religious',
            'annual',
            EXTRACT(DOW FROM buddhist_lent) IN (0, 6)
        );

        -- Queen's Birthday - Annual
        INSERT INTO holiday (date, name_th, name_en, type, category, is_weekend)
        VALUES (
            DATE(current_year || '-08-12'),
            'วันแม่แห่งชาติ',
            'Queen''s Birthday',
            'national',
            'annual',
            EXTRACT(DOW FROM DATE(current_year || '-08-12')) IN (0, 6)
        );

        -- King's Birthday - Annual
        INSERT INTO holiday (date, name_th, name_en, type, category, is_weekend)
        VALUES (
            DATE(current_year || '-12-05'),
            'วันพ่อแห่งชาติ',
            'King''s Birthday',
            'national',
            'annual',
            EXTRACT(DOW FROM DATE(current_year || '-12-05')) IN (0, 6)
        );

        -- Constitution Day - Annual
        INSERT INTO holiday (date, name_th, name_en, type, category, is_weekend)
        VALUES (
            DATE(current_year || '-12-10'),
            'วันรัฐธรรมนูญ',
            'Constitution Day',
            'national',
            'annual',
            EXTRACT(DOW FROM DATE(current_year || '-12-10')) IN (0, 6)
        );

        -- New Year's Eve - Annual
        INSERT INTO holiday (date, name_th, name_en, type, category, is_weekend)
        VALUES (
            DATE(current_year || '-12-31'),
            'วันสิ้นปี',
            'New Year''s Eve',
            'national',
            'annual',
            EXTRACT(DOW FROM DATE(current_year || '-12-31')) IN (0, 6)
        );

        -- Special Holidays (ตัวอย่าง - สามารถเพิ่มได้ตามต้องการ)
        -- Special Holiday 1 - Special
        INSERT INTO holiday (date, name_th, name_en, type, category, is_weekend)
        VALUES (
            DATE(current_year || '-03-15'),
            'วันหยุดพิเศษ 1',
            'Special Holiday 1',
            'observance',
            'special',
            EXTRACT(DOW FROM DATE(current_year || '-03-15')) IN (0, 6)
        );

        -- Special Holiday 2 - Special
        INSERT INTO holiday (date, name_th, name_en, type, category, is_weekend)
        VALUES (
            DATE(current_year || '-09-20'),
            'วันหยุดพิเศษ 2',
            'Special Holiday 2',
            'observance',
            'special',
            EXTRACT(DOW FROM DATE(current_year || '-09-20')) IN (0, 6)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate holidays for past 3 years and future 10 years
SELECT generate_thai_holidays(EXTRACT(YEAR FROM CURRENT_DATE) - 3, EXTRACT(YEAR FROM CURRENT_DATE) + 10);

-- Insert default FT configurations for multiple years (2023-2035)
DO $$
DECLARE
    current_year INTEGER;
BEGIN
    FOR current_year IN 2023..2035 LOOP
        INSERT INTO ft_config (year, name, value, unit, description, start_month, end_month, start_day, end_day, created_by) VALUES
        (current_year, 'FT Rate 1', 0.0000, 'Baht/Unit', 'อัตราค่าไฟฟ้าฐาน', 'Jan', 'Dec', 1, 31, 'system'),
        (current_year, 'FT Rate 2', 0.0000, 'Baht/Unit', 'อัตราค่าไฟฟ้าปรับ', 'Jan', 'Dec', 1, 31, 'system'),
        (current_year, 'FT Rate 3', 0.0000, 'Baht/Unit', 'อัตราค่าไฟฟ้าเพิ่มเติม', 'Jan', 'Dec', 1, 31, 'system');
    END LOOP;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_holiday_updated_at BEFORE UPDATE ON holiday
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ft_config_updated_at BEFORE UPDATE ON ft_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for easier querying
CREATE OR REPLACE VIEW holiday_view AS
SELECT 
    id,
    date,
    name_th,
    name_en,
    type,
    category,
    is_weekend,
    EXTRACT(YEAR FROM date) as year,
    EXTRACT(MONTH FROM date) as month,
    EXTRACT(DAY FROM date) as day,
    is_active,
    created_by,
    created_at,
    updated_by,
    updated_at
FROM holiday
WHERE is_active = TRUE
ORDER BY date;

CREATE OR REPLACE VIEW ft_config_view AS
SELECT 
    id,
    year,
    name,
    value,
    unit,
    description,
    start_month,
    end_month,
    start_day,
    end_day,
    is_active,
    created_by,
    created_at,
    updated_by,
    updated_at
FROM ft_config
WHERE is_active = TRUE
ORDER BY year DESC, name;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON holiday TO webmeter_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ft_config TO webmeter_user;
GRANT SELECT ON holiday_view TO webmeter_user;
GRANT SELECT ON ft_config_view TO webmeter_user;
GRANT USAGE, SELECT ON SEQUENCE holiday_id_seq TO webmeter_user;
GRANT USAGE, SELECT ON SEQUENCE ft_config_id_seq TO webmeter_user;
