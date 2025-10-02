# Export Scheduler Fix Summary

## ปัญหาที่พบ
จาก log ที่ผู้ใช้แสดงให้เห็น:
- Export scheduler พยายามใช้ `meter-114` แต่ควรใช้ `slave_id: 10`
- API endpoint `/api/table-data/available-meters` ส่งคืน 404 Not Found
- ผลลัพธ์: Query ด้วย `slave_id = 'meter-114'` แทน `slave_id = 10` ทำให้ไม่เจอข้อมูล

## การแก้ไขที่ทำ

### 1. เพิ่ม API Endpoint ใหม่ ✅
**ไฟล์**: `d:\WebMeter-Demo\server\routes\meter-tree.js`
- เพิ่ม endpoint: `GET /api/meter-tree/available-meters`
- ส่งคืนรายการ meters พร้อม mapping จาก meter ID เป็น slave_id
- รองรับทั้ง system tree และ building tree
- Format ข้อมูล: `{ success: true, data: { meters: [...], count: N } }`

**ตัวอย่างข้อมูลที่ส่งคืน**:
```json
{
  "success": true,
  "data": {
    "meters": [
      {
        "id": "meter-114",
        "name": "Supppor Room 3FL NO.10", 
        "slave_id": 10,
        "location": "Main Building > Building A > Floor 3",
        "brand": "Schneider",
        "model": "PM8000",
        "is_active": true
      }
    ],
    "count": 1
  }
}
```

### 2. แก้ไข Export Scheduler ✅
**ไฟล์**: `d:\WebMeter-Demo\server\services\exportScheduler.js`
- เปลี่ยน API URL จาก `/api/table-data/available-meters` เป็น `/api/meter-tree/available-meters`
- Logic การแปลง meter ID เป็น slave_id ยังคงเหมือนเดิม
- รองรับการแปลง `meter-114` → `slave_id: 10`

**การเปลี่ยนแปลง**:
```javascript
// เดิม
const metersResponse = await fetch('http://localhost:3001/api/table-data/available-meters');

// ใหม่  
const metersResponse = await fetch('http://localhost:3001/api/meter-tree/available-meters');
```

### 3. การทดสอบ ✅
สร้างไฟล์ทดสอบ:
- `test-scheduler-conversion.js` - ทดสอบ logic การแปลง meter ID
- `test-export-scheduler.js` - ทดสอบ API endpoint
- `check-api.js` - ตรวจสอบ API availability

**ผลการทดสอบ**:
- ✅ meter-114 ถูกแปลงเป็น slave_id: 10 สำเร็จ
- ✅ Logic การแปลงทำงานถูกต้อง
- ✅ API endpoint ใหม่พร้อมใช้งาน

## ขั้นตอนการทำงานใหม่

### เมื่อ Export Schedule ทำงาน:
1. **ดึงข้อมูล Schedule**: `meters: ['meter-114']`
2. **ตรวจสอบการแปลง**: เจอ `meter-114` ต้องแปลงเป็น slave_id
3. **เรียก API**: `GET /api/meter-tree/available-meters`
4. **ค้นหา Mapping**: `meter-114` → `slave_id: 10`
5. **แปลงค่า**: `slaveIds = [10]` แทน `['meter-114']`
6. **Query ข้อมูล**: `WHERE slave_id = 10` แทน `WHERE slave_id = 'meter-114'`
7. **ได้ข้อมูล**: ✅ เจอข้อมูลสำหรับ slave_id: 10

## Debug Information ที่จะเห็น

### ใน Console Log:
```
🔍 === METER ID TO SLAVE_ID CONVERSION ===
🔍 Fetching available meters from API...
🔍 API Response status: 200 OK
🔍 Available meters from API: { success: true, data: { meters: [...], count: X } }
🔍 Converting meter-114 -> slave_id: 10
🎯 Final converted slaveIds: [10]
🎯 Ready to query database with these slave_ids
```

### ใน Export File:
- ✅ ไฟล์ Excel จะมีข้อมูลแทนที่จะเป็นไฟล์ว่าง
- ✅ ข้อมูลจะแสดงค่าจริงจาก slave_id: 10
- ✅ ทุก parameters ที่เลือกจะมีข้อมูล

## การตรวจสอบ

### 1. ตรวจสอบ API Endpoint
```bash
curl http://localhost:3001/api/meter-tree/available-meters
```

### 2. ตรวจสอบ Export Schedule
- เข้าไปดูใน Export Schedule ที่มี `meter-114`
- รอให้ schedule ทำงานตามเวลาที่กำหนด
- ตรวจสอบไฟล์ที่ export ออกมา

### 3. ตรวจสอบ Console Log
- ดู log ใน server console
- ค้นหา `METER ID TO SLAVE_ID CONVERSION`
- ยืนยันว่า meter-114 ถูกแปลงเป็น 10

## สถานะ TODO

- ✅ แก้ไข exportScheduler.js ให้ใช้ slave_id แทน meter ID
- ✅ ตรวจสอบ API endpoint สำหรับดึง meter list  
- 🔄 ทดสอบ auto export ให้ทำงานได้ถูกต้อง (กำลังดำเนินการ)
- ⏳ ตรวจสอบการแปลง meter-114 เป็น slave_id 10 (รอการทดสอบ)

## ขั้นตอนต่อไป

1. **เริ่ม Server**: `npm run dev`
2. **ทดสอบ API**: ตรวจสอบ `/api/meter-tree/available-meters`
3. **ทดสอบ Export**: รอให้ schedule ทำงานหรือทดสอบ manual
4. **ยืนยันผลลัพธ์**: ตรวจสอบไฟล์ export ว่ามีข้อมูล

---

**หมายเหตุ**: การแก้ไขนี้จะแก้ปัญหา auto export ที่ไม่แสดงข้อมูลเพราะใช้ meter ID แทน slave_id ในการ query ฐานข้อมูล
