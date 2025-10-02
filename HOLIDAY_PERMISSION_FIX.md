# แก้ไข Holiday Page ให้เคารพ Write Permissions

## 🔍 **ปัญหาที่พบ**
หน้า Holiday ไม่มี `usePermissions` เลย ทำให้ไม่ได้ตรวจสอบ write permissions สำหรับการดำเนินการต่างๆ:
- ✅ **Add Holiday** - ใช้งานได้ (ไม่ควรได้ถ้าไม่มี write permission)
- ✅ **Set FT** - ใช้งานได้ (ไม่ควรได้ถ้าไม่มี write permission)
- ✅ **Save Holiday** - ใช้งานได้ (ไม่ควรได้ถ้าไม่มี write permission)
- ✅ **Save/Update FT** - ใช้งานได้ (ไม่ควรได้ถ้าไม่มี write permission)

## ✅ **การแก้ไขที่ทำ**

### **1. เพิ่ม usePermissions Import**
```typescript
import { usePermissions } from '@/hooks/usePermissions';
```

### **2. เพิ่มการตรวจสอบ Permissions**
```typescript
export default function Holiday() {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const holidayPermissions = userPermissions?.['Holiday'] || { read: false, write: false, report: false };
  
  console.log('📝 Holiday Permissions:', holidayPermissions);
  // ...
}
```

### **3. แก้ไขปุ่ม Add Holiday**
```typescript
// เดิม
<Button
  onClick={() => {
    // Reset form และ date states เมื่อเปิด Add Holiday dialog
    const defaultDate = new Date(selectedYear, 0, 1);
    setSelectedDate(defaultDate);
    setNewHoliday({
      name: '',
      nameEn: '',
      date: defaultDate,
      type: 'observance',
      category: 'special'
    });
    setShowAddHoliday(true);
  }}
  size="sm"
  className="bg-primary hover:bg-primary/90 text-white text-xs h-8 rounded-none"
>
  <Plus className="w-3 h-3 mr-1" />
  {language === 'TH' ? 'เพิ่มวันหยุด' : 'Add Holiday'}
</Button>

// ใหม่
<Button
  onClick={() => {
    // Reset form และ date states เมื่อเปิด Add Holiday dialog
    const defaultDate = new Date(selectedYear, 0, 1);
    setSelectedDate(defaultDate);
    setNewHoliday({
      name: '',
      nameEn: '',
      date: defaultDate,
      type: 'observance',
      category: 'special'
    });
    setShowAddHoliday(true);
  }}
  size="sm"
  className="bg-primary hover:bg-primary/90 text-white text-xs h-8 rounded-none"
  disabled={!holidayPermissions.write}
  title={!holidayPermissions.write ? "You don't have write permission for Holiday" : ""}
>
  <Plus className="w-3 h-3 mr-1" />
  {language === 'TH' ? 'เพิ่มวันหยุด' : 'Add Holiday'}
</Button>
```

### **4. แก้ไขปุ่ม Set FT**
```typescript
// เดิม
<Button
  onClick={() => setShowSetFT(true)}
  size="sm"
  className="bg-primary hover:bg-primary/90 text-white text-xs h-8 rounded-none"
>
  <Settings className="w-3 h-3 mr-1" />
  Set FT
</Button>

// ใหม่
<Button
  onClick={() => setShowSetFT(true)}
  size="sm"
  className="bg-primary hover:bg-primary/90 text-white text-xs h-8 rounded-none"
  disabled={!holidayPermissions.write}
  title={!holidayPermissions.write ? "You don't have write permission for Holiday" : ""}
>
  <Settings className="w-3 h-3 mr-1" />
  Set FT
</Button>
```

### **5. แก้ไขปุ่ม Save Holiday (Add Holiday Dialog)**
```typescript
// เดิม
<Button 
  onClick={addCustomHoliday} 
  className="text-xs rounded-none"
  disabled={addingHoliday}
>

// ใหม่
<Button 
  onClick={addCustomHoliday} 
  className="text-xs rounded-none"
  disabled={addingHoliday || !holidayPermissions.write}
  title={!holidayPermissions.write ? "You don't have write permission for Holiday" : ""}
>
```

