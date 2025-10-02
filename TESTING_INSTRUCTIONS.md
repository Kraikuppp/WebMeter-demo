# คำแนะนำการทดสอบ Permission System

## 🎯 **วัตถุประสงค์**
ทดสอบว่าปุ่มต่างๆ ใน WebMeter ได้ถูก disabled ถูกต้องตาม write permissions ของ user

## 📋 **User Permissions ที่ทดสอบ**
จาก server log user Jakkrit มี permissions:
```javascript
{
  'Export Data': { read: true, write: false, report: false },
  'Email Line': { read: true, write: false, report: false },
  'Meter Tree': { read: true, write: false, report: false },
  'Holiday': { read: true, write: false, report: false },
  'User Management': { read: true, write: false, report: false }
}
```

## 🚀 **ขั้นตอนการทดสอบ**

### **Step 1: รีสตาร์ทระบบ**
```bash
# Terminal 1: Frontend
cd d:\WebMeter-Demo
npm run dev

# Terminal 2: Backend
cd d:\WebMeter-Demo\server
node server.js
```

### **Step 2: Login และเปิด Developer Console**
1. เปิด Browser → http://localhost:5173
2. กด F12 เปิด Developer Console
3. Login ด้วย username: `Jakkrit`

### **Step 3: ทดสอบแต่ละหน้า**

## 📊 **การทดสอบแต่ละหน้า**

### **1. Export Page** ✅ **แก้ไขแล้ว**
**URL**: `/export`

**ที่ควรเห็น**:
- ✅ เข้าหน้าได้
- ✅ Console: `📝 Export Data Permissions: { read: true, write: false, report: false }`
- ❌ ปุ่ม **Export** disabled (เทา, คลิกไม่ได้)
- ❌ ปุ่ม **Add Schedule** disabled (เทา, คลิกไม่ได้)
- ❌ ปุ่ม **Toggle Schedule** disabled (เทา, คลิกไม่ได้)
- ❌ ปุ่ม **Delete Schedule** disabled (เทา, คลิกไม่ได้)
- ✅ Hover ปุ่ม → tooltip: "You don't have write permission for Export Data"

**การทดสอบ**:
```
1. เข้า /export
2. ตรวจสอบ console log
3. ลองคลิกปุ่ม Export → ควรไม่มีอะไรเกิดขึ้น
4. Hover ปุ่ม → ควรเห็น tooltip
5. ✅ PASS ถ้าปุ่มทั้งหมด disabled
```

### **2. MeterTree Page** ✅ **แก้ไขแล้ว**
**URL**: `/meter-tree`

**ที่ควรเห็น**:
- ✅ เข้าหน้าได้
- ✅ Console: `📝 Meter Tree Permissions: { read: true, write: false, report: false }`
- ✅ ดู tree structure ได้ปกติ
- ❌ ปุ่ม **Import System Tree** disabled (ถ้ามี import modal)
- ❌ ปุ่ม **Import Building Tree** disabled (ถ้ามี import modal)
- ✅ Hover ปุ่ม → tooltip: "You don't have write permission for Meter Tree"

**การทดสอบ**:
```
1. เข้า /meter-tree
2. ตรวจสอบ console log
3. ดู tree structure → ควรแสดงปกติ
4. หา import functionality → ปุ่มควร disabled
5. ✅ PASS ถ้าดูได้แต่แก้ไขไม่ได้
```

### **3. Email/Line Page** 🔄 **แก้ไขบางส่วน**
**URL**: `/config/email`

**ที่ควรเห็น**:
- ✅ เข้าหน้าได้
- ✅ Console: `📝 Email Line Permissions: { read: true, write: false, report: false }`
- ❌ ปุ่ม **Add Email** disabled ✅ **แก้ไขแล้ว**
- ❌ ปุ่ม **Add User** disabled ❌ **ยังไม่แก้**
- ❌ ปุ่ม **Add Group** disabled ❌ **ยังไม่แก้**
- ❌ ปุ่ม **Delete** disabled ❌ **ยังไม่แก้**

