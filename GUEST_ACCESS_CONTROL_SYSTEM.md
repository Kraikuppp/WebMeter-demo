# Guest Access Control System

## Overview
ระบบการจำกัดสิทธิ์สำหรับ Guest users ใน WebMeter Application ที่จำกัดการเข้าถึงฟีเจอร์บางอย่างสำหรับผู้ใช้ Guest

## Features Implemented

### 1. **ProtectedRoute Component** 🛡️
- **Location**: `src/components/auth/ProtectedRoute.tsx`
- **Purpose**: จำกัดการเข้าถึงหน้าต่างๆ ตามสิทธิ์ผู้ใช้
- **Components**:
  - `ProtectedRoute`: Base component สำหรับการตรวจสอบสิทธิ์
  - `GuestRestrictedRoute`: จำกัด Guest users
  - `AuthRequiredRoute`: ต้องการการ login (รวม Guest)

### 2. **Navigation Menu Control** 🧭
- **Location**: `src/components/ui/navigation.tsx`
- **Changes**:
  - ปรับ `getNavItems()` ให้รับ parameter `isGuest`
  - แยกเมนูเป็น 2 กลุ่ม: `allItems` และ `restrictedItems`
  - ซ่อนเมนูที่จำกัดสำหรับ Guest users

### 3. **Route Protection** 🚦
- **Location**: `src/App.tsx`
- **Implementation**:
  - Wrap routes ด้วย `AuthRequiredRoute` หรือ `GuestRestrictedRoute`
  - จัดกลุ่ม routes ตามระดับการเข้าถึง

### 4. **Feature-level Protection** 🛡️
- **Location**: `src/components/auth/GuestRestrictedFeature.tsx`
- **Components**:
  - `GuestRestrictedFeature`: ซ่อนหรือแสดง fallback สำหรับฟีเจอร์
  - `GuestRestrictedButton`: ปุ่มที่ถูก disable สำหรับ Guest
  - `useGuestStatus`: Hook สำหรับตรวจสอบสถานะ Guest

### 5. **Print Modal Protection** 🖨️
- **Location**: `src/components/ui/print-modal.tsx`
- **Implementation**:
  - ตรวจสอบสถานะ Guest ก่อนแสดง modal
  - แสดงหน้า "Print Feature Restricted" สำหรับ Guest
  - บล็อกการ export ทุกรูปแบบ (PDF, CSV, Image, Text)
  - บล็อกการส่ง Email และ LINE

## Access Levels

### 👤 **Guest User Access**
**✅ Allowed Pages:**
- Home (`/home`)
- Dashboard (`/dashboard`)
- Table Data (`/table-data`)
- Graph Data (`/graph-data/*`)

**❌ Restricted Pages:**
- Online Data (`/online-data`)
- Event (`/event`) 🆕
- TOU pages (`/tou-*`)
- Config pages (`/config/*`)
- User Management (`/users`)
- Export (`/export`)
- Email/Line (`/config/email`)
- Meter Tree (`/meter-tree`)
- Holiday & FT (`/holiday`)

**❌ Restricted Features:**
- Print Modal (PDF/CSV/Image/Text export) 🆕
- Email sending 🆕
- LINE message sending 🆕

### 👨‍💼 **Regular User Access**
**✅ Full Access:**
- ทุกหน้าที่ Guest เข้าได้
- บวกกับหน้าที่ถูกจำกัดทั้งหมด

## How It Works

### 1. **User Detection**
```typescript
const isGuestUser = (): boolean => {
  const token = localStorage.getItem('auth_token');
  let levelFromToken = '';
  
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      if (payload?.level) levelFromToken = payload.level;
    }
  } catch {}
  
  return (levelFromToken || '').toLowerCase() === 'guest' || 
         localStorage.getItem('isGuest') === 'true';
};
```

### 2. **Route Protection**
```typescript
// Guest ไม่สามารถเข้าถึง
<Route path="/online-data" element={
  <GuestRestrictedRoute>
    <OnlineData />
  </GuestRestrictedRoute>
} />

// Guest สามารถเข้าถึงได้
<Route path="/table-data" element={
  <AuthRequiredRoute>
    <TableData />
  </AuthRequiredRoute>
} />
```

### 3. **Navigation Menu**
```typescript
// ใน navigation.tsx
const navItems = getNavItems(language, isGuest);

function getNavItems(language: 'TH' | 'EN', isGuest: boolean = false) {
  // Basic items for all users
  const allItems = [...];
  
  // Restricted items for non-guest users only
  const restrictedItems = [...];
  
  if (isGuest) {
    return allItems; // Guest เห็นเฉพาะเมนูพื้นฐาน
  }
  
  return [...allItems, ...restrictedItems]; // User ปกติเห็นทั้งหมด
}
```

