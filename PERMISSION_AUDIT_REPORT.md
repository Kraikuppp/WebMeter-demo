# Permission Audit Report - WebMeter Pages

## 📊 **สรุปการตรวจสอบ Permissions ในทุกหน้า**

### **✅ หน้าที่แก้ไขแล้ว**

#### **1. Export.tsx** ✅ **FIXED**
- **Status**: แก้ไขเสร็จสิ้น
- **Permissions Used**: `Export Data: { read, write, report }`
- **Write Permission Checks**: 
  - ✅ Export Button
  - ✅ Add Schedule Button  
  - ✅ Toggle Schedule Button
  - ✅ Delete Schedule Button
- **Implementation**: `disabled={!exportPermissions.write}`

#### **2. Users.tsx** ✅ **HAS PERMISSIONS**
- **Status**: มี usePermissions แล้ว
- **Permissions Used**: `User Management: { read, write, report }`
- **Current Implementation**: ใช้สำหรับ page access เท่านั้น
- **Note**: ใช้ AdminRoute protection แทน write permission checks

#### **3. App.tsx** ✅ **ROUTING FIXED**
- **Status**: แก้ไข module names เสร็จสิ้น
- **Implementation**: RBACRoute ตรวจสอบ read permissions
- **All Routes**: ใช้ module names ที่ถูกต้องแล้ว

### **📋 หน้าที่มี usePermissions แต่อาจต้องตรวจสอบ Write Permissions**

#### **4. TableData.tsx** ⚠️ **NEEDS REVIEW**
- **Permissions Used**: `hasPermission` function
- **Potential Issues**: Print/Export buttons อาจต้องตรวจสอบ write permissions
- **Action Needed**: ตรวจสอบปุ่ม export, print, send email/LINE

#### **5. OnlineData.tsx** ⚠️ **NEEDS REVIEW**  
- **Permissions Used**: `permissions, isAdmin`
- **Potential Issues**: Export/Print functionality
- **Action Needed**: ตรวจสอบ PrintModal และ export functions

#### **6. Event.tsx** ⚠️ **NEEDS REVIEW**
- **Permissions Used**: `permissions, isAdmin`
- **Potential Issues**: Export/Print functionality
- **Action Needed**: ตรวจสอบ PrintModal

#### **7. Graph Pages** ⚠️ **NEEDS REVIEW**
- **Pages**: LineGraph.tsx, EnergyGraph.tsx, DemandGraph.tsx, CompareGraph.tsx
- **Permissions Used**: `permissions, isAdmin`
- **Potential Issues**: Export/Print functionality
- **Action Needed**: ตรวจสอบ export และ print functions

#### **8. Charge.tsx** ⚠️ **NEEDS REVIEW**
- **Permissions Used**: `permissions, isAdmin`
- **Potential Issues**: Calculator operations, save functions
- **Action Needed**: ตรวจสอบ calculation และ save functions

### **❌ หน้าที่ไม่มี usePermissions**

#### **9. MeterTree.tsx** ❌ **NO PERMISSIONS**
- **Status**: ไม่มี usePermissions
- **Protection**: ใช้ RBACRoute เท่านั้น
- **Potential Issues**: Create/Edit/Delete operations
- **Action Needed**: เพิ่ม usePermissions และตรวจสอบ write operations

#### **10. Config.tsx** ❓ **UNKNOWN**
- **Status**: ไม่ได้ตรวจสอบ
- **Action Needed**: ตรวจสอบว่ามี usePermissions หรือไม่

#### **11. Email.tsx** ❓ **UNKNOWN**
- **Status**: ไม่ได้ตรวจสอบ
- **Action Needed**: ตรวจสอบว่ามี usePermissions หรือไม่

#### **12. Holiday.tsx** ❓ **UNKNOWN**
- **Status**: ไม่ได้ตรวจสอบ
- **Action Needed**: ตรวจสอบว่ามี usePermissions หรือไม่

## 🎯 **แนวทางการแก้ไข**

### **Priority 1: หน้าที่ต้องแก้ไขทันที**

#### **MeterTree.tsx** 🔥 **HIGH PRIORITY**
```typescript
// เพิ่ม usePermissions
import { usePermissions } from '@/hooks/usePermissions';

export default function MeterTree() {
  const { permissions: userPermissions } = usePermissions();
  const meterTreePermissions = userPermissions?.['Meter Tree'] || { read: false, write: false, report: false };
  
  // ตรวจสอบ write permissions สำหรับ:
  // - Create LogNet buttons
  // - Edit LogNet buttons  
  // - Delete LogNet buttons
  // - Import functions
}
```

