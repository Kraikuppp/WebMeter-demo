# Export N/A Fix Summary

## ปัญหาที่พบ
จาก log และไฟล์ Excel ที่คุณแสดงให้เห็น:
- ✅ **API ดึงข้อมูลได้**: 1,439 records พร้อมค่าต่างๆ ครบถ้วน
- ❌ **Excel แสดง N/A**: ทุกค่าในไฟล์ Excel เป็น N/A ทั้งหมด
- ❌ **Read Time ไม่ทำงาน**: ควรสุ่มตัวอย่างทุก 15 นาที แต่ export ข้อมูลทั้งหมด

## สาเหตุหลัก

### 1. **Column Name Mismatch** 🔴
- **Schedule Parameters**: ใช้ underscore format (`volt_an`, `demand_w`, `import_kwh`)
- **API Response**: ใช้ space format (`Volt AN`, `Demand W`, `Import kWh`)
- **ผลลัพธ์**: ระบบหาค่าไม่เจอ → แสดง N/A

### 2. **Read Time Filtering ไม่มี** 🔴
- Export scheduler ไม่มีการกรองข้อมูลตาม Read Time
- ดึงข้อมูลทั้งหมด 1,439 records แทนที่จะสุ่มตัวอย่างทุก 15 นาที

## การแก้ไขที่ทำ

### 1. **Enhanced Column Mapping** ✅
เพิ่ม parameter mapping table ที่ครอบคลุม:

```javascript
const parameterMapping = {
  'frequency': 'Frequency',
  'volt_an': 'Volt AN',
  'volt_bn': 'Volt BN', 
  'volt_cn': 'Volt CN',
  'volt_ln_avg': 'Volt LN Avg',
  'volt_ab': 'Volt AB',
  'volt_bc': 'Volt BC',
  'volt_ca': 'Volt CA',
  'volt_ll_avg': 'Volt LL Avg',
  'current_a': 'Current A',
  'current_b': 'Current B',
  'current_c': 'Current C',
  'current_avg': 'Current Avg',
  'current_in': 'Current IN',
  'watt_a': 'Watt A',
  'watt_b': 'Watt B',
  'watt_c': 'Watt C',
  'watt_total': 'Watt Total',
  'var_a': 'Var A',
  'var_b': 'Var B',
  'var_c': 'Var C',
  'var_total': 'Var total',
  'va_a': 'VA A',
  'va_b': 'VA B',
  'va_c': 'VA C',
  'va_total': 'VA Total',
  'pf_a': 'PF A',
  'pf_b': 'PF B',
  'pf_c': 'PF C',
  'pf_total': 'PF Total',
  'demand_w': 'Demand W',
  'demand_var': 'Demand Var',
  'demand_va': 'Demand VA',
  'import_kwh': 'Import kWh',
  'export_kwh': 'Export kWh',
  'import_kvarh': 'Import kVarh',
  'export_kvarh': 'Export kVarh',
  'thdv': 'THDV',
  'thdi': 'THDI'
};
```

### 2. **Smart Column Matching** ✅
ปรับปรุง logic การหาค่า:

```javascript
// Try specific mapping first
const mappedColumnName = parameterMapping[param.toLowerCase()];
if (mappedColumnName && row[mappedColumnName] !== undefined) {
  value = row[mappedColumnName];
  matchedKey = mappedColumnName;
} else {
  // Try general matching patterns
  const keys = Object.keys(row);
  const matchingKey = keys.find(key => 
    key.toLowerCase() === param.toLowerCase() ||
    key.replace(/\s+/g, '_').toLowerCase() === param.replace(/\s+/g, '_').toLowerCase() ||
    key.replace(/_/g, ' ').toLowerCase() === param.replace(/_/g, ' ').toLowerCase()
  );
  
  if (matchingKey) {
    value = row[matchingKey];
    matchedKey = matchingKey;
  }
}
```

### 3. **Read Time Filtering** ✅
เพิ่มฟังก์ชัน `filterDataByReadTime`:

