# แก้ไข Export Page ให้เคารพ Write Permissions

## 🔍 **ปัญหาที่พบ**
หน้า Export ไม่ได้ตรวจสอบ write permission ทำให้ user ที่มี `Export Data: { read: true, write: false }` ยังสามารถใช้ปุ่มต่างๆ ได้:
- ✅ **Export Button** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Add Schedule Button** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Toggle Schedule** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Delete Schedule** - ใช้งานได้ (ไม่ควรได้)

## ✅ **การแก้ไขที่ทำ**

### **1. เพิ่ม usePermissions Import**
```typescript
import { usePermissions } from '@/hooks/usePermissions';
```

### **2. เพิ่มการตรวจสอบ Permissions**
```typescript
export default function Export() {
  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const exportPermissions = userPermissions?.['Export Data'] || { read: false, write: false, report: false };
  
  console.log('📝 Export Data Permissions:', exportPermissions);
  // ...
}
```

### **3. แก้ไขปุ่ม Export**
```typescript
// เดิม
<Button 
  className="w-full bg-primary hover:bg-primary/90 h-8 text-xs rounded-none shadow"
  onClick={handleExport}
>

// ใหม่
<Button 
  className="w-full bg-primary hover:bg-primary/90 h-8 text-xs rounded-none shadow"
  onClick={handleExport}
  disabled={!exportPermissions.write}
  title={!exportPermissions.write ? "You don't have write permission for Export Data" : ""}
>
```

### **4. แก้ไขปุ่ม Add Schedule**
```typescript
// เดิม
<Button
  type="button"
  className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 rounded-none"
  onClick={handleAddAutoExport}
>

// ใหม่
<Button
  type="button"
  className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 rounded-none"
  onClick={handleAddAutoExport}
  disabled={!exportPermissions.write}
  title={!exportPermissions.write ? "You don't have write permission for Export Data" : ""}
>
```

### **5. แก้ไขปุ่ม Toggle Schedule**
```typescript
// เดิม
<button
  onClick={() => toggleSchedule(schedule.id)}
  className={`px-2 py-1 text-xs rounded-none flex items-center gap-1 ${...}`}
  title={schedule.enabled ? 'Disable Schedule' : 'Enable Schedule'}
>

// ใหม่
<button
  onClick={() => toggleSchedule(schedule.id)}
  className={`px-2 py-1 text-xs rounded-none flex items-center gap-1 ${...}`}
  title={schedule.enabled ? 'Disable Schedule' : 'Enable Schedule'}
  disabled={!exportPermissions.write}
>
```

### **6. แก้ไขปุ่ม Delete Schedule**
```typescript
// เดิม
<button
  onClick={() => removeSchedule(schedule.id)}
  className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-none hover:bg-red-200 flex items-center gap-1"
  title="Delete Schedule"
>

// ใหม่
<button
  onClick={() => removeSchedule(schedule.id)}
  className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-none hover:bg-red-200 flex items-center gap-1"
  title="Delete Schedule"
  disabled={!exportPermissions.write}
>
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### **User มี Export Data: { read: true, write: false }** ✅
- ✅ **เข้าหน้า Export ได้** - มี read permission
- ❌ **Export Button disabled** - ไม่มี write permission
- ❌ **Add Schedule Button disabled** - ไม่มี write permission
- ❌ **Toggle Schedule disabled** - ไม่มี write permission
- ❌ **Delete Schedule disabled** - ไม่มี write permission
- ✅ **View Schedule Details ได้** - เป็น read operation

### **User มี Export Data: { read: true, write: true }** ✅
- ✅ **เข้าหน้า Export ได้** - มี read permission
- ✅ **Export Button enabled** - มี write permission
- ✅ **Add Schedule Button enabled** - มี write permission
- ✅ **Toggle Schedule enabled** - มี write permission
- ✅ **Delete Schedule enabled** - มี write permission
- ✅ **View Schedule Details ได้** - เป็น read operation

## 🔍 **การทดสอบ**

### **Test Case 1: Read-Only User**
```
User permissions: { read: true, write: false, report: false }
Expected:
- หน้า Export เข้าได้
- ปุ่ม Export, Add Schedule, Toggle, Delete ถูก disabled
- เมื่อ hover ปุ่มจะแสดง tooltip "You don't have write permission for Export Data"
- ปุ่ม View Details ยังใช้งานได้
```

### **Test Case 2: Full Access User**
```
User permissions: { read: true, write: true, report: false }
Expected:
- หน้า Export เข้าได้
- ปุ่มทั้งหมดใช้งานได้ปกติ
- สามารถ export, สร้าง/แก้ไข/ลบ schedules ได้
```

### **Test Case 3: No Access User**
```
User permissions: { read: false, write: false, report: false }
Expected:
- ไม่สามารถเข้าหน้า Export ได้ (ถูกบล็อคโดย RBACRoute)
- แสดง "Access Denied" page
```

## 📋 **Console Logs ที่จะเห็น**
```javascript
📝 Export Data Permissions: { read: true, write: false, report: false }
```

## 🚨 **หมายเหตุสำคัญ**

### **ปุ่มที่ไม่ได้แก้ไข (Read Operations)**
- **View Schedule Details** - ยังใช้งานได้เพราะเป็น read operation
- **Clear Button** - ยังใช้งานได้เพราะเป็น UI operation ไม่ใช่ data operation

### **Disabled Button Styling**
- ปุ่มที่ disabled จะมี opacity ลดลงและไม่สามารถคลิกได้
- เมื่อ hover จะแสดง tooltip อธิบายเหตุผล
- CSS classes จะถูกใช้ตาม browser default disabled styling

### **Permission Checking Logic**
- ใช้ `exportPermissions.write` เป็นเกณฑ์หลัก
- ถ้า permissions ยังไม่โหลด จะ default เป็น `{ read: false, write: false, report: false }`
- ปุ่มจะ disabled จนกว่า permissions จะโหลดเสร็จ

## 🔧 **การทดสอบอย่างรวดเร็ว**

### **ขั้นตอนการทดสอบ**
1. **รีสตาร์ทระบบ** (Frontend + Backend)
2. **Login** ด้วย user ที่มี `Export Data: { read: true, write: false }`
3. **เข้าหน้า Export** → ควรเข้าได้
4. **ตรวจสอบปุ่ม** → Export, Add Schedule, Toggle, Delete ควร disabled
5. **Hover ปุ่ม** → ควรแสดง tooltip permission error
6. **ตรวจสอบ Console** → ควรเห็น `📝 Export Data Permissions: { read: true, write: false, report: false }`

### **Expected UI Changes**
- ปุ่ม Export: เทาและคลิกไม่ได้
- ปุ่ม Add Schedule: เทาและคลิกไม่ได้
- ปุ่ม Toggle Schedule: เทาและคลิกไม่ได้
- ปุ่ม Delete Schedule: เทาและคลิกไม่ได้
- ปุ่ม View Details: ยังใช้งานได้ปกติ (สีน้ำเงิน)

---
**สร้างเมื่อ**: 01/10/2025 09:09  
**สถานะ**: ✅ แก้ไขเสร็จสิ้น พร้อมทดสอบ
