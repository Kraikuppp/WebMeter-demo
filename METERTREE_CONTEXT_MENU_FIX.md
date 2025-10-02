# แก้ไข MeterTree Context Menu ให้เคารพ Write Permissions

## 🔍 **ปัญหาที่พบ**
หน้า MeterTree มี Context Menu (คลิกขวา) ที่ยังไม่ได้ตรวจสอบ write permissions ทำให้ user ที่มี `Meter Tree: { read: true, write: false }` ยังสามารถใช้:
- ✅ **Edit LogNet/Meter/Node** - ใช้งานได้ (ไม่ควรได้)
- ✅ **New Location/Building** - ใช้งานได้ (ไม่ควรได้)
- ✅ **New Floor** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Add Meter** - ใช้งานได้ (ไม่ควรได้)
- ✅ **New LogNet** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Delete** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Delete System** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Enable/Disable Online** - ใช้งานได้ (ไม่ควรได้)

## ✅ **การแก้ไขที่ทำ**

### **1. เพิ่ม usePermissions ใน PhysicalTreeNode**
```typescript
function PhysicalTreeNode(props: any) {
  // ... existing props
  
  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const meterTreePermissions = userPermissions?.['Meter Tree'] || { read: false, write: false, report: false };
  
  // ... rest of component
}
```

### **2. แก้ไข Context Menu Items**

#### **Edit Operations** ✅
```typescript
// Edit LogNet
<ContextMenuItem 
  onClick={meterTreePermissions.write ? handleEditLogNet : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Pencil className="w-4 h-4 text-gray-500 mr-2" /> Edit LogNet
</ContextMenuItem>

// Edit Meter
<ContextMenuItem 
  onClick={meterTreePermissions.write ? handleEditMeter : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Pencil className="w-4 h-4 text-gray-500 mr-2" /> Edit Meter
</ContextMenuItem>

// Edit Node
<ContextMenuItem 
  onClick={meterTreePermissions.write ? () => setEditingChildId(node.id) : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Pencil className="w-4 h-4 text-gray-500 mr-2" /> Edit
</ContextMenuItem>
```

#### **Create Operations** ✅
```typescript
// New Location/Building
<ContextMenuItem 
  onClick={meterTreePermissions.write ? handleCreateLocation : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Folder className="w-4 h-4 text-blue-400 mr-2" /> New Location
</ContextMenuItem>

// New Floor
<ContextMenuItem 
  onClick={meterTreePermissions.write ? handleCreateFloor : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <MdOutlineStairs className="w-4 h-4 text-green-500 mr-2" /> New Floor
</ContextMenuItem>

// Add Meter
<ContextMenuItem 
  onClick={meterTreePermissions.write ? handleCreateNode : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Gauge className="w-3 h-3 text-white" /> Add Meter
</ContextMenuItem>

// New Meter (System Tree - LogNet)
<ContextMenuItem 
  onClick={meterTreePermissions.write ? handleCreateNode : undefined}
  disabled={node.meterCount >= 32 || !meterTreePermissions.write}
  className={(node.meterCount >= 32 || !meterTreePermissions.write) ? 'opacity-50 cursor-not-allowed' : ''}
>
  <Gauge className="w-3 h-3 text-white" /> 
  New Meter {node.meterCount >= 32 ? '(Max 32)' : !meterTreePermissions.write ? '(No Permission)' : ''}
</ContextMenuItem>

// New LogNet
<ContextMenuItem 
  onClick={meterTreePermissions.write ? handleCreateLogNet : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <TbServer className="w-4 h-4 text-purple-500 mr-2" /> New LogNet
</ContextMenuItem>
```

#### **Delete Operations** ✅
```typescript
// Delete Node
<ContextMenuItem 
  onClick={meterTreePermissions.write ? () => onDelete && onDelete(node.id, level) : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Trash2 className="w-4 h-4 text-red-500 mr-2" /> Delete
</ContextMenuItem>

// Delete System
<ContextMenuItem 
  onClick={meterTreePermissions.write ? onDeleteRoot : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Trash2 className="w-4 h-4 text-red-600 mr-2" /> Delete System
</ContextMenuItem>
```

