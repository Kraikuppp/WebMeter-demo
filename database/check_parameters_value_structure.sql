-- ตรวจสอบโครงสร้างตาราง parameters_value
\c parameters_db;

-- 1. ตรวจสอบว่ามีคอลัมน์ slave_id หรือไม่
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'parameters_value' 
AND column_name = 'slave_id';

-- 2. ตรวจสอบข้อมูล slave_id ที่มีอยู่
SELECT DISTINCT slave_id, COUNT(*) as count
FROM parameters_value 
WHERE slave_id IS NOT NULL
GROUP BY slave_id
ORDER BY slave_id;

-- 3. ตรวจสอบจำนวนข้อมูลที่มี slave_id เป็น NULL
SELECT COUNT(*) as null_slave_id_count
FROM parameters_value 
WHERE slave_id IS NULL;

-- 4. ตรวจสอบข้อมูลตัวอย่าง
SELECT reading_timestamp, slave_id, param_01_freqency, param_05_voltage_avg_phase
FROM parameters_value 
ORDER BY reading_timestamp DESC 
LIMIT 10;

-- 5. ตรวจสอบข้อมูลสำหรับ slave_id = 3
SELECT reading_timestamp, slave_id, param_01_freqency, param_05_voltage_avg_phase
FROM parameters_value 
WHERE slave_id = 3
ORDER BY reading_timestamp DESC 
LIMIT 5;

-- 6. ตรวจสอบข้อมูลในช่วงวันที่ที่เลือก
SELECT reading_timestamp, slave_id, param_01_freqency, param_05_voltage_avg_phase
FROM parameters_value 
WHERE reading_timestamp >= '2025-08-26 00:00:00' 
AND reading_timestamp <= '2025-08-26 01:52:00'
ORDER BY reading_timestamp DESC 
LIMIT 10;
