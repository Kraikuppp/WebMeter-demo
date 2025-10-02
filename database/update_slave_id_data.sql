-- อัปเดตข้อมูล slave_id ในตาราง parameters_value
\c parameters_db;

-- 1. ตรวจสอบข้อมูลปัจจุบัน
SELECT COUNT(*) as total_rows,
       COUNT(slave_id) as non_null_slave_id,
       COUNT(*) - COUNT(slave_id) as null_slave_id
FROM parameters_value;

-- 2. อัปเดต slave_id = 3 สำหรับข้อมูลในช่วงวันที่ที่ต้องการ
UPDATE parameters_value 
SET slave_id = 3 
WHERE reading_timestamp >= '2025-08-25 00:00:00' 
AND reading_timestamp <= '2025-08-26 23:59:59'
AND slave_id IS NULL;

-- 3. อัปเดต slave_id อื่นๆ ตามต้องการ
-- ตัวอย่าง: กำหนด slave_id = 1, 2, 4, 5, ... สำหรับข้อมูลอื่นๆ
UPDATE parameters_value 
SET slave_id = 1 
WHERE reading_timestamp >= '2025-08-25 00:00:00' 
AND reading_timestamp <= '2025-08-26 23:59:59'
AND slave_id IS NULL
LIMIT 1000;

UPDATE parameters_value 
SET slave_id = 2 
WHERE reading_timestamp >= '2025-08-25 00:00:00' 
AND reading_timestamp <= '2025-08-26 23:59:59'
AND slave_id IS NULL
LIMIT 1000;

-- 4. ตรวจสอบผลลัพธ์
SELECT DISTINCT slave_id, COUNT(*) as count
FROM parameters_value 
WHERE slave_id IS NOT NULL
GROUP BY slave_id
ORDER BY slave_id;

-- 5. ตรวจสอบข้อมูลสำหรับ slave_id = 3
SELECT reading_timestamp, slave_id, param_01_freqency, param_05_voltage_avg_phase
FROM parameters_value 
WHERE slave_id = 3
ORDER BY reading_timestamp DESC 
LIMIT 5;
