# Manual Export Logic Fix Summary

## ปัญหาที่พบ
1. **Database Error**: `column "date_from" of relation "export_schedules" does not exist`
2. **เวลาไม่ตรงกับที่เลือก**: Auto export ใช้เวลาเมื่อวานแทนที่จะเป็นเวลาปัจจุบัน
3. **Logic ไม่เหมือน Manual Export**: Auto export คำนวณวันที่เอง แทนที่จะใช้ logic เดียวกับ manual export

## วิธีแก้ไข: ใช้ Logic เดียวกับ Manual Export

### **1. ลบ Database Fields ที่ไม่จำเป็น** ✅

#### **Frontend (Export.tsx)**:
```javascript
// เดิม - ส่ง date/time fields ไป database
const scheduleData = {
  // ... other fields
  date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
  date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : null,
  time_from: timeFrom || '00:00',
  time_to: timeTo || '23:59'
};

// ใหม่ - ไม่ส่ง date/time fields
const scheduleData = {
  // ... other fields
  created_by: currentUser
};
```

#### **Backend (export-schedules.js)**:
```sql
-- เดิม - INSERT กับ date/time fields
INSERT INTO export_schedules (
  frequency, time, day_of_week, day_of_month, export_type, export_format,
  read_time, meters, parameters, file_path, email_list, line_list, 
  date_from, date_to, time_from, time_to, created_by, next_run
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)

-- ใหม่ - INSERT โดยไม่มี date/time fields
INSERT INTO export_schedules (
  frequency, time, day_of_week, day_of_month, export_type, export_format,
  read_time, meters, parameters, file_path, email_list, line_list, 
  created_by, next_run
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
```

### **2. ใช้ Current Date/Time Logic** ✅

#### **Export Scheduler (exportScheduler.js)**:
```javascript
// เดิม - คำนวณจาก export_type (เมื่อวาน)
if (schedule.export_type === 'daily') {
  dateFrom = new Date(now);
  dateFrom.setDate(dateFrom.getDate() - 1); // เมื่อวาน!
  dateTo = new Date(dateFrom);
}

// ใหม่ - ใช้วันที่ปัจจุบัน (เหมือน manual export)
const now = new Date();
dateFrom = new Date(now);
dateFrom.setHours(0, 0, 0, 0); // เริ่มต้นวันนี้
dateTo = new Date(now);
dateTo.setHours(23, 59, 59, 999); // สิ้นสุดวันนี้

// Time range: จากเริ่มวันถึงเวลาปัจจุบัน
let timeFromStr = '00:00';
let timeToStr = now.toTimeString().slice(0, 5); // เวลาปัจจุบัน
```

### **3. ใช้ API เดียวกับ Manual Export** ✅

#### **เดิม - ใช้ custom API call**:
```javascript
const response = await this.callTableDataAPI({
  dateFrom: dateFromStr,
  dateTo: dateToStr,
  timeFrom: timeFromStr,
  timeTo: timeToStr,
  columns: columns,
  slaveIds: slaveIds,
  readTime: parseInt(schedule.read_time) || 15
});
```

#### **ใหม่ - ใช้ apiClient.getTableData เหมือน manual export**:
```javascript
const apiClient = require('../services/api');

const params = {
  dateFrom: dateFromStr,
  dateTo: dateToStr,
  timeFrom: timeFromStr,
  timeTo: timeToStr,
  columns: columns,
  slaveIds: slaveIds,
  interval: parseInt(schedule.read_time) || 15 // ใช้ interval เหมือน manual export
};

const response = await apiClient.getTableData(params);
```

## ผลลัพธ์ที่คาดหวัง

### **Debug Information** 📊
```
📅 Using current date range (like manual export): 2025-09-27 to 2025-09-27
⏰ Using time range from start of day to current time: 00:00 to 15:48
📊 Calling getTableData API with params (same as manual export): {
  dateFrom: '2025-09-27',
  dateTo: '2025-09-27',
  timeFrom: '00:00',
  timeTo: '15:48',
  columns: [...],
  slaveIds: [1, 10],
  interval: 15
}
```

### **Excel/PDF Metadata** 📄
```
Meter: Meter 1, Meter 10
Date: 27 September 2025 00:00 - 27 September 2025 15:48
Generated: 27/09/2025 15:48:00
```

### **Email/LINE Message** 📧
```
📊 WebMeter Auto Export Report
📋 Export Type: table_data
📅 Date Range: 2025-09-27 00:00 - 2025-09-27 15:48
🏭 Meters: 2 selected
📊 Parameters: 5 selected
⏰ Generated: 27/09/2025 15:48:00
```

## เปรียบเทียบ Manual vs Auto Export

### **Manual Export** 👤:
1. User เลือกวันที่และเวลา
2. เรียก `fetchMeterData(slaveIds, parameters, dateFrom, dateTo, timeFrom, timeTo, readTime)`
3. ใช้ `apiClient.getTableData(params)`
4. ได้ข้อมูลตามที่เลือก

### **Auto Export (ใหม่)** 🤖:
1. ระบบใช้วันที่ปัจจุบัน และเวลาจาก 00:00 ถึงเวลาปัจจุบัน
2. เรียก `apiClient.getTableData(params)` เหมือน manual export
3. ใช้ parameters เดียวกัน: `dateFrom`, `dateTo`, `timeFrom`, `timeTo`, `columns`, `slaveIds`, `interval`
4. ได้ข้อมูลปัจจุบัน (ไม่ใช่เมื่อวาน)

## ข้อดีของการแก้ไข

### **1. ไม่ต้องแก้ไข Database** ✅
- ไม่ต้องเพิ่ม columns ใหม่
- ไม่ต้องรัน migration
- ใช้ logic ใน code แทน

### **2. Consistency** ✅
- Manual export และ Auto export ใช้ API เดียวกัน
- ใช้ parameters format เดียวกัน
- ได้ผลลัพธ์ที่สอดคล้องกัน

### **3. Real-time Data** ✅
- Auto export จะได้ข้อมูลปัจจุบัน
- ไม่ใช่ข้อมูลเมื่อวาน
- เหมาะสำหรับ monitoring แบบ real-time

### **4. Maintainability** ✅
- Code ง่ายขึ้น
- ไม่ต้อง maintain 2 sets ของ logic
- Bug fixes จะส่งผลต่อทั้ง manual และ auto export

## การทดสอบ

### **1. สร้าง Auto Export Schedule**:
- เลือก meters และ parameters
- กำหนดเวลา export (เช่น ทุกวันเวลา 16:00)
- กด "Add Schedule"

### **2. ตรวจสอบ Console Log**:
```
📅 Using current date range (like manual export): 2025-09-27 to 2025-09-27
⏰ Using time range from start of day to current time: 00:00 to 15:48
📊 Calling getTableData API with params (same as manual export)
```

### **3. ตรวจสอบไฟล์ Export**:
- Metadata ควรแสดง: "Date: 27 September 2025 00:00 - 27 September 2025 15:48"
- ข้อมูลควรเป็นของวันที่ 27 September 2025 เวลา 00:00-15:48

## สรุป

การแก้ไขนี้ทำให้:
1. **ไม่มี Database Error** - ไม่ต้องเพิ่ม columns ใหม่
2. **ได้ข้อมูลปัจจุบัน** - ไม่ใช่เมื่อวาน
3. **Logic เดียวกัน** - Manual และ Auto export ใช้ API เดียวกัน
4. **Maintainable** - Code ง่ายและสอดคล้องกัน

ตอนนี้ Auto Export จะทำงานเหมือน Manual Export แล้ว! 🎉
