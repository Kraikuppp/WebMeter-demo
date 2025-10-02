# สรุปการแก้ไขปัญหา Permissions และ Menu

## 🎯 **ปัญหาที่พบ:**
- ✅ **Role ทำงานถูกต้องแล้ว**: `userRole: 'Test'`
- ❌ **Menu มีแค่ Home**: ทั้งที่ role Test ควรเข้าถึงได้ทุกเมนู
- ❌ **Permissions ไม่ได้โหลด**: `hasPermission()` return `false` ทุกอัน

## 🔧 **การแก้ไขที่ทำ:**

### **1. แก้ไข Permissions API (server/routes/permissions.js)**
```javascript
// เพิ่ม role_name ใน user query
const userQuery = `
  SELECT 
    u.id, u.username, u.name, u.surname, u.email, u.level, u.line_id, u.role_id,
    r.role_name
  FROM users.users u
  LEFT JOIN users.roles r ON u.role_id = r.id
  WHERE u.id = $1
`;

// ใช้ role_name แทน level
const userRole = user.role_name || user.level || 'Guest';
```

### **2. แก้ไข usePermissions Hook**
```javascript
// เรียก API เพื่อโหลด permissions
if (userUsername && userRole && !isGuest && token) {
  const response = await fetch('http://localhost:3001/api/permissions/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    setPermissions(data.data.permissions);
  }
}
```

## 🚀 **วิธีทดสอบ:**

### **ขั้นตอนที่ 1: Restart Servers**
```bash
# Terminal 1: Start backend
cd d:\WebMeter-Demo\server
node server.js

# Terminal 2: Start frontend  
cd d:\WebMeter-Demo
npm run dev
```

### **ขั้นตอนที่ 2: Login และตรวจสอบ**
1. **Login ด้วย Jakkrit**
2. **เปิด Developer Console (F12)**
3. **ดู debug logs ที่ควรเห็น:**

```
🔍 === PERMISSIONS HOOK DEBUG ===
📝 userRole: "Test"
✅ Using localStorage user data and fetching permissions
✅ Permissions loaded from API: {Dashboard: {read: true, write: true, report: true}, ...}

🧭 Building navigation menu...
🔍 Dashboard permission: true
🔍 Table Data permission: true
🔍 Event permission: true
```

### **ขั้นตอนที่ 3: ตรวจสอบ Menu**
- **ควรเห็นเมนูทั้งหมด**: Dashboard, Table Data, Online Data, Events, etc.
- **ไม่ใช่แค่ Home อย่างเดียว**

## 🔍 **Debug Commands:**
```javascript
// ใน browser console
debugPermissions.checkLocalStorage()  // ตรวจสอบ localStorage
debugPermissions.refreshPermissions() // Force refresh permissions
```

## 🚨 **หากยังมีปัญหา:**

### **1. ตรวจสอบ Database**
```sql
-- ตรวจสอบ role_id ของ user Jakkrit
SELECT u.username, u.role_id, r.role_name 
UPDATE users.users 
SET role_id = (
  SELECT id 
  FROM users.roles 
  WHERE role_name = 'Test'
)
WHERE username = 'Jakkrit';
```

## ขั้นตอนการทดสอบ:

### 1. รัน SQL Script
```bash
psql -h localhost -U postgres -d webmeter -f "fix_jakkrit_role_now.sql"
```

### 2. ทดสอบ Login
1. Logout จากระบบ (ถ้ายัง login อยู่)
2. Login ใหม่ด้วย username: Jakkrit
3. ดู console logs:

**คาดหวังจะเห็น:**
```
AuthToken: stored

Fetching permissions from API with token...
Permissions API response status: 200
Permissions API response data: { data: { permissions: { Dashboard: {...}, Config: {...}, ... } } }
Permissions loaded from API: { Dashboard: {...}, Config: {...}, ... }
Available modules: ['Dashboard', 'Config', ...]
- [x] เพิ่ม debug logging
- [x] เพิ่ม debug tools
- [ ] ทดสอบ login และตรวจสอบ menu
- [ ] ยืนยันว่า permissions ทำงานถูกต้อง

## 🎯 **สรุป:**
ปัญหาหลักคือ permissions ไม่ได้โหลดจาก API เพราะ:
1. API ใช้ `level` แทน `role_name` 
2. usePermissions hook ไม่ได้เรียก API
3. role_id ใน database เป็น null

การแก้ไขครั้งนี้จะทำให้ระบบ permissions ทำงานถูกต้อง และแสดงเมนูตาม role ที่กำหนด
