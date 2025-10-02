# LINE Login Debug Guide

## ปัญหาที่พบ
หลังจากเพิ่มระบบการจำกัดสิทธิ์ Guest, LINE Login ไม่สามารถเข้าสู่ระบบได้

## การแก้ไขที่ทำ

### 1. **แก้ไข AuthCallback.tsx** ✅
- เพิ่มการรับ `username` และ `level` จาก URL parameters
- เพิ่ม debug logging
- ตั้งค่า `isGuest` ตาม level ที่ได้รับ
- แสดง loading screen ขณะประมวลผล

### 2. **แก้ไข Server LINE Callback** ✅
- ส่ง `username` และ `level` ใน callback URL
- เพิ่ม debug logging
- ใช้ `user.level || 'Guest'` เป็น default

### 3. **ปรับปรุง ProtectedRoute** ✅
- ตรวจสอบทั้ง `userUsername` และ `auth_token`
- เพิ่ม debug logging
- รองรับ LINE users ที่มี token แต่ไม่มี username

### 4. **เพิ่ม Debug ใน Navigation** ✅
- แสดงข้อมูล user, level, guest status
- ช่วยในการ debug ปัญหา

## วิธีทดสอบ

### **Test Case 1: LINE Login**
```
1. เข้า /login
2. กดปุ่ม "Login with LINE"
3. ทำการ authorize ใน LINE
4. ตรวจสอบ Console logs:
   🔗 AuthCallback received: { token: true, username: "...", level: "Guest" }
   ✅ LINE login successful: { username: "...", isGuest: true }
   🧭 Navigation Debug: { username: "...", isGuest: true, ... }
5. ควรเข้า /home ได้และเห็นเมนูที่ถูกต้อง
```

### **Test Case 2: LINE User vs Guest**
```
LINE User ที่มี level = 'Guest':
- ✅ เข้าระบบได้
- ✅ เห็นเมนูพื้นฐาน: Home, Dashboard, Table Data, Graph Data
- ❌ ไม่เห็นเมนู: Event, TOU, Config, Online Data

LINE User ที่มี level = 'User' หรือ 'Admin':
- ✅ เข้าระบบได้
- ✅ เห็นเมนูทั้งหมด
```

## Debug Console Logs

### **สำหรับ LINE Login สำเร็จ:**
```
🔗 AuthCallback received: { 
  token: true, 
  username: "John Doe", 
  level: "Guest", 
  error: null 
}
✅ LINE login successful: { 
  username: "John Doe", 
  isGuest: true 
}
🧭 Navigation Debug: { 
  username: "John Doe", 
  levelFromToken: "Guest", 
  isGuest: true, 
  userLevel: "read only", 
  hasToken: true 
}
🔒 Guest user detected - showing limited menu items
```

### **สำหรับ LINE Login ล้มเหลว:**
```
❌ LINE login failed: "error message"
🔍 Authentication Check: { 
  hasValidUsername: false, 
  hasValidToken: false, 
  isGuest: false 
}
```

## การตรวจสอบ LocalStorage

หลัง LINE Login สำเร็จ ควรมี:
```javascript
localStorage.getItem('auth_token')     // JWT token
localStorage.getItem('userUsername')   // "John Doe"
localStorage.getItem('isGuest')        // "true" หรือ "false"
```

## Server-side Debug

### **ใน server/routes/auth.js:**
```
🔗 LINE Login Success - Redirecting with: {
  username: "John Doe",
  level: "Guest", 
  hasToken: true
}
```

## การแก้ไขปัญหาเพิ่มเติม

### **หาก LINE Login ยังไม่ทำงาน:**

1. **ตรวจสอบ Environment Variables:**
   ```bash
   LINE_CHANNEL_ID=2008116224
   LINE_CHANNEL_SECRET=59ba9ab9777ac92bc8c0156a48557aaa
   LINE_REDIRECT_URI=http://localhost:3001/api/auth/line/callback
   ```

2. **ตรวจสอบ Database:**
   ```sql
   SELECT * FROM users.users WHERE line_id IS NOT NULL;
   ```

3. **ตรวจสอบ JWT Token:**
   - ใช้ jwt.io เพื่อ decode token
   - ตรวจสอบว่ามี `level` field หรือไม่

4. **ตรวจสอบ Network:**
   - เปิด Developer Tools > Network
   - ดู requests ไป `/api/auth/line/callback`

## สรุป

การแก้ไขหลัก:
- ✅ Server ส่ง username & level ใน callback URL
- ✅ Frontend รับและประมวลผลข้อมูลถูกต้อง
- ✅ ProtectedRoute รองรับ LINE users
- ✅ Navigation แสดงเมนูตาม Guest status

หาก LINE Login ยังไม่ทำงาน ให้ตรวจสอบ Console logs และ Network requests เพื่อหาสาเหตุ