## Access Denied Page 🚫

เมื่อ Guest พยายามเข้าถึงหน้าที่ถูกจำกัด จะเห็น:

- **Lock Icon** และข้อความ "Access Denied"
- **Reason**: อธิบายว่าทำไมไม่สามารถเข้าถึงได้
- **Guest Account Limitations**: แจ้งข้อจำกัดของบัญชี Guest
- **Actions**:
  - "Go Back to Home" - กลับไปหน้าแรก
  - "Login with Full Account" - ไปหน้า Login

## Testing Guide 🧪

### **Test Scenario 1: Guest Login**
1. เข้า `/login`
2. กดปุ่ม "Guest Login"
3. ตรวจสอบว่า:
   - เข้า `/home` ได้
   - เมนู navigation แสดงเฉพาะ: Home, Dashboard, Table Data, Graph Data, Event
   - ไม่เห็นเมนู: Online Data, TOU, Config

### **Test Scenario 2: Access Restriction**
1. Login เป็น Guest
2. พยายามเข้า `/online-data` โดยตรงใน URL
3. ควรเห็นหน้า "Access Denied"
4. กดปุ่ม "Go Back to Home" ควรกลับไป `/home`

### **Test Scenario 3: Regular User**
1. Login ด้วย username/password ปกติ
2. ตรวจสอบว่า:
   - เห็นเมนูทั้งหมด
   - เข้าทุกหน้าได้
   - ไม่มีข้อจำกัดใดๆ

## Debug Information 🔍

### **Console Logs**
```
🔒 Guest user detected - showing limited menu items
👤 Guest user detected (no real username found)
```

### **LocalStorage Keys**
- `isGuest`: `'true'` | `'false'`
- `userUsername`: username หรือ `'guest'`
- `auth_token`: JWT token (อาจมี level field)

## Security Notes 🔐

### **Frontend Protection Only**
- ระบบนี้เป็นการป้องกันระดับ Frontend เท่านั้น
- Backend APIs ควรมีการตรวจสอบสิทธิ์เพิ่มเติม
- ไม่ควรพึ่งพา Frontend validation อย่างเดียว

### **Token Validation**
- ตรวจสอบ JWT token ใน localStorage
- ตรวจสอบ `level` field ใน token payload
- Fallback ไปที่ `isGuest` flag ใน localStorage

## Future Enhancements 🚀

### **Possible Improvements**
1. **Role-based Access Control**: เพิ่มระดับสิทธิ์มากกว่า Guest/User
2. **API-level Protection**: เพิ่มการตรวจสอบสิทธิ์ใน Backend
3. **Feature-level Restrictions**: จำกัดฟีเจอร์เฉพาะส่วนแทนทั้งหน้า
4. **Session Management**: ปรับปรุงการจัดการ session และ token

## Files Modified 📁

1. **NEW**: `src/components/auth/ProtectedRoute.tsx`
2. **NEW**: `src/components/auth/GuestRestrictedFeature.tsx` 🆕
3. **MODIFIED**: `src/components/ui/navigation.tsx`
4. **MODIFIED**: `src/components/ui/print-modal.tsx` 🆕
5. **MODIFIED**: `src/App.tsx`
6. **NEW**: `GUEST_ACCESS_CONTROL_SYSTEM.md`

## Summary ✅

ระบบการจำกัดสิทธิ์ Guest ได้ถูกสร้างขึ้นเรียบร้อยแล้ว โดย:

- ✅ **Guest users** จะเห็นเฉพาะเมนูพื้นฐาน
- ✅ **ไม่สามารถเข้าถึง** Event, TOU, Config, OnlineData 🆕
- ✅ **ไม่สามารถใช้ Print Modal** - บล็อกการ export และส่ง email/LINE 🆕
- ✅ **แสดงหน้า Access Denied** เมื่อพยายามเข้าถึงหน้าที่ถูกจำกัด
- ✅ **แสดง Print Feature Restricted** เมื่อพยายามใช้ Print Modal 🆕
- ✅ **Regular users** ยังคงเข้าถึงได้ทุกอย่างเหมือนเดิม

### 🆕 **New Restrictions Added:**
- **Event page**: Guest ไม่สามารถดูเหตุการณ์ได้
- **Print Modal**: Guest ไม่สามารถ export หรือส่ง report ได้
- **Feature-level Protection**: สามารถจำกัดฟีเจอร์เฉพาะส่วนได้

ระบบพร้อมใช้งานและสามารถทดสอบได้ทันที! 🎯
