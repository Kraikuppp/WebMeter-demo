-- อัปเดตตาราง locations เพื่อรองรับ hierarchical structure
-- รันคำสั่งนี้ใน PostgreSQL ด้วย superuser

-- 1. เพิ่ม parent_id column (ถ้ายังไม่มี)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS parent_id INTEGER;

-- 2. สร้าง index สำหรับ parent_id (ถ้ายังไม่มี)
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);

-- 3. อัปเดตข้อมูลที่มีอยู่ (ตั้งค่า parent_id เป็น NULL สำหรับ root locations)
UPDATE locations SET parent_id = NULL WHERE parent_id IS NULL;

-- 4. เพิ่ม foreign key constraint (ถ้ายังไม่มี)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_locations_parent' 
        AND table_name = 'locations'
    ) THEN
        ALTER TABLE locations ADD CONSTRAINT fk_locations_parent 
        FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. ตรวจสอบโครงสร้าง
\d locations

-- 6. ทดสอบการสร้าง hierarchical data
INSERT INTO locations (name, description, parent_id) VALUES 
  ('Main Location', 'Main location description', NULL),
  ('Sub Location 1', 'Sub location 1 description', 1),
  ('Sub Location 2', 'Sub location 2 description', 1)
ON CONFLICT DO NOTHING;

-- 7. ดูผลลัพธ์
SELECT 
  l1.id,
  l1.name as location_name,
  l1.parent_id,
  l2.name as parent_name
FROM locations l1
LEFT JOIN locations l2 ON l1.parent_id = l2.id
ORDER BY l1.id;
