# Holiday & FT Configuration Database Setup Guide

## ภาพรวม

คู่มือนี้จะอธิบายการตั้งค่าฐานข้อมูลสำหรับระบบจัดการวันหยุดและค่า FT (Fuel Adjustment Charge) ใน WebMeter

## โครงสร้างฐานข้อมูล

### 1. ตาราง Holiday

ตาราง `holiday` ใช้เก็บข้อมูลวันหยุดต่างๆ โดยมีฟิลด์ดังนี้:

```sql
CREATE TABLE holiday (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,                    -- วันที่
    name_th VARCHAR(200) NOT NULL,         -- ชื่อวันหยุดภาษาไทย
    name_en VARCHAR(200) NOT NULL,         -- ชื่อวันหยุดภาษาอังกฤษ
    type VARCHAR(50) NOT NULL,             -- ประเภท: national, religious, observance
    category VARCHAR(50) NOT NULL,         -- หมวดหมู่: special, annual
    is_weekend BOOLEAN NOT NULL,           -- เป็นวันหยุดสุดสัปดาห์หรือไม่
    is_active BOOLEAN NOT NULL,            -- สถานะการใช้งาน
    created_by VARCHAR(100),               -- ผู้สร้าง
    created_at TIMESTAMP,                  -- วันที่สร้าง
    updated_by VARCHAR(100),               -- ผู้แก้ไข
    updated_at TIMESTAMP                   -- วันที่แก้ไข
);
```

### 2. ตาราง FT Config

ตาราง `ft_config` ใช้เก็บข้อมูลค่า FT โดยมีฟิลด์ดังนี้:

```sql
CREATE TABLE ft_config (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,                 -- ปี
    name VARCHAR(100) NOT NULL,            -- ชื่อค่า FT
    value DECIMAL(10,4) NOT NULL,          -- ค่า FT
    unit VARCHAR(50) NOT NULL,             -- หน่วย
    description TEXT,                      -- คำอธิบาย
    start_month VARCHAR(10) NOT NULL,      -- เดือนเริ่มต้น
    end_month VARCHAR(10) NOT NULL,        -- เดือนสิ้นสุด
    start_day INTEGER NOT NULL,            -- วันที่เริ่มต้น
    end_day INTEGER NOT NULL,              -- วันที่สิ้นสุด
    is_active BOOLEAN NOT NULL,            -- สถานะการใช้งาน
    created_by VARCHAR(100),               -- ผู้สร้าง
    created_at TIMESTAMP,                  -- วันที่สร้าง
    updated_by VARCHAR(100),               -- ผู้แก้ไข
    updated_at TIMESTAMP                   -- วันที่แก้ไข
);
```

## การติดตั้ง

### 1. รันไฟล์ SQL

```bash
# รันไฟล์สร้างตารางและข้อมูล
psql -U webmeter_user -d webmeter_db -f create_holiday_ft_tables.sql
```

### 2. ตรวจสอบการติดตั้ง

```sql
-- ตรวจสอบตาราง holiday
SELECT COUNT(*) FROM holiday;

-- ตรวจสอบตาราง ft_config
SELECT COUNT(*) FROM ft_config;

-- ตรวจสอบข้อมูลวันหยุดปีปัจจุบัน
SELECT * FROM holiday WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE);

-- ตรวจสอบค่า FT ปีปัจจุบัน
SELECT * FROM ft_config WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);
```

## ข้อมูลเริ่มต้น

### วันหยุดที่สร้างอัตโนมัติ

ระบบจะสร้างวันหยุดสำหรับ 13 ปี (ย้อนหลัง 3 ปี + ปัจจุบัน + ล่วงหน้า 10 ปี) รวมถึง:

