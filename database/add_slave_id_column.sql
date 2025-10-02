-- เพิ่มคอลัมน์ slave_id ในตาราง parameters_value
\c parameters_db;

-- 1. เพิ่มคอลัมน์ slave_id
ALTER TABLE parameters_value ADD COLUMN IF NOT EXISTS slave_id INTEGER;

-- 2. อัปเดตข้อมูล slave_id ตามที่ต้องการ
-- ตัวอย่าง: กำหนด slave_id = 3 สำหรับข้อมูลบางส่วน
UPDATE parameters_value 
SET slave_id = 3 
WHERE reading_timestamp >= '2025-08-25 00:00:00' 
AND reading_timestamp <= '2025-08-26 23:59:59'
AND slave_id IS NULL
LIMIT 1000;

-- 3. ตรวจสอบผลลัพธ์
SELECT reading_timestamp, slave_id, param_01_freqency, param_05_voltage_avg_phase
FROM parameters_value 
WHERE slave_id = 3
ORDER BY reading_timestamp DESC 
LIMIT 5;