**การทดสอบ**:
```
1. เข้า /config/email
2. ตรวจสอบ console log
3. ลองคลิกปุ่ม Add Email → ควรไม่ทำงาน ✅
4. ลองคลิกปุ่ม Add User → ยังทำงานได้ ❌ (ปัญหา)
5. ลองคลิกปุ่ม Add Group → ยังทำงานได้ ❌ (ปัญหา)
6. 🔄 PARTIAL PASS - ต้องแก้ไขต่อ
```

### **4. Holiday Page** ❌ **ยังไม่แก้ไข**
**URL**: `/holiday`

**ที่ควรเห็น**:
- ✅ เข้าหน้าได้
- ❌ Console: ไม่มี permission log ❌ **ปัญหา**
- ❌ ปุ่ม **Add Holiday** ยังใช้งานได้ ❌ **ปัญหา**
- ❌ ปุ่ม **Set FT** ยังใช้งานได้ ❌ **ปัญหา**

**การทดสอบ**:
```
1. เข้า /holiday
2. ตรวจสอบ console → ไม่มี permission log
3. ลองคลิกปุ่ม Add Holiday → ยังทำงานได้ ❌ (ปัญหา)
4. ลองคลิกปุ่ม Set FT → ยังทำงานได้ ❌ (ปัญหา)
5. ❌ FAIL - ต้องแก้ไข
```

### **5. Users Page** ✅ **Admin Only**
**URL**: `/users`

**ที่ควรเห็น**:
- ❌ ไม่ควรเข้าได้ (AdminRoute protection)
- ✅ แสดง "Access Denied" หรือ redirect

**การทดสอบ**:
```
1. พยายามเข้า /users
2. ควรถูกบล็อคหรือ redirect
3. ✅ PASS ถ้าเข้าไม่ได้
```

## 📊 **สรุปผลการทดสอบ**

### **Expected Results**
| หน้า | เข้าได้ | Console Log | ปุ่ม Disabled | Status |
|------|--------|-------------|---------------|--------|
| Export | ✅ | ✅ | ✅ | ✅ PASS |
| MeterTree | ✅ | ✅ | ✅ | ✅ PASS |
| Email/Line | ✅ | ✅ | 🔄 บางส่วน | 🔄 PARTIAL |
| Holiday | ✅ | ❌ | ❌ | ❌ FAIL |
| Users | ❌ | N/A | N/A | ✅ PASS |

### **ปัญหาที่พบ**
1. **Email/Line Page**: ปุ่ม Add User, Add Group, Delete ยังใช้งานได้
2. **Holiday Page**: ไม่มี permission checks เลย

## 🔧 **การรายงานปัญหา**

### **ถ้าทดสอบไม่ผ่าน**
กรุณารายงาน:
```
❌ หน้า: [ชื่อหน้า]
❌ ปัญหา: [ปุ่มไหนที่ยังใช้งานได้ที่ไม่ควรได้]
❌ Console Log: [มี permission log หรือไม่]
❌ Screenshot: [ถ่ายหน้าจอปุ่มที่มีปัญหา]
```

### **ถ้าทดสอบผ่าน**
```
✅ หน้า: [ชื่อหน้า]
✅ ปุ่ม disabled ถูกต้อง
✅ Console แสดง permission log
✅ Tooltip แสดงเหตุผล
```

## 🎯 **เป้าหมายสุดท้าย**

### **Success Criteria**
- ✅ ทุกหน้าที่มี read permission เข้าได้
- ✅ ปุ่มที่ต้องการ write permission ถูก disabled
- ✅ Console แสดง permission logs ถูกต้อง
- ✅ Tooltip แสดงเหตุผลเมื่อ hover ปุ่ม disabled

### **การทดสอบเพิ่มเติม**
หลังจากแก้ไขหน้า Email และ Holiday แล้ว:
1. ทดสอบซ้ำทุกหน้า
2. ลอง login ด้วย user ที่มี write permission
3. ตรวจสอบว่าปุ่มทำงานปกติเมื่อมีสิทธิ์

---
**สร้างเมื่อ**: 01/10/2025 09:23  
**สถานะ**: 📋 Ready for Testing  
**ผลลัพธ์ปัจจุบัน**: 2/4 หน้าผ่านการทดสอบ
