# Guest Permissions System Setup

## การเปลี่ยนแปลงที่ทำ:

### 1. **Backend Permissions (server/routes/permissions.js)** ✅
```javascript
// อัปเดต guest permissions ให้เข้าถึงหน้าที่กำหนด
case 'guest':
default:
  const guestAllowedModules = [
    'Dashboard', 'Table Data', 'Graph Data', 'Line Graph', 
    'Demand Graph', 'Energy Graph', 'Compare Graph'
  ];
  
  allModules.forEach(module => {
    if (guestAllowedModules.includes(module)) {
      permissions[module] = { read: true, write: false, report: false };
    } else {
      permissions[module] = { read: false, write: false, report: false };
    }
  });
```

### 2. **Frontend Permissions (src/hooks/usePermissions.tsx)** ✅
```typescript
// อัปเดต guest permissions ใน frontend
const guestPermissions = {
  'Dashboard': { read: true, write: false, report: false },
  'Table Data': { read: true, write: false, report: false },
  'Graph Data': { read: true, write: false, report: false },
  'Line Graph': { read: true, write: false, report: false },
  'Demand Graph': { read: true, write: false, report: false },
  'Energy Graph': { read: true, write: false, report: false },
  'Compare Graph': { read: true, write: false, report: false }
};
```

### 3. **Print Modal Restrictions** ✅
อัปเดตหน้าต่างๆ ให้ใช้ `hasPermission('Module Name', 'report')` แทน `isAdmin`:

#### **CompareGraph.tsx**:
```typescript
{/* Print Button - Only show for users with report permission */}
{hasPermission('Compare Graph', 'report') && (
  <Button onClick={() => setShowExportModal(true)}>
    <Printer className="w-4 h-4 mr-0" />
  </Button>
)}
```

#### **LineGraph.tsx**:
```typescript
{/* Print Button - Only show for users with report permission */}
{hasPermission('Line Graph', 'report') && (
  <Button onClick={() => setShowExportModal(true)}>
    <Printer className="w-4 h-4 mr-0" />
  </Button>
)}
```

#### **DemandGraph.tsx**:
```typescript
{/* Print Button - Only show for users with report permission */}
{hasPermission('Demand Graph', 'report') && (
  <Button onClick={() => setShowExportModal(true)}>
    <Printer className="w-4 h-4 mr-0" />
  </Button>
)}
```

#### **EnergyGraph.tsx**:
```typescript
{/* Print Button - Only show for users with report permission */}
{hasPermission('Energy Graph', 'report') && (
  <Button onClick={() => setShowExportModal(true)}>
    <Printer className="w-4 h-4 mr-0" />
  </Button>
)}
```

#### **TableData.tsx**: ✅ (มีการตรวจสอบ permissions อยู่แล้ว)
```typescript
{hasPermission('Table Data', 'report') && (
  <Button onClick={() => setShowExportModal(true)}>
    <Printer className="w-4 h-4 mr-0" />
  </Button>
)}
```

## Guest Permissions Summary:

### **หน้าที่ Guest เข้าถึงได้** ✅
- **Dashboard** - อ่านอย่างเดียว
- **Table Data** - อ่านอย่างเดียว (ไม่มีปุ่ม Print)
- **Graph Data** - อ่านอย่างเดียว
- **Line Graph** - อ่านอย่างเดียว (ไม่มีปุ่ม Print)
- **Demand Graph** - อ่านอย่างเดียว (ไม่มีปุ่ม Print)
- **Energy Graph** - อ่านอย่างเดียว (ไม่มีปุ่ม Print)
- **Compare Graph** - อ่านอย่างเดียว (ไม่มีปุ่ม Print)

### **หน้าที่ Guest เข้าถึงไม่ได้** ❌
- Online Data
- TOU (ทุกหน้า)
- Charge
- Event
- Config
- Export Data
- Email Line
- User Management
- Meter Tree
- Holiday

