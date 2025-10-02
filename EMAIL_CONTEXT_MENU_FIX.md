# แก้ไข Email Context Menu ให้เคารพ Write Permissions

## 🔍 **ปัญหาที่พบ**
หน้า Email/Line มี Context Menu (คลิกขวา) ที่ยังไม่ได้ตรวจสอบ write permissions ทำให้ user ที่มี `Email Line: { read: true, write: false }` ยังสามารถใช้:
- ✅ **Edit** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Add to Group** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Move to Group** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Delete** - ใช้งานได้ (ไม่ควรได้)

## ✅ **การแก้ไขที่ทำ**

### **1. แก้ไข SharedContextMenu Component**

#### **เพิ่ม canWrite Parameter**
```typescript
// เดิม
const SharedContextMenu = ({ 
  row, 
  onEdit, 
  onSelect, 
  onAddToGroup, 
  onMoveToGroup, 
  onDelete, 
  isSelected 
}: {
  // ... types
  isSelected: boolean;
}) => (

// ใหม่
const SharedContextMenu = ({ 
  row, 
  onEdit, 
  onSelect, 
  onAddToGroup, 
  onMoveToGroup, 
  onDelete, 
  isSelected,
  canWrite 
}: {
  // ... types
  isSelected: boolean;
  canWrite: boolean;
}) => (
```

#### **แก้ไข Context Menu Items**
```typescript
// Edit Button
<ContextMenuItem 
  onClick={() => canWrite ? onEdit(row) : undefined}
  disabled={!canWrite}
  className={!canWrite ? "opacity-50 cursor-not-allowed" : ""}
>
  <Edit3 className="w-3 h-3 mr-2" />
  Edit
</ContextMenuItem>

// Select Button (ยังใช้งานได้ - เป็น read operation)
<ContextMenuItem onClick={() => onSelect(row)}>
  {isSelected ? "Deselect" : "Select"}
</ContextMenuItem>

// Add to Group Button
<ContextMenuItem 
  onClick={() => canWrite ? onAddToGroup(row) : undefined}
  disabled={!canWrite}
  className={!canWrite ? "opacity-50 cursor-not-allowed" : ""}
>
  <Plus className="w-3 h-3 mr-2" />
  Add to Group
</ContextMenuItem>

// Move to Group Button
<ContextMenuItem 
  onClick={() => canWrite ? onMoveToGroup(row) : undefined}
  disabled={!canWrite}
  className={!canWrite ? "opacity-50 cursor-not-allowed" : ""}
>
  <ChevronRight className="w-3 h-3 mr-2" />
  Move to Group
</ContextMenuItem>

// Delete Button
<ContextMenuItem 
  onClick={() => canWrite ? onDelete(row) : undefined}
  disabled={!canWrite}
  className={`${!canWrite ? "opacity-50 cursor-not-allowed" : "text-red-600 focus:text-red-600"}`}
>
  <Trash2 className="w-3 h-3 mr-2" />
  Delete
</ContextMenuItem>
```

### **2. อัปเดต SharedContextMenu Calls**

#### **เพิ่ม canWrite Parameter ให้ทุก Call**
```typescript
// Email Tab - Individual Rows
<SharedContextMenu
  row={row}
  onEdit={handleEditRow}
  onSelect={handleSelectEmail}
  onAddToGroup={(row) => {
    setSelectedRowForGroupAction(row);
    setAddToGroupDialogOpen(true);
  }}
  onMoveToGroup={(row) => {
    setSelectedRowForGroupAction(row);
    setMoveToGroupDialogOpen(true);
  }}
  onDelete={handleDeleteRow}
  isSelected={selectedEmails.has(row.id)}
  canWrite={emailPermissions.write}  // ✅ เพิ่มใหม่
/>

// Email Tab - Group Members
<SharedContextMenu
  row={user}
  // ... other props
  isSelected={selectedEmails.has(user.id)}
  canWrite={emailPermissions.write}  // ✅ เพิ่มใหม่
/>

// Line Tab - Individual Rows
<SharedContextMenu
  row={row}
  // ... other props
  isSelected={selectedEmails.has(row.id)}
  canWrite={emailPermissions.write}  // ✅ เพิ่มใหม่
/>

// Line Tab - Group Members
<SharedContextMenu
  row={user}
  // ... other props
  isSelected={selectedEmails.has(user.id)}
  canWrite={emailPermissions.write}  // ✅ เพิ่มใหม่
/>
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### **User มี Email Line: { read: true, write: false }** ✅
- ✅ **คลิกขวาได้** - Context menu จะแสดง
- ✅ **Select/Deselect ได้** - เป็น read operation
- ❌ **Edit disabled** - เทา, คลิกไม่ได้
- ❌ **Add to Group disabled** - เทา, คลิกไม่ได้
- ❌ **Move to Group disabled** - เทา, คลิกไม่ได้
- ❌ **Delete disabled** - เทา, คลิกไม่ได้

### **User มี Email Line: { read: true, write: true }** ✅
- ✅ **คลิกขวาได้** - Context menu จะแสดง
- ✅ **Select/Deselect ได้** - เป็น read operation
- ✅ **Edit enabled** - สีปกติ, คลิกได้
- ✅ **Add to Group enabled** - สีปกติ, คลิกได้
- ✅ **Move to Group enabled** - สีปกติ, คลิกได้
- ✅ **Delete enabled** - สีแดง, คลิกได้

## 🔍 **การทดสอบ Context Menu**

### **Test Case: Right-Click Operations**
```
1. เข้าหน้า Email/Line (/config/email)
2. คลิกขวาที่แถวใดแถวหนึ่ง
3. ตรวจสอบ Context Menu:
   - Select/Deselect: ใช้งานได้ (สีปกติ)
   - Edit: disabled (เทา, opacity 50%)
   - Add to Group: disabled (เทา, opacity 50%)
   - Move to Group: disabled (เทา, opacity 50%)
   - Delete: disabled (เทา, opacity 50%)
