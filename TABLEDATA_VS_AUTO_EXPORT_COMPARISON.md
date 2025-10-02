# TableData vs Auto Export Comparison

## การวิเคราะห์ TableData.tsx Export Logic

### **1. User Interface สำหรับเลือกเวลา** 📅
```javascript
// TableData.tsx มี UI elements เหล่านี้:
const [dateFrom, setDateFrom] = useState<Date>();
const [dateTo, setDateTo] = useState<Date>();
const [timeFrom, setTimeFrom] = useState('00:00');
const [timeTo, setTimeTo] = useState('23:59');

// UI Components:
<Calendar selected={dateFrom} onSelect={setDateFrom} />
<Calendar selected={dateTo} onSelect={setDateTo} />
<TimeInput24 value={timeFrom} onChange={setTimeFrom} />
<TimeInput24 value={timeTo} onChange={setTimeTo} />
```

### **2. การโหลดข้อมูลจาก API** 🚀
```javascript
const loadTableData = async () => {
  const params = {
    dateFrom: format(dateFrom, 'yyyy-MM-dd'),    // User selected date
    dateTo: format(dateTo, 'yyyy-MM-dd'),        // User selected date
    timeFrom,                                    // User selected time (00:00)
    timeTo,                                      // User selected time (01:13)
    columns: contextSelectedColumns,             // Selected columns
    slaveIds: selectedSlaveIds                   // Selected meters
  };

  console.log('📅 Date Range:', `${params.dateFrom} ${params.timeFrom} to ${params.dateTo} ${params.timeTo}`);
  console.log('🔢 Slave IDs to fetch:', params.slaveIds);
  console.log('📊 Selected Columns:', params.columns);

  const response = await apiClient.getTableData(params);
  
  if (response.success && response.data) {
    const rawData = response.data;
    
    // กรองข้อมูลให้ห่างกัน 15 นาที
    const filteredData = filterDataBy15MinuteInterval(rawData);
    setTableData(filteredData);
  }
};
```

### **3. การ Filter ข้อมูลตาม Read Time** ⏰
```javascript
const filterDataBy15MinuteInterval = (data: ApiTableDataRow[]): ApiTableDataRow[] => {
  if (data.length === 0) return data;
  
  const filteredData: ApiTableDataRow[] = [];
  
  // เรียงข้อมูลตามเวลา
  const sortedData = [...data].sort((a, b) => {
    const timeA = new Date(a.reading_timestamp || a.time);
    const timeB = new Date(b.reading_timestamp || b.time);
    return timeA.getTime() - timeB.getTime();
  });

  // สร้างช่วงเวลาทุก 15 นาที
  const startTime = new Date(sortedData[0].reading_timestamp || sortedData[0].time);
  const endTime = new Date(sortedData[sortedData.length - 1].reading_timestamp || sortedData[sortedData.length - 1].time);
  
  // ปรับเวลาเริ่มต้นให้เป็นจุดที่หารด้วย 15 ลงตัว
  const adjustedStartTime = new Date(startTime);
  adjustedStartTime.setMinutes(Math.floor(adjustedStartTime.getMinutes() / 15) * 15, 0, 0);
  
  const timeSlots: Date[] = [];
  const currentTime = new Date(adjustedStartTime);
  
  while (currentTime <= endTime) {
    timeSlots.push(new Date(currentTime));
    currentTime.setMinutes(currentTime.getMinutes() + 15);
  }

  // สำหรับแต่ละช่วงเวลา หาข้อมูลที่ใกล้เคียงที่สุด
  timeSlots.forEach(targetTime => {
    let closestRow: ApiTableDataRow | null = null;
    let minTimeDiff = Infinity;
    
    sortedData.forEach(row => {
      const rowTime = new Date(row.reading_timestamp || row.time);
      const timeDiff = Math.abs(rowTime.getTime() - targetTime.getTime());
      
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestRow = row;
      }
    });
    
    // เพิ่มข้อมูลที่ใกล้เคียงที่สุด
    if (closestRow) {
      filteredData.push(closestRow);
    }
  });
  
  return filteredData;
};
```

### **4. การ Export ข้อมูล** 📄
```javascript
async function handleExport(type: 'pdf' | 'csv' | 'image' | 'text') {
  if (!isLoaded || paginatedData.length === 0) {
    alert('Please Load Data before export');
    return;
  }

  const fromDateStr = dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '-';
  const toDateStr = dateTo ? format(dateTo, 'dd/MM/yyyy') : '-';
  
  await exportTableData({
    type,
    fileName: defaultFileName,
    fromDate: fromDateStr,      // User selected date (formatted)
    toDate: toDateStr,          // User selected date (formatted)
    timeFrom,                   // User selected time (00:00)
    timeTo,                     // User selected time (01:13)
    meterName: meterNameForExport,
    columns: displayColumns,
    data: filteredData,         // Filtered data (15-minute intervals)
    formatDateTime,
    getColumnValue
  });
}
```

## เปรียบเทียบ TableData vs Auto Export

### **TableData.tsx (Manual Export)** ✅

