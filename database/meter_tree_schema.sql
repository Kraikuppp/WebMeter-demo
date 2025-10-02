-- Meter Tree Database Schema
-- This file contains the complete database schema for the meter tree system

-- ===== LOCATIONS TABLE =====
-- ตาราง Locations (ตำแหน่งหลัก)
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== LOGNETS TABLE =====
-- ตาราง LogNet Systems 
CREATE TABLE IF NOT EXISTS lognets (
    id SERIAL PRIMARY KEY,
    location_id INTEGER,
    sublocation_id INTEGER NULL, -- สำหรับ sublocation hierarchy
    name VARCHAR(255) NOT NULL,
    model VARCHAR(100),
    brand VARCHAR(100),
    serial_number VARCHAR(100),
    firmware_version VARCHAR(50),
    ip_address INET,
    subnet_mask INET,
    gateway INET,
    dns INET,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (sublocation_id) REFERENCES lognets(id) ON DELETE CASCADE
);

-- ===== BUILDINGS TABLE =====
-- ตาราง Buildings
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    location_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- ===== FLOORS TABLE =====
-- ตาราง Floors
CREATE TABLE IF NOT EXISTS floors (
    id SERIAL PRIMARY KEY,
    building_id INTEGER,
    name VARCHAR(100) NOT NULL,
    floor_number INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

-- ===== METERS TABLE =====
-- ตาราง Meters
CREATE TABLE IF NOT EXISTS meters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    meter_sn VARCHAR(100),
    protocol VARCHAR(50),
    ip_address INET,
    slave_id INTEGER,
    port INTEGER,
    ct_primary DECIMAL(10,2),
    pt_primary DECIMAL(10,2),
    ct_secondary DECIMAL(10,2),
    pt_secondary DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- สำหรับ Meter Tree System (LogNet based)
    lognet_id INTEGER NULL,
    
    -- สำหรับ Meter Tree Building/Online (Building based)
    floor_id INTEGER NULL,
    is_disabled_in_building BOOLEAN DEFAULT FALSE, -- สำหรับ disable ใน building tree
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lognet_id) REFERENCES lognets(id) ON DELETE SET NULL,
    FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE SET NULL
);

-- ===== INDEXES =====

-- Indexes for lognets table
CREATE INDEX IF NOT EXISTS idx_lognet_location ON lognets(location_id);
CREATE INDEX IF NOT EXISTS idx_lognet_sublocation ON lognets(sublocation_id);
CREATE INDEX IF NOT EXISTS idx_lognet_ip ON lognets(ip_address);
CREATE INDEX IF NOT EXISTS idx_lognet_serial ON lognets(serial_number);
CREATE INDEX IF NOT EXISTS idx_lognet_active ON lognets(is_active);

-- Indexes for buildings table
CREATE INDEX IF NOT EXISTS idx_building_location ON buildings(location_id);
CREATE INDEX IF NOT EXISTS idx_building_active ON buildings(is_active);
CREATE INDEX IF NOT EXISTS idx_building_name ON buildings(name);

-- Indexes for floors table
CREATE INDEX IF NOT EXISTS idx_floor_building ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_floor_number ON floors(floor_number);
CREATE INDEX IF NOT EXISTS idx_floor_active ON floors(is_active);
CREATE INDEX IF NOT EXISTS idx_floor_name ON floors(name);

-- Indexes for meters table
CREATE INDEX IF NOT EXISTS idx_meter_lognet ON meters(lognet_id);
CREATE INDEX IF NOT EXISTS idx_meter_floor ON meters(floor_id);
CREATE INDEX IF NOT EXISTS idx_meter_ip ON meters(ip_address);
CREATE INDEX IF NOT EXISTS idx_meter_serial ON meters(meter_sn);
CREATE INDEX IF NOT EXISTS idx_meter_active ON meters(is_active);
CREATE INDEX IF NOT EXISTS idx_meter_slave_id ON meters(slave_id);
CREATE INDEX IF NOT EXISTS idx_meter_building_disabled ON meters(is_disabled_in_building);
CREATE INDEX IF NOT EXISTS idx_meter_name ON meters(name);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_meter_lognet_active ON meters(lognet_id, is_active);
CREATE INDEX IF NOT EXISTS idx_meter_floor_active ON meters(floor_id, is_active, is_disabled_in_building);
CREATE INDEX IF NOT EXISTS idx_meter_slave_active ON meters(slave_id, is_active);