#### **TableData.tsx** 🔥 **HIGH PRIORITY**
```typescript
// ตรวจสอบ write permissions สำหรับ:
// - Export buttons
// - Print buttons
// - Send Email/LINE buttons
// - Save/Load functions

// Example:
<Button 
  onClick={handleExport}
  disabled={!hasPermission('Table Data', 'write')}
>
  Export
</Button>
```

### **Priority 2: หน้าที่ควรตรวจสอบ**

#### **Graph Pages** 📊 **MEDIUM PRIORITY**
- LineGraph.tsx, EnergyGraph.tsx, DemandGraph.tsx, CompareGraph.tsx
- ตรวจสอบ export และ print functions
- เพิ่ม write permission checks

#### **OnlineData.tsx** 📊 **MEDIUM PRIORITY**
- ตรวจสอบ PrintModal และ export functions
- เพิ่ม write permission checks

#### **Event.tsx** 📊 **MEDIUM PRIORITY**
- ตรวจสอบ PrintModal
- เพิ่ม write permission checks

### **Priority 3: หน้าที่ต้องตรวจสอบว่ามี usePermissions หรือไม่**

#### **Config.tsx, Email.tsx, Holiday.tsx** ❓ **LOW PRIORITY**
- ตรวจสอบว่ามี usePermissions หรือไม่
- เพิ่ม permission checks ถ้าจำเป็น

## 🔍 **การตรวจสอบแบบ Systematic**

### **Step 1: ตรวจสอบหน้าที่ไม่มี usePermissions**
```bash
# ค้นหาหน้าที่ไม่มี usePermissions
grep -L "usePermissions" src/pages/*.tsx
```

### **Step 2: ตรวจสอบปุ่มที่ต้องการ write permissions**
```bash
# ค้นหาปุ่มที่อาจต้องการ write permissions
grep -n "onClick.*handle.*\(Create\|Update\|Delete\|Save\|Export\|Send\)" src/pages/*.tsx
```

### **Step 3: ตรวจสอบ disabled attributes**
```bash
# ค้นหาปุ่มที่มี disabled แล้ว
grep -n "disabled=" src/pages/*.tsx
```

## 📋 **Template สำหรับการแก้ไข**

### **เพิ่ม usePermissions**
```typescript
import { usePermissions } from '@/hooks/usePermissions';

export default function YourPage() {
  const { permissions: userPermissions } = usePermissions();
  const pagePermissions = userPermissions?.['Module Name'] || { read: false, write: false, report: false };
  
  console.log('📝 Module Name Permissions:', pagePermissions);
  // ...
}
```

### **เพิ่ม Write Permission Checks**
```typescript
// สำหรับปุ่มที่ต้องการ write permission
<Button
  onClick={handleAction}
  disabled={!pagePermissions.write}
  title={!pagePermissions.write ? "You don't have write permission for Module Name" : ""}
>
  Action Button
</Button>

// สำหรับปุ่มที่ต้องการ report permission  
<Button
  onClick={handleExport}
  disabled={!pagePermissions.report}
  title={!pagePermissions.report ? "You don't have report permission for Module Name" : ""}
>
  Export Button
</Button>
```

## 🧪 **การทดสอบ**

### **Test Cases สำหรับแต่ละหน้า**
1. **User มี read only** → ปุ่ม write operations ควร disabled
2. **User มี read + write** → ปุ่ม write operations ควรใช้งานได้
3. **User มี read + report** → ปุ่ม export ควรใช้งานได้
4. **User ไม่มีสิทธิ์** → ไม่ควรเข้าหน้าได้

### **การทดสอบแบบ Manual**
```
1. เปลี่ยน user permissions ในฐานข้อมูล
2. Logout และ Login ใหม่
3. ทดสอบแต่ละหน้าว่าปุ่มต่างๆ disabled ถูกต้องหรือไม่
4. ตรวจสอบ console logs
5. ตรวจสอบ tooltip messages
```

## 📊 **Progress Tracking**

### **Completed** ✅
- [x] Export.tsx - Write permission checks added
- [x] Users.tsx - Has usePermissions (AdminRoute protected)
- [x] App.tsx - Module names fixed

### **In Progress** 🔄
- [ ] MeterTree.tsx - Add usePermissions and write checks
- [ ] TableData.tsx - Add write permission checks
- [ ] Graph pages - Add write permission checks

### **To Do** ⏳
- [ ] OnlineData.tsx - Review and add checks
- [ ] Event.tsx - Review and add checks
- [ ] Config.tsx - Check if has usePermissions
- [ ] Email.tsx - Check if has usePermissions
- [ ] Holiday.tsx - Check if has usePermissions

---
**สร้างเมื่อ**: 01/10/2025 09:13  
**สถานะ**: 📋 Audit Complete - Action Items Identified
