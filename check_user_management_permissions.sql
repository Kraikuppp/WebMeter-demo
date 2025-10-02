-- ตรวจสอบสิทธิ์ User Management ของทุก role
SELECT 
    r.role_name,
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report,
    COUNT(u.id) as user_count
FROM users.roles r
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id AND rp.module = 'User Management'
LEFT JOIN users.users u ON u.level = r.role_name
GROUP BY r.role_name, rp.module, rp.can_read, rp.can_write, rp.can_report
ORDER BY r.role_name;

-- ตรวจสอบ user ปัจจุบันและสิทธิ์ของเขา
SELECT 
    u.username,
    u.level as user_role,
    r.role_name,
    rp.module,
    rp.can_read,
    rp.can_write,
    rp.can_report
FROM users.users u
LEFT JOIN users.roles r ON r.role_name = u.level
LEFT JOIN users.role_permissions rp ON r.id = rp.role_id AND rp.module = 'User Management'
WHERE u.status = 'active'
ORDER BY u.username;

-- ตรวจสอบว่า role ไหนที่มีสิทธิ์ User Management
SELECT 
    '🔍 Roles with User Management permissions:' as info,
    r.role_name,
    rp.can_read as view_permission,
    rp.can_write as edit_permission,
    rp.can_report as report_permission
FROM users.roles r
INNER JOIN users.role_permissions rp ON r.id = rp.role_id
WHERE rp.module = 'User Management' 
  AND (rp.can_read = true OR rp.can_write = true OR rp.can_report = true)
ORDER BY r.role_name;
