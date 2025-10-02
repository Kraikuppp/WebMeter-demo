-- แก้ไข foreign key ของ lognets เพื่อให้อ้างอิงถึง locations แทน
-- รันคำสั่งนี้ใน PostgreSQL ด้วย superuser

-- 1. ลบ foreign key constraint เดิม
ALTER TABLE lognets DROP CONSTRAINT IF EXISTS lognets_sublocation_id_fkey;

-- 2. เพิ่ม foreign key constraint ใหม่
ALTER TABLE lognets ADD CONSTRAINT lognets_sublocation_id_fkey 
  FOREIGN KEY (sublocation_id) REFERENCES locations(id) ON DELETE CASCADE;

-- 3. ตรวจสอบโครงสร้างตาราง
\d lognets

-- 4. ดูข้อมูล lognets ปัจจุบัน
SELECT 
  l.id,
  l.name as lognet_name,
  l.location_id,
  loc1.name as main_location,
  l.sublocation_id,
  loc2.name as sub_location
FROM lognets l
LEFT JOIN locations loc1 ON l.location_id = loc1.id
LEFT JOIN locations loc2 ON l.sublocation_id = loc2.id
ORDER BY l.id;
