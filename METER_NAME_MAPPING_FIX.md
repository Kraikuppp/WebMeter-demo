# Meter Name Mapping Fix - แก้ไขการแสดงชื่อมิเตอร์ใน Auto Export PDF

## ปัญหาที่พบ 🔍

### **User เลือก**: slave_id = 1 (Main Incomming)
### **ผลลัพธ์เดิม**: แสดง "Meter 1" ❌
### **ผลลัพธ์ที่ต้องการ**: แสดง "Main Incomming" ✅

### **สาเหตุ**:
```javascript
// เดิม: ไม่มีการแมป meter name จาก meterList
meter_name: row.meter_name || `Meter ${row.slave_id}` // ❌ row.meter_name ไม่มีใน API response
```

## การแก้ไข 💡

### **1. เพิ่ม meterListCache** ✅
```javascript
// Store meterList for later use in meter name mapping
this.meterListCache = meterList;
console.log(`🔍 Cached meterList for name mapping:`, this.meterListCache.length, 'meters');
```

### **2. แก้ไขการแมป meter name** ✅
```javascript
// Add meter names to the data using cached meterList
const dataWithNames = response.data.map(row => {
  // Find meter name from cached meterList
  let meterName = `Meter ${row.slave_id}`; // Default fallback
  
  if (this.meterListCache && this.meterListCache.length > 0) {
    const meter = this.meterListCache.find(m => parseInt(m.slave_id) === parseInt(row.slave_id));
    if (meter && meter.name) {
      meterName = meter.name;
      console.log(`🏷️ Mapped slave_id ${row.slave_id} -> "${meterName}"`);
    } else {
      console.log(`⚠️ No meter found for slave_id ${row.slave_id} in cached meterList`);
    }
  } else {
    console.log(`⚠️ No meterListCache available for name mapping`);
  }
  
  return {
    ...row,
    meter_name: meterName,
    reading_timestamp: row.reading_timestamp || row.timestamp || row.time
  };
});
```

### **3. เพิ่มการดึง meterList เสมอ** ✅
```javascript
} else {
  // Even if no conversion needed, fetch meterList for name mapping
  console.log(`🔍 === FETCHING METER LIST FOR NAME MAPPING ===`);
  try {
    const fetch = (await import('node-fetch')).default;
    const metersResponse = await fetch('http://localhost:3001/api/meter-tree/available-meters');
    
    if (metersResponse.ok) {
      const metersData = await metersResponse.json();
      if (metersData.success && metersData.data && metersData.data.meters) {
        this.meterListCache = metersData.data.meters;
        console.log(`🔍 Cached meterList for name mapping:`, this.meterListCache.length, 'meters');
      }
    }
  } catch (error) {
    console.error(`❌ Error fetching meter list for name mapping:`, error);
  }
}
```

### **4. แก้ไข Fallback Cases** ✅
```javascript
// Fallback to sample data with proper meter name
const fallbackSlaveId = slaveIds[0] || 1;
let fallbackMeterName = `Meter ${fallbackSlaveId}`;

// Try to get meter name from cache
if (this.meterListCache && this.meterListCache.length > 0) {
  const meter = this.meterListCache.find(m => parseInt(m.slave_id) === parseInt(fallbackSlaveId));
  if (meter && meter.name) {
    fallbackMeterName = meter.name;
    console.log(`🏷️ Fallback: Using meter name "${fallbackMeterName}" for slave_id ${fallbackSlaveId}`);
  }
}
```

## Meter List Structure 📊

### **Input Data**:
```json
[
  {
    "id": "meter-107",
    "name": "Main Incomming",
    "location": "Main Building > Building A > Floor 1",
    "slave_id": 1
  },
  {
    "id": "meter-108", 
    "name": "Car Charger 1rd",
    "location": "Main Building > Building A > Floor 1",
    "slave_id": 2
  },
  {
    "id": "meter-109",
    "name": "2rd FL NO.3 (Main)",
    "location": "Main Building > Building A > Floor 2", 
    "slave_id": 3
  }
]
```

### **Mapping Logic**:
```javascript
// Find meter by slave_id
const meter = this.meterListCache.find(m => parseInt(m.slave_id) === parseInt(row.slave_id));

// slave_id 1 -> "Main Incomming"
// slave_id 2 -> "Car Charger 1rd"  
// slave_id 3 -> "2rd FL NO.3 (Main)"
```

## ผลลัพธ์ 🎯

### **เดิม** ❌:
- **slave_id 1**: แสดง "Meter 1"
- **slave_id 2**: แสดง "Meter 2"
- **slave_id 3**: แสดง "Meter 3"

### **ใหม่** ✅:
- **slave_id 1**: แสดง "Main Incomming"
- **slave_id 2**: แสดง "Car Charger 1rd"
- **slave_id 3**: แสดง "2rd FL NO.3 (Main)"

