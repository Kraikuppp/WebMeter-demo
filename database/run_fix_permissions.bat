@echo off
echo ========================================
echo แก้ไขปัญหา Database Permissions
echo ========================================

echo.
echo 1. เชื่อมต่อ PostgreSQL ด้วย superuser...
echo psql -U postgres -d webmeter_db -f database/create_meter_tree_tables.sql
echo.

echo 2. รันคำสั่ง SQL แก้ไข permissions...
psql -U postgres -d webmeter_db -f database/create_meter_tree_tables.sql

echo.
echo 3. ตรวจสอบการเชื่อมต่อ...
echo psql -U webmeter_app -d webmeter_db -c "SELECT * FROM locations LIMIT 1;"
echo.

echo ========================================
echo เสร็จสิ้น! ลองทดสอบ Meter Tree อีกครั้ง
echo ========================================
pause
