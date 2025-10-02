-- สคริปต์สำหรับสร้าง database และข้อมูลทดสอบอย่างง่าย
-- เรียกใช้ใน PostgreSQL

-- เชื่อมต่อไปยัง PostgreSQL และสร้าง database
-- psql -U postgres -h localhost

-- สร้าง database ถ้ายังไม่มี
-- CREATE DATABASE parameters_db;

-- เชื่อมต่อไปยัง parameters_db
-- \c parameters_db;

-- ลบตารางเก่าถ้ามี
DROP TABLE IF EXISTS parameters_data;

-- สร้างตาราง parameters_data
CREATE TABLE parameters_data (
    id SERIAL PRIMARY KEY,
    reading_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    meter_id VARCHAR(50),
    meter_name VARCHAR(100),
    param_01_freqency DECIMAL(10,2) DEFAULT 50.00,
    param_02_voltage_phase_1 DECIMAL(10,2) DEFAULT 220.0,
    param_03_voltage_phase_2 DECIMAL(10,2) DEFAULT 220.0,
    param_04_voltage_phase_3 DECIMAL(10,2) DEFAULT 220.0,
    param_05_voltage_avg_phase DECIMAL(10,2) DEFAULT 220.0,
    param_06_voltage_line_1_2 DECIMAL(10,2) DEFAULT 380.0,
    param_07_voltage_line_2_3 DECIMAL(10,2) DEFAULT 380.0,
    param_08_voltage_line_3_1 DECIMAL(10,2) DEFAULT 380.0,
    param_09_voltage_avg_line DECIMAL(10,2) DEFAULT 380.0,
    param_10_current_phase_a DECIMAL(10,3) DEFAULT 5.000,
    param_11_current_phase_b DECIMAL(10,3) DEFAULT 5.000,
    param_12_current_phase_c DECIMAL(10,3) DEFAULT 5.000,
    param_13_current_avg_phase DECIMAL(10,3) DEFAULT 5.000,
    param_14_current_neutral DECIMAL(10,3) DEFAULT 0.050,
    param_15_power_phase_a DECIMAL(12,5) DEFAULT 1100.00000,
    param_16_power_phase_b DECIMAL(12,5) DEFAULT 1100.00000,
    param_17_power_phase_c DECIMAL(12,5) DEFAULT 1100.00000,
    param_18_power_total_system DECIMAL(12,5) DEFAULT 3300.00000,
    param_19_reactive_power_phase_a DECIMAL(12,5) DEFAULT 250.00000,
    param_20_reactive_power_phase_b DECIMAL(12,5) DEFAULT 250.00000,
    param_21_reactive_power_phase_c DECIMAL(12,5) DEFAULT 250.00000,
    param_22_reactive_power_total DECIMAL(12,5) DEFAULT 750.00000,
    param_23_apparent_power_phase_a DECIMAL(12,5) DEFAULT 1130.00000,
    param_24_apparent_power_phase_b DECIMAL(12,5) DEFAULT 1130.00000,
    param_25_apparent_power_phase_c DECIMAL(12,5) DEFAULT 1130.00000,
    param_26_apparent_power_total DECIMAL(12,5) DEFAULT 3390.00000,
    param_27_power_factor_phase_a DECIMAL(5,3) DEFAULT 0.978,
    param_28_power_factor_phase_b DECIMAL(5,3) DEFAULT 0.978,
    param_29_power_factor_phase_c DECIMAL(5,3) DEFAULT 0.978,
    param_30_power_factor_total DECIMAL(5,3) DEFAULT 0.978,
    param_31_power_demand DECIMAL(10,2) DEFAULT 3400.00,
    param_32_reactive_power_demand DECIMAL(10,2) DEFAULT 760.00,
    param_33_apparent_power_demand DECIMAL(10,2) DEFAULT 3500.00,
    param_34_import_kwh DECIMAL(12,2) DEFAULT 12000.00,
    param_35_export_kwh DECIMAL(12,2) DEFAULT 1200.00,
    param_36_import_kvarh DECIMAL(12,2) DEFAULT 800.00,
    param_37_export_kvarh DECIMAL(12,2) DEFAULT 400.00,
    param_38_thdv DECIMAL(5,2) DEFAULT 2.50,
    param_39_thdi DECIMAL(5,2) DEFAULT 3.20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้าง index สำหรับประสิทธิภาพ
CREATE INDEX idx_parameters_reading_timestamp ON parameters_data(reading_timestamp);
CREATE INDEX idx_parameters_meter_id ON parameters_data(meter_id);

-- เพิ่มข้อมูลตัวอย่าง (ทุก 15 นาที ในวันนี้)
INSERT INTO parameters_data (reading_timestamp, meter_id, meter_name) VALUES 
('2025-08-07 00:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 00:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 00:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 00:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 01:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 01:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 01:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 01:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 02:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 02:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 02:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 02:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 03:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 03:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 03:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 03:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 04:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 04:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 04:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 04:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 05:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 05:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 05:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 05:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 06:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 06:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 06:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 06:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 07:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 07:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 07:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 07:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 08:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 08:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 08:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 08:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 09:00:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 09:15:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 09:30:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 09:45:00+07', 'METER001', 'Main Building Meter'),
('2025-08-07 10:00:00+07', 'METER001', 'Main Building Meter');