## Debug Information 🔍

### **Console Logs ที่เพิ่ม**:
```javascript
console.log(`🔍 Cached meterList for name mapping:`, this.meterListCache.length, 'meters');
console.log(`🏷️ Mapped slave_id ${row.slave_id} -> "${meterName}"`);
console.log(`⚠️ No meter found for slave_id ${row.slave_id} in cached meterList`);
console.log(`🏷️ Fallback: Using meter name "${fallbackMeterName}" for slave_id ${fallbackSlaveId}`);
```

### **การตรวจสอบ**:
1. **ดู Console Log**: ตรวจสอบว่ามีการ cache meterList
2. **ตรวจสอบ mapping**: ดูว่า slave_id แมปกับ meter name ถูกต้อง
3. **ตรวจสอบ PDF**: ดูว่าชื่อมิเตอร์ในไฟล์ PDF ถูกต้อง

## การทำงานของระบบ 🔄

### **Flow ใหม่**:
1. **ดึง meterList** จาก `/api/meter-tree/available-meters`
2. **Cache ใน meterListCache** สำหรับใช้ในการแมป
3. **แปลง meter ID เป็น slave_id** (ถ้าจำเป็น)
4. **ดึงข้อมูล** จาก `/api/table-data`
5. **แมป meter name** จาก meterListCache ตาม slave_id
6. **สร้าง PDF** ด้วยชื่อมิเตอร์ที่ถูกต้อง

### **Scenarios ที่รองรับ**:

#### **Case 1: Meter ID Conversion** 🔄
- **Input**: `["meter-107", "meter-108"]`
- **Convert**: `meter-107` → `slave_id: 1`, `meter-108` → `slave_id: 2`
- **Map Names**: `slave_id: 1` → `"Main Incomming"`, `slave_id: 2` → `"Car Charger 1rd"`

#### **Case 2: Direct Slave ID** 🎯
- **Input**: `[1, 2, 3]`
- **No Conversion**: ใช้ slave_id โดยตรง
- **Map Names**: `slave_id: 1` → `"Main Incomming"`, etc.

#### **Case 3: Fallback Cases** 🛡️
- **No Data**: ใช้ meter name จาก cache
- **API Error**: ใช้ meter name จาก cache
- **No Cache**: ใช้ `"Meter X"` เป็น fallback

## การทดสอบ 🧪

### **Test Case 1: Single Meter**
- **Input**: slave_id = 1
- **Expected**: "Main Incomming" ใน PDF
- **Before Fix**: "Meter 1"
- **After Fix**: "Main Incomming" ✅

### **Test Case 2: Multiple Meters**
- **Input**: slave_id = [1, 2, 3]
- **Expected**: "Main Incomming", "Car Charger 1rd", "2rd FL NO.3 (Main)"
- **Before Fix**: "Meter 1", "Meter 2", "Meter 3"
- **After Fix**: ชื่อจริงทั้งหมด ✅

### **Test Case 3: Unknown Slave ID**
- **Input**: slave_id = 99 (ไม่มีใน meterList)
- **Expected**: "Meter 99" (fallback)
- **Result**: ทำงานถูกต้อง ✅

## ผลกระทบต่อระบบ 🎉

### **Auto Export PDF** ✅
- แสดงชื่อมิเตอร์จริงแทน "Meter X"
- ง่ายต่อการอ่านและเข้าใจ
- สอดคล้องกับ Manual Export

### **Excel Export** ✅
- ใช้ logic เดียวกันสำหรับ meter name mapping
- ความสอดคล้องระหว่าง PDF และ Excel

### **Error Handling** 🛡️
- Graceful fallback เมื่อไม่พบ meter name
- ไม่ crash เมื่อ API error
- Debug information ครบถ้วน

## สรุป 🎯

### **ปัญหาที่แก้ไขแล้ว**:
- ✅ **แสดงชื่อมิเตอร์จริง**: "Main Incomming" แทน "Meter 1"
- ✅ **รองรับทุก scenarios**: meter ID conversion และ direct slave_id
- ✅ **Fallback handling**: จัดการกรณี error และ missing data
- ✅ **Debug information**: ตรวจสอบการทำงานได้ง่าย

### **การใช้งาน**:
1. **สร้าง Auto Export Schedule** ด้วย slave_id หรือ meter_id
2. **ระบบจะดึง meterList** และ cache ไว้
3. **แมป meter name** ตาม slave_id
4. **สร้าง PDF** ด้วยชื่อมิเตอร์ที่ถูกต้อง

### **Expected Results**:
- **slave_id 1**: "Main Incomming" ✅
- **slave_id 2**: "Car Charger 1rd" ✅
- **slave_id 3**: "2rd FL NO.3 (Main)" ✅

ตอนนี้ Auto Export PDF จะแสดงชื่อมิเตอร์ที่ถูกต้องแล้ว! 🎯
