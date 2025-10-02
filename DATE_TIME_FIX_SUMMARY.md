# Date Time Export Fix Summary

## ปัญหาที่พบ
คุณเลือกวันที่ 27 September 2025 เวลา 00:00-13:37 ใน UI แต่ Export Scheduler แสดงข้อมูลวันที่ 26 September 2025 00:00-23:59

### **สาเหตุหลัก**
Export Scheduler ไม่ได้ใช้วันที่ที่ผู้ใช้เลือก แต่คำนวณจาก `export_type` แทน:

```javascript
// ใน exportScheduler.js - Logic เดิม
if (schedule.export_type === 'daily') {
  // Yesterday's data
  dateFrom = new Date(now);
  dateFrom.setDate(dateFrom.getDate() - 1);  // เมื่อวาน!
  dateTo = new Date(dateFrom);
}
```

**ผลลัพธ์**: ไม่ว่าจะเลือกวันที่อะไร ระบบจะใช้เมื่อวานเสมอ

## การแก้ไขที่ทำ

### **1. อัปเดต Export.tsx ให้ส่งข้อมูลวันที่** ✅

#### **เพิ่มฟิลด์วันที่ใน scheduleData:**
```javascript
const scheduleData = {
  frequency: autoExportFrequency,
  time: autoExportTime,
  // ... existing fields
  created_by: currentUser,
  // เพิ่มข้อมูลวันที่ที่ผู้ใช้เลือก
  date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
  date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : null,
  time_from: timeFrom || '00:00',
  time_to: timeTo || '23:59'
};
```

#### **อัปเดต AutoExportSchedule Type:**
```javascript
type AutoExportSchedule = {
  // ... existing fields
  // เพิ่มฟิลด์วันที่
  dateFrom?: string;
  dateTo?: string;
  timeFrom?: string;
  timeTo?: string;
};
```

#### **อัปเดต loadExportSchedules:**
```javascript
const schedules: AutoExportSchedule[] = response.data.map(dbSchedule => ({
  // ... existing fields
  // โหลดข้อมูลวันที่จาก database
  dateFrom: dbSchedule.date_from,
  dateTo: dbSchedule.date_to,
  timeFrom: dbSchedule.time_from,
  timeTo: dbSchedule.time_to
}));
```

### **2. อัปเดต Export Scheduler ให้ใช้วันที่ที่เลือก** ✅

#### **ปรับปรุง Date Calculation Logic:**
```javascript
// ใน exportScheduler.js - Logic ใหม่
if (schedule.date_from && schedule.date_to) {
  // ใช้วันที่ที่ผู้ใช้เลือก
  dateFrom = new Date(schedule.date_from);
  dateTo = new Date(schedule.date_to);
  console.log(`📅 Using custom date range from schedule: ${schedule.date_from} to ${schedule.date_to}`);
} else {
  // Fallback: คำนวณจาก export_type
  const now = new Date();
  console.log(`📅 Using calculated date range based on export_type: ${schedule.export_type}`);
  
  if (schedule.export_type === 'daily') {
    dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - 1);
    dateTo = new Date(dateFrom);
  }
  // ... other cases
}
```

#### **เพิ่ม Debug Logging:**
```javascript
console.log(`📅 Final date range: ${dateFromStr} to ${dateToStr}`);
```

## ผลลัพธ์ที่คาดหวัง

### **Debug Information** 📊
```
📅 Using custom date range from schedule: 2025-09-27 to 2025-09-27
📅 Final date range: 2025-09-27 to 2025-09-27
📊 Export settings: {
  frequency: 'daily',
  time: '13:37',
  export_type: 'table_data',
  export_format: 'excel',
  date_from: '2025-09-27',
  date_to: '2025-09-27',
  time_from: '00:00',
  time_to: '13:37'
}
```

### **Excel/PDF Metadata** 📄
```
Meter: Meter 1, Meter 10
Date: 27 September 2025 00:00 - 27 September 2025 13:37
Generated: 27/09/2025 14:20:00
```

