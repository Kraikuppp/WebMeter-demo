# แก้ไขปัญหาการแสดงปี พ.ศ. แทน ค.ศ. ใน Auto Export

## ปัญหาเดิม:
- Auto Export แสดงปี **2568 (พ.ศ.)** แทนปี **2025 (ค.ศ.)**
- ผู้ใช้เลือกวันที่ในหน้า Export Manual เป็น **29/09/2025** แต่ Auto Export แสดง **29/09/2568**
- สาเหตุ: ใช้ `toLocaleDateString('th-TH')` และ `toLocaleString('th-TH')` ที่แปลงเป็นปี พ.ศ. อัตโนมัติ

## การแก้ไข:

### 1. **แก้ไข formatThaiDate() function** ✅
```javascript
// เดิม: ใช้ toLocaleDateString('th-TH') → แสดงปี พ.ศ.
const formatThaiDate = (date) => {
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// ใหม่: ใช้ manual format → แสดงปี ค.ศ.
const formatThaiDate = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear(); // ใช้ปี ค.ศ. แทน พ.ศ.
  return `${day}/${month}/${year}`;
};
```

### 2. **แก้ไข formatTime() function** ✅
```javascript
// เดิม: ใช้ toLocaleTimeString('th-TH')
const formatTime = (date) => {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// ใหม่: ใช้ manual format
const formatTime = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};
```

### 3. **แก้ไข formatThaiDateTime() function** ✅
```javascript
// เดิม: ใช้ toLocaleString('th-TH') → แสดงปี พ.ศ.
const formatThaiDateTime = (date) => {
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// ใหม่: ใช้ manual format → แสดงปี ค.ศ.
const formatThaiDateTime = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear(); // ใช้ปี ค.ศ.
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
```

### 4. **แก้ไข Generated Time** ✅
```javascript
// เดิม: ใช้ new Date().toLocaleString() → แสดงปี พ.ศ.
⏰ Generated: ${new Date().toLocaleString()}

// ใหม่: ใช้ manual format → แสดงปี ค.ศ.
const now = new Date();
const generatedTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
⏰ Generated: ${generatedTime}
```

### 5. **แก้ไข No Data Notification** ✅
```javascript
// เดิม: ใช้ toLocaleDateString('th-TH') → แสดงปี พ.ศ.
📅 Requested Date: ${schedule.date_from ? new Date(schedule.date_from).toLocaleDateString('th-TH') : 'N/A'}

// ใหม่: ใช้ manual format → แสดงปี ค.ศ.
let requestedDateStr = 'N/A';
if (schedule.date_from) {
  const date = new Date(schedule.date_from);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear(); // ใช้ปี ค.ศ.
  requestedDateStr = `${day}/${month}/${year}`;
}
📅 Requested Date: ${requestedDateStr}
```

### 6. **แก้ไข LINE Message Timestamp** ✅
```javascript
// เดิม: ใช้ toLocaleString('th-TH') → แสดงปี พ.ศ.
const formattedTime = dateObj.toLocaleString('th-TH', {
  day: '2-digit',
  month: '2-digit', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

// ใหม่: ใช้ manual format → แสดงปี ค.ศ.
const day = dateObj.getDate().toString().padStart(2, '0');
const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
const year = dateObj.getFullYear(); // ใช้ปี ค.ศ.
const hours = dateObj.getHours().toString().padStart(2, '0');
const minutes = dateObj.getMinutes().toString().padStart(2, '0');
const seconds = dateObj.getSeconds().toString().padStart(2, '0');
const formattedTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
```

## ผลลัพธ์:

### **เดิม (ปัญหา)** ❌
```
📊 WebMeter Auto Export Report
📋 Export Type: daily
📅 Date Range: 29/09/2568 00:00 - 29/09/2568 13:25  ← ปี พ.ศ. ผิด!
🏭 Meters: 1 selected
📊 Parameters: 1 selected
⏰ Generated: 29/9/2568 13:51:01  ← ปี พ.ศ. ผิด!
📊 Meter 1
⏰ 29/09/2568 13:51:01  import_kwh: 0.00  ← ปี พ.ศ. ผิด!
```

### **ใหม่ (แก้ไขแล้ว)** ✅
```
📊 WebMeter Auto Export Report
📋 Export Type: daily
📅 Date Range: 29/09/2025 00:00 - 29/09/2025 13:25  ← ปี ค.ศ. ถูกต้อง!
🏭 Meters: 1 selected
📊 Parameters: 1 selected
⏰ Generated: 29/09/2025 14:05:47  ← ปี ค.ศ. ถูกต้อง!
📊 Meter 1
⏰ 29/09/2025 13:51:01  import_kwh: 0.00  ← ปี ค.ศ. ถูกต้อง!
```