**วันหยุดประจำปี (Annual):**
- วันขึ้นปีใหม่ (1 มกราคม)
- วันมาฆบูชา (ประมาณ 15 กุมภาพันธ์)
- วันจักรี (6 เมษายน)
- วันสงกรานต์ (13 เมษายน)
- วันแรงงานแห่งชาติ (1 พฤษภาคม)
- วันฉัตรมงคล (5 พฤษภาคม)
- วันวิสาขบูชา (ประมาณ 15 พฤษภาคม)
- วันอาสาฬหบูชา (ประมาณ 15 กรกฎาคม)
- วันเข้าพรรษา (ประมาณ 16 กรกฎาคม)
- วันแม่แห่งชาติ (12 สิงหาคม)
- วันพ่อแห่งชาติ (5 ธันวาคม)
- วันรัฐธรรมนูญ (10 ธันวาคม)
- วันสิ้นปี (31 ธันวาคม)

**วันหยุดไม่ประจำปี (Special):**
- วันหยุดพิเศษ 1 (15 มีนาคม)
- วันหยุดพิเศษ 2 (20 กันยายน)

### ค่า FT เริ่มต้น

ระบบจะสร้างค่า FT เริ่มต้นสำหรับปีปัจจุบัน:
- FT Rate 1: 0.0000 Baht/Unit (อัตราค่าไฟฟ้าฐาน)
- FT Rate 2: 0.0000 Baht/Unit (อัตราค่าไฟฟ้าปรับ)
- FT Rate 3: 0.0000 Baht/Unit (อัตราค่าไฟฟ้าเพิ่มเติม)

## API Endpoints

### Holiday API

#### GET /api/holiday
- ดึงข้อมูลวันหยุดทั้งหมด
- Query parameters: `year`, `category`, `type`, `limit`, `offset`

#### GET /api/holiday/:id
- ดึงข้อมูลวันหยุดตาม ID

#### POST /api/holiday
- สร้างวันหยุดใหม่
- Body: `{ date, name_th, name_en, type, category, created_by }`

#### PUT /api/holiday/:id
- แก้ไขข้อมูลวันหยุด
- Body: `{ date?, name_th?, name_en?, type?, category?, updated_by }`

#### DELETE /api/holiday/:id
- ลบวันหยุด (soft delete)
- Body: `{ deleted_by }`

#### GET /api/holiday/range/:startYear/:endYear
- ดึงข้อมูลวันหยุดตามช่วงปี
- Query parameters: `category`, `type`

### FT Config API

#### GET /api/ft-config
- ดึงข้อมูลค่า FT ทั้งหมด
- Query parameters: `year`, `name`, `limit`, `offset`

#### GET /api/ft-config/:id
- ดึงข้อมูลค่า FT ตาม ID

#### POST /api/ft-config
- สร้างค่า FT ใหม่
- Body: `{ year, name, value, unit, description?, start_month?, end_month?, start_day?, end_day?, created_by }`

#### PUT /api/ft-config/:id
- แก้ไขข้อมูลค่า FT
- Body: `{ year?, name?, value?, unit?, description?, start_month?, end_month?, start_day?, end_day?, updated_by }`

#### DELETE /api/ft-config/:id
- ลบค่า FT (soft delete)
- Body: `{ deleted_by }`

#### GET /api/ft-config/year/:year
- ดึงข้อมูลค่า FT ตามปี
- Query parameters: `name`

#### GET /api/ft-config/year-range/:startYear/:endYear
- ดึงข้อมูลค่า FT ตามช่วงปี
- Query parameters: `name`

#### POST /api/ft-config/bulk/:year
- สร้างค่า FT หลายรายการพร้อมกัน
- Body: `{ configurations: [...], created_by }`

## การใช้งานใน Frontend

### 1. Import Services

```typescript
import { holidayService } from '@/services/holidayService';
import { ftConfigService } from '@/services/ftConfigService';
```

### 2. ตัวอย่างการใช้งาน Holiday Service

```typescript
// ดึงวันหยุดปีปัจจุบัน
const holidays = await holidayService.getHolidaysByYear(2024);

// ดึงวันหยุดประจำปี
const annualHolidays = await holidayService.getAnnualHolidays(2024);

// ดึงวันหยุดไม่ประจำปี
const specialHolidays = await holidayService.getSpecialHolidays(2024);

// สร้างวันหยุดใหม่
const newHoliday = await holidayService.createHoliday({
  date: '2024-12-25',
  name_th: 'วันคริสต์มาส',
  name_en: 'Christmas Day',
  type: 'observance',
  category: 'special'
});

// ตรวจสอบว่าเป็นวันหยุดหรือไม่
const isHoliday = await holidayService.isHoliday('2024-01-01');
```

