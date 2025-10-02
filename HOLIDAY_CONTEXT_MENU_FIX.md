# แก้ไข Holiday Context Menu ให้เคารพ Write Permissions

## 🔍 **ปัญหาที่พบ**
หน้า Holiday มี Context Menu (คลิกขวา) ที่ยังไม่ได้ตรวจสอบ write permissions ทำให้ user ที่มี `Holiday: { read: true, write: false }` ยังสามารถใช้:
- ✅ **Edit Holiday** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Delete Holiday** - ใช้งานได้ (ไม่ควรได้)
- ✅ **Delete Button (inline)** - ใช้งานได้ (ไม่ควรได้)

## ✅ **การแก้ไขที่ทำ**

### **1. Annual Holidays Section** ✅

#### **Context Menu Items**
```typescript
// Edit Holiday
<ContextMenuItem 
  onClick={holidayPermissions.write ? () => handleEditHoliday(holiday) : undefined}
  disabled={!holidayPermissions.write}
  className={!holidayPermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Settings className="w-4 h-4 mr-2" />
  {language === 'TH' ? 'แก้ไข' : 'Edit'}
</ContextMenuItem>

// Delete Holiday
<ContextMenuItem 
  onClick={holidayPermissions.write ? () => handleDeleteHoliday(holiday) : undefined}
  disabled={!holidayPermissions.write}
  className={!holidayPermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Trash2 className="w-4 h-4 mr-2" />
  {language === 'TH' ? 'ลบ' : 'Delete'}
</ContextMenuItem>
```

#### **Inline Delete Button**
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => removeCustomHoliday(customHolidays.indexOf(holiday))}
  className="text-destructive hover:text-destructive p-1 h-6 w-6"
  disabled={!holidayPermissions.write}
  title={!holidayPermissions.write ? "You don't have write permission for Holiday" : ""}
>
  <Trash2 className="w-3 h-3" />