#### **Flow การทำงาน**:
1. **User เลือกเวลา**: `dateFrom`, `dateTo`, `timeFrom`, `timeTo`
2. **กด Load Data**: เรียก `apiClient.getTableData(params)` ด้วย user selected parameters
3. **Filter ข้อมูล**: ใช้ `filterDataBy15MinuteInterval()` กรองข้อมูลให้ห่างกัน 15 นาที
4. **กด Export**: ส่ง `filteredData` ไปยัง `exportTableData()`

#### **ผลลัพธ์**:
- ✅ ได้ข้อมูลตามช่วงเวลาที่เลือก (00:00-01:13)
- ✅ ข้อมูลถูก filter ตาม read time interval
- ✅ Export file มี metadata ที่ถูกต้อง

### **Auto Export (ปัจจุบัน)** ❌

#### **Flow การทำงาน**:
1. **ไม่มี User Input**: ใช้ current time หรือ calculated time
2. **เรียก API**: ใช้ parameters ที่คำนวณเอง
3. **ไม่ Filter**: ใช้ข้อมูลดิบจาก API
4. **Export**: ส่งข้อมูลที่อาจไม่ตรงกับที่ user เลือก

#### **ปัญหา**:
- ❌ ไม่ใช้เวลาที่ user เลือกใน UI
- ❌ ไม่มี 15-minute interval filtering
- ❌ Export file metadata ไม่ตรงกับที่ user เลือก

## สิ่งที่ Auto Export ควรทำเหมือน TableData

### **1. ใช้ User Selected Parameters** ✅ (แก้ไขแล้ว)
```javascript
// Auto Export ควรใช้:
if (schedule.date_from && schedule.date_to && schedule.time_from && schedule.time_to) {
  dateFrom = new Date(schedule.date_from);
  dateTo = new Date(schedule.date_to);
  timeFromStr = schedule.time_from;  // 00:00
  timeToStr = schedule.time_to;      // 01:13
}
```

### **2. เรียก API เหมือน TableData** ✅ (แก้ไขแล้ว)
```javascript
const params = {
  dateFrom: dateFromStr,        // 2025-09-27
  dateTo: dateToStr,            // 2025-09-27
  timeFrom: timeFromStr,        // 00:00
  timeTo: timeToStr,            // 01:13
  columns: columns,
  slaveIds: slaveIds,
  interval: parseInt(schedule.read_time) || 15
};

const response = await fetch(`http://localhost:3001/api/table-data?${queryParams}`);
```

### **3. เพิ่ม 15-Minute Interval Filtering** ⚠️ (ยังไม่ได้ทำ)
```javascript
// Auto Export ควรเพิ่ม:
const filterDataBy15MinuteInterval = (data) => {
  // Same logic as TableData.tsx
  // Filter data to 15-minute intervals
  return filteredData;
};

// ใน fetchMeterData():
if (response && response.data && Array.isArray(response.data)) {
  const rawData = response.data;
  
  // Filter data like TableData.tsx
  const filteredData = filterDataBy15MinuteInterval(rawData);
  
  return {
    data: filteredData,  // Use filtered data instead of raw data
    dateFromStr,
    dateToStr,
    timeFromStr,
    timeToStr,
    dateFrom,
    dateTo
  };
}
```

### **4. ใช้ exportTableData Utility** ⚠️ (ยังไม่ได้ทำ)
```javascript
// แทนที่จะสร้าง Excel/PDF เอง ให้ใช้ exportTableData เหมือน TableData.tsx:
const { exportTableData } = require('../utils/exportUtils');

await exportTableData({
  type: schedule.export_format,  // 'pdf' or 'excel'
  fileName: `auto_export_${dateFromStr}`,
  fromDate: format(dateFrom, 'dd/MM/yyyy'),
  toDate: format(dateTo, 'dd/MM/yyyy'),
  timeFrom: timeFromStr,
  timeTo: timeToStr,
  meterName: meterNames,
  columns: schedule.parameters,
  data: filteredData,
  formatDateTime,
  getColumnValue
});
```

## สรุปสิ่งที่ต้องแก้ไขใน Auto Export

### **✅ แก้ไขแล้ว**:
1. ใช้ user selected date/time parameters
2. เรียก API ด้วย parameters ที่ถูกต้อง
3. ส่งข้อมูลจริงใน Email/LINE

### **⚠️ ยังต้องแก้ไข**:
1. **เพิ่ม 15-minute interval filtering** เหมือน TableData.tsx
2. **ใช้ exportTableData utility** แทนการสร้าง Excel/PDF เอง
3. **ทดสอบว่าได้ข้อมูลตรงกับ TableData.tsx หรือไม่**

### **🎯 Expected Result**:
เมื่อแก้ไขครบแล้ว Auto Export ควรได้ข้อมูลเหมือนกับ TableData.tsx ทุกประการ:
- ✅ ช่วงเวลาเดียวกัน (00:00-01:13)
- ✅ ข้อมูลถูก filter เหมือนกัน (15-minute intervals)
- ✅ Format เหมือนกัน
- ✅ Metadata ตรงกัน

การแก้ไขนี้จะทำให้ Auto Export ทำงานเหมือน Manual Export ใน TableData.tsx ทุกประการ! 🎉
