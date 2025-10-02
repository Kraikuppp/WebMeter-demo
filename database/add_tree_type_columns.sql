-- เพิ่ม tree_type column ในตารางต่างๆ เพื่อแยกข้อมูลระหว่าง System, Building, และ Online tree
-- รันคำสั่งนี้ใน PostgreSQL

-- 1. เพิ่ม tree_type column ในตาราง locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS tree_type VARCHAR(20) DEFAULT 'system';

-- 2. เพิ่ม tree_type column ในตาราง lognets
ALTER TABLE lognets ADD COLUMN IF NOT EXISTS tree_type VARCHAR(20) DEFAULT 'system';

-- 3. เพิ่ม tree_type column ในตาราง buildings
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS tree_type VARCHAR(20) DEFAULT 'building';

-- 4. เพิ่ม tree_type column ในตาราง floors
ALTER TABLE floors ADD COLUMN IF NOT EXISTS tree_type VARCHAR(20) DEFAULT 'building';

-- 5. เพิ่ม tree_type column ในตาราง meters
ALTER TABLE meters ADD COLUMN IF NOT EXISTS tree_type VARCHAR(20) DEFAULT 'system';

-- 6. สร้าง indexes สำหรับ tree_type
CREATE INDEX IF NOT EXISTS idx_locations_tree_type ON locations(tree_type);
CREATE INDEX IF NOT EXISTS idx_lognets_tree_type ON lognets(tree_type);
CREATE INDEX IF NOT EXISTS idx_buildings_tree_type ON buildings(tree_type);
CREATE INDEX IF NOT EXISTS idx_floors_tree_type ON floors(tree_type);
CREATE INDEX IF NOT EXISTS idx_meters_tree_type ON meters(tree_type);

-- 7. อัปเดตข้อมูลที่มีอยู่ให้มี tree_type ที่ถูกต้อง
-- Locations ที่มี lognets จะเป็น system tree
UPDATE locations SET tree_type = 'system' WHERE id IN (
  SELECT DISTINCT location_id FROM lognets WHERE location_id IS NOT NULL
);

-- Locations ที่มี buildings จะเป็น building tree
UPDATE locations SET tree_type = 'building' WHERE id IN (
  SELECT DISTINCT location_id FROM buildings WHERE location_id IS NOT NULL
);

-- ถ้า location มีทั้ง lognets และ buildings ให้เป็น system (เพราะ system tree เป็นหลัก)
UPDATE locations SET tree_type = 'system' WHERE id IN (
  SELECT DISTINCT l.id FROM locations l
  WHERE l.id IN (SELECT DISTINCT location_id FROM lognets WHERE location_id IS NOT NULL)
  AND l.id IN (SELECT DISTINCT location_id FROM buildings WHERE location_id IS NOT NULL)
);

-- LogNets เป็น system tree
UPDATE lognets SET tree_type = 'system';

-- Buildings เป็น building tree
UPDATE buildings SET tree_type = 'building';

-- Floors เป็น building tree
UPDATE floors SET tree_type = 'building';

-- Meters ที่มี lognet_id เป็น system tree
UPDATE meters SET tree_type = 'system' WHERE lognet_id IS NOT NULL;

-- Meters ที่มี floor_id เป็น building tree
UPDATE meters SET tree_type = 'building' WHERE floor_id IS NOT NULL;

-- Online tree จะใช้ข้อมูลจาก building tree ที่ filter เฉพาะ enabled meters
-- ไม่ต้องสร้างข้อมูลแยก เพราะ online tree เป็น subset ของ building tree