-- ===== TRIGGERS =====

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_locations_updated_at 
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_lognets_updated_at 
    BEFORE UPDATE ON lognets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_buildings_updated_at 
    BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_floors_updated_at 
    BEFORE UPDATE ON floors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_meters_updated_at 
    BEFORE UPDATE ON meters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== SAMPLE DATA =====

-- Insert sample locations
INSERT INTO locations (name, description) VALUES
('Main Factory', 'Main production facility'),
('Office Building', 'Administrative offices'),
('Warehouse A', 'Storage facility A'),
('Warehouse B', 'Storage facility B')
ON CONFLICT DO NOTHING;

-- Insert sample buildings
INSERT INTO buildings (location_id, name, description) VALUES
(1, 'Production Hall 1', 'Main production area'),
(1, 'Production Hall 2', 'Secondary production area'),
(2, 'Office Tower', 'Main office building'),
(3, 'Storage Building', 'Main storage facility')
ON CONFLICT DO NOTHING;

-- Insert sample floors
INSERT INTO floors (building_id, name, floor_number, description) VALUES
(1, 'Ground Floor', 1, 'Main production floor'),
(1, 'Mezzanine', 2, 'Equipment floor'),
(3, 'Ground Floor', 1, 'Reception and common areas'),
(3, 'First Floor', 2, 'Office spaces'),
(3, 'Second Floor', 3, 'Meeting rooms and conference areas')
ON CONFLICT DO NOTHING;

-- Insert sample lognets
INSERT INTO lognets (location_id, name, model, brand, serial_number, ip_address, is_active) VALUES
(1, 'LogNet-Main', 'LN-2000', 'Amptron', 'LN001', '192.168.1.100', true),
(1, 'LogNet-Sub', 'LN-1500', 'Amptron', 'LN002', '192.168.1.101', true),
(2, 'LogNet-Office', 'LN-1000', 'Amptron', 'LN003', '192.168.2.100', true)
ON CONFLICT DO NOTHING;

-- Insert sample meters
INSERT INTO meters (name, brand, model, meter_sn, protocol, ip_address, slave_id, port, ct_primary, pt_primary, lognet_id, floor_id, is_active) VALUES
('AMR-Boiler1', 'Amptron', 'AI205-A-A-P0', 'AMR001', 'Modbus TCP', '192.168.1.10', 1, 502, 100.00, 400.00, 1, NULL, true),
('AMR-Boiler2', 'Amptron', 'AI205-A-A-P0', 'AMR002', 'Modbus TCP', '192.168.1.11', 2, 502, 100.00, 400.00, 1, NULL, true),
('AMR-B1-F4', 'Acuenergy', 'Acuvim-CL', 'AMR003', 'Modbus TCP', '192.168.1.12', 3, 502, 200.00, 400.00, 1, 1, true),
('AMR-Draw line RPSF', 'Amptron', 'AI205-A-A-P0', 'AMR004', 'Modbus TCP', '192.168.1.13', 4, 502, 100.00, 400.00, 1, 1, true),
('AMR-Spinning RPSF', 'Amptron', 'AI205-A-A-P0', 'AMR005', 'Modbus TCP', '192.168.1.14', 5, 502, 50.00, 400.00, 1, 1, true),
('AMR-Office-Lighting', 'Schneider', 'PM2200', 'AMR006', 'Modbus TCP', '192.168.2.10', 1, 502, 50.00, 400.00, 3, 3, true),
('AMR-Office-HVAC', 'Schneider', 'PM2200', 'AMR007', 'Modbus TCP', '192.168.2.11', 2, 502, 100.00, 400.00, 3, 3, true)
ON CONFLICT DO NOTHING;

-- ===== COMMENTS =====

COMMENT ON TABLE locations IS 'Main locations for the meter tree system';
COMMENT ON TABLE lognets IS 'LogNet systems for meter communication';
COMMENT ON TABLE buildings IS 'Buildings within locations';
COMMENT ON TABLE floors IS 'Floors within buildings';
COMMENT ON TABLE meters IS 'Power meters with communication capabilities';

COMMENT ON COLUMN meters.lognet_id IS 'Reference to LogNet for system tree view';
COMMENT ON COLUMN meters.floor_id IS 'Reference to floor for building tree view';
COMMENT ON COLUMN meters.is_disabled_in_building IS 'Flag to disable meter in building/online tree view';