</Button>
```

### **2. Special Holidays Section** ✅

#### **Context Menu Items**
```typescript
// Edit Holiday
<ContextMenuItem 
  onClick={holidayPermissions.write ? () => handleEditHoliday(holiday) : undefined}
  disabled={!holidayPermissions.write}
  className={!holidayPermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Settings className="w-4 h-4 mr-2" />
  {language === 'TH' ? 'แก้ไข' : 'Edit'}
</ContextMenuItem>

// Delete Holiday
<ContextMenuItem 
  onClick={holidayPermissions.write ? () => handleDeleteHoliday(holiday) : undefined}
  disabled={!holidayPermissions.write}
  className={!holidayPermissions.write ? "opacity-50 cursor-not-allowed" : ""}
>
  <Trash2 className="w-4 h-4 mr-2" />
  {language === 'TH' ? 'ลบ' : 'Delete'}
</ContextMenuItem>
```

#### **Inline Delete Button**
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => removeCustomHoliday(customHolidays.indexOf(holiday))}
  className="text-destructive hover:text-destructive p-1 h-6 w-6"
  disabled={!holidayPermissions.write}
  title={!holidayPermissions.write ? "You don't have write permission for Holiday" : ""}
>
  <Trash2 className="w-3 h-3" />
</Button>
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### **User มี Holiday: { read: true, write: false }** ✅

#### **Context Menu Behavior**
- ✅ **คลิกขวาได้** - Context menu จะแสดง
- ❌ **Edit Holiday disabled** - เทา (opacity 50%), คลิกไม่ได้
- ❌ **Delete Holiday disabled** - เทา (opacity 50%), คลิกไม่ได้

#### **Inline Actions**
- ❌ **Delete Button disabled** - เทา, คลิกไม่ได้
- ✅ **Hover tooltip** - แสดง "You don't have write permission for Holiday"

#### **Annual Holidays Section**
- ✅ **ดูรายการได้** - แสดงปกติ
- ❌ **คลิกขวา → Edit disabled** - เทา, คลิกไม่ได้
- ❌ **คลิกขวา → Delete disabled** - เทา, คลิกไม่ได้
- ❌ **ปุ่ม Delete (🗑️) disabled** - เทา, คลิกไม่ได้

#### **Special Holidays Section**
- ✅ **ดูรายการได้** - แสดงปกติ
- ❌ **คลิกขวา → Edit disabled** - เทา, คลิกไม่ได้
- ❌ **คลิกขวา → Delete disabled** - เทา, คลิกไม่ได้
- ❌ **ปุ่ม Delete (🗑️) disabled** - เทา, คลิกไม่ได้

### **User มี Holiday: { read: true, write: true }** ✅
- ✅ **ทุก Context Menu items ใช้งานได้** - สีปกติ, คลิกได้
- ✅ **ทุก inline buttons ใช้งานได้** - สีปกติ, คลิกได้
- ✅ **สามารถ edit, delete holidays ได้**

## 🔍 **การทดสอบ Context Menu**

### **Test Case: Right-Click Operations**
```
1. เข้าหน้า Holiday (/holiday)
2. ตรวจสอบ Console → 📝 Holiday Permissions: { read: true, write: false, report: false }
3. คลิกขวาที่ Holiday items:

   Annual Holidays:
   - คลิกขวาที่ Holiday → Edit, Delete ควร disabled
   - ลองคลิกปุ่ม Delete (🗑️) → ควร disabled

   Special Holidays:
   - คลิกขวาที่ Holiday → Edit, Delete ควร disabled
   - ลองคลิกปุ่ม Delete (🗑️) → ควร disabled

4. ลองคลิกปุ่ม disabled → ไม่มีอะไรเกิดขึ้น
5. Hover ปุ่ม disabled → ควรแสดง tooltip permission error
```

## 🚨 **หมายเหตุสำคัญ**

### **Context Menu Styling**
- **disabled={!holidayPermissions.write}** - ป้องกันการคลิก
- **onClick={holidayPermissions.write ? handler : undefined}** - ป้องกัน action เมื่อไม่มีสิทธิ์
- **className opacity-50** - แสดงให้เห็นว่า disabled
- **cursor-not-allowed** - แสดง cursor ที่บ่งบอกว่าไม่สามารถคลิกได้

### **Inline Button Styling**
- **disabled={!holidayPermissions.write}** - ป้องกันการคลิก
- **title** - แสดง tooltip อธิบายเหตุผล

### **Write Operations ที่ถูก Disabled**
- **Edit Holiday** - แก้ไขข้อมูล holiday
- **Delete Holiday** - ลบ holiday
- **Remove Custom Holiday** - ลบ custom holiday

### **Read Operations ที่ยังใช้งานได้**
- **View Holiday List** - ดูรายการ holidays
- **View Context Menu** - แสดง menu ได้
- **Browse Calendar** - ดู calendar ได้

## 📊 **สรุปการแก้ไขทั้งหมดในหน้า Holiday**

### **✅ Operations ที่แก้ไขเสร็จสิ้น (8 Operations)**

#### **Main Buttons (4 ปุ่ม)**
1. **Add Holiday Button** - `disabled={!holidayPermissions.write}` ✅
2. **Set FT Button** - `disabled={!holidayPermissions.write}` ✅
3. **Save Holiday Button** - `disabled={addingHoliday || !holidayPermissions.write}` ✅
4. **Save/Update FT Button** - `disabled={addingFTConfig || !holidayPermissions.write}` ✅

#### **Context Menu Items (4 Operations)**
5. **Edit Holiday (Annual)** - `disabled={!holidayPermissions.write}` ✅
6. **Delete Holiday (Annual)** - `disabled={!holidayPermissions.write}` ✅
7. **Edit Holiday (Special)** - `disabled={!holidayPermissions.write}` ✅
8. **Delete Holiday (Special)** - `disabled={!holidayPermissions.write}` ✅

#### **Inline Buttons (2 ปุ่ม)**
9. **Delete Button (Annual)** - `disabled={!holidayPermissions.write}` ✅
10. **Delete Button (Special)** - `disabled={!holidayPermissions.write}` ✅

### **Operations ที่ยังใช้งานได้** ✅
- **View Holiday Lists** - read operation
- **View FT Lists** - read operation
- **Browse Calendar** - read operation
- **View Context Menu** - UI operation (แต่ปุ่มจะ disabled)
- **Cancel Buttons** - UI operation

## 🔧 **การทดสอบครบถ้วน**

### **ขั้นตอนการทดสอบ**
1. **รีสตาร์ท Frontend** - `npm run dev`
2. **เข้าหน้า Holiday** - `/holiday`
3. **ตรวจสอบ Console** - `📝 Holiday Permissions: { read: true, write: false, report: false }`
4. **ทดสอบ Main Buttons** - Add Holiday, Set FT ควร disabled
5. **ทดสอบ Context Menu** - คลิกขวา Holiday items → Edit, Delete ควร disabled
6. **ทดสอบ Inline Buttons** - ปุ่ม Delete (🗑️) ควร disabled
7. **ทดสอบ Tooltips** - Hover ปุ่ม disabled → ควรแสดง permission error

### **Expected Results**
- ✅ ปุ่มทั้งหมดที่ต้องการ write permission ถูก disabled
- ✅ Context menu items ที่ต้องการ write permission ถูก disabled
- ✅ Inline buttons ที่ต้องการ write permission ถูก disabled
- ✅ Tooltips แสดงเหตุผลเมื่อ hover ปุ่ม disabled
- ✅ Read operations ยังทำงานได้ปกติ

---
**สร้างเมื่อ**: 01/10/2025 11:07  
**สถานะ**: ✅ **COMPLETED** - Holiday Context Menu แก้ไขเสร็จสิ้น  
**Context Menu Items**: 4 Operations + 2 Inline Buttons = 6 Additional Operations  
**ครอบคลุม**: Annual Holidays, Special Holidays, All Context Menu Actions
