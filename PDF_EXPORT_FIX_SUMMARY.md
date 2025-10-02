# PDF Export N/A Fix Summary

## ปัญหาที่พบ
- ✅ **Excel Export**: แสดงค่าจริงแล้ว (หลังแก้ไข column mapping)
- ❌ **PDF Export**: ยังแสดง N/A เพราะใช้ column matching logic แบบเก่า

## สาเหตุ
PDF generation ใน `generatePdfContent()` ใช้ column matching logic แบบง่าย:
```javascript
// Logic เก่า (ทำให้เกิด N/A)
const value = row[param] || row[param.toLowerCase()] || row[param.replace(/\s+/g, '_').toLowerCase()];
```

ขณะที่ Excel generation ใช้ enhanced parameter mapping ที่แก้ไขแล้ว

## การแก้ไข

### 1. **Enhanced Column Mapping สำหรับ PDF** ✅
เพิ่ม parameter mapping table เดียวกับ Excel:

```javascript
const parameterMapping = {
  'frequency': 'Frequency',
  'volt_an': 'Volt AN',
  'volt_bn': 'Volt BN',
  'demand_w': 'Demand W',
  'demand_var': 'Demand Var',
  'demand_va': 'Demand VA',
  'import_kwh': 'Import kWh',
  'export_kwh': 'Export kWh',
  'import_kvarh': 'Import kVarh',
  'export_kvarh': 'Export kVarh',
  'pf_total': 'PF Total',
  'thdv': 'THDV',
  'thdi': 'THDI'
  // ... ครบทั้งหมด 39 parameters
};
```

### 2. **Smart Column Matching Logic** ✅
ใช้ logic เดียวกับ Excel:

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

### 3. **Default Parameters Mapping** ✅
แก้ไข default parameters ให้ใช้ column mapping:

```javascript
const columnMapping = {
  'Voltage': 'Volt AN',
  'Current': 'Current Avg', 
  'Power Factor': 'PF Total',
  'Demand W': 'Demand W',
  'Import kWh': 'Import kWh',
  'Frequency': 'Frequency'
};
```

### 4. **Debug Logging** ✅
เพิ่ม logging เหมือน Excel:

```javascript
// Debug logging for first row only
if (index === 0) {
  console.log(`📄 Parameter "${param}" -> Key "${matchedKey}" -> Value: ${value}`);
}
```

## ผลลัพธ์ที่คาดหวัง

### **Column Mapping สำหรับ PDF** 📄
```
📄 Parameter "demand_w" -> Key "Demand W" -> Value: 1.4364
📄 Parameter "demand_var" -> Key "Demand Var" -> Value: 0.8686
📄 Parameter "demand_va" -> Key "Demand VA" -> Value: 1.7426
📄 Parameter "import_kwh" -> Key "Import kWh" -> Value: 42762.3
📄 Parameter "export_kwh" -> Key "Export kWh" -> Value: 0
📄 Parameter "import_kvarh" -> Key "Import kVarh" -> Value: 14316.4
📄 Parameter "export_kvarh" -> Key "Export kVarh" -> Value: 111.5
```

### **PDF Content** 📋
```
Time                    | demand_w | demand_var | demand_va | import_kwh
17:00 25 September 2025 | 1.4364   | 0.8686     | 1.7426    | 42762.3
17:15 25 September 2025 | 1.4500   | 0.8700     | 1.7500    | 42762.4
17:30 25 September 2025 | 1.4200   | 0.8600     | 1.7300    | 42762.5
```

## การทดสอบ

### **1. เริ่ม Server**
```bash
cd d:\WebMeter-Demo\server
node server.js
```

### **2. รอ Schedule ทำงาน**
- Schedule 35 (PDF): ควรแสดงค่าจริงแทน N/A
- ตรวจสอบ console log ว่ามี parameter mapping

### **3. ตรวจสอบไฟล์ PDF**
- เปิดไฟล์ `export_27092025.pdf`
- ตรวจสอบว่าไม่มี N/A ในตาราง
- ค่าต่างๆ ควรแสดงตัวเลขจริง

## เปรียบเทียบก่อนและหลัง

### **ก่อนแก้ไข** ❌
- **Excel**: N/A ทั้งหมด → ✅ แก้ไขแล้ว
- **PDF**: N/A ทั้งหมด → ❌ ยังไม่แก้ไข

### **หลังแก้ไข** ✅
- **Excel**: แสดงค่าจริง → ✅ ทำงานได้
- **PDF**: แสดงค่าจริง → ✅ ควรทำงานได้

## ไฟล์ที่แก้ไข

### **หลัก**:
- `server/services/exportScheduler.js` - แก้ไข `generatePdfContent()` function

### **การเปลี่ยนแปลง**:
- เพิ่ม enhanced parameter mapping
- ปรับปรุง column matching logic
- เพิ่ม debug logging
- แก้ไข default parameters mapping

## สรุป

### **ปัญหาเดิม** ❌
- PDF ใช้ column matching แบบเก่า → N/A ทั้งหมด

### **หลังแก้ไข** ✅
- PDF ใช้ column mapping เดียวกับ Excel → แสดงค่าจริง
- Logic สอดคล้องกันระหว่าง Excel และ PDF
- Debug logging เพื่อติดตามการทำงาน

ตอนนี้ทั้ง Excel และ PDF export ควรแสดงค่าจริงแทน N/A แล้ว! 🎉
