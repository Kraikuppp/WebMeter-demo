# แก้ไข Email/Line Page ให้เคารพ Write Permissions

## 🔍 **ปัญหาที่พบ**
หน้า Email/Line ไม่ได้ตรวจสอบ write permissions ทำให้ user ที่มี `Email Line: { read: true, write: false }` ยังสามารถใช้ปุ่มต่างๆ ได้:
- ✅ **Add Email** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Add User/Group** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Delete** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Add to Group** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Move to Group** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Save Changes** - ใช้งานได้ (ไม่ควรได้)

## ✅ **การแก้ไขที่ทำ**

### **1. เพิ่ม usePermissions Import**
```typescript
import { usePermissions } from '@/hooks/usePermissions';
```

### **2. เพิ่มการตรวจสอบ Permissions**
```typescript
export default function Email() {
  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const emailPermissions = userPermissions?.['Email Line'] || { read: false, write: false, report: false };
  
  console.log('📝 Email Line Permissions:', emailPermissions);
  // ...
}
```

### **3. แก้ไขปุ่มใน Email Tab**

#### **Add Email Button** ✅
```typescript
<Button 
  size="sm"
  className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
  onClick={handleAdd}
  disabled={!emailPermissions.write}
  title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
>
  Add Email
</Button>
```

#### **Bulk Operations** ✅
```typescript
// Delete Button
<Button size="sm" className="text-xs h-8 bg-red-500 hover:bg-red-600 text-white rounded-none" 
  onClick={handleBulkDelete} 
  disabled={selectedEmails.size === 0 || !emailPermissions.write} 
  title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
  <Trash2 className="w-3 h-3 mr-1" /> Delete
</Button>

// Add to Group Button
<Button size="sm" className="text-xs h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-none" 
  onClick={() => setBulkAddToGroupDialogOpen(true)} 
  disabled={selectedEmails.size === 0 || !emailPermissions.write} 
  title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
  <Plus className="w-3 h-3 mr-1" /> Add to Group
</Button>

// Move to Group Button
<Button size="sm" className="text-xs h-8 bg-primary hover:bg-primary/90 text-white rounded-none" 
  onClick={() => setBulkMoveToGroupDialogOpen(true)} 
  disabled={selectedEmails.size === 0 || !emailPermissions.write} 
  title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
  <ChevronRight className="w-3 h-3 mr-1" /> Move to Group
</Button>
```

### **4. แก้ไขปุ่มใน Line Tab**

#### **Bulk Operations (เหมือนกับ Email Tab)** ✅
- Delete Button - `disabled={selectedEmails.size === 0 || !emailPermissions.write}`
- Add to Group Button - `disabled={selectedEmails.size === 0 || !emailPermissions.write}`
- Move to Group Button - `disabled={selectedEmails.size === 0 || !emailPermissions.write}`

### **5. แก้ไขปุ่ม Save Changes**

