-- ตรวจสอบ tables ที่มีใน webmeter_db
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('meters', 'locations', 'buildings', 'floors', 'lognets')
ORDER BY table_name;

-- ตรวจสอบจำนวนข้อมูลในแต่ละ table
SELECT 'meters' as table_name, COUNT(*) as count FROM meters
UNION ALL
SELECT 'locations' as table_name, COUNT(*) as count FROM locations  
UNION ALL
SELECT 'buildings' as table_name, COUNT(*) as count FROM buildings
UNION ALL
SELECT 'floors' as table_name, COUNT(*) as count FROM floors
UNION ALL
SELECT 'lognets' as table_name, COUNT(*) as count FROM lognets;

-- ตรวจสอบ sample data จาก meters
SELECT id, name, brand, model, slave_id, is_active 
FROM meters 
LIMIT 5;