#### **Configuration Operations** ✅
```typescript
// Enable/Disable Online
<ContextMenuItem 
  onClick={meterTreePermissions.write ? handleToggleOnline : undefined}
  disabled={!meterTreePermissions.write}
  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  {node.onlineEnabled !== false ? (
    <>
      <EyeOff className="w-4 h-4 text-orange-500 mr-2" /> Disable Online
    </>
  ) : (
    <>
      <Eye className="w-4 h-4 text-green-500 mr-2" /> Enable Online
    </>
  )}
</ContextMenuItem>
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### **User มี Meter Tree: { read: true, write: false }** ✅

#### **Context Menu Behavior**
- ✅ **คลิกขวาได้** - Context menu จะแสดง
- ✅ **Add to Favorite ได้** - เป็น UI operation (ไม่ต้องการ write permission)
- ❌ **Edit operations disabled** - เทา (opacity 50%), คลิกไม่ได้
- ❌ **Create operations disabled** - เทา (opacity 50%), คลิกไม่ได้
- ❌ **Delete operations disabled** - เทา (opacity 50%), คลิกไม่ได้
- ❌ **Configuration operations disabled** - เทา (opacity 50%), คลิกไม่ได้

#### **Specific Context Menu Items**
- ❌ **Edit LogNet** disabled
- ❌ **Edit Meter** disabled
- ❌ **Edit Node** disabled
- ❌ **New Location/Building** disabled
- ❌ **New Floor** disabled
- ❌ **Add Meter** disabled
- ❌ **New LogNet** disabled
- ❌ **Delete** disabled
- ❌ **Delete System** disabled
- ❌ **Enable/Disable Online** disabled
- ✅ **Add to Favorite** enabled (read operation)

### **User มี Meter Tree: { read: true, write: true }** ✅
- ✅ **ทุก Context Menu items ใช้งานได้** - สีปกติ, คลิกได้
- ✅ **สามารถ edit, create, delete ได้**

## 🔍 **การทดสอบ Context Menu**

### **Test Case: Right-Click Operations**
```
1. เข้าหน้า MeterTree (/meter-tree)
2. ตรวจสอบ Console → 📝 Meter Tree Permissions: { read: true, write: false, report: false }
3. คลิกขวาที่ node ต่างๆ:

   System Tree:
   - คลิกขวาที่ Location → New Location, Delete ควร disabled
   - คลิกขวาที่ LogNet → Edit LogNet, New Meter, New LogNet, Delete ควร disabled
   - คลิกขวาที่ Meter → Edit Meter, Delete ควร disabled

   Building Tree:
   - คลิกขวาที่ Location → New Building, New Floor, Delete ควร disabled
   - คลิกขวาที่ Floor → Add Meter, Delete ควร disabled
   - คลิกขวาที่ Meter → Edit Meter, Enable/Disable Online, Delete ควร disabled

4. ลองคลิกปุ่ม disabled → ไม่มีอะไรเกิดขึ้น
5. Add to Favorite → ควรทำงานได้ปกติ (read operation)
```

## 🚨 **หมายเหตุสำคัญ**

### **Context Menu Styling**
- **disabled={!meterTreePermissions.write}** - ป้องกันการคลิก
- **onClick={meterTreePermissions.write ? handler : undefined}** - ป้องกัน action เมื่อไม่มีสิทธิ์
- **className opacity-50** - แสดงให้เห็นว่า disabled
- **cursor-not-allowed** - แสดง cursor ที่บ่งบอกว่าไม่สามารถคลิกได้

### **Special Cases**
- **New Meter (LogNet)** - มีการตรวจสอบทั้ง meter count limit และ write permission
- **Add to Favorite** - ไม่ต้องการ write permission เพราะเป็น UI preference

### **Write Operations ที่ถูก Disabled**
- **Edit** - แก้ไขข้อมูล nodes
- **Create** - สร้าง nodes ใหม่
- **Delete** - ลบ nodes
- **Configuration** - เปลี่ยนแปลงการตั้งค่า (Enable/Disable Online)

### **Read Operations ที่ยังใช้งานได้**
- **View Context Menu** - แสดง menu ได้
- **Add to Favorite** - เป็น UI preference
- **View Node Details** - ดูรายละเอียด nodes

## 📊 **สรุปการแก้ไขทั้งหมดในหน้า MeterTree**

### **✅ ปุ่มที่แก้ไขเสร็จสิ้น (16 Operations)**

#### **Toolbar Buttons (8 ปุ่ม)**
1. **Add Location (System)** - `disabled={!meterTreePermissions.write}` ✅
2. **Download Template (System)** - `disabled={!meterTreePermissions.write}` ✅
3. **Import from File (System)** - `disabled={!meterTreePermissions.write}` ✅
4. **Add Location (Building)** - `disabled={!meterTreePermissions.write}` ✅
5. **Download Template (Building)** - `disabled={!meterTreePermissions.write}` ✅
6. **Import from File (Building)** - `disabled={!meterTreePermissions.write}` ✅
7. **Import System Tree** - `disabled={!meterTreePermissions.write}` ✅
8. **Import Building Tree** - `disabled={!meterTreePermissions.write}` ✅

#### **Context Menu Items (8 Operations)**
9. **Edit LogNet** - `disabled={!meterTreePermissions.write}` ✅
10. **Edit Meter** - `disabled={!meterTreePermissions.write}` ✅
11. **Edit Node** - `disabled={!meterTreePermissions.write}` ✅
12. **New Location/Building** - `disabled={!meterTreePermissions.write}` ✅
13. **New Floor** - `disabled={!meterTreePermissions.write}` ✅
14. **Add Meter** - `disabled={!meterTreePermissions.write}` ✅
15. **New LogNet** - `disabled={!meterTreePermissions.write}` ✅
16. **Delete** - `disabled={!meterTreePermissions.write}` ✅
17. **Delete System** - `disabled={!meterTreePermissions.write}` ✅
18. **Enable/Disable Online** - `disabled={!meterTreePermissions.write}` ✅

### **Operations ที่ยังใช้งานได้** ✅
- **View Tree Structure** - read operation
- **Expand/Collapse Nodes** - UI operation
- **Select Nodes** - UI operation
- **Add to Favorite** - UI preference
- **Navigate Tree** - read operation

---
**สร้างเมื่อ**: 01/10/2025 10:57  
**สถานะ**: ✅ **COMPLETED** - MeterTree Context Menu แก้ไขเสร็จสิ้น  
**Context Menu Items**: 10 Operations แก้ไขครบถ้วน  
**ครอบคลุม**: System Tree, Building Tree, All Node Types