4. ลองคลิกปุ่ม disabled → ไม่มีอะไรเกิดขึ้น
```

### **Test Case: Group Members Context Menu**
```
1. เข้าหน้า Email/Line (/config/email)
2. ไปที่ tab Groups
3. คลิกขวาที่ member ในกลุ่ม
4. ตรวจสอบ Context Menu เหมือนกับข้างบน
```

## 🚨 **หมายเหตุสำคัญ**

### **Context Menu Behavior**
- **disabled={!canWrite}** - ป้องกันการคลิก
- **onClick={() => canWrite ? action() : undefined}** - ป้องกัน action เมื่อไม่มีสิทธิ์
- **className opacity-50** - แสดงให้เห็นว่า disabled
- **cursor-not-allowed** - แสดง cursor ที่บ่งบอกว่าไม่สามารถคลิกได้

### **Read Operations ที่ยังใช้งานได้**
- **Select/Deselect** - เป็น UI operation ไม่ใช่ data operation
- **View Context Menu** - ยังแสดงได้แต่ปุ่มจะ disabled

### **Write Operations ที่ถูก Disabled**
- **Edit** - แก้ไขข้อมูล
- **Add to Group** - เพิ่มเข้ากลุ่ม
- **Move to Group** - ย้ายกลุ่ม
- **Delete** - ลบข้อมูล

## 📊 **สรุปการแก้ไขทั้งหมดในหน้า Email**

### **ปุ่มที่แก้ไขแล้ว** ✅
1. **Add Email Button** - `disabled={!emailPermissions.write}`
2. **Bulk Delete Button** - `disabled={selectedEmails.size === 0 || !emailPermissions.write}`
3. **Bulk Add to Group Button** - `disabled={selectedEmails.size === 0 || !emailPermissions.write}`
4. **Bulk Move to Group Button** - `disabled={selectedEmails.size === 0 || !emailPermissions.write}`
5. **Save Changes Button** - `disabled={!emailPermissions.write}`
6. **Context Menu Edit** - `disabled={!canWrite}`
7. **Context Menu Add to Group** - `disabled={!canWrite}`
8. **Context Menu Move to Group** - `disabled={!canWrite}`
9. **Context Menu Delete** - `disabled={!canWrite}`

### **Operations ที่ยังใช้งานได้** ✅
- **View Email/Line List** - read operation
- **Search/Filter** - read operation
- **Select/Deselect Items** - UI operation
- **View Context Menu** - UI operation (แต่ปุ่มจะ disabled)

## 🔧 **การทดสอบครบถ้วน**

### **ขั้นตอนการทดสอบ**
1. **รีสตาร์ท Frontend** - `npm run dev`
2. **เข้าหน้า Email** - `/config/email`
3. **ตรวจสอบ Console** - `📝 Email Line Permissions: { read: true, write: false, report: false }`
4. **ทดสอบปุ่มหลัก** - Add Email, Delete, Add to Group, Move to Group ควร disabled
5. **ทดสอบ Context Menu** - คลิกขวาแถว → Edit, Add to Group, Move to Group, Delete ควร disabled
6. **ทดสอบทั้ง Email และ Line tabs**

### **Expected Results**
- ✅ ปุ่มทั้งหมดที่ต้องการ write permission ถูก disabled
- ✅ Context menu items ที่ต้องการ write permission ถูก disabled
- ✅ Select/Deselect ยังใช้งานได้
- ✅ View operations ยังใช้งานได้

---
**สร้างเมื่อ**: 01/10/2025 09:33  
**สถานะ**: ✅ แก้ไขเสร็จสิ้น พร้อมทดสอบ  
**Context Menu**: ✅ Edit, Add to Group, Move to Group, Delete ทั้งหมด disabled
