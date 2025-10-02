-- เพิ่มคอลัม budrate ในตาราง meters
-- รันคำสั่งนี้ใน PostgreSQL

-- 1. เพิ่มคอลัม budrate ในตาราง meters
ALTER TABLE meters ADD COLUMN IF NOT EXISTS budrate INTEGER DEFAULT 9600;

-- 2. อัปเดตข้อมูลที่มีอยู่ให้มีค่าเริ่มต้น
UPDATE meters SET budrate = 9600 WHERE budrate IS NULL;

-- 3. ตรวจสอบคอลัมที่เพิ่มขึ้น
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'meters' AND column_name = 'budrate';

-- 4. ตรวจสอบข้อมูลในตาราง
SELECT id, name, budrate FROM meters LIMIT 5;
