# 🧪 WebMeter RBAC Testing Guide

## 📋 การทดสอบระบบ Role-Based Access Control

### 🎯 วัตถุประสงค์การทดสอบ
- ตรวจสอบการทำงานของระบบ RBAC
- ยืนยันการจำกัดสิทธิ์การเข้าถึง
- ทดสอบการจัดการ Roles และ Permissions
- ตรวจสอบการบันทึกและโหลดข้อมูล

---

## 🚀 การเตรียมการทดสอบ

### 1. ติดตั้งฐานข้อมูล
```sql
-- รันไฟล์ SQL สำหรับตั้งค่า RBAC
\i database/setup_rbac_system.sql
```

### 2. เริ่มต้น Server
```bash
cd server
npm start
```

### 3. เริ่มต้น Frontend
```bash
npm run dev
```

### 4. เข้าสู่ระบบด้วยบัญชี Admin
- Username: `admin`
- Password: `password123`

---

## 📝 Test Cases

### 🔐 TC001: การเข้าถึงหน้า Users Management

#### Test Steps:
1. เข้าสู่ระบบด้วยบัญชี Admin
2. คลิกเมนู "Users"
3. ตรวจสอบการแสดงผล 3 แท็บ: User List, Permissions, Authorize

#### Expected Results:
- ✅ เข้าถึงหน้า Users ได้สำเร็จ
- ✅ แสดงแท็บทั้ง 3 แท็บ
- ✅ ไม่มี error ใน console

#### Test Data:
```
Role: Admin
Expected Access: Full access to all tabs
```

---

### 👥 TC002: การจัดการผู้ใช้ในแท็บ User List

#### Test Steps:
1. เข้าแท็บ "User List"
2. คลิก "Add User"
3. กรอกข้อมูลผู้ใช้ใหม่:
   ```
   Username: testuser1
   Email: test1@example.com
   Password: Test123!
   Name: Test
   Surname: User1
   Level: Engineer
   ```
4. คลิก "Add User"
5. ตรวจสอบผู้ใช้ใหม่ในรายการ

#### Expected Results:
- ✅ เพิ่มผู้ใช้ใหม่ได้สำเร็จ
- ✅ แสดงผู้ใช้ในรายการ
- ✅ Level แสดงเป็น "Engineer"

---

### 🏷️ TC003: การสร้าง Role ใหม่

#### Test Steps:
1. เข้าแท็บ "Authorize"
2. คลิก "Add" ในส่วน Role Management
3. กรอกชื่อ Role: "Technician"
4. คลิก "Add"
5. ตรวจสอบ Role ใหม่ในรายการ

#### Expected Results:
- ✅ สร้าง Role ใหม่ได้สำเร็จ
- ✅ แสดง Role "Technician" ในรายการ
- ✅ แสดงจำนวนผู้ใช้ = 0

---

### ⚙️ TC004: การตั้งค่า Permissions

#### Test Steps:
1. เลือก Role "Technician"
2. เปิดสิทธิ์ Read สำหรับโมดูล:
   - Dashboard ✅
   - Online Data ✅
   - Table Data ✅
   - Export ✅
3. เปิดสิทธิ์ Write สำหรับ:
   - Dashboard ✅
   - Export ✅
4. คลิก "Save"

#### Expected Results:
- ✅ บันทึก Permissions ได้สำเร็จ
- ✅ แสดงสถิติ: Read 4/19, Write 2/19, Report 0/19
- ✅ ไม่มี error ใน console

---

### 📊 TC005: การ Copy Permissions

#### Test Steps:
1. เลือก Role "Technician"
2. คลิก "Copy From"
3. เลือก "Engineer" เป็น source
4. คลิก "Copy Permissions"
5. ตรวจสอบ Permissions ที่ถูกคัดลอก
6. คลิก "Save"

#### Expected Results:
- ✅ คัดลอก Permissions ได้สำเร็จ
- ✅ Technician มี Permissions เหมือน Engineer
- ✅ บันทึกลงฐานข้อมูลได้สำเร็จ

---

### 🔄 TC006: การเปลี่ยน Role ของผู้ใช้

#### Test Steps:
1. เข้าแท็บ "User List"
2. คลิกขวาที่ผู้ใช้ "testuser1"
3. เลือก "Set as Technician"
4. ยืนยันการเปลี่ยนแปลง
5. ตรวจสอบ Level ใหม่