### **ข้อจำกัดสำหรับ Guest** 🚫
- **ไม่สามารถ Write**: ไม่สามารถแก้ไขข้อมูลใดๆ
- **ไม่สามารถ Report**: ไม่มีปุ่ม Print/Export ในทุกหน้า
- **View Only**: สามารถดูข้อมูลและกราฟได้เท่านั้น

## การทดสอบระบบ:

### **1. ทดสอบ Guest Login** 🔐
```bash
# รันไฟล์ทดสอบ
node test-guest-permissions.js
```

### **2. ทดสอบผ่าน UI** 🎨
1. **เข้าหน้า Login** → กดปุ่ม "Guest Login"
2. **ตรวจสอบเมนู** → ควรเห็นเฉพาะหน้าที่อนุญาต
3. **เข้าหน้าต่างๆ** → ตรวจสอบว่าไม่มีปุ่ม Print
4. **ลองเข้าหน้าที่ห้าม** → ควรเห็น "Access Denied"

### **3. ทดสอบ Permissions API** 📡
```bash
# ทดสอบ API permissions
curl -X GET "http://localhost:3001/api/permissions/me" \
  -H "Authorization: Bearer <guest_token>"
```

## การใช้งาน Guest Login:

### **สำหรับผู้ใช้ทั่วไป** 👥
1. เข้าหน้า Login
2. กดปุ่ม "Guest Login" (ไอคอนคน)
3. ระบบจะพาไปหน้า Dashboard
4. สามารถดูข้อมูลและกราฟได้
5. ไม่สามารถ Export หรือ Print ได้

### **สำหรับ Demo/Presentation** 🎯
- ใช้สำหรับแสดงระบบโดยไม่ต้อง login
- แสดงข้อมูลและกราฟได้ครบถ้วน
- ปลอดภัย - ไม่สามารถแก้ไขหรือ export ข้อมูล

## ไฟล์ที่แก้ไข:

### **Backend** 🔧
- `server/routes/permissions.js` - อัปเดต guest permissions

### **Frontend** 🎨
- `src/hooks/usePermissions.tsx` - อัปเดต guest permissions
- `src/pages/CompareGraph.tsx` - เปลี่ยนจาก isAdmin เป็น hasPermission
- `src/pages/LineGraph.tsx` - เปลี่ยนจาก isAdmin เป็น hasPermission
- `src/pages/DemandGraph.tsx` - เปลี่ยนจาก isAdmin เป็น hasPermission
- `src/pages/EnergyGraph.tsx` - เปลี่ยนจาก isAdmin เป็น hasPermission

### **Testing** 🧪
- `test-guest-permissions.js` - ไฟล์ทดสอบระบบ
- `GUEST_PERMISSIONS_SETUP.md` - เอกสารนี้

## การตรวจสอบ:

### **✅ สิ่งที่ควรเห็น (Guest Login)**
- เมนูมีเฉพาะ: Dashboard, Table Data, Graph Data, Line Graph, Demand Graph, Energy Graph, Compare Graph
- ไม่มีปุ่ม Print ในทุกหน้า
- สามารถดูข้อมูลและกราฟได้ปกติ
- Navigation แสดง "Guest" เป็น role

### **❌ สิ่งที่ไม่ควรเห็น (Guest Login)**
- เมนู: Online Data, TOU, Charge, Event, Config, Export, Email, User Management, Meter Tree, Holiday
- ปุ่ม Print/Export ในทุกหน้า
- ปุ่มแก้ไขหรือบันทึกข้อมูล

## สรุป:
✅ **Guest Login พร้อมใช้งาน**
✅ **เข้าถึงได้เฉพาะหน้าที่กำหนด**
✅ **ไม่สามารถใช้ Print Modal ได้**
✅ **ระบบปลอดภัย - View Only**

ระบบ Guest Permissions ทำงานสมบูรณ์แล้ว! 🎯