### **6. แก้ไขปุ่ม Save/Update FT (Set FT Dialog)**
```typescript
// เดิม
<Button
  onClick={selectedFTForEdit ? handleUpdateFTFromDialog : addNewFTConfig}
  disabled={addingFTConfig}
  className="bg-primary hover:bg-primary/90 text-white text-xs rounded-none"
>

// ใหม่
<Button
  onClick={selectedFTForEdit ? handleUpdateFTFromDialog : addNewFTConfig}
  disabled={addingFTConfig || !holidayPermissions.write}
  className="bg-primary hover:bg-primary/90 text-white text-xs rounded-none"
  title={!holidayPermissions.write ? "You don't have write permission for Holiday" : ""}
>
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### **User มี Holiday: { read: true, write: false }** ✅
- ✅ **เข้าหน้า Holiday ได้** - มี read permission
- ✅ **ดูรายการ Holiday ได้** - เป็น read operation
- ✅ **ดูรายการ FT ได้** - เป็น read operation
- ❌ **Add Holiday Button disabled** - ไม่มี write permission
- ❌ **Set FT Button disabled** - ไม่มี write permission
- ❌ **Save Holiday Button disabled** - ไม่มี write permission (ใน dialog)
- ❌ **Save/Update FT Button disabled** - ไม่มี write permission (ใน dialog)
- ✅ **เมื่อ hover ปุ่มจะแสดง tooltip** - "You don't have write permission for Holiday"

### **User มี Holiday: { read: true, write: true }** ✅
- ✅ **เข้าหน้า Holiday ได้** - มี read permission
- ✅ **ดูรายการ Holiday ได้** - เป็น read operation
- ✅ **ดูรายการ FT ได้** - เป็น read operation
- ✅ **Add Holiday Button enabled** - มี write permission
- ✅ **Set FT Button enabled** - มี write permission
- ✅ **Save Holiday Button enabled** - มี write permission
- ✅ **Save/Update FT Button enabled** - มี write permission

## 🔍 **การทดสอบ**

### **Test Case 1: Read-Only User**
```
User permissions: { read: true, write: false, report: false }
Expected:
- หน้า Holiday เข้าได้
- ดูรายการ Holiday และ FT ได้
- ปุ่ม Add Holiday disabled (เทา, คลิกไม่ได้)
- ปุ่ม Set FT disabled (เทา, คลิกไม่ได้)
- ถ้าเปิด dialog ได้ (ไม่น่าจะเปิดได้) ปุ่ม Save ควร disabled
- เมื่อ hover ปุ่มจะแสดง tooltip permission error
```

### **Test Case 2: Full Access User**
```
User permissions: { read: true, write: true, report: false }
Expected:
- หน้า Holiday เข้าได้
- ดูรายการ Holiday และ FT ได้
- ปุ่ม Add Holiday enabled (สีปกติ, คลิกได้)
- ปุ่ม Set FT enabled (สีปกติ, คลิกได้)
- สามารถเพิ่ม Holiday และตั้งค่า FT ได้
```

### **Test Case 3: No Access User**
```
User permissions: { read: false, write: false, report: false }
Expected:
- ไม่สามารถเข้าหน้า Holiday ได้ (ถูกบล็อคโดย RBACRoute)
- แสดง "Access Denied" page
```

## 📋 **Console Logs ที่จะเห็น**
```javascript
📝 Holiday Permissions: { read: true, write: false, report: false }
```

## ⚠️ **ปุ่มที่อาจยังต้องตรวจสอบเพิ่มเติม**

### **ปุ่มที่อาจมีแต่ยังไม่ได้แก้ไข**
- **Edit Holiday** - ถ้ามี context menu หรือ inline edit
- **Delete Holiday** - ถ้ามี context menu หรือ delete button
- **Edit FT** - ถ้ามี edit functionality
- **Delete FT** - ถ้ามี delete functionality
- **Activate/Deactivate FT** - ถ้ามี toggle functionality

### **การตรวจสอบเพิ่มเติม**
```bash
# ค้นหาปุ่มอื่นๆ ที่อาจต้องการ write permissions
grep -n "onClick.*handle.*\(Edit\|Delete\|Update\|Toggle\)" src/pages/Holiday.tsx
```

## 🚨 **หมายเหตุสำคัญ**

### **Holiday Operations**
- Add Holiday เป็น write operation เพราะจะเพิ่มข้อมูลใหม่
- Set FT เป็น write operation เพราะจะเปลี่ยนแปลงการตั้งค่า
- ต้องการ write permission เพื่อป้องกันการเปลี่ยนแปลงโดยไม่ได้รับอนุญาต

### **Read Operations ที่ยังใช้งานได้**
- **View Holiday List** - ดูรายการวันหยุดได้ปกติ
- **View FT List** - ดูรายการ FT ได้ปกติ
- **Browse Calendar** - ดู calendar ได้
- **Filter/Search** - กรองและค้นหาได้

### **Disabled Button Styling**
- ปุ่มที่ disabled จะมี opacity ลดลงและไม่สามารถคลิกได้
- เมื่อ hover จะแสดง tooltip อธิบายเหตุผล
- CSS classes จะถูกใช้ตาม browser default disabled styling

## 🔧 **การทดสอบอย่างรวดเร็ว**

### **ขั้นตอนการทดสอบ**
1. **รีสตาร์ทระบบ** (Frontend + Backend)
2. **Login** ด้วย user ที่มี `Holiday: { read: true, write: false }`
3. **เข้าหน้า Holiday** → ควรเข้าได้
4. **ตรวจสอบรายการ** → ควรแสดงได้ปกติ
5. **ลองใช้ปุ่มต่างๆ** → ปุ่ม Add Holiday, Set FT ควร disabled
6. **Hover ปุ่ม disabled** → ควรแสดง tooltip permission error
7. **ตรวจสอบ Console** → ควรเห็น `📝 Holiday Permissions: { read: true, write: false, report: false }`

### **Expected UI Changes**
- ปุ่ม Add Holiday: เทาและคลิกไม่ได้
- ปุ่ม Set FT: เทาและคลิกไม่ได้
- รายการ Holiday/FT: แสดงปกติ (สีปกติ)
- Navigation: ยังใช้งานได้ปกติ

## 📊 **จาก User Log**
```
'Holiday': { read: true, write: false, report: false }
```

User ควรจะ:
- ✅ **read: true** - เข้าหน้าได้และดูรายการได้
- ❌ **write: false** - ไม่สามารถเพิ่ม/แก้ไข Holiday และ FT ได้
- ❌ **report: false** - ไม่สามารถ export รายการได้ (ถ้ามี function นี้)

## 📊 **สรุปการแก้ไขทั้งหมดในหน้า Holiday**

### **✅ ปุ่มที่แก้ไขเสร็จสิ้น (4 ปุ่ม)**
1. **Add Holiday Button** - `disabled={!holidayPermissions.write}` ✅
2. **Set FT Button** - `disabled={!holidayPermissions.write}` ✅
3. **Save Holiday Button** - `disabled={addingHoliday || !holidayPermissions.write}` ✅
4. **Save/Update FT Button** - `disabled={addingFTConfig || !holidayPermissions.write}` ✅

### **Operations ที่ยังใช้งานได้** ✅
- **View Holiday List** - read operation
- **View FT List** - read operation
- **Browse Calendar** - read operation
- **Filter/Search** - read operation
- **Cancel Buttons** - UI operation

---
**สร้างเมื่อ**: 01/10/2025 11:04  
**สถานะ**: ✅ แก้ไขเสร็จสิ้น พร้อมทดสอบ  
**ปุ่มที่แก้ไข**: 4 ปุ่ม (Add Holiday, Set FT, Save Holiday, Save/Update FT)