#### Expected Results:
- ✅ เปลี่ยน Role ได้สำเร็จ
- ✅ Level แสดงเป็น "Technician"
- ✅ จำนวนผู้ใช้ใน Role Technician = 1

---

### 🔍 TC007: การค้นหาและกรองข้อมูล

#### Test Steps:
1. เข้าแท็บ "User List"
2. กรอก "test" ในช่องค้นหา
3. ตรวจสอบผลการค้นหา
4. เคลียร์การค้นหา
5. เข้าแท็บ "Permissions"
6. คลิกกลุ่ม "Technician" เพื่อขยาย

#### Expected Results:
- ✅ ค้นหาผู้ใช้ได้ถูกต้อง
- ✅ แสดงเฉพาะผู้ใช้ที่มีคำว่า "test"
- ✅ แสดงผู้ใช้ในกลุ่ม Technician

---

### 🚫 TC008: การทดสอบสิทธิ์การเข้าถึง (Access Control)

#### Test Steps:
1. Logout จากบัญชี Admin
2. Login ด้วยบัญชี testuser1 (Technician)
3. พยายามเข้าหน้า Users
4. ตรวจสอบการเข้าถึงโมดูลต่างๆ

#### Expected Results:
- ❌ ไม่สามารถเข้าหน้า Users ได้ (ไม่มีสิทธิ์)
- ✅ เข้า Dashboard ได้
- ✅ เข้า Online Data ได้
- ✅ เข้า Table Data ได้
- ✅ เข้า Export ได้
- ❌ ไม่สามารถเข้า Config ได้

---

### 🗑️ TC009: การลบ Role

#### Test Steps:
1. Login ด้วยบัญชี Admin
2. เข้าแท็บ "Authorize"
3. คลิกปุ่มลบข้าง Role "Technician"
4. ยืนยันการลบ
5. ตรวจสอบผลกระทบต่อผู้ใช้

#### Expected Results:
- ✅ ลบ Role ได้สำเร็จ
- ⚠️ ผู้ใช้ที่มี Role นี้จะได้รับผลกระทบ
- ✅ ไม่แสดง Role "Technician" ในรายการ

---

### 📊 TC010: การตรวจสอบ Select All Permissions

#### Test Steps:
1. เลือก Role "Manager"
2. คลิก checkbox "View" ในหัวตาราง (Select All)
3. ตรวจสอบว่าทุกโมดูลได้รับสิทธิ์ Read
4. คลิก checkbox "Edit" ในหัวตาราง
5. ตรวจสอบว่าโมดูลที่มี Read ได้รับสิทธิ์ Write
6. คลิก "Save"

#### Expected Results:
- ✅ Select All Read ทำงานได้ถูกต้อง
- ✅ Select All Write ทำงานเฉพาะโมดูลที่มี Read
- ✅ บันทึกได้สำเร็จ

---

## 🔧 การทดสอบ API

### API Test Cases:

#### 🌐 AT001: GET /api/roles/permissions/all
```bash
curl -X GET http://localhost:3001/api/roles/permissions/all
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "role_name": "Admin",
      "permissions": [...]
    }
  ]
}
```

#### 🌐 AT002: PUT /api/roles/:roleId/permissions
```bash
curl -X PUT http://localhost:3001/api/roles/1/permissions \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      {
        "module": "Dashboard",
        "read": true,
        "write": true,
        "report": true
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Permissions updated for role Admin"
}
```

---

## 🐛 การทดสอบ Error Handling

### 🚨 ET001: การทดสอบ Validation

#### Test Steps:
1. พยายามสร้าง Role ด้วยชื่อว่าง
2. พยายามสร้างผู้ใช้ด้วย email ที่ไม่ถูกต้อง
3. พยายามบันทึก Permissions โดยไม่เลือก Role

#### Expected Results:
- ❌ แสดง error message ที่เหมาะสม
- ❌ ไม่บันทึกข้อมูลที่ไม่ถูกต้อง
- ✅ แสดง validation feedback

### 🚨 ET002: การทดสอบ Network Error

