-- แก้ไข foreign key constraints ของตาราง meters ให้เป็น ON DELETE CASCADE
-- รันคำสั่งนี้ใน PostgreSQL

-- 1. ลบ foreign key constraints เดิม
ALTER TABLE meters DROP CONSTRAINT IF EXISTS meters_lognet_id_fkey;
ALTER TABLE meters DROP CONSTRAINT IF EXISTS meters_floor_id_fkey;

-- 2. เพิ่ม foreign key constraints ใหม่ด้วย ON DELETE CASCADE
ALTER TABLE meters 
ADD CONSTRAINT meters_lognet_id_fkey 
FOREIGN KEY (lognet_id) REFERENCES lognets(id) ON DELETE CASCADE;

ALTER TABLE meters 
ADD CONSTRAINT meters_floor_id_fkey 
FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE;

-- 3. ตรวจสอบ constraints ที่สร้างขึ้น
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'meters'
ORDER BY tc.table_name, kcu.column_name;
