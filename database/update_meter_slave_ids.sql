-- อัปเดต slave_id ให้กับมิเตอร์ที่มีอยู่
-- ไฟล์นี้จะเพิ่ม slave_id ให้กับมิเตอร์ที่ยังไม่มี

-- ตรวจสอบมิเตอร์ที่มีอยู่
SELECT id, name, slave_id FROM meters ORDER BY id;

-- อัปเดต slave_id ให้กับมิเตอร์ (ตัวอย่าง)
-- เปลี่ยน slave_id ตามความต้องการจริง

UPDATE meters SET slave_id = 1 WHERE name LIKE '%Main incoming%' OR name LIKE '%Main%';
UPDATE meters SET slave_id = 2 WHERE name LIKE '%Sub Panel A%' OR name LIKE '%Sub A%';
UPDATE meters SET slave_id = 3 WHERE name LIKE '%Sub Panel B%' OR name LIKE '%Sub B%';
UPDATE meters SET slave_id = 4 WHERE name LIKE '%Floor 1%' OR name LIKE '%F1%';
UPDATE meters SET slave_id = 5 WHERE name LIKE '%Floor 2%' OR name LIKE '%F2%';
UPDATE meters SET slave_id = 6 WHERE name LIKE '%Floor 3%' OR name LIKE '%F3%';
UPDATE meters SET slave_id = 7 WHERE name LIKE '%Floor 4%' OR name LIKE '%F4%';
UPDATE meters SET slave_id = 8 WHERE name LIKE '%Boiler%';
UPDATE meters SET slave_id = 9 WHERE name LIKE '%Controller%' OR name LIKE '%Plat%';

-- ตรวจสอบผลลัพธ์
SELECT id, name, slave_id FROM meters ORDER BY slave_id, id;

-- เพิ่มข้อมูลตัวอย่างถ้ายังไม่มี
INSERT INTO meters (name, brand, model, protocol, ip_address, slave_id, lognet_id, is_active) 
VALUES 
('Main Incoming Meter', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.100', 1, 1, true),
('Sub Panel A', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.101', 2, 1, true),
('Sub Panel B', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.102', 3, 1, true),
('Floor 1 Panel', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.103', 4, 1, true),
('Floor 2 Panel', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.104', 5, 1, true),
('Floor 3 Panel', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.105', 6, 1, true),
('Floor 4 Panel', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.106', 7, 1, true),
('Boiler Room', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.107', 8, 1, true),
('Platform Controller', 'Schneider', 'PM8000', 'Modbus TCP', '192.168.1.108', 9, 1, true)
ON CONFLICT (name) DO NOTHING;

-- ตรวจสอบผลลัพธ์สุดท้าย
SELECT id, name, slave_id, is_active FROM meters ORDER BY slave_id, id;
