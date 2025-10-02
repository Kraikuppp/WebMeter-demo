# User Selected Time Fix Summary

## ปัญหาที่พบ

### **1. Auto Export ไม่ใช้เวลาที่ User เลือก** ❌
```
User เลือก:
📅 Date From: Sat Sep 27 2025 00:00:00 GMT+0700
📅 Date To: Sat Sep 27 2025 16:13:09 GMT+0700  
⏰ Time From: 00:00
⏰ Time To: 01:13
🕐 Auto Export Time: 16:14

แต่ Auto Export ใช้:
📅 Current date range: 2025-09-27 to 2025-09-27
⏰ Current time: 00:00 to 16:17 (เวลาปัจจุบัน)
```

### **2. Email/LINE ไม่มีข้อมูลจริง** ❌
- Auto Export ส่งแค่ summary
- Manual Export ส่งข้อมูลจริง (formatted data)

## การแก้ไข

### **1. ใช้ User Selected Date/Time** ✅

#### **Frontend - เพิ่ม date/time fields กลับมา**:
```javascript
const scheduleData = {
  // ... existing fields
  created_by: currentUser,
  // Add user selected date/time for auto export
  date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
  date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : null,
  time_from: timeFrom || '00:00',
  time_to: timeTo || '23:59'
};
```

#### **Backend - เพิ่ม date/time columns กลับมา**:
```sql
INSERT INTO export_schedules (
  frequency, time, day_of_week, day_of_month, export_type, export_format,
  read_time, meters, parameters, file_path, email_list, line_list, 
  date_from, date_to, time_from, time_to, created_by, next_run
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
```

#### **Export Scheduler - ใช้ user selected time**:
```javascript
// Check if schedule has custom date/time from user selection
if (schedule.date_from && schedule.date_to && schedule.time_from && schedule.time_to) {
  // Use user selected date/time (like manual export)
  dateFrom = new Date(schedule.date_from);
  dateTo = new Date(schedule.date_to);
  timeFromStr = schedule.time_from;
  timeToStr = schedule.time_to;
  console.log(`📅 Using user selected date/time: ${schedule.date_from} ${schedule.time_from} - ${schedule.date_to} ${schedule.time_to}`);
} else {
  // Fallback: use current date with time from start of day to now
  dateFrom = new Date(now);
  dateFrom.setHours(0, 0, 0, 0);
  dateTo = new Date(now);
  dateTo.setHours(0, 0, 0, 0);
  timeFromStr = '00:00';
  timeToStr = now.toTimeString().slice(0, 5);
  console.log(`📅 Using current date/time (fallback)`);
}
```

### **2. Email/LINE ส่งข้อมูลจริง** ✅

#### **Email Content - มีตารางข้อมูลจริง**:
```javascript
formatDataForEmail(schedule, meterData, dateTimeInfo) {
  // Format actual data like manual export
  let formattedData = '';
  if (meterData && meterData.length > 0) {
    // Group data by meter
    const groupedByMeter = {};
    meterData.forEach(row => {
      const meterName = row.meter_name || `Meter ${row.slave_id}`;
      if (!groupedByMeter[meterName]) {
        groupedByMeter[meterName] = [];
      }
      groupedByMeter[meterName].push(row);
    });

    // Format data for each meter
    Object.keys(groupedByMeter).forEach(meterName => {
      formattedData += `<h4>${meterName}</h4>\n<table border="1">\n`;
      formattedData += '<tr><th>Time</th>';
      
      // Add parameter headers
      if (schedule.parameters && Array.isArray(schedule.parameters)) {
        schedule.parameters.forEach(param => {
          formattedData += `<th>${param}</th>`;
        });
      }
      formattedData += '</tr>\n';

      // Add data rows (limit to 10 rows per meter)
      groupedByMeter[meterName].slice(0, 10).forEach(row => {
        const timestamp = row.reading_timestamp || row.timestamp || row.time;
        const formattedTime = new Date(timestamp).toLocaleString();
        formattedData += `<tr><td>${formattedTime}</td>`;
        
        if (schedule.parameters && Array.isArray(schedule.parameters)) {
          schedule.parameters.forEach(param => {
            const value = this.getParameterValue(row, param);
            formattedData += `<td>${value}</td>`;
          });
        }
        formattedData += '</tr>\n';
      });
      
      formattedData += '</table><br>\n';
    });
  }
  
  return `
    <h2>WebMeter Auto Export Report</h2>
    <p><strong>Date Range:</strong> ${dateRange}</p>
    <h3>Data</h3>
    ${formattedData}
  `;
}
```

