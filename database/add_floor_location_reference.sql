-- เพิ่มการอ้างอิงระหว่าง floor และ location
-- รันคำสั่งนี้ใน PostgreSQL

-- 1. เพิ่มคอลัมน์ floor_location_id ในตาราง floors (สำหรับ location ที่อยู่ใน floor)
ALTER TABLE floors ADD COLUMN IF NOT EXISTS floor_location_id INTEGER;
ALTER TABLE floors ADD CONSTRAINT fk_floor_location FOREIGN KEY (floor_location_id) REFERENCES locations(id) ON DELETE CASCADE;

-- 2. เพิ่มคอลัมน์ location_floor_id ในตาราง locations (สำหรับ floor ที่อยู่ใน location)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_floor_id INTEGER;
ALTER TABLE locations ADD CONSTRAINT fk_location_floor FOREIGN KEY (location_floor_id) REFERENCES floors(id) ON DELETE CASCADE;

-- 3. สร้าง indexes สำหรับการค้นหา
CREATE INDEX IF NOT EXISTS idx_floor_location_ref ON floors(floor_location_id);
CREATE INDEX IF NOT EXISTS idx_location_floor_ref ON locations(location_floor_id);

-- 4. ตรวจสอบคอลัมน์ที่เพิ่มขึ้น
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'floors' AND column_name IN ('floor_location_id');

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'locations' AND column_name IN ('location_floor_id');

-- 5. ตรวจสอบ constraints ที่เพิ่มขึ้น
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('floors', 'locations')
    AND kcu.column_name IN ('floor_location_id', 'location_floor_id');
