# แก้ไข MeterTree Page ให้เคารพ Write Permissions

## 🔍 **ปัญหาที่พบ**
หน้า MeterTree ไม่มี `usePermissions` เลย ทำให้ไม่ได้ตรวจสอบ write permissions สำหรับการดำเนินการต่างๆ:
- ✅ **Import System Tree** - ใช้งานได้ (ไม่ควรได้ถ้าไม่มี write permission)
- ✅ **Import Building Tree** - ใช้งานได้ (ไม่ควรได้ถ้าไม่มี write permission)
- ❓ **อาจมีปุ่มอื่นๆ** - ที่ต้องการ write permissions

## ✅ **การแก้ไขที่ทำ**

### **1. เพิ่ม usePermissions Import**
```typescript
import { usePermissions } from '@/hooks/usePermissions';
```

### **2. เพิ่มการตรวจสอบ Permissions**
```typescript
export default function MeterTree() {
  const { toast } = useToast();
  
  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const meterTreePermissions = userPermissions?.['Meter Tree'] || { read: false, write: false, report: false };
  
  console.log('📝 Meter Tree Permissions:', meterTreePermissions);
  // ...
}
```

### **3. แก้ไขปุ่ม Import System Tree**
```typescript
// เดิม
<button
  onClick={() => handleConfirmImport('system')}
  className="w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
>

// ใหม่
<button
  onClick={() => handleConfirmImport('system')}
  className="w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
  disabled={!meterTreePermissions.write}
  title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : ""}
>
```

### **4. แก้ไขปุ่ม Import Building Tree**
```typescript
// เดิม
<button
  onClick={() => handleConfirmImport('building')}
  className="w-full p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-left"
>

// ใหม่
<button
  onClick={() => handleConfirmImport('building')}
  className="w-full p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-left"
  disabled={!meterTreePermissions.write}
  title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : ""}
>
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### **User มี Meter Tree: { read: true, write: false }** ✅
- ✅ **เข้าหน้า MeterTree ได้** - มี read permission
- ✅ **ดู Tree Structure ได้** - เป็น read operation
- ❌ **Import System Tree disabled** - ไม่มี write permission
- ❌ **Import Building Tree disabled** - ไม่มี write permission
- ✅ **เมื่อ hover ปุ่มจะแสดง tooltip** - "You don't have write permission for Meter Tree"

### **User มี Meter Tree: { read: true, write: true }** ✅
- ✅ **เข้าหน้า MeterTree ได้** - มี read permission
- ✅ **ดู Tree Structure ได้** - เป็น read operation
- ✅ **Import System Tree enabled** - มี write permission
- ✅ **Import Building Tree enabled** - มี write permission
- ✅ **สามารถ import และแก้ไข tree ได้**

## 🔍 **การทดสอบ**

### **Test Case 1: Read-Only User**
```
User permissions: { read: true, write: false, report: false }
Expected:
- หน้า MeterTree เข้าได้
- ดู tree structure ได้
- ปุ่ม Import System Tree disabled (เทา, คลิกไม่ได้)
- ปุ่ม Import Building Tree disabled (เทา, คลิกไม่ได้)
- เมื่อ hover ปุ่มจะแสดง tooltip permission error
```

### **Test Case 2: Full Access User**
```
User permissions: { read: true, write: true, report: false }
Expected:
- หน้า MeterTree เข้าได้
- ดู tree structure ได้
- ปุ่ม Import System Tree enabled (สีปกติ, คลิกได้)
- ปุ่ม Import Building Tree enabled (สีปกติ, คลิกได้)
- สามารถ import และแก้ไข tree ได้
```

### **Test Case 3: No Access User**
```
User permissions: { read: false, write: false, report: false }
Expected:
- ไม่สามารถเข้าหน้า MeterTree ได้ (ถูกบล็อคโดย RBACRoute)
- แสดง "Access Denied" page
```

## 📋 **Console Logs ที่จะเห็น**
```javascript
📝 Meter Tree Permissions: { read: true, write: false, report: false }
```

## ⚠️ **ปุ่มอื่นๆ ที่อาจต้องตรวจสอบเพิ่มเติม**

### **ปุ่มที่อาจมีแต่ยังไม่ได้แก้ไข**
- **Create LogNet** - ถ้ามี
- **Edit LogNet** - ถ้ามี
- **Delete LogNet** - ถ้ามี
- **Save Configuration** - ถ้ามี
- **Export Tree** - อาจต้องการ report permission

### **การตรวจสอบเพิ่มเติม**
```bash
# ค้นหาปุ่มอื่นๆ ที่อาจต้องการ write permissions
grep -n "onClick.*handle.*\(Create\|Add\|Edit\|Delete\|Save\)" src/pages/MeterTree.tsx
```

## 🚨 **หมายเหตุสำคัญ**

### **Import Operations**
- Import เป็น write operation เพราะจะเปลี่ยนแปลงโครงสร้าง tree
- ต้องการ write permission เพื่อป้องกันการเปลี่ยนแปลงโดยไม่ได้รับอนุญาต

### **Read Operations ที่ยังใช้งานได้**
- **View Tree Structure** - ดู tree ได้ปกติ
- **Browse Nodes** - เลือกและดู nodes ได้
- **View Details** - ดูรายละเอียดของ nodes ได้

### **Disabled Button Styling**
- ปุ่มที่ disabled จะมี opacity ลดลงและไม่สามารถคลิกได้
- เมื่อ hover จะแสดง tooltip อธิบายเหตุผล
- CSS classes จะถูกใช้ตาม browser default disabled styling

## 🔧 **การทดสอบอย่างรวดเร็ว**

### **ขั้นตอนการทดสอบ**
1. **รีสตาร์ทระบบ** (Frontend + Backend)
2. **Login** ด้วย user ที่มี `Meter Tree: { read: true, write: false }`
3. **เข้าหน้า MeterTree** → ควรเข้าได้
4. **ตรวจสอบ tree structure** → ควรแสดงได้ปกติ
5. **ลองใช้ import function** → ปุ่ม import ควร disabled
6. **Hover ปุ่ม import** → ควรแสดง tooltip permission error
7. **ตรวจสอบ Console** → ควรเห็น `📝 Meter Tree Permissions: { read: true, write: false, report: false }`

### **Expected UI Changes**
- ปุ่ม Import System Tree: เทาและคลิกไม่ได้
- ปุ่ม Import Building Tree: เทาและคลิกไม่ได้
- Tree structure: แสดงปกติ (สีปกติ)
- Navigation: ยังใช้งานได้ปกติ

## 📊 **จาก Log ที่ User แสดง**
```
'Meter Tree': { read: true, write: false, report: false }
```

User มีสิทธิ์:
- ✅ **read: true** - เข้าหน้าได้และดู tree ได้
- ❌ **write: false** - ไม่สามารถ import หรือแก้ไข tree ได้
- ❌ **report: false** - ไม่สามารถ export tree ได้ (ถ้ามี function นี้)

---
**สร้างเมื่อ**: 01/10/2025 09:13  
**สถานะ**: ✅ แก้ไขเสร็จสิ้น พร้อมทดสอบ
