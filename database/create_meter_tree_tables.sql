-- สร้างตาราง Meter Tree และให้สิทธิ์
-- รันคำสั่งนี้ใน PostgreSQL ด้วย superuser

-- 1. สร้างตาราง locations
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. สร้างตาราง lognets
CREATE TABLE IF NOT EXISTS lognets (
  id SERIAL PRIMARY KEY,
  location_id INTEGER,
  sublocation_id INTEGER NULL,
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

-- 3. สร้างตาราง buildings
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

-- 4. สร้างตาราง floors
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

-- 5. สร้างตาราง meters
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
  ct_primary NUMERIC(10,2),
  pt_primary NUMERIC(10,2),
  ct_secondary NUMERIC(10,2),
  pt_secondary NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  lognet_id INTEGER,
  floor_id INTEGER,
  is_disabled_in_building BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lognet_id) REFERENCES lognets(id) ON DELETE SET NULL,
  FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE SET NULL
);

-- 6. สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_lognet_location ON lognets(location_id);
CREATE INDEX IF NOT EXISTS idx_lognet_sublocation ON lognets(sublocation_id);
CREATE INDEX IF NOT EXISTS idx_lognet_ip ON lognets(ip_address);
CREATE INDEX IF NOT EXISTS idx_lognet_serial ON lognets(serial_number);
CREATE INDEX IF NOT EXISTS idx_lognet_active ON lognets(is_active);

CREATE INDEX IF NOT EXISTS idx_building_location ON buildings(location_id);
CREATE INDEX IF NOT EXISTS idx_building_active ON buildings(is_active);
CREATE INDEX IF NOT EXISTS idx_building_name ON buildings(name);

CREATE INDEX IF NOT EXISTS idx_floor_building ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_floor_number ON floors(floor_number);
CREATE INDEX IF NOT EXISTS idx_floor_active ON floors(is_active);
CREATE INDEX IF NOT EXISTS idx_floor_name ON floors(name);

CREATE INDEX IF NOT EXISTS idx_meter_lognet ON meters(lognet_id);
CREATE INDEX IF NOT EXISTS idx_meter_floor ON meters(floor_id);
CREATE INDEX IF NOT EXISTS idx_meter_active ON meters(is_active);
CREATE INDEX IF NOT EXISTS idx_meter_disabled ON meters(is_disabled_in_building);

-- 7. สร้าง trigger function สำหรับ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. สร้าง triggers
CREATE TRIGGER update_locations_updated_at 
  BEFORE UPDATE ON locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lognets_updated_at 
  BEFORE UPDATE ON lognets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at 
  BEFORE UPDATE ON buildings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floors_updated_at 
  BEFORE UPDATE ON floors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meters_updated_at 
  BEFORE UPDATE ON meters 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. ให้สิทธิ์ทั้งหมดกับ webmeter_app user
GRANT ALL PRIVILEGES ON TABLE locations TO webmeter_app;
GRANT ALL PRIVILEGES ON TABLE lognets TO webmeter_app;
GRANT ALL PRIVILEGES ON TABLE buildings TO webmeter_app;
GRANT ALL PRIVILEGES ON TABLE floors TO webmeter_app;
GRANT ALL PRIVILEGES ON TABLE meters TO webmeter_app;

-- 10. ให้สิทธิ์สำหรับ sequences
GRANT USAGE, SELECT ON SEQUENCE locations_id_seq TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE lognets_id_seq TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE buildings_id_seq TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE floors_id_seq TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE meters_id_seq TO webmeter_app;

-- 11. ให้สิทธิ์สำหรับ schema public
GRANT USAGE ON SCHEMA public TO webmeter_app;
GRANT CREATE ON SCHEMA public TO webmeter_app;

-- 12. ตรวจสอบสิทธิ์
\dp locations
\dp lognets
\dp buildings
\dp floors
\dp meters

-- 13. ทดสอบการสร้างข้อมูล
INSERT INTO locations (name, description) VALUES ('Test Location', 'Test Description') ON CONFLICT DO NOTHING;
SELECT * FROM locations;