#### Test Steps:
1. ปิด server
2. พยายามบันทึก Permissions
3. เปิด server กลับมา
4. ลองบันทึกอีกครั้ง

#### Expected Results:
- ❌ แสดง error เมื่อ server ปิด
- ✅ ทำงานปกติเมื่อ server เปิดกลับมา

---

## 📊 Performance Testing

### 🚀 PT001: การทดสอบ Load Time

#### Test Steps:
1. วัดเวลาโหลดหน้า Users
2. วัดเวลาโหลด Permissions
3. วัดเวลาบันทึก Permissions

#### Expected Results:
- ⏱️ โหลดหน้า Users < 2 วินาที
- ⏱️ โหลด Permissions < 1 วินาที
- ⏱️ บันทึก Permissions < 3 วินาที

### 🚀 PT002: การทดสอบกับข้อมูลจำนวนมาก

#### Test Steps:
1. สร้าง Role 20 อัน
2. สร้างผู้ใช้ 100 คน
3. ตั้งค่า Permissions ทั้งหมด
4. ทดสอบการค้นหาและกรอง

#### Expected Results:
- ✅ ระบบทำงานได้ปกติ
- ✅ การค้นหารวดเร็ว
- ✅ UI ไม่ค้าง

---

## 📋 Test Report Template

### การบันทึกผลการทดสอบ:

```
Test Case: TC001
Date: 2025-09-30
Tester: [ชื่อผู้ทดสอบ]
Browser: Chrome 118.0.0
Status: ✅ PASS / ❌ FAIL
Notes: [หมายเหตุเพิ่มเติม]
Screenshots: [ลิงก์ภาพหน้าจอ]
```

### Checklist การทดสอบ:

- [ ] TC001: การเข้าถึงหน้า Users Management
- [ ] TC002: การจัดการผู้ใช้ในแท็บ User List
- [ ] TC003: การสร้าง Role ใหม่
- [ ] TC004: การตั้งค่า Permissions
- [ ] TC005: การ Copy Permissions
- [ ] TC006: การเปลี่ยน Role ของผู้ใช้
- [ ] TC007: การค้นหาและกรองข้อมูل
- [ ] TC008: การทดสอบสิทธิ์การเข้าถึง
- [ ] TC009: การลบ Role
- [ ] TC010: การตรวจสอบ Select All Permissions
- [ ] AT001: API GET permissions
- [ ] AT002: API PUT permissions
- [ ] ET001: Validation testing
- [ ] ET002: Network error testing
- [ ] PT001: Load time testing
- [ ] PT002: Large data testing

---

## 🎯 เกณฑ์การผ่านการทดสอบ

### ✅ Acceptance Criteria:
1. **Functionality**: ทุก Test Case ผ่าน 95%
2. **Performance**: Load time < 3 วินาที
3. **Security**: Access Control ทำงานถูกต้อง 100%
4. **Usability**: UI/UX ใช้งานง่าย ไม่มี confusion
5. **Reliability**: ไม่มี critical bugs
6. **Data Integrity**: ข้อมูลบันทึกถูกต้อง 100%

### 📊 Test Metrics:
- **Test Coverage**: 100% ของฟีเจอร์หลัก
- **Pass Rate**: ≥ 95%
- **Critical Bugs**: 0
- **Performance**: ตามเกณฑ์ที่กำหนด

---

## 🔍 Debugging Tips

### การตรวจสอบปัญหา:

1. **เปิด Developer Console** (F12)
2. **ตรวจสอบ Network Tab** สำหรับ API calls
3. **ดู Console Log** สำหรับ error messages
4. **ตรวจสอบ Database** ด้วย SQL queries
5. **ตรวจสอบ Server Log** สำหรับ backend errors

### SQL Queries สำหรับ Debug:

```sql
-- ดูข้อมูล Roles ทั้งหมด
SELECT * FROM roles ORDER BY role_name;

-- ดูข้อมูล Permissions ทั้งหมด
SELECT * FROM role_permissions_detail ORDER BY role_name, module;

-- ดูสถิติ Permissions
SELECT * FROM role_permissions_summary;

-- ดูผู้ใช้และ Role
SELECT username, email, level, status FROM users ORDER BY level, username;
```

---

*คู่มือการทดสอบนี้อัปเดตล่าสุด: 30 กันยายน 2025*
