# Export Scheduler Pool Update Summary

## การเปลี่ยนแปลงที่ทำใน exportScheduler.js

### **1. เปลี่ยน Database Connection** ✅

#### **เดิม - ใช้ Default Pool**:
```javascript
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'webmeter',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});
```

#### **ใหม่ - ใช้ Parameters Pool**:
```javascript
const parametersPool = new Pool({
  host: '192.168.1.175',
  port: 5432,
  database: 'parameters_db',
  user: 'postgres',
  password: 'orangepi123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### **2. เพิ่ม Table Creation สำหรับ Email/LINE Lists** ✅

#### **Email List Table**:
```sql
CREATE TABLE IF NOT EXISTS email_list (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  groups TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **LINE List Table**:
```sql
CREATE TABLE IF NOT EXISTS line_list (
  id SERIAL PRIMARY KEY,
  line_messaging_id VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  line_groups TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **3. อัปเดต Database Queries ทั้งหมด** ✅

#### **Schedule Management Queries**:
```javascript
// เดิม
const result = await pool.query(`SELECT * FROM export_schedules WHERE enabled = true AND next_run <= NOW()`);
const currentSchedule = await pool.query('SELECT * FROM export_schedules WHERE id = $1', [scheduleId]);
await pool.query(`UPDATE export_schedules SET last_run = NOW(), next_run = $1, run_count = run_count + 1 WHERE id = $2`);

// ใหม่
const result = await parametersPool.query(`SELECT * FROM export_schedules WHERE enabled = true AND next_run <= NOW()`);
const currentSchedule = await parametersPool.query('SELECT * FROM export_schedules WHERE id = $1', [scheduleId]);
await parametersPool.query(`UPDATE export_schedules SET last_run = NOW(), next_run = $1, run_count = run_count + 1 WHERE id = $2`);
```

#### **Email/LINE Recipients Queries**:
```javascript
// เดิม
const result = await pool.query('SELECT id, email, name FROM email_list WHERE id = ANY($1)', [emailListIds]);
const result = await pool.query('SELECT id, line_messaging_id, display_name as "displayName" FROM line_list WHERE id = ANY($1)', [lineListIds]);

// ใหม่
const result = await parametersPool.query('SELECT id, email, name FROM email_list WHERE id = ANY($1)', [emailListIds]);
const result = await parametersPool.query('SELECT id, line_messaging_id, display_name as "displayName" FROM line_list WHERE id = ANY($1)', [lineListIds]);
```

## Database Schema ใน parameters_db

### **export_schedules Table** (จาก export-schedules.js):
```sql
CREATE TABLE IF NOT EXISTS export_schedules (
  id SERIAL PRIMARY KEY,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time VARCHAR(5) NOT NULL,
  day_of_week VARCHAR(10),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  export_type VARCHAR(50) NOT NULL,
  export_format VARCHAR(20) NOT NULL,
  read_time VARCHAR(10) NOT NULL,
  meters JSONB NOT NULL,
  parameters JSONB NOT NULL,
  file_path TEXT,
  email_list JSONB,
  line_list JSONB,
  date_from DATE,
  date_to DATE,
  time_from VARCHAR(5),
  time_to VARCHAR(5),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NOT NULL,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  run_count INTEGER DEFAULT 0
);
```

### **email_list Table** (ใหม่):
```sql
CREATE TABLE IF NOT EXISTS email_list (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  groups TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **line_list Table** (ใหม่):
```sql
CREATE TABLE IF NOT EXISTS line_list (
  id SERIAL PRIMARY KEY,
  line_messaging_id VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  line_groups TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Export Scheduler Functions ที่ได้รับผลกระทบ

### **1. checkAndRunDueSchedules()** ⏰
- **Function**: ตรวจสอบและรัน schedules ที่ถึงเวลา
- **Database**: ดึงข้อมูลจาก `parameters_db.export_schedules`

### **2. markScheduleAsRun()** 📝
- **Function**: อัปเดตสถานะการทำงานของ schedule
- **Database**: อัปเดตใน `parameters_db.export_schedules`

### **3. getEmailRecipients()** 📧
- **Function**: ดึงรายชื่อผู้รับ email
- **Database**: ดึงข้อมูลจาก `parameters_db.email_list`

### **4. getLineRecipients()** 📱
- **Function**: ดึงรายชื่อผู้รับ LINE
- **Database**: ดึงข้อมูลจาก `parameters_db.line_list`

### **5. sendEmailExport()** 📧
- **Function**: ส่ง email export พร้อมข้อมูลจริง
- **Dependencies**: ต้องการ `email_list` table

### **6. sendLineExport()** 📱
- **Function**: ส่ง LINE export พร้อมข้อมูลจริง
- **Dependencies**: ต้องการ `line_list` table

## Sample Data สำหรับทดสอบ

### **Email List Sample Data**:
```sql
INSERT INTO email_list (email, name, groups) VALUES 
('test1@example.com', 'Test User 1', ARRAY['admin', 'reports']),
('test2@example.com', 'Test User 2', ARRAY['users', 'reports']),
('admin@company.com', 'Admin User', ARRAY['admin']);
```

### **LINE List Sample Data**:
```sql
INSERT INTO line_list (line_messaging_id, display_name, line_groups) VALUES 
('U1234567890abcdef', 'Test User 1', ARRAY['admin', 'alerts']),
('U0987654321fedcba', 'Test User 2', ARRAY['users', 'alerts']),
('Uadmin123456789', 'Admin User', ARRAY['admin']);
```

## การทดสอบ

### **1. ตรวจสอบ Database Connection**:
```bash
# ทดสอบการเชื่อมต่อ parameters_db
psql -h 192.168.1.175 -p 5432 -U postgres -d parameters_db
```

### **2. ตรวจสอบ Tables**:
```sql
-- ตรวจสอบว่า tables ถูกสร้าง
\dt export_schedules
\dt email_list
\dt line_list

-- ตรวจสอบ schema
\d export_schedules
\d email_list
\d line_list
```

### **3. ทดสอบ Auto Export**:
```bash
# รัน server
node server.js

# สร้าง export schedule ผ่าน UI
# - เลือก Export Format: Email หรือ LINE
# - เลือก recipients
# - กำหนดเวลา export
# - ตรวจสอบ console logs
```

### **4. ตรวจสอบ Console Logs**:
```
📋 Fetching all export schedules
✅ Found 2 export schedules
⏰ Found 1 due export schedules
🏃 Running export schedule 123: table_data - email
📧 Sending email export for schedule 123
📧 Found 2 email recipients
📧 Email sent to test1@example.com
✅ Schedule 123 marked as run, next run: Sun Sep 28 2025 16:35:00
```

## ข้อดีของการเปลี่ยนแปลง

### **1. Centralized Database** 🎯:
- Export schedules, email lists, และ LINE lists อยู่ใน database เดียวกัน
- ง่ายต่อการ backup และ maintenance

### **2. Consistent Connection Pool** ⚡:
- ใช้ connection pool เดียวกันสำหรับทุก operations
- ลด connection overhead

### **3. Auto Table Creation** 🔧:
- Tables จะถูกสร้างอัตโนมัติเมื่อ server start
- ไม่ต้อง manual setup

### **4. Better Organization** 📋:
- Email/LINE lists แยกจาก user management
- เฉพาะสำหรับ export functionality

## Troubleshooting

### **ปัญหาที่อาจเกิดขึ้น**:

#### **1. Connection Error**:
```
Error: connect ECONNREFUSED 192.168.1.175:5432
```
**วิธีแก้**: ตรวจสอบว่า PostgreSQL server ทำงานอยู่ที่ 192.168.1.175:5432

#### **2. Authentication Error**:
```
Error: password authentication failed for user "postgres"
```
**วิธีแก้**: ตรวจสอบ username/password ใน connection config

#### **3. Database Not Found**:
```
Error: database "parameters_db" does not exist
```
**วิธีแก้**: สร้าง database `parameters_db` ก่อน

#### **4. Table Creation Error**:
```
Error: permission denied for schema public
```
**วิธีแก้**: ให้สิทธิ์ CREATE TABLE แก่ user `postgres`

## สรุป

การอัปเดตนี้ทำให้:
- ✅ Export Scheduler ใช้ `parametersPool` เดียวกับ export-schedules.js
- ✅ สร้าง `email_list` และ `line_list` tables อัตโนมัติ
- ✅ Email/LINE Auto Export สามารถทำงานได้
- ✅ ข้อมูลทั้งหมดอยู่ใน `parameters_db` database
- ✅ Connection pool ที่ปรับแต่งเฉพาะ

ตอนนี้ Export Scheduler พร้อมทำงานกับ `parametersPool` แล้ว! 🎉