```javascript
filterDataByReadTime(data, readTimeMinutes) {
  // Sort data by timestamp
  const sortedData = data.sort((a, b) => {
    const timeA = new Date(a.reading_timestamp || a.timestamp || a.time);
    const timeB = new Date(b.reading_timestamp || b.timestamp || b.time);
    return timeA.getTime() - timeB.getTime();
  });

  const filteredData = [];
  let lastTimestamp = null;
  const intervalMs = readTimeMinutes * 60 * 1000;

  sortedData.forEach((record, index) => {
    const currentTimestamp = new Date(record.reading_timestamp || record.timestamp || record.time);
    
    if (lastTimestamp === null) {
      filteredData.push(record);
      lastTimestamp = currentTimestamp;
    } else {
      const timeDiff = currentTimestamp.getTime() - lastTimestamp.getTime();
      
      if (timeDiff >= intervalMs) {
        filteredData.push(record);
        lastTimestamp = currentTimestamp;
      }
    }
  });

  return filteredData;
}
```

### 4. **Debug Logging** ✅
เพิ่ม logging เพื่อติดตามการทำงาน:

```javascript
// Debug logging for first row only
if (index === 0) {
  console.log(`📊 Parameter "${param}" -> Key "${matchedKey}" -> Value: ${value}`);
}
```

## ผลลัพธ์ที่คาดหวัง

### **Column Mapping** 📊
- ✅ `frequency` → `Frequency` = 49.95
- ✅ `volt_an` → `Volt AN` = 422.8339
- ✅ `demand_w` → `Demand W` = -0.0602
- ✅ `import_kwh` → `Import kWh` = 16354.4
- ✅ ทุก parameters ควรแมปได้ 100%

### **Read Time Filtering** ⏱️
- **เดิม**: 1,439 records (ทุกนาที)
- **ใหม่**: ~96 records (ทุก 15 นาที)
- **การคำนวณ**: 24 ชั่วโมง × 4 ครั้ง/ชั่วโมง = 96 records

### **Excel Export** 📄
- ✅ แสดงค่าจริงแทน N/A
- ✅ ข้อมูลสุ่มตัวอย่างตาม Read Time
- ✅ ไฟล์ขนาดเล็กลง (96 แถว แทน 1,439 แถว)

## Debug Information ที่จะเห็น

### **ใน Console Log**:
```
📊 Processing 1439 data rows for Excel export
📊 Read Time filtering: 1439 -> 96 records (15 min interval)
📊 Parameter "frequency" -> Key "Frequency" -> Value: 49.95
📊 Parameter "volt_an" -> Key "Volt AN" -> Value: 422.8339
📊 Parameter "demand_w" -> Key "Demand W" -> Value: -0.0602
```

### **ใน Excel File**:
```
Time                    | frequency | volt_an  | demand_w | import_kwh
17:00 25 September 2025 | 49.95     | 422.8339 | -0.0602  | 16354.4
17:15 25 September 2025 | 50.01     | 423.1    | -0.0650  | 16354.5
17:30 25 September 2025 | 49.98     | 422.9    | -0.0580  | 16354.6
```

## การทดสอบ

### **1. ทดสอบ Column Mapping**
```bash
node test-final-fix.js
```
ควรเห็น success rate 100%

### **2. ทดสอบ Export Scheduler**
```bash
node server.js
```
รอให้ schedule ทำงานและตรวจสอบไฟล์ Excel

### **3. ตรวจสอบผลลัพธ์**
- เปิดไฟล์ Excel ที่ export
- ตรวจสอบว่าไม่มี N/A
- นับจำนวนแถวควรเป็น ~96 แถว (สำหรับ 15 นาที interval)

## ไฟล์ที่แก้ไข

### **หลัก**:
- `d:\WebMeter-Demo\server\services\exportScheduler.js` - แก้ไข column mapping และ Read Time filtering

### **ทดสอบ**:
- `test-final-fix.js` - ทดสอบ column mapping
- `test-export-fixes.js` - ทดสอบ export scheduler
- `test-column-mapping.js` - ทดสอบ column matching logic

## สรุป

### **ปัญหาเดิม** ❌
- Column names ไม่ตรงกัน → N/A ทั้งหมด
- ไม่มี Read Time filtering → ข้อมูลมากเกินไป

### **หลังแก้ไข** ✅
- Column mapping ครบถ้วน → แสดงค่าจริง
- Read Time filtering → ข้อมูลสุ่มตัวอย่างถูกต้อง
- Excel export ที่มีประโยชน์และอ่านง่าย

ตอนนี้ระบบ Auto Export ควรทำงานได้อย่างสมบูรณ์แล้ว! 🎉