### **API Call** 🚀
```
📊 Calling table-data API with params: {
  dateFrom: '2025-09-27',
  dateTo: '2025-09-27',
  timeFrom: '00:00',
  timeTo: '13:37',
  columns: [...],
  slaveIds: [1, 10],
  readTime: 15
}
```

## Flow การทำงานใหม่

### **1. User Input** 👤
- เลือกวันที่: 27 September 2025
- เลือกเวลา: 00:00 - 13:37
- กด "Add Schedule"

### **2. Frontend (Export.tsx)** 💻
```javascript
// ส่งข้อมูลไป API
const scheduleData = {
  date_from: '2025-09-27',
  date_to: '2025-09-27', 
  time_from: '00:00',
  time_to: '13:37'
};
```

### **3. Database** 🗄️
```sql
-- เก็บข้อมูลในตาราง export_schedules
INSERT INTO export_schedules (
  date_from, date_to, time_from, time_to, ...
) VALUES (
  '2025-09-27', '2025-09-27', '00:00', '13:37', ...
);
```

### **4. Export Scheduler** ⚙️
```javascript
// อ่านจาก database และใช้วันที่ที่เลือก
if (schedule.date_from && schedule.date_to) {
  dateFrom = new Date(schedule.date_from);  // 2025-09-27
  dateTo = new Date(schedule.date_to);      // 2025-09-27
}
```

### **5. API Call** 🌐
```javascript
// เรียก table-data API ด้วยวันที่ที่ถูกต้อง
const response = await this.callTableDataAPI({
  dateFrom: '2025-09-27',
  dateTo: '2025-09-27',
  timeFrom: '00:00',
  timeTo: '13:37'
});
```

### **6. Export File** 📁
```
Date: 27 September 2025 00:00 - 27 September 2025 13:37
```

## เปรียบเทียบก่อนและหลัง

### **ก่อนแก้ไข** ❌
- **User เลือก**: 27 September 2025 00:00-13:37
- **Export แสดง**: 26 September 2025 00:00-23:59
- **สาเหตุ**: ใช้ yesterday calculation

### **หลังแก้ไข** ✅
- **User เลือก**: 27 September 2025 00:00-13:37  
- **Export แสดง**: 27 September 2025 00:00-13:37
- **สาเหตุ**: ใช้วันที่ที่ผู้ใช้เลือก

## ไฟล์ที่แก้ไข

### **Frontend**:
- `src/pages/Export.tsx` - เพิ่มการส่งข้อมูลวันที่

### **Backend**:
- `server/services/exportScheduler.js` - ใช้วันที่ที่เลือกแทนการคำนวณ

### **การเปลี่ยนแปลง**:
1. เพิ่มฟิลด์ `date_from`, `date_to`, `time_from`, `time_to` ใน schedule data
2. อัปเดต type definition
3. ปรับปรุง date calculation logic
4. เพิ่ม debug logging

## การทดสอบ

### **1. สร้าง Schedule ใหม่**
- เลือกวันที่ 27 September 2025
- เลือกเวลา 00:00-13:37
- กด "Add Schedule"

### **2. ตรวจสอบ Console Log**
```
📅 Using custom date range from schedule: 2025-09-27 to 2025-09-27
📅 Final date range: 2025-09-27 to 2025-09-27
```

### **3. ตรวจสอบไฟล์ Export**
- Metadata ควรแสดง: "Date: 27 September 2025 00:00 - 27 September 2025 13:37"
- ข้อมูลควรเป็นของวันที่ 27 September 2025

## สรุป

### **ปัญหาเดิม** ❌
- Export Scheduler ไม่ใช้วันที่ที่ผู้ใช้เลือก
- คำนวณจาก export_type → ได้วันที่ผิด

### **หลังแก้ไข** ✅
- Export Scheduler ใช้วันที่ที่ผู้ใช้เลือก
- Fallback ไปคำนวณจาก export_type ถ้าไม่มีข้อมูล
- Debug logging ครบถ้วน

ตอนนี้ Export Schedule จะใช้วันที่และเวลาที่ผู้ใช้เลือกอย่างถูกต้อง! 🎉