## การทดสอบ:

### **Test Results** 🧪
```
❌ Old format (พ.ศ.): 29/9/2568
✅ New format (ค.ศ.): 29/09/2025

🔍 Contains Buddhist year (2568): ✅ NO (GOOD)
🔍 Contains Christian year (2025): ✅ YES (GOOD)
```

## ไฟล์ที่แก้ไข:
- **server/services/exportScheduler.js** - แก้ไขทุกฟังก์ชัน date formatting
- **test-date-format-fix.js** - ไฟล์ทดสอบการแก้ไข

## การใช้งาน:
1. **เข้าหน้า Export** → เลือกวันที่ 29/09/2025
2. **สร้าง Auto Export Schedule** → บันทึกลงฐานข้อมูล
3. **ระบบส่งรายงานอัตโนมัติ** → แสดงปี ค.ศ. (2025) ถูกต้อง
4. **ไม่แสดงปี พ.ศ. (2568)** อีกต่อไป

## สาเหตุของปัญหา:
- **JavaScript toLocaleDateString('th-TH')** แปลงปี ค.ศ. เป็น พ.ศ. อัตโนมัติ
- **2025 (ค.ศ.) + 543 = 2568 (พ.ศ.)**
- **การใช้ manual format** หลีกเลี่ยงการแปลงอัตโนมัติ

## ข้อดีของการแก้ไข:
✅ **Consistency** - ใช้ปี ค.ศ. เหมือนหน้า Export Manual  
✅ **User Experience** - แสดงปีที่ผู้ใช้เลือกจริง  
✅ **No Confusion** - ไม่สับสนระหว่างปี ค.ศ. และ พ.ศ.  
✅ **International Standard** - ใช้ปี ค.ศ. ตามมาตรฐานสากล  

ตอนนี้ระบบ Auto Export จะแสดงปี ค.ศ. (2025) ถูกต้องแล้ว! 🎯

---

# แก้ไขปัญหา Date Range ไม่ตรงกับที่ผู้ใช้เลือก (เพิ่มเติม)

## ปัญหาที่พบ:
- ผู้ใช้เลือก: **00:00 - 14:19**
- Auto Export แสดง: **00:00 - 23:59** ❌
- สาเหตุ: บังคับใช้ `T23:59:59` แทนเวลาที่ผู้ใช้เลือก

## การแก้ไข:

### **แก้ไข Date Object Creation** ✅
```javascript
// เดิม: บังคับใช้ 23:59:59
dateFrom = new Date(dateFromStr_temp + 'T00:00:00'); // Local midnight
dateTo = new Date(dateToStr_temp + 'T23:59:59');     // Local end of day ← ปัญหา!

// ใหม่: ใช้เวลาที่ผู้ใช้เลือก
dateFrom = new Date(dateFromStr_temp + 'T' + schedule.time_from + ':00'); // ใช้เวลาที่ผู้ใช้เลือก
dateTo = new Date(dateToStr_temp + 'T' + schedule.time_to + ':00');       // ใช้เวลาที่ผู้ใช้เลือก
```

## ผลลัพธ์:

### **เดิม (ปัญหา)** ❌
```
User selects: 00:00 - 14:19
Report shows: 29/09/2025 00:00 - 29/09/2025 23:59  ← ผิด!
```

### **ใหม่ (แก้ไขแล้ว)** ✅
```
User selects: 00:00 - 14:19
Report shows: 29/09/2025 00:00 - 29/09/2025 14:19  ← ถูกต้อง!
```

## การทดสอบ:
```
📅 === USER SELECTION ===
Time From: 00:00
Time To: 14:19

❌ Old Result: 29/09/2025 00:00 - 29/09/2025 23:59
✅ New Result: 29/09/2025 00:00 - 29/09/2025 14:19
🎯 Match with user selection: ✅ YES
```

## ไฟล์ที่แก้ไข:
- **server/services/exportScheduler.js** - แก้ไข Date object creation
- **test-time-range-fix.js** - ไฟล์ทดสอบการแก้ไข

ตอนนี้ Auto Export จะแสดง Date Range ตรงกับที่ผู้ใช้เลือกแล้ว! 🎯
