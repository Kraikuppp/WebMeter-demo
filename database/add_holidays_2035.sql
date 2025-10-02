-- เพิ่มวันหยุดปี 2035
-- วันที่มีเครื่องหมาย * คือวันประเภท special

-- วันหยุดประจำปี (annual)
INSERT INTO holiday (date, name_holiday, category, created_by) VALUES
('2035-01-01', 'วันขึ้นปีใหม่', 'annual', 'system'),
('2035-04-06', 'วันจักรี', 'annual', 'system'),
('2035-04-13', 'วันสงกรานต์', 'annual', 'system'),
('2035-04-14', 'วันสงกรานต์', 'annual', 'system'),
('2035-04-15', 'วันสงกรานต์', 'annual', 'system'),
('2035-05-01', 'วันแรงงาน', 'annual', 'system'),
('2035-05-04', 'วันฉัตรมงคล', 'annual', 'system'),
('2035-06-03', 'วันเฉลิมฯพระราชินี', 'annual', 'system'),
('2035-07-28', 'วันเฉลิมพระชนมพรรษา ร.10', 'annual', 'system'),
('2035-08-12', 'วันแม่แห่งชาติ', 'annual', 'system'),
('2035-10-13', 'วันคล้ายวันสวรรคต ร.9', 'annual', 'system'),
('2035-10-23', 'วันปิยมหาราช', 'annual', 'system'),
('2035-12-05', 'วันพ่อแห่งชาติ', 'annual', 'system'),
('2035-12-10', 'วันรัฐธรรมนูญ', 'annual', 'system'),
('2035-12-31', 'วันสิ้นปี', 'annual', 'system');

-- วันหยุดพิเศษ (special) - วันที่มีเครื่องหมาย *
INSERT INTO holiday (date, name_holiday, category, created_by) VALUES
('2035-02-22', 'วันมาฆบูชา', 'special', 'system'),
('2035-05-21', 'วันวิสาขบูชา', 'special', 'system'),
('2035-07-20', 'วันอาสาฬหบูชา', 'special', 'system'),
('2035-07-21', 'วันเข้าพรรษา', 'special', 'system');

-- ตรวจสอบข้อมูลที่เพิ่ม
SELECT 
    date,
    name_holiday,
    category,
    created_at
FROM holiday 
WHERE EXTRACT(YEAR FROM date) = 2035 
ORDER BY date;
