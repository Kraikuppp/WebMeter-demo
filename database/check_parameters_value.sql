-- ตรวจสอบและแก้ไขข้อมูลใน parameters_value table
-- ไฟล์นี้จะตรวจสอบ slave_id ใน parameters_value และอัปเดตถ้าจำเป็น

-- 1. ตรวจสอบโครงสร้างตาราง parameters_value
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'parameters_value' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ตรวจสอบข้อมูลที่มีอยู่
SELECT 
    reading_timestamp, 
    slave_id, 
    param_01_freqency,
    param_05_voltage_avg_phase,
    param_13_current_avg_phase,
    param_18_power_total_system
FROM parameters_value 
ORDER BY reading_timestamp DESC 
LIMIT 10;

-- 3. ตรวจสอบข้อมูลสำหรับ slave_id = 10
SELECT 
    reading_timestamp, 
    slave_id, 
    param_01_freqency,
    param_05_voltage_avg_phase,
    param_13_current_avg_phase,
    param_18_power_total_system
FROM parameters_value 
WHERE slave_id = 10
ORDER BY reading_timestamp DESC 
LIMIT 5;

-- 4. ตรวจสอบ slave_id ที่มีอยู่ในตาราง
SELECT DISTINCT slave_id, COUNT(*) as count
FROM parameters_value 
WHERE slave_id IS NOT NULL
GROUP BY slave_id
ORDER BY slave_id;

-- 5. ตรวจสอบข้อมูลที่ไม่มี slave_id
SELECT COUNT(*) as null_slave_id_count
FROM parameters_value 
WHERE slave_id IS NULL;

-- 6. ถ้าข้อมูลไม่มี slave_id ให้อัปเดต (ตัวอย่าง)
-- UPDATE parameters_value SET slave_id = 10 WHERE slave_id IS NULL AND reading_timestamp >= '2025-01-01';

-- 7. เพิ่มข้อมูลตัวอย่างสำหรับ slave_id = 10 (ถ้ายังไม่มี)
INSERT INTO parameters_value (
    reading_timestamp, 
    slave_id, 
    param_01_freqency,
    param_02_voltage_phase_1,
    param_03_voltage_phase_2,
    param_04_voltage_phase_3,
    param_05_voltage_avg_phase,
    param_06_voltage_line_1_2,
    param_07_voltage_line_2_3,
    param_08_voltage_line_3_1,
    param_09_voltage_avg_line,
    param_10_current_phase_a,
    param_11_current_phase_b,
    param_12_current_phase_c,
    param_13_current_avg_phase,
    param_14_current_neutral,
    param_15_power_phase_a,
    param_16_power_phase_b,
    param_17_power_phase_c,
    param_18_power_total_system,
    param_19_reactive_power_phase_a,
    param_20_reactive_power_phase_b,
    param_21_reactive_power_phase_c,
    param_22_reactive_power_total,
    param_23_apparent_power_phase_a,
    param_24_apparent_power_phase_b,
    param_25_apparent_power_phase_c,
    param_26_apparent_power_total,
    param_27_power_factor_phase_a,
    param_28_power_factor_phase_b,
    param_29_power_factor_phase_c,
    param_30_power_factor_total,
    param_31_power_demand,
    param_32_reactive_power_demand,
    param_33_apparent_power_demand,
    param_34_import_kwh,
    param_35_export_kwh,
    param_36_import_kvarh,
    param_37_export_kvarh,
    param_38_thdv,
    param_39_thdi
) VALUES 
('2025-08-25 17:00:00', 10, 50.0032, 225.5, 226.2, 227.1, 226.3, 390.5, 391.2, 392.1, 391.3, 40.5, 41.2, 42.1, 41.3, 5.2, 4500.5, 4600.2, 4700.1, 4600.3, 1200.5, 1250.2, 1300.1, 1250.3, 4800.5, 4900.2, 5000.1, 4900.3, 0.95, 0.96, 0.97, 0.96, 4600.3, 1250.3, 4900.3, 12800.5, 345.2, 3200.5, 45.2, 2.5, 3.2),
('2025-08-25 17:01:00', 10, 50.0035, 225.6, 226.3, 227.2, 226.4, 390.6, 391.3, 392.2, 391.4, 40.6, 41.3, 42.2, 41.4, 5.3, 4501.5, 4601.2, 4701.1, 4601.3, 1201.5, 1251.2, 1301.1, 1251.3, 4801.5, 4901.2, 5001.1, 4901.3, 0.95, 0.96, 0.97, 0.96, 4601.3, 1251.3, 4901.3, 12801.5, 345.3, 3201.5, 45.3, 2.6, 3.3),
('2025-08-25 17:02:00', 10, 50.0038, 225.7, 226.4, 227.3, 226.5, 390.7, 391.4, 392.3, 391.5, 40.7, 41.4, 42.3, 41.5, 5.4, 4502.5, 4602.2, 4702.1, 4602.3, 1202.5, 1252.2, 1302.1, 1252.3, 4802.5, 4902.2, 5002.1, 4902.3, 0.95, 0.96, 0.97, 0.96, 4602.3, 1252.3, 4902.3, 12802.5, 345.4, 3202.5, 45.4, 2.7, 3.4)
ON CONFLICT (reading_timestamp, slave_id) DO NOTHING;

-- 8. ตรวจสอบผลลัพธ์สุดท้าย
SELECT 
    reading_timestamp, 
    slave_id, 
    param_01_freqency,
    param_05_voltage_avg_phase,
    param_13_current_avg_phase,
    param_18_power_total_system
FROM parameters_value 
WHERE slave_id = 10
ORDER BY reading_timestamp DESC 
LIMIT 5;
