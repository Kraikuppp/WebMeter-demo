# Holiday & FT Configuration System Setup

## ภาพรวม

ระบบจัดการวันหยุดและค่า FT (Fuel Adjustment Charge) สำหรับ WebMeter ที่ประกอบด้วย:

1. **ฐานข้อมูล** - ตาราง holiday และ ft_config
2. **API Backend** - RESTful API สำหรับจัดการข้อมูล
3. **Frontend Services** - TypeScript services สำหรับเรียกใช้ API
4. **เอกสารและคู่มือ** - คู่มือการใช้งานและตัวอย่าง

## ไฟล์ที่สร้างขึ้น

### 1. ฐานข้อมูล
- `create_holiday_ft_tables.sql` - สร้างตารางและข้อมูลเริ่มต้น
- `setup_holiday_ft.bat` - Script ติดตั้งสำหรับ Windows
- `setup_holiday_ft.sh` - Script ติดตั้งสำหรับ Linux/Mac

### 2. API Backend
- `server/routes/holiday.js` - API routes สำหรับจัดการวันหยุด
- `server/routes/ft-config.js` - API routes สำหรับจัดการค่า FT
- `server/server.js` - เพิ่ม routes ใหม่เข้าไปใน server

### 3. Frontend Services
- `src/services/holidayService.ts` - Service สำหรับเรียกใช้ Holiday API
- `src/services/ftConfigService.ts` - Service สำหรับเรียกใช้ FT Config API

### 4. เอกสาร
- `HOLIDAY_FT_SETUP_GUIDE.md` - คู่มือการติดตั้งและใช้งาน
- `api_examples.md` - ตัวอย่างการใช้งาน API
- `README_HOLIDAY_FT.md` - ไฟล์สรุปนี้

## ขั้นตอนการติดตั้ง

### 1. ติดตั้งฐานข้อมูล

#### Windows
```bash
cd database
setup_holiday_ft.bat
```

#### Linux/Mac
```bash
cd database
chmod +x setup_holiday_ft.sh
./setup_holiday_ft.sh
```

#### Manual
```bash
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

### 3. เริ่มต้น Server

```bash
cd server
npm start
```

### 4. ทดสอบ API

```bash
# ทดสอบ Holiday API
curl -X GET "http://localhost:3001/api/holiday?year=2024"

# ทดสอบ FT Config API
curl -X GET "http://localhost:3001/api/ft-config?year=2024"
```

## ข้อมูลเริ่มต้น

### วันหยุดที่สร้างอัตโนมัติ (13 ปี)

**วันหยุดประจำปี:**
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

**วันหยุดไม่ประจำปี:**
- วันหยุดพิเศษ 1 (15 มีนาคม)
- วันหยุดพิเศษ 2 (20 กันยายน)

### ค่า FT เริ่มต้น

สำหรับปีปัจจุบัน:
- FT Rate 1: 0.0000 Baht/Unit (อัตราค่าไฟฟ้าฐาน)
- FT Rate 2: 0.0000 Baht/Unit (อัตราค่าไฟฟ้าปรับ)
- FT Rate 3: 0.0000 Baht/Unit (อัตราค่าไฟฟ้าเพิ่มเติม)

## API Endpoints

### Holiday API
- `GET /api/holiday` - ดึงข้อมูลวันหยุดทั้งหมด
- `GET /api/holiday/:id` - ดึงข้อมูลวันหยุดตาม ID
- `POST /api/holiday` - สร้างวันหยุดใหม่
- `PUT /api/holiday/:id` - แก้ไขข้อมูลวันหยุด
- `DELETE /api/holiday/:id` - ลบวันหยุด
- `GET /api/holiday/range/:startYear/:endYear` - ดึงข้อมูลวันหยุดตามช่วงปี

### FT Config API
- `GET /api/ft-config` - ดึงข้อมูลค่า FT ทั้งหมด
- `GET /api/ft-config/:id` - ดึงข้อมูลค่า FT ตาม ID
- `POST /api/ft-config` - สร้างค่า FT ใหม่
- `PUT /api/ft-config/:id` - แก้ไขข้อมูลค่า FT
- `DELETE /api/ft-config/:id` - ลบค่า FT
- `GET /api/ft-config/year/:year` - ดึงข้อมูลค่า FT ตามปี
- `GET /api/ft-config/year-range/:startYear/:endYear` - ดึงข้อมูลค่า FT ตามช่วงปี
- `POST /api/ft-config/bulk/:year` - สร้างค่า FT หลายรายการพร้อมกัน

## การใช้งานใน Frontend

### Import Services
```typescript
import { holidayService } from '@/services/holidayService';
import { ftConfigService } from '@/services/ftConfigService';
```

### ตัวอย่างการใช้งาน
```typescript
// ดึงวันหยุดปีปัจจุบัน
const holidays = await holidayService.getHolidaysByYear(2024);

// สร้างวันหยุดใหม่
const newHoliday = await holidayService.createHoliday({
  date: '2024-12-25',
  name_th: 'วันคริสต์มาส',
  name_en: 'Christmas Day',
  type: 'observance',
  category: 'special'
});

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
```

## การบำรุงรักษา

### การสำรองข้อมูล
```bash
# สำรองข้อมูลวันหยุด
pg_dump -U webmeter_user -d webmeter_db -t holiday > holiday_backup.sql

# สำรองข้อมูลค่า FT
pg_dump -U webmeter_user -d webmeter_db -t ft_config > ft_config_backup.sql
```

### การกู้คืนข้อมูล
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
SELECT grantee, table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN ('holiday', 'ft_config');
```

### 3. ตรวจสอบข้อมูล
```sql
SELECT 'holiday' as table_name, COUNT(*) as count FROM holiday WHERE is_active = TRUE
UNION ALL
SELECT 'ft_config' as table_name, COUNT(*) as count FROM ft_config WHERE is_active = TRUE;
```

## หมายเหตุสำคัญ

1. **Soft Delete** - ระบบใช้ soft delete สำหรับการลบข้อมูล
2. **วันหยุดทางศาสนา** - อาจมีการเปลี่ยนแปลงตามปฏิทินจันทรคติ
3. **ค่า FT** - จะถูกใช้ในการคำนวณค่าไฟฟ้า
4. **การสำรองข้อมูล** - ควรมีการสำรองข้อมูลเป็นประจำ
5. **สิทธิ์การเข้าถึง** - ตรวจสอบสิทธิ์ของ webmeter_user

## เอกสารเพิ่มเติม

- `HOLIDAY_FT_SETUP_GUIDE.md` - คู่มือการติดตั้งและใช้งานแบบละเอียด
- `api_examples.md` - ตัวอย่างการใช้งาน API แบบละเอียด

## การสนับสนุน

หากมีปัญหาในการติดตั้งหรือใช้งาน กรุณาตรวจสอบ:
1. การเชื่อมต่อฐานข้อมูล
2. สิทธิ์การเข้าถึง
3. ไฟล์ log ของ server
4. เอกสารในโฟลเดอร์ database/
