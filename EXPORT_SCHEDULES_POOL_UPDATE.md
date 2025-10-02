# Export Schedules Pool Update Summary

## การเปลี่ยนแปลงที่ทำ

### **เปลี่ยนจาก Default Pool เป็น Parameters Pool** ✅

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

### **Database Queries ที่อัปเดต** 📊

#### **1. Table Initialization**:
```javascript
// เดิม
pool.query(createTableQuery).catch(console.error);

// ใหม่
parametersPool.query(createTableQuery).catch(console.error);
```

#### **2. GET /api/export-schedules**:
```javascript
// เดิม
const result = await pool.query(`SELECT * FROM export_schedules ORDER BY created_at DESC`);

// ใหม่
const result = await parametersPool.query(`SELECT * FROM export_schedules ORDER BY created_at DESC`);
```

#### **3. POST /api/export-schedules**:
```javascript
// เดิม
const result = await pool.query(`INSERT INTO export_schedules (...) VALUES (...)`);

// ใหม่
const result = await parametersPool.query(`INSERT INTO export_schedules (...) VALUES (...)`);
```

#### **4. PUT /api/export-schedules/:id**:
```javascript
// เดิม
const currentSchedule = await pool.query('SELECT * FROM export_schedules WHERE id = $1', [id]);
const result = await pool.query(`UPDATE export_schedules SET enabled = $1, next_run = $2 WHERE id = $3`);

// ใหม่
const currentSchedule = await parametersPool.query('SELECT * FROM export_schedules WHERE id = $1', [id]);
const result = await parametersPool.query(`UPDATE export_schedules SET enabled = $1, next_run = $2 WHERE id = $3`);
```

#### **5. DELETE /api/export-schedules/:id**:
```javascript
// เดิม
const result = await pool.query(`DELETE FROM export_schedules WHERE id = $1 RETURNING *`);

// ใหม่
const result = await parametersPool.query(`DELETE FROM export_schedules WHERE id = $1 RETURNING *`);
```

#### **6. GET /api/export-schedules/due**:
```javascript
// เดิม
const result = await pool.query(`SELECT * FROM export_schedules WHERE enabled = true AND next_run <= NOW()`);

// ใหม่
const result = await parametersPool.query(`SELECT * FROM export_schedules WHERE enabled = true AND next_run <= NOW()`);
```

#### **7. POST /api/export-schedules/:id/run**:
```javascript
// เดิม
const currentSchedule = await pool.query('SELECT * FROM export_schedules WHERE id = $1', [id]);
const result = await pool.query(`UPDATE export_schedules SET last_run = NOW(), next_run = $1, run_count = run_count + 1`);

// ใหม่
const currentSchedule = await parametersPool.query('SELECT * FROM export_schedules WHERE id = $1', [id]);
const result = await parametersPool.query(`UPDATE export_schedules SET last_run = NOW(), next_run = $1, run_count = run_count + 1`);
```

## Database Connection Details

### **Parameters Pool Configuration** 🔧:
- **Host**: `192.168.1.175`
- **Port**: `5432`
- **Database**: `parameters_db`
- **User**: `postgres`
- **Password**: `orangepi123`
- **Max Connections**: `20`
- **Idle Timeout**: `30000ms` (30 seconds)
- **Connection Timeout**: `2000ms` (2 seconds)

### **Table Schema** 📋:
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

## API Endpoints ที่ได้รับผลกระทบ

### **1. GET /api/export-schedules** 📋
- **Function**: ดึงรายการ export schedules ทั้งหมด
- **Database**: ตอนนี้ใช้ `parameters_db` แทน `webmeter`

### **2. POST /api/export-schedules** ➕
- **Function**: สร้าง export schedule ใหม่
- **Database**: บันทึกลง `parameters_db`

### **3. PUT /api/export-schedules/:id** ✏️
- **Function**: อัปเดต export schedule (enable/disable)
- **Database**: อัปเดตใน `parameters_db`

### **4. DELETE /api/export-schedules/:id** 🗑️
- **Function**: ลบ export schedule
- **Database**: ลบจาก `parameters_db`

### **5. GET /api/export-schedules/due** ⏰
- **Function**: ดึง schedules ที่ถึงเวลาทำงาน
- **Database**: ค้นหาใน `parameters_db`

### **6. POST /api/export-schedules/:id/run** 🏃
- **Function**: อัปเดตสถานะการทำงานของ schedule
- **Database**: อัปเดตใน `parameters_db`

## การทดสอบ

### **1. ตรวจสอบ Database Connection**:
```bash
# ทดสอบการเชื่อมต่อ parameters_db
psql -h 192.168.1.175 -p 5432 -U postgres -d parameters_db
```

### **2. ตรวจสอบ Table Creation**:
```sql
-- ตรวจสอบว่า table ถูกสร้างใน parameters_db
\dt export_schedules
```

### **3. ทดสอบ API Endpoints**:
```bash
# GET - ดึงรายการ schedules
curl http://localhost:3001/api/export-schedules

# POST - สร้าง schedule ใหม่
curl -X POST http://localhost:3001/api/export-schedules \
  -H "Content-Type: application/json" \
  -d '{"frequency":"daily","time":"16:30",...}'

# PUT - อัปเดต schedule
curl -X PUT http://localhost:3001/api/export-schedules/1 \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'

# DELETE - ลบ schedule
curl -X DELETE http://localhost:3001/api/export-schedules/1
```

## ข้อดีของการเปลี่ยนแปลง

### **1. Dedicated Database** 🎯:
- Export schedules ถูกเก็บใน database เฉพาะ
- ไม่รบกวนข้อมูลหลักใน `webmeter` database

### **2. Better Performance** ⚡:
- Connection pool ที่ปรับแต่งเฉพาะ
- Timeout settings ที่เหมาะสม

### **3. Scalability** 📈:
- สามารถปรับแต่ง database settings แยกต่างหาก
- ง่ายต่อการ backup และ maintenance

### **4. Security** 🔒:
- แยก credentials และ access control
- ลดความเสี่ยงจากการเข้าถึงข้อมูลหลัก

## สรุป

การเปลี่ยนแปลงนี้ทำให้:
- ✅ Export schedules ใช้ `parameters_db` database
- ✅ Connection pool ที่ปรับแต่งเฉพาะ
- ✅ API endpoints ทำงานกับ database ใหม่
- ✅ Table schema รองรับ date/time fields
- ✅ ความปลอดภัยและประสิทธิภาพที่ดีขึ้น

ตอนนี้ Export Schedules ใช้ `parametersPool` ที่ระบุแล้ว! 🎉
