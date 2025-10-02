-- ให้สิทธิ์ User Management แก่ role ที่ต้องการ
-- แก้ไข role_name ตามที่ต้องการ (เช่น 'Test', 'Manager', 'Admin')

-- 1. ตรวจสอบ role ที่มีอยู่
SELECT 'Available roles:' as info, role_name FROM users.roles ORDER BY role_name;

-- 2. ให้สิทธิ์ User Management แก่ role 'Test' (แก้ไขชื่อ role ตามต้องการ)
INSERT INTO users.role_permissions (role_id, module, can_read, can_write, can_report)
SELECT 
    r.id,
    'User Management',
    true,  -- view permission
    true,  -- edit permission  
    false  -- report permission (ถ้าต้องการให้ report ให้เปลี่ยนเป็น true)
FROM users.roles r
WHERE r.role_name = 'Test'  -- แก้ไขชื่อ role ตามต้องการ
ON CONFLICT (role_id, module) 
DO UPDATE SET 
    can_read = EXCLUDED.can_read,
    can_write = EXCLUDED.can_write,
    can_report = EXCLUDED.can_report,
    updated_at = CURRENT_TIMESTAMP;

-- 3. ตรวจสอบผลลัพธ์
SELECT 
    '✅ Updated User Management permissions for role:' as result,
    r.role_name,
    rp.can_read as view,
    rp.can_write as edit,
    rp.can_report as report
FROM users.roles r
INNER JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE rp.module = 'User Management' AND r.role_name = 'Test';  -- แก้ไขชื่อ role ตามต้องการ

-- 4. ตรวจสอบ user ที่จะได้รับสิทธิ์ใหม่
SELECT 
    '👥 Users who will get User Management access:' as info,
    u.username,
    u.name,
    u.surname,
    u.level as role
FROM users.users u
WHERE u.level = 'Test'  -- แก้ไขชื่อ role ตามต้องการ
  AND u.status = 'active';

-- คำแนะนำการใช้งาน:
-- 1. แก้ไข 'Test' เป็นชื่อ role ที่ต้องการให้สิทธิ์
-- 2. ปรับค่า can_read, can_write, can_report ตามต้องการ:
--    - can_read: true = สามารถดูหน้า Users ได้
--    - can_write: true = สามารถแก้ไข/เพิ่ม/ลบ users ได้
--    - can_report: true = สามารถสร้างรายงาน users ได้
-- 3. รัน script นี้ในฐานข้อมูล
-- 4. ให้ user logout และ login ใหม่เพื่อโหลด permissions ใหม่