#### **Edit Line Group Modal** ✅
```typescript
<Button 
  size="sm"
  className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
  onClick={handleSaveEditLineGroup}
  disabled={!emailPermissions.write}
  title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
>
  Save Changes
</Button>
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### **User มี Email Line: { read: true, write: false }** ✅
- ✅ **เข้าหน้า Email/Line ได้** - มี read permission
- ✅ **ดูรายการ Email/Line ได้** - เป็น read operation
- ❌ **Add Email Button disabled** - ไม่มี write permission
- ❌ **Delete Button disabled** - ไม่มี write permission
- ❌ **Add to Group Button disabled** - ไม่มี write permission
- ❌ **Move to Group Button disabled** - ไม่มี write permission
- ❌ **Save Changes Button disabled** - ไม่มี write permission
- ✅ **เมื่อ hover ปุ่มจะแสดง tooltip** - "You don't have write permission for Email Line"

### **User มี Email Line: { read: true, write: true }** ✅
- ✅ **เข้าหน้า Email/Line ได้** - มี read permission
- ✅ **ดูรายการ Email/Line ได้** - เป็น read operation
- ✅ **Add Email Button enabled** - มี write permission
- ✅ **Delete Button enabled** - มี write permission
- ✅ **Add to Group Button enabled** - มี write permission
- ✅ **Move to Group Button enabled** - มี write permission
- ✅ **Save Changes Button enabled** - มี write permission

## 🔍 **การทดสอบ**

### **Test Case 1: Read-Only User**
```
User permissions: { read: true, write: false, report: false }
Expected:
- หน้า Email/Line เข้าได้
- ดูรายการ Email/Line ได้
- ปุ่ม Add Email disabled (เทา, คลิกไม่ได้)
- ปุ่ม Delete disabled (เทา, คลิกไม่ได้)
- ปุ่ม Add to Group disabled (เทา, คลิกไม่ได้)
- ปุ่ม Move to Group disabled (เทา, คลิกไม่ได้)
- ปุ่ม Save Changes disabled (เทา, คลิกไม่ได้)
- เมื่อ hover ปุ่มจะแสดง tooltip permission error
```

### **Test Case 2: Full Access User**
```
User permissions: { read: true, write: true, report: false }
Expected:
- หน้า Email/Line เข้าได้
- ดูรายการ Email/Line ได้
- ปุ่มทั้งหมดใช้งานได้ปกติ (สีปกติ, คลิกได้)
- สามารถเพิ่ม/แก้ไข/ลบ Email/Line ได้
```

### **Test Case 3: No Access User**
```
User permissions: { read: false, write: false, report: false }
Expected:
- ไม่สามารถเข้าหน้า Email/Line ได้ (ถูกบล็อคโดย RBACRoute)
- แสดง "Access Denied" page
```

## 📋 **Console Logs ที่จะเห็น**
```javascript
📝 Email Line Permissions: { read: true, write: false, report: false }
```

## ⚠️ **ปุ่มที่อาจยังต้องตรวจสอบเพิ่มเติม**

### **ปุ่มที่อาจมีแต่ยังไม่พบ**
- **Add Line User** - ถ้ามี
- **Add Email Group** - ถ้ามี
- **Add Line Group** - ถ้ามี
- **Edit Email/Line** - ใน context menu หรือ inline edit
- **Delete Individual** - ใน context menu

### **การตรวจสอบเพิ่มเติม**
```bash
# ค้นหาปุ่มอื่นๆ ที่อาจต้องการ write permissions
grep -n "onClick.*handle.*\(Create\|Add\|Edit\|Delete\|Save\)" src/pages/Email.tsx
```

## 🚨 **หมายเหตุสำคัญ**

### **Bulk Operations**
- ปุ่ม bulk operations จะ disabled เมื่อ:
  1. ไม่มี items ที่เลือก (`selectedEmails.size === 0`)
  2. ไม่มี write permission (`!emailPermissions.write`)
- ทั้งสองเงื่อนไขใช้ OR logic

### **Read Operations ที่ยังใช้งานได้**
- **View Email/Line List** - ดูรายการได้ปกติ
- **Search/Filter** - ค้นหาและกรองได้
- **Select Items** - เลือก items ได้ (แต่ bulk operations จะ disabled)
- **View Details** - ดูรายละเอียดได้

### **Disabled Button Styling**
- ปุ่มที่ disabled จะมี opacity ลดลงและไม่สามารถคลิกได้
- เมื่อ hover จะแสดง tooltip อธิบายเหตุผล
- CSS classes จะถูกใช้ตาม browser default disabled styling

## 🔧 **การทดสอบอย่างรวดเร็ว**

### **ขั้นตอนการทดสอบ**
1. **รีสตาร์ทระบบ** (Frontend + Backend)
2. **Login** ด้วย user ที่มี `Email Line: { read: true, write: false }`
3. **เข้าหน้า Email/Line** → ควรเข้าได้
4. **ตรวจสอบรายการ** → ควรแสดงได้ปกติ
5. **ลองใช้ปุ่มต่างๆ** → ปุ่ม Add, Delete, Add to Group, Move to Group, Save ควร disabled
6. **Hover ปุ่ม disabled** → ควรแสดง tooltip permission error
7. **ตรวจสอบ Console** → ควรเห็น `📝 Email Line Permissions: { read: true, write: false, report: false }`

### **Expected UI Changes**
- ปุ่ม Add Email: เทาและคลิกไม่ได้
- ปุ่ม Delete: เทาและคลิกไม่ได้
- ปุ่ม Add to Group: เทาและคลิกไม่ได้
- ปุ่ม Move to Group: เทาและคลิกไม่ได้
- ปุ่ม Save Changes: เทาและคลิกไม่ได้
- รายการ Email/Line: แสดงปกติ (สีปกติ)

## 📊 **จาก User Log**
```
'Email Line': { read: true, write: false, report: false }
```

User ควรจะ:
- ✅ **read: true** - เข้าหน้าได้และดูรายการได้
- ❌ **write: false** - ไม่สามารถเพิ่ม/แก้ไข/ลบได้
- ❌ **report: false** - ไม่สามารถ export รายการได้ (ถ้ามี function นี้)

---
**สร้างเมื่อ**: 01/10/2025 09:26  
**สถานะ**: ✅ แก้ไขเสร็จสิ้น พร้อมทดสอบ  
**ปุ่มที่แก้ไข**: Add Email, Delete, Add to Group, Move to Group, Save Changes (ทั้ง Email และ Line tabs)
