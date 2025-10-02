# คำแนะนำการทดสอบหลังแก้ไข Permission System

## 🎯 **วัตถุประสงค์**
ทดสอบว่าการแก้ไข Permission Key Mismatch สำเร็จแล้ว และ user สามารถเข้าถึงหน้าต่างๆ ได้ตามสิทธิ์ที่กำหนด

## 📋 **ข้อมูล User ที่ทดสอบ**
จาก server log:
- **Username**: Jakkrit
- **Role**: Test
- **Permissions**: ตามที่แสดงใน log

```
'User Management': { read: true, write: true, report: false }
'Export Data': { read: true, write: false, report: true }
'Config': { read: true, write: false, report: false }
'Email Line': { read: true, write: true, report: false }
'Event': { read: true, write: false, report: false }
'Holiday': { read: true, write: true, report: false }
'Meter Tree': { read: true, write: true, report: false }
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

### **Step 2: Login และตรวจสอบ Console**
1. **เปิด Browser** → http://localhost:5173
2. **เปิด Developer Console** (F12)
3. **Login** ด้วย username: `Jakkrit`
4. **ดู Console Logs** ว่ามี permission loading หรือไม่

### **Step 3: ทดสอบการเข้าถึงหน้าต่างๆ**

#### **✅ หน้าที่ควรเข้าได้ (มีสิทธิ์)**

| หน้า | URL | Permission Required | Expected Result |
|------|-----|-------------------|-----------------|
| **Export** | `/export` | Export Data: read ✅ | เข้าได้ |
| **Users** | `/users` | User Management: read ✅ | เข้าได้ |
| **Config** | `/config` | Config: read ✅ | เข้าได้ |
| **Email** | `/config/email` | Email Line: read ✅ | เข้าได้ |
| **Event** | `/event` | Event: read ✅ | เข้าได้ |
| **Holiday** | `/holiday` | Holiday: read ✅ | เข้าได้ |
| **Meter Tree** | `/meter-tree` | Meter Tree: read ✅ | เข้าได้ |

#### **❌ หน้าที่ไม่ควรเข้าได้ (ไม่มีสิทธิ์)**

| หน้า | URL | Permission Required | Expected Result |
|------|-----|-------------------|-----------------|
| **Dashboard** | `/dashboard` | Dashboard: read ❌ | Access Denied |
| **Table Data** | `/table-data` | Table Data: read ❌ | Access Denied |
| **Online Data** | `/online-data` | Online Data: read ❌ | Access Denied |
| **Graph Data** | `/graph-data` | Graph Data: read ❌ | Access Denied |
| **TOU Pages** | `/tou-*` | TOU *: read ❌ | Access Denied |
| **Charge** | `/charge` | Charge: read ❌ | Access Denied |

### **Step 4: ตรวจสอบ Navigation Menu**
1. **ดู Sidebar Menu** ว่าแสดงเฉพาะหน้าที่มีสิทธิ์
2. **ควรเห็น**:
   - ✅ Export Data
   - ✅ Email/Line  
   - ✅ User Management
   - ✅ Meter Tree
   - ✅ Holiday & FT
   - ✅ Event
   - ✅ Config
3. **ไม่ควรเห็น**:
   - ❌ Dashboard
   - ❌ Table Data
   - ❌ Online Data
   - ❌ Graph Data
   - ❌ TOU menus
   - ❌ Charge

### **Step 5: ทดสอบ Error Messages**
เมื่อพยายามเข้าหน้าที่ไม่มีสิทธิ์ ควรเห็น:
```
🚫 Access Denied
You don't have permission to access this page.
Required: read access to [Module Name]
```

## 🔍 **การตรวจสอบ Console Logs**

### **Logs ที่ควรเห็น (ถูกต้อง)**
```javascript
// Permission loading
✅ Permissions loaded from API: {...}
📊 Available modules: [...]

// Navigation permission checks
🔍 Dashboard permission: false
🔍 Table Data permission: false
🔍 Export Data permission: true
🔍 User Management permission: true
🔍 Config permission: true