### 3. ตัวอย่างการใช้งาน FT Config Service

```typescript
// ดึงค่า FT ปีปัจจุบัน
const ftConfigs = await ftConfigService.getCurrentYearFTConfigs();

// สร้างค่า FT ใหม่
const newFTConfig = await ftConfigService.createFTConfig({
  year: 2024,
  name: 'FT Rate 4',
  value: 0.1500,
  unit: 'Baht/Unit',
  description: 'อัตราค่าไฟฟ้าพิเศษ'
});

// สร้างค่า FT หลายรายการพร้อมกัน
const bulkResult = await ftConfigService.bulkCreateFTConfigs(2024, {
  configurations: [
    { year: 2024, name: 'FT Rate 1', value: 0.1000, unit: 'Baht/Unit' },
    { year: 2024, name: 'FT Rate 2', value: 0.2000, unit: 'Baht/Unit' }
  ]
});

// คัดลอกค่า FT จากปีหนึ่งไปอีกปี
const copyResult = await ftConfigService.copyFTConfigsFromYear(2023, 2024);
```

## การบำรุงรักษา

### 1. การเพิ่มวันหยุดใหม่

```sql
-- เพิ่มวันหยุดใหม่
INSERT INTO holiday (date, name_th, name_en, type, category, is_weekend, created_by)
VALUES ('2024-12-25', 'วันคริสต์มาส', 'Christmas Day', 'observance', 'special', false, 'admin');
```

### 2. การอัปเดตค่า FT

```sql
-- อัปเดตค่า FT
UPDATE ft_config 
SET value = 0.1500, updated_by = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE year = 2024 AND name = 'FT Rate 1';
```

### 3. การลบข้อมูล (Soft Delete)

```sql
-- ลบวันหยุด (soft delete)
UPDATE holiday 
SET is_active = FALSE, updated_by = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE id = 123;

-- ลบค่า FT (soft delete)
UPDATE ft_config 
SET is_active = FALSE, updated_by = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE id = 456;
```

## การสำรองข้อมูล

### 1. สำรองข้อมูลวันหยุด

```bash
pg_dump -U webmeter_user -d webmeter_db -t holiday > holiday_backup.sql
```

### 2. สำรองข้อมูลค่า FT

```bash
pg_dump -U webmeter_user -d webmeter_db -t ft_config > ft_config_backup.sql
```

### 3. กู้คืนข้อมูล

```bash
psql -U webmeter_user -d webmeter_db -f holiday_backup.sql
psql -U webmeter_user -d webmeter_db -f ft_config_backup.sql
```

## การแก้ไขปัญหา

### 1. ตรวจสอบการเชื่อมต่อฐานข้อมูล

```bash
psql -U webmeter_user -d webmeter_db -c "SELECT version();"
```

### 2. ตรวจสอบสิทธิ์การเข้าถึง

```sql
-- ตรวจสอบสิทธิ์ของ webmeter_user
SELECT grantee, table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN ('holiday', 'ft_config');
```

### 3. ตรวจสอบข้อมูล

```sql
-- ตรวจสอบจำนวนข้อมูล
SELECT 'holiday' as table_name, COUNT(*) as count FROM holiday WHERE is_active = TRUE
UNION ALL
SELECT 'ft_config' as table_name, COUNT(*) as count FROM ft_config WHERE is_active = TRUE;
```

## หมายเหตุ

- ระบบใช้ soft delete สำหรับการลบข้อมูล
- วันหยุดทางศาสนาอาจมีการเปลี่ยนแปลงตามปฏิทินจันทรคติ
- ค่า FT จะถูกใช้ในการคำนวณค่าไฟฟ้า
- ควรมีการสำรองข้อมูลเป็นประจำ