#### **LINE Content - มีข้อมูลจริง (จำกัดความยาว)**:
```javascript
formatDataForLine(schedule, meterData, dateTimeInfo) {
  // Format actual data like manual export
  let formattedData = '';
  if (meterData && meterData.length > 0) {
    // Group data by meter
    const groupedByMeter = {};
    meterData.forEach(row => {
      const meterName = row.meter_name || `Meter ${row.slave_id}`;
      if (!groupedByMeter[meterName]) {
        groupedByMeter[meterName] = [];
      }
      groupedByMeter[meterName].push(row);
    });

    // Format data for each meter (limit to avoid LINE message length limit)
    Object.keys(groupedByMeter).slice(0, 2).forEach(meterName => { // Max 2 meters
      formattedData += `\n📊 ${meterName}\n`;
      
      groupedByMeter[meterName].slice(0, 5).forEach(row => { // Max 5 rows per meter
        const timestamp = row.reading_timestamp || row.timestamp || row.time;
        const formattedTime = new Date(timestamp).toLocaleString();
        formattedData += `⏰ ${formattedTime}\n`;
        
        if (schedule.parameters && Array.isArray(schedule.parameters)) {
          schedule.parameters.slice(0, 3).forEach(param => { // Max 3 parameters
            const value = this.getParameterValue(row, param);
            formattedData += `  ${param}: ${value}\n`;
          });
        }
        formattedData += '\n';
      });
    });
  }
  
  return `📊 WebMeter Auto Export Report
📅 Date Range: ${dateRange}
${formattedData}
WebMeter by Amptron Thailand Co.,Ltd.`;
}
```

#### **Parameter Value Helper**:
```javascript
getParameterValue(row, param) {
  // Try different column name formats
  const possibleKeys = [
    param,
    param.charAt(0).toUpperCase() + param.slice(1),
    param.replace(/_/g, ' '),
    param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    `param_${param}`,
  ];

  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      const value = row[key];
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return value.toString();
    }
  }
  
  return 'N/A';
}
```

## ผลลัพธ์ที่คาดหวัง

### **Debug Information** 📊
```
📅 Using user selected date/time: 2025-09-27 00:00 - 2025-09-27 01:13
📅 Final API parameters: 2025-09-27 00:00 - 2025-09-27 01:13
📊 Calling table-data API (same as manual export): 
http://localhost:3001/api/table-data?dateFrom=2025-09-27&dateTo=2025-09-27&timeFrom=00%3A00&timeTo=01%3A13&interval=15&columns=Demand+W&slaveIds=1
```

### **Email Content** 📧
```html
<h2>WebMeter Auto Export Report</h2>
<p><strong>Export Type:</strong> table_data</p>
<p><strong>Date Range:</strong> 2025-09-27 00:00 - 2025-09-27 01:13</p>
<p><strong>Meters:</strong> 1 selected</p>
<p><strong>Parameters:</strong> 7 selected</p>
<p><strong>Generated:</strong> 27/09/2025 16:17:47</p>

<h3>Data</h3>
<h4>Meter 1</h4>
<table border="1" style="border-collapse: collapse; width: 100%;">
<tr><th>Time</th><th>demand_w</th><th>demand_var</th><th>import_kwh</th></tr>
<tr><td>27/09/2025 00:00:00</td><td>1.44</td><td>0.87</td><td>42762.30</td></tr>
<tr><td>27/09/2025 00:15:00</td><td>1.38</td><td>0.87</td><td>42762.60</td></tr>
<tr><td>27/09/2025 00:30:00</td><td>1.44</td><td>0.86</td><td>42763.00</td></tr>
<tr><td>27/09/2025 00:45:00</td><td>1.44</td><td>0.88</td><td>42763.30</td></tr>
<tr><td>27/09/2025 01:00:00</td><td>1.50</td><td>0.97</td><td>42763.70</td></tr>
</table>
```

