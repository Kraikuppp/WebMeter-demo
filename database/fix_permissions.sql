-- แก้ไขปัญหา Database Permissions สำหรับ Meter Tree
-- รันคำสั่งนี้ใน PostgreSQL เพื่อให้สิทธิ์กับ database user

-- 1. เชื่อมต่อ PostgreSQL ด้วย superuser (postgres)
-- psql -U postgres -d webmeter_db

-- 2. ตรวจสอบ database user ปัจจุบัน
SELECT current_user;

-- 3. ตรวจสอบสิทธิ์ของตาราง locations
\dp locations

-- 4. ให้สิทธิ์ทั้งหมดกับ webmeter_app user สำหรับตาราง locations
GRANT ALL PRIVILEGES ON TABLE locations TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE locations_id_seq TO webmeter_app;

-- 5. ให้สิทธิ์สำหรับตาราง lognets
GRANT ALL PRIVILEGES ON TABLE lognets TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE lognets_id_seq TO webmeter_app;

-- 6. ให้สิทธิ์สำหรับตาราง buildings
GRANT ALL PRIVILEGES ON TABLE buildings TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE buildings_id_seq TO webmeter_app;

-- 7. ให้สิทธิ์สำหรับตาราง floors
GRANT ALL PRIVILEGES ON TABLE floors TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE floors_id_seq TO webmeter_app;

-- 8. ให้สิทธิ์สำหรับตาราง meters
GRANT ALL PRIVILEGES ON TABLE meters TO webmeter_app;
GRANT USAGE, SELECT ON SEQUENCE meters_id_seq TO webmeter_app;

-- 9. ให้สิทธิ์สำหรับ schema public (ถ้าจำเป็น)
GRANT USAGE ON SCHEMA public TO webmeter_app;
GRANT CREATE ON SCHEMA public TO webmeter_app;

-- 10. ตรวจสอบสิทธิ์หลังจากให้แล้ว
\dp locations
\dp lognets
\dp buildings
\dp floors
\dp meters

-- 11. ทดสอบการเชื่อมต่อด้วย webmeter_app user
-- \q
-- psql -U webmeter_app -d webmeter_db -h localhost
-- SELECT * FROM locations LIMIT 1;