// Page access
✅ Token validation and permission check passed, loading data...
📝 User Management Permissions: {read: true, write: true, report: false}
```

### **Logs ที่ไม่ควรเห็น (ปัญหา)**
```javascript
// Error messages
❌ No read permission for [Module], redirecting...
❌ Access Denied - Required: read access to [Module]
❌ Permission key mismatch errors
```

## 📊 **Test Cases แบบละเอียด**

### **Test Case 1: Export Page**
```
1. Navigate to: http://localhost:5173/export
2. Expected: หน้า Export โหลดสำเร็จ
3. Check Console: ไม่มี "Access Denied" errors
4. Check UI: แสดงฟอร์ม export ปกติ
```

### **Test Case 2: Users Page**
```
1. Navigate to: http://localhost:5173/users
2. Expected: หน้า Users โหลดสำเร็จ
3. Check Console: แสดง "User Management Permissions: {read: true, write: true}"
4. Check UI: แสดงตาราง users และสามารถแก้ไขได้
```

### **Test Case 3: Dashboard Page (ไม่มีสิทธิ์)**
```
1. Navigate to: http://localhost:5173/dashboard
2. Expected: แสดง "Access Denied" page
3. Check Console: "Required: read access to Dashboard"
4. Check UI: แสดงปุ่ม "Go Back" และ "Go to Home"
```

### **Test Case 4: Navigation Menu**
```
1. Check Sidebar: แสดงเฉพาะเมนูที่มีสิทธิ์
2. Click เมนู Export: ไปหน้า /export สำเร็จ
3. Click เมนู Users: ไปหน้า /users สำเร็จ
4. ไม่มีเมนู Dashboard, Table Data, etc.
```

## 🐛 **การแก้ไขปัญหาที่อาจพบ**

### **ปัญหา 1: ยังแสดง "Access Denied" แม้มีสิทธิ์**
```
สาเหตุ: Browser cache หรือ localStorage เก่า
แก้ไข: 
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Logout และ Login ใหม่
```

### **ปัญหา 2: Navigation ไม่แสดงเมนู**
```
สาเหตุ: Permissions ยังไม่โหลด
แก้ไข:
1. ตรวจสอบ network tab ว่า API permissions ถูกเรียก
2. ตรวจสอบ server logs ว่า permissions ถูกส่งกลับ
3. รีสตาร์ท backend server
```

### **ปัญหา 3: Console แสดง permission errors**
```
สาเหตุ: Module names ยังไม่ตรงกัน
แก้ไข:
1. ตรวจสอบ App.tsx ว่า module names ถูกต้อง
2. ตรวจสอบฐานข้อมูลว่ามี permissions ครบ
3. รัน SQL scripts ที่สร้างไว้
```

## ✅ **เกณฑ์ผ่านการทดสอบ**

### **Must Pass (ต้องผ่าน)**
- ✅ เข้าหน้า Export ได้ (มี Export Data permission)
- ✅ เข้าหน้า Users ได้ (มี User Management permission)
- ✅ ไม่เข้าหน้า Dashboard ได้ (ไม่มี Dashboard permission)
- ✅ Navigation แสดงเฉพาะเมนูที่มีสิทธิ์
- ✅ ไม่มี console errors เกี่ยวกับ permission mismatch

### **Should Pass (ควรผ่าน)**
- ✅ เข้าหน้า Config, Event, Holiday, Meter Tree ได้
- ✅ Error messages แสดงชื่อ module ที่ถูกต้อง
- ✅ Permission checks ทำงานเร็วและไม่มี delay

## 📝 **การรายงานผล**

### **ถ้าทดสอบผ่าน**
```
✅ Permission system แก้ไขสำเร็จ!
- Export page: เข้าได้
- Users page: เข้าได้  
- Dashboard page: ถูกบล็อคถูกต้อง
- Navigation: แสดงเมนูถูกต้อง
- Console: ไม่มี permission errors
```

### **ถ้าทดสอบไม่ผ่าน**
```
❌ ยังมีปัญหา:
- หน้าไหนเข้าไม่ได้ที่ควรเข้าได้
- หน้าไหนเข้าได้ที่ไม่ควรเข้าได้
- Console errors อะไรบ้าง
- Navigation แสดงผิดอย่างไร
```

## 🔧 **SQL Scripts สำหรับแก้ไขเพิ่มเติม**

หากยังมีปัญหา ให้รัน:
1. `check_user_management_permissions.sql` - ตรวจสอบสิทธิ์ปัจจุบัน
2. `grant_user_management_permissions.sql` - ให้สิทธิ์เพิ่มเติม

## 📞 **การติดต่อขอความช่วยเหลือ**

หากทดสอบไม่ผ่าน ให้รายงาน:
1. **ขั้นตอนที่ทำ**: Step ไหนที่มีปัญหา
2. **ผลลัพธ์ที่ได้**: Error message หรือพฤติกรรมที่เห็น
3. **Console logs**: Copy logs ที่เกี่ยวข้อง
4. **Screenshots**: ถ่ายหน้าจอ error page

---
**สร้างเมื่อ**: 01/10/2025 09:00
**สถานะ**: 🧪 พร้อมทดสอบ