### **LINE Message** 📱
```
📊 WebMeter Auto Export Report

📋 Export Type: table_data
📅 Date Range: 2025-09-27 00:00 - 2025-09-27 01:13
🏭 Meters: 1 selected
📊 Parameters: 7 selected
⏰ Generated: 27/09/2025 16:17:47

📊 Meter 1
⏰ 27/09/2025 00:00:00
  demand_w: 1.44
  demand_var: 0.87
  import_kwh: 42762.30

⏰ 27/09/2025 00:15:00
  demand_w: 1.38
  demand_var: 0.87
  import_kwh: 42762.60

WebMeter by Amptron Thailand Co.,Ltd.
```

## เปรียบเทียบก่อนและหลัง

### **Date/Time Selection** 📅

#### **ก่อนแก้ไข** ❌:
- **User เลือก**: 27 Sep 2025 00:00-01:13
- **Auto Export ใช้**: 27 Sep 2025 00:00-16:17 (current time)
- **ผลลัพธ์**: ได้ข้อมูลผิดช่วงเวลา

#### **หลังแก้ไข** ✅:
- **User เลือก**: 27 Sep 2025 00:00-01:13
- **Auto Export ใช้**: 27 Sep 2025 00:00-01:13 (user selected)
- **ผลลัพธ์**: ได้ข้อมูลตามที่เลือก

### **Email/LINE Content** 📧📱

#### **ก่อนแก้ไข** ❌:
- **Content**: แค่ summary (Export Type, Date Range, Meters count)
- **Data**: ไม่มีข้อมูลจริง
- **ประโยชน์**: จำกัด

#### **หลังแก้ไข** ✅:
- **Content**: Summary + ตารางข้อมูลจริง
- **Data**: มีข้อมูลจริงจาก API
- **ประโยชน์**: สามารถดูข้อมูลได้ทันที

## Database Schema Requirements

ต้องมี columns เหล่านี้ใน `export_schedules` table:
```sql
ALTER TABLE export_schedules 
ADD COLUMN IF NOT EXISTS date_from DATE,
ADD COLUMN IF NOT EXISTS date_to DATE,
ADD COLUMN IF NOT EXISTS time_from VARCHAR(5),
ADD COLUMN IF NOT EXISTS time_to VARCHAR(5);
```

## การทดสอบ

### **1. สร้าง Auto Export Schedule**:
- เลือกวันที่: 27 September 2025
- เลือกเวลา: 00:00 - 01:13
- Export Format: Email หรือ LINE
- กำหนดเวลา Auto Export: 16:20

### **2. ตรวจสอบ Console Log**:
```
📅 Using user selected date/time: 2025-09-27 00:00 - 2025-09-27 01:13
📅 Final API parameters: 2025-09-27 00:00 - 2025-09-27 01:13
📧 Sending email export for schedule 123
📧 Found 2 email recipients
📧 Email sent to test@example.com
```

### **3. ตรวจสอบ Email/LINE**:
- **Email**: ควรมีตารางข้อมูลจริงในช่วงเวลา 00:00-01:13
- **LINE**: ควรมีข้อมูลจริงในรูปแบบ text

## สรุป

การแก้ไขนี้ทำให้:
1. **Auto Export ใช้เวลาที่ User เลือก** ✅
2. **Email/LINE มีข้อมูลจริง** ✅
3. **Consistent กับ Manual Export** ✅
4. **Database รองรับ custom date/time** ✅

ตอนนี้ Auto Export จะทำงานตามเวลาที่ User เลือกและส่งข้อมูลจริงไปยัง Email/LINE แล้ว! 🎉
