-- สร้างตารางตัวอย่างสำหรับทดสอบ parameters_db
-- ใช้คำสั่งนี้ใน PostgreSQL เพื่อสร้างข้อมูลทดสอบ

-- สร้าง database ถ้ายังไม่มี
-- CREATE DATABASE parameters_db;

-- เชื่อมต่อไปยัง parameters_db
-- \c parameters_db;

-- สร้างตาราง parameters_data
CREATE TABLE IF NOT EXISTS parameters_data (
    id SERIAL PRIMARY KEY,
    reading_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    meter_id VARCHAR(50),
    meter_name VARCHAR(100),
    param_01_freqency DECIMAL(10,2),
    param_02_voltage_phase_1 DECIMAL(10,2),
    param_03_voltage_phase_2 DECIMAL(10,2),
    param_04_voltage_phase_3 DECIMAL(10,2),
    param_05_voltage_avg_phase DECIMAL(10,2),
    param_06_voltage_line_1_2 DECIMAL(10,2),
    param_07_voltage_line_2_3 DECIMAL(10,2),
    param_08_voltage_line_3_1 DECIMAL(10,2),
    param_09_voltage_avg_line DECIMAL(10,2),
    param_10_current_phase_a DECIMAL(10,3),
    param_11_current_phase_b DECIMAL(10,3),
    param_12_current_phase_c DECIMAL(10,3),
    param_13_current_avg_phase DECIMAL(10,3),
    param_14_current_neutral DECIMAL(10,3),
    param_15_power_phase_a DECIMAL(12,5),
    param_16_power_phase_b DECIMAL(12,5),
    param_17_power_phase_c DECIMAL(12,5),
    param_18_power_total_system DECIMAL(12,5),
    param_19_reactive_power_phase_a DECIMAL(12,5),
    param_20_reactive_power_phase_b DECIMAL(12,5),
    param_21_reactive_power_phase_c DECIMAL(12,5),
    param_22_reactive_power_total DECIMAL(12,5),
    param_23_apparent_power_phase_a DECIMAL(12,5),
    param_24_apparent_power_phase_b DECIMAL(12,5),
    param_25_apparent_power_phase_c DECIMAL(12,5),
    param_26_apparent_power_total DECIMAL(12,5),
    param_27_power_factor_phase_a DECIMAL(5,3),
    param_28_power_factor_phase_b DECIMAL(5,3),
    param_29_power_factor_phase_c DECIMAL(5,3),
    param_30_power_factor_total DECIMAL(5,3),
    param_31_power_demand DECIMAL(10,2),
    param_32_reactive_power_demand DECIMAL(10,2),
    param_33_apparent_power_demand DECIMAL(10,2),
    param_34_import_kwh DECIMAL(12,2),
    param_35_export_kwh DECIMAL(12,2),
    param_36_import_kvarh DECIMAL(12,2),
    param_37_export_kvarh DECIMAL(12,2),
    param_38_thdv DECIMAL(5,2),
    param_39_thdi DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้าง index สำหรับประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_parameters_reading_timestamp ON parameters_data(reading_timestamp);
CREATE INDEX IF NOT EXISTS idx_parameters_meter_id ON parameters_data(meter_id);

-- เพิ่มข้อมูลตัวอย่าง (ทุก 15 นาที ในวันนี้)
INSERT INTO parameters_data (
    reading_timestamp, meter_id, meter_name,
    param_01_freqency, param_02_voltage_phase_1, param_03_voltage_phase_2, param_04_voltage_phase_3, param_05_voltage_avg_phase,
    param_06_voltage_line_1_2, param_07_voltage_line_2_3, param_08_voltage_line_3_1, param_09_voltage_avg_line,
    param_10_current_phase_a, param_11_current_phase_b, param_12_current_phase_c, param_13_current_avg_phase, param_14_current_neutral,
    param_15_power_phase_a, param_16_power_phase_b, param_17_power_phase_c, param_18_power_total_system,
    param_19_reactive_power_phase_a, param_20_reactive_power_phase_b, param_21_reactive_power_phase_c, param_22_reactive_power_total,
    param_23_apparent_power_phase_a, param_24_apparent_power_phase_b, param_25_apparent_power_phase_c, param_26_apparent_power_total,
    param_27_power_factor_phase_a, param_28_power_factor_phase_b, param_29_power_factor_phase_c, param_30_power_factor_total,
    param_31_power_demand, param_32_reactive_power_demand, param_33_apparent_power_demand,
    param_34_import_kwh, param_35_export_kwh, param_36_import_kvarh, param_37_export_kvarh,
    param_38_thdv, param_39_thdi
) VALUES 
-- ข้อมูลวันนี้ ทุก 15 นาที
(NOW() - INTERVAL '3 hours', 'METER001', 'Main Building Meter', 50.01, 220.5, 221.2, 219.8, 220.5, 380.2, 381.1, 379.5, 380.3, 5.12, 5.08, 5.15, 5.12, 0.05, 1125.6, 1118.4, 1131.7, 3375.7, 255.3, 260.1, 248.9, 764.3, 1150.2, 1145.8, 1158.3, 3454.3, 0.978, 0.976, 0.977, 0.977, 3500.5, 780.2, 3600.1, 12850.25, 1250.75, 850.30, 450.80, 2.5, 3.2),
(NOW() - INTERVAL '2 hours 45 minutes', 'METER001', 'Main Building Meter', 49.98, 220.8, 221.5, 220.1, 220.8, 380.5, 381.4, 379.8, 380.6, 5.18, 5.14, 5.21, 5.18, 0.06, 1142.4, 1135.2, 1148.6, 3426.2, 268.7, 273.5, 261.3, 803.5, 1168.5, 1164.1, 1176.9, 3509.5, 0.978, 0.976, 0.977, 0.977, 3550.8, 815.7, 3650.3, 12875.50, 1255.25, 855.80, 455.30, 2.3, 3.0),
(NOW() - INTERVAL '2 hours 30 minutes', 'METER001', 'Main Building Meter', 50.02, 220.2, 220.9, 219.5, 220.2, 379.9, 380.8, 379.2, 380.0, 5.05, 5.01, 5.08, 5.05, 0.04, 1112.1, 1104.9, 1119.3, 3336.3, 241.9, 246.7, 234.5, 723.1, 1136.8, 1132.4, 1145.2, 3414.4, 0.979, 0.977, 0.978, 0.978, 3455.2, 735.6, 3555.8, 12900.75, 1260.00, 860.55, 459.05, 2.7, 3.4),
(NOW() - INTERVAL '2 hours 15 minutes', 'METER001', 'Main Building Meter', 49.99, 220.6, 221.3, 219.9, 220.6, 380.3, 381.2, 379.6, 380.4, 5.15, 5.11, 5.18, 5.15, 0.05, 1138.2, 1131.0, 1144.4, 3413.6, 264.5, 269.3, 257.1, 790.9, 1164.3, 1159.9, 1172.7, 3496.9, 0.978, 0.976, 0.977, 0.977, 3525.4, 805.3, 3625.7, 12925.25, 1264.50, 865.05, 462.55, 2.4, 3.1),
(NOW() - INTERVAL '2 hours', 'METER001', 'Main Building Meter', 50.00, 220.4, 221.1, 219.7, 220.4, 380.1, 381.0, 379.4, 380.2, 5.09, 5.05, 5.12, 5.09, 0.05, 1124.8, 1117.6, 1130.9, 3373.3, 253.1, 257.9, 246.7, 757.7, 1148.0, 1143.6, 1156.3, 3447.9, 0.978, 0.976, 0.977, 0.977, 3485.7, 770.8, 3580.2, 12950.50, 1269.25, 869.80, 466.30, 2.6, 3.3),
(NOW() - INTERVAL '1 hour 45 minutes', 'METER001', 'Main Building Meter', 50.01, 220.7, 221.4, 220.0, 220.7, 380.4, 381.3, 379.7, 380.5, 5.16, 5.12, 5.19, 5.16, 0.06, 1140.6, 1133.4, 1146.8, 3420.8, 266.9, 271.7, 259.5, 798.1, 1166.7, 1162.3, 1175.1, 3504.1, 0.978, 0.976, 0.977, 0.977, 3540.9, 810.5, 3640.4, 12975.75, 1274.00, 874.30, 469.80, 2.2, 2.9),
(NOW() - INTERVAL '1 hour 30 minutes', 'METER001', 'Main Building Meter', 49.98, 220.1, 220.8, 219.4, 220.1, 379.8, 380.7, 379.1, 379.9, 5.03, 4.99, 5.06, 5.03, 0.04, 1108.7, 1101.5, 1115.9, 3326.1, 239.7, 244.5, 232.3, 716.5, 1133.4, 1129.0, 1141.8, 3404.2, 0.979, 0.977, 0.978, 0.978, 3440.3, 725.2, 3540.9, 13000.25, 1278.50, 878.55, 473.05, 2.8, 3.5),
(NOW() - INTERVAL '1 hour 15 minutes', 'METER001', 'Main Building Meter', 50.02, 220.5, 221.2, 219.8, 220.5, 380.2, 381.1, 379.5, 380.3, 5.12, 5.08, 5.15, 5.12, 0.05, 1125.6, 1118.4, 1131.7, 3375.7, 255.3, 260.1, 248.9, 764.3, 1150.2, 1145.8, 1158.3, 3454.3, 0.978, 0.976, 0.977, 0.977, 3500.5, 780.2, 3600.1, 13025.50, 1283.25, 883.05, 476.80, 2.5, 3.2),
(NOW() - INTERVAL '1 hour', 'METER001', 'Main Building Meter', 49.99, 220.3, 221.0, 219.6, 220.3, 380.0, 380.9, 379.3, 380.1, 5.07, 5.03, 5.10, 5.07, 0.05, 1121.2, 1114.0, 1127.3, 3362.5, 250.9, 255.7, 244.5, 751.1, 1145.8, 1141.4, 1154.1, 3441.3, 0.978, 0.976, 0.977, 0.977, 3470.8, 760.9, 3570.3, 13050.75, 1288.00, 887.80, 480.30, 2.7, 3.4),
(NOW() - INTERVAL '45 minutes', 'METER001', 'Main Building Meter', 50.00, 220.6, 221.3, 219.9, 220.6, 380.3, 381.2, 379.6, 380.4, 5.14, 5.10, 5.17, 5.14, 0.05, 1134.8, 1127.6, 1140.9, 3403.3, 262.7, 267.5, 255.3, 785.5, 1161.9, 1157.5, 1170.3, 3489.7, 0.978, 0.976, 0.977, 0.977, 3515.6, 795.4, 3615.8, 13076.00, 1292.50, 892.30, 483.55, 2.3, 3.0),
(NOW() - INTERVAL '30 minutes', 'METER001', 'Main Building Meter', 50.01, 220.4, 221.1, 219.7, 220.4, 380.1, 381.0, 379.4, 380.2, 5.08, 5.04, 5.11, 5.08, 0.05, 1118.4, 1111.2, 1124.5, 3354.1, 248.7, 253.5, 242.3, 744.5, 1142.6, 1138.2, 1150.9, 3431.7, 0.978, 0.976, 0.977, 0.977, 3460.2, 750.7, 3560.4, 13100.25, 1297.25, 896.55, 487.05, 2.6, 3.3),
(NOW() - INTERVAL '15 minutes', 'METER001', 'Main Building Meter', 49.98, 220.2, 220.9, 219.5, 220.2, 379.9, 380.8, 379.2, 380.0, 5.06, 5.02, 5.09, 5.06, 0.04, 1115.0, 1107.8, 1121.1, 3343.9, 246.5, 251.3, 240.1, 737.9, 1139.2, 1134.8, 1147.5, 3421.5, 0.979, 0.977, 0.978, 0.978, 3435.8, 740.3, 3535.9, 13125.50, 1301.75, 901.05, 490.80, 2.8, 3.5),
(NOW(), 'METER001', 'Main Building Meter', 50.00, 220.5, 221.2, 219.8, 220.5, 380.2, 381.1, 379.5, 380.3, 5.10, 5.06, 5.13, 5.10, 0.05, 1122.6, 1115.4, 1128.7, 3366.7, 252.1, 256.9, 245.7, 754.7, 1147.4, 1143.0, 1155.7, 3446.1, 0.978, 0.976, 0.977, 0.977, 3475.9, 765.8, 3575.2, 13150.75, 1306.50, 905.80, 494.30, 2.5, 3.2);
