# 🔍 Event Logging System - WebMeter

ระบบ Event Logging อัตโนมัติสำหรับการเก็บและติดตาม events ที่เกิดขึ้นในระบบ WebMeter

## 📋 ภาพรวมระบบ

ระบบ Event Logging ประกอบด้วย:
- **Event Logger Service** - หัวใจของระบบเก็บ events
- **Event Types & Categories** - การจัดหมวดหมู่ events
- **Auto-logging Integration** - การเก็บ events อัตโนมัติ
- **Event Monitoring Dashboard** - หน้าแสดงผล events

## 🚀 ฟีเจอร์หลัก

### ✅ Event Types ที่รองรับ:
- **LOGIN/LOGOUT** - การเข้า/ออกระบบ
- **DATA_ACCESS** - การเข้าถึงข้อมูล
- **CONFIG_CHANGE** - การเปลี่ยนแปลง configuration
- **SYSTEM_ERROR** - ข้อผิดพลาดระบบ
- **USER_ACTION** - การกระทำของผู้ใช้
- **NETWORK_EVENT** - เหตุการณ์เครือข่าย
- **SECURITY_EVENT** - เหตุการณ์ความปลอดภัย
- **EXPORT_DATA** - การ export ข้อมูล
- **SEND_REPORT** - การส่งรายงาน

### ✅ Event Severity Levels:
- **LOW** - เหตุการณ์ทั่วไป
- **MEDIUM** - เหตุการณ์ที่ควรสนใจ
- **HIGH** - เหตุการณ์สำคัญ
- **CRITICAL** - เหตุการณ์วิกฤต

## 📁 โครงสร้างไฟล์

```
src/
├── services/
│   ├── eventLogger.ts              # Event Logger Service หลัก
│   └── eventLoggerExamples.ts      # ตัวอย่างการใช้งาน
├── hooks/
│   └── useEventLogger.ts           # React Hook สำหรับ Event Logging
├── pages/
│   ├── Event.tsx                   # หน้าแสดง Events (อัปเดตแล้ว)
│   └── Login.tsx                   # หน้า Login (มี Event Logging)
└── utils/
    └── reportUtils.ts              # Report Utils (มี Event Logging)
```

## 🔧 การติดตั้งและใช้งาน

### 1. Import Event Logger

```typescript
// Import แบบ individual functions
import { 
  logLogin, 
  logDataAccess, 
  logUserAction, 
  logSystemError 
} from '@/services/eventLogger';

// หรือใช้ React Hook
import { useEventLogger } from '@/hooks/useEventLogger';
```

### 2. การใช้งานพื้นฐาน

```typescript
// ใน React Component
const { logPageAccess, logAction, logError } = useEventLogger();

// Log เมื่อเข้าหน้า
useEffect(() => {
  logPageAccess('Dashboard');
}, []);

// Log การกระทำของผู้ใช้
const handleButtonClick = () => {
  logAction('Export Data', { format: 'PDF', records: 100 });
};

// Log ข้อผิดพลาด
const handleError = (error: Error) => {
  logError('API Error', { message: error.message });
};
```

### 3. การใช้งานขั้นสูง

```typescript
// Log การเข้าสู่ระบบ
await logLogin('username', true); // สำเร็จ
await logLogin('username', false); // ล้มเหลว

// Log การเปลี่ยนแปลง configuration
await logConfigChange('user_settings', {
  oldValue: { theme: 'light' },
  newValue: { theme: 'dark' }
});

// Log security event
await logSecurityEvent('Suspicious login attempt', EventSeverity.HIGH);
```

## 📊 การดู Events

### หน้า Event Management
- เข้าไปที่หน้า `/events`
- กรองตามวันที่และเวลา
- ค้นหา events เฉพาะ
- Export และส่งรายงาน

### ข้อมูลที่แสดง:
- **ID** - รหัส event
- **Time** - เวลาที่เกิด event
- **Username** - ผู้ใช้ที่เกี่ยวข้อง
- **IP Address** - IP ที่เกิด event
- **Lognet IP** - IP ของ lognet
- **Event** - รายละเอียด event

## 🔄 การทำงานของระบบ

### Event Flow:
1. **Event เกิดขึ้น** - ในระบบต่างๆ
2. **Logger รับ Event** - ผ่าน logging functions
3. **เพิ่มข้อมูลเสริม** - username, IP, timestamp
4. **เก็บใน Queue** - รอการส่งไป API
5. **ส่งไป Database** - ผ่าน API endpoint
6. **แสดงผลในหน้า Event** - สำหรับ monitoring

### Auto-flush Mechanism:
- ส่ง events ทุก 30 วินาที
- ส่งทันทีสำหรับ events ที่มี severity HIGH/CRITICAL
- Retry mechanism สำหรับ events ที่ส่งไม่สำเร็จ

## 🎯 ตัวอย่างการใช้งานในหน้าต่างๆ

### Login Page:
```typescript
// เมื่อ login สำเร็จ
await logLogin(username, true);

// เมื่อ login ล้มเหลว
await logLogin(username, false);

// เมื่อ account ถูก lock
await logSecurityEvent(`Account locked: ${username}`, EventSeverity.HIGH);
```

### Dashboard:
```typescript
// เมื่อเข้าหน้า dashboard
logPageAccess('Dashboard');

// เมื่อเปลี่ยน date range
logAction('Change Date Range', { from, to });

// เมื่อเลือก meter
logAction('Select Meter', { meterId, meterName });
```

### Table Data:
```typescript
// เมื่อ search ข้อมูล
logSearch('Table Data', filters, resultCount);

// เมื่อ export ข้อมูล
logExport('PDF', 'Table Data', recordCount);

// เมื่อส่งรายงาน
logSendReport('Table Data Report', recipients, 'email');
```

## ⚙️ การปรับแต่ง

### เปิด/ปิด Event Logging:
```typescript
import { eventLogger } from '@/services/eventLogger';

// ปิด logging
eventLogger.setEnabled(false);

// เปิด logging
eventLogger.setEnabled(true);
```

### Custom Event Types:
```typescript
import { logEvent, EventType } from '@/services/eventLogger';

// Log custom event
await logEvent({
  eventType: EventType.USER_ACTION,
  event: 'Custom Action',
  description: 'User performed custom action',
  severity: EventSeverity.LOW,
  metadata: { customData: 'value' }
});
```

## 🔍 การ Debug

### Console Logs:
ระบบจะแสดง console logs สำหรับ:
- การเก็บ events
- การส่ง events ไป API
- ข้อผิดพลาดในการส่ง
- การ retry

### ตัวอย่าง Console Output:
```
📝 Logging event: { eventType: 'LOGIN', event: 'User Login Successful', ... }
📤 Flushing 5 events to API
✅ Event logged successfully: User Login Successful
❌ Failed to log event: Network error
```

## 🚨 ข้อควรระวัง

1. **Performance** - ระบบใช้ queue และ batch sending เพื่อลด impact
2. **Storage** - Events จะเก็บในฐานข้อมูล ควร cleanup เป็นระยะ
3. **Privacy** - ระวังการเก็บข้อมูลส่วนตัวใน event logs
4. **Network** - Events อาจหายหากมีปัญหาเครือข่าย

## 📈 การ Monitoring

### ตัวชี้วัดที่ควรติดตาม:
- จำนวน events ต่อวัน
- Event types ที่เกิดบ่อย
- Security events
- System errors
- User activity patterns

### การ Alert:
- CRITICAL events ควร alert ทันที
- HIGH severity events ควร review
- ปริมาณ events ผิดปกติ

## 🔮 การพัฒนาต่อ

### ฟีเจอร์ที่อาจเพิ่มในอนาคต:
- Real-time event streaming
- Event analytics dashboard
- Automated alerting system
- Event correlation และ pattern detection
- Event archiving และ cleanup
- Advanced filtering และ search

---

## 📞 การสนับสนุน

หากมีปัญหาหรือข้อสงสัยเกี่ยวกับระบบ Event Logging:
1. ตรวจสอบ console logs
2. ดู event examples ใน `eventLoggerExamples.ts`
3. ทดสอบการส่ง events ผ่าน API

**ระบบ Event Logging พร้อมใช้งานแล้ว! 🎉**

## 📋 ภาพรวมระบบ

ระบบนี้จะเก็บเฉพาะ **เหตุการณ์สำคัญ** ที่ผู้ใช้ทำการเปลี่ยนแปลงข้อมูลในระบบ **ไม่เก็บ** การเข้าถึงหน้าเว็บ, การค้นหา, หรือการ export ทั่วไป

### ✅ เหตุการณ์ที่เก็บ:
- **Export Data**: เพิ่ม Schedule
- **Email/Line Management**: เพิ่ม Email, Group, LINE, การจัดการ User ใน Group
- **User Management**: เพิ่ม User, Role, การกำหนด Role
- **Meter Tree**: จัดการ Location, Lognet, Meter, Floor, การเปิด/ปิด Online
- **Holiday/FT**: จัดการวันหยุด, FT Rate, การเปิด/ปิด FT

### ❌ เหตุการณ์ที่ไม่เก็บ:
- การเข้าถึงหน้าเว็บ (Page Access)
- การค้นหาข้อมูล (Search)
- การ Export ข้อมูลทั่วไป
- การดูข้อมูล (View)

## 📁 Files

### 1. `src/services/eventLogger.ts`
- **EventLogger Class**: Singleton class สำหรับจัดการ event logging
- **Event Types**: 40+ event types สำหรับเหตุการณ์สำคัญ
- **Logging Methods**: Methods เฉพาะสำหรับแต่ละประเภทเหตุการณ์
- **Smart Username Detection**: ระบบแยกแยะระหว่าง username จริงกับ user level

### 2. `src/services/eventLoggerExamples.ts`
- ตัวอย่างการใช้งาน Event Logger สำหรับเหตุการณ์สำคัญ
- Helper functions สำหรับแต่ละหน้า
- Code examples สำหรับการ integrate

### 3. `src/pages/Event.tsx`
- หน้าสำหรับดู Events ที่เกิดขึ้นในระบบ (View Only)
- ฟีเจอร์กรอง, ค้นหา, และ export events
- **ไม่มีการเพิ่ม events แบบ manual** (อัตโนมัติเท่านั้น)
- **ไม่ log การเข้าถึงหน้านี้**

## 🏷️ Event Types

### 🔐 Authentication
- `LOGIN` - การเข้าสู่ระบบ
- `LOGOUT` - การออกจากระบบ

### 📊 Export Data Management
- `SCHEDULE_ADD` - เพิ่ม Schedule ใหม่

### 📧 Email/Line Management
- `EMAIL_ADD` - เพิ่ม Email
- `EMAIL_GROUP_ADD` - เพิ่ม Email Group
- `LINE_ADD` - เพิ่ม LINE Contact
- `LINE_GROUP_ADD` - เพิ่ม LINE Group
- `USER_ADD_TO_GROUP` - เพิ่ม User เข้า Group
- `USER_MOVE_TO_GROUP` - ย้าย User ระหว่าง Group

### 👥 User Management
- `USER_ADD` - เพิ่ม User ใหม่
- `ROLE_ADD` - เพิ่ม Role ใหม่
- `USER_SET_ROLE` - กำหนด Role ให้ User

### 🏢 Meter Tree Management
- `LOCATION_ADD/EDIT/DELETE` - จัดการ Location
- `LOGNET_ADD/EDIT/DELETE` - จัดการ Lognet
- `METER_ADD/EDIT/DELETE` - จัดการ Meter
- `FLOOR_ADD/EDIT/DELETE` - จัดการ Floor
- `METER_ONLINE_ENABLE/DISABLE` - เปิด/ปิด Meter Online
- `FILE_IMPORT` - Import ไฟล์

### 📅 Holiday/FT Management
- `HOLIDAY_ADD/EDIT/DELETE` - จัดการวันหยุด
- `FT_SET/EDIT/DELETE` - จัดการ FT Rate
- `FT_ACTIVATE/DEACTIVATE` - เปิด/ปิด FT

### 🔒 System Events
- `SECURITY_EVENT` - เหตุการณ์ด้านความปลอดภัย

## 💻 Usage Examples

### Export Data Management
```typescript
import { logScheduleAdd } from '@/services/eventLogger';

const handleCreateSchedule = async (scheduleData: any) => {
  try {
    const result = await createScheduleAPI(scheduleData);
    if (result.success) {
      await logScheduleAdd(scheduleData);
      toast.success('Schedule created successfully');
    }
  } catch (error) {
    console.error('Failed to create schedule:', error);
  }
};
```

### Email/Line Management
```typescript
import { logEmailGroupAdd, logUserAddToGroup } from '@/services/eventLogger';

const handleCreateEmailGroup = async (groupData: any) => {
  try {
    const result = await createEmailGroupAPI(groupData);
    if (result.success) {
      await logEmailGroupAdd(groupData);
      toast.success('Email group created');
    }
  } catch (error) {
    console.error('Failed to create email group:', error);
  }
};

const handleAddUserToGroup = async (userId: string, groupId: string) => {
  try {
    const result = await addUserToGroupAPI(userId, groupId);
    if (result.success) {
      await logUserAddToGroup({ userId }, { groupId });
      toast.success('User added to group');
    }
  } catch (error) {
    console.error('Failed to add user to group:', error);
  }
};
```

### User Management
```typescript
import { logUserAdd, logUserSetRole } from '@/services/eventLogger';

const handleCreateUser = async (userData: any) => {
  try {
    const result = await createUserAPI(userData);
    if (result.success) {
      await logUserAdd(userData);
      toast.success('User created successfully');
    }
  } catch (error) {
    console.error('Failed to create user:', error);
  }
};

const handleSetUserRole = async (userId: string, roleId: string) => {
  try {
    const result = await setUserRoleAPI(userId, roleId);
    if (result.success) {
      await logUserSetRole({ userId }, { roleId });
      toast.success('User role updated');
    }
  } catch (error) {
    console.error('Failed to set user role:', error);
  }
};
```

### Meter Tree Management
```typescript
import { 
  logMeterAdd, 
  logMeterEdit, 
  logMeterDelete,
  logMeterOnlineEnable,
  logMeterOnlineDisable 
} from '@/services/eventLogger';

const handleCreateMeter = async (meterData: any) => {
  try {
    const result = await createMeterAPI(meterData);
    if (result.success) {
      await logMeterAdd(meterData);
      toast.success('Meter created successfully');
    }
  } catch (error) {
    console.error('Failed to create meter:', error);
  }
};

const handleToggleMeterOnline = async (meterId: string, enabled: boolean) => {
  try {
    const result = await toggleMeterOnlineAPI(meterId, enabled);
    if (result.success) {
      const meterData = { meterId, enabled };
      if (enabled) {
        await logMeterOnlineEnable(meterData);
      } else {
        await logMeterOnlineDisable(meterData);
      }
      toast.success(`Meter online ${enabled ? 'enabled' : 'disabled'}`);
    }
  } catch (error) {
    console.error('Failed to toggle meter online:', error);
  }
};
```

### Holiday/FT Management
```typescript
import { 
  logHolidayAdd, 
  logFtSet, 
  logFtActivate, 
  logFtDeactivate 
} from '@/services/eventLogger';

const handleCreateHoliday = async (holidayData: any) => {
  try {
    const result = await createHolidayAPI(holidayData);
    if (result.success) {
      await logHolidayAdd(holidayData);
      toast.success('Holiday created successfully');
    }
  } catch (error) {
    console.error('Failed to create holiday:', error);
  }
};

const handleToggleFt = async (ftId: string, active: boolean) => {
  try {
    const result = await toggleFtAPI(ftId, active);
    if (result.success) {
      const ftData = { ftId, active };
      if (active) {
        await logFtActivate(ftData);
      } else {
        await logFtDeactivate(ftData);
      }
      toast.success(`FT ${active ? 'activated' : 'deactivated'}`);
    }
  } catch (error) {
    console.error('Failed to toggle FT:', error);
  }
};
```

## 🔧 Smart Username Detection

ระบบจะแยกแยะระหว่าง **username จริง** กับ **user level** อัตโนมัติ:

```typescript
// ลำดับความสำคัญในการหา username:
// 1. payload.username (ชื่อ user จริง)
// 2. payload.displayName 
// 3. payload.name (ถ้าไม่ใช่ level)
// 4. payload.email
// 5. localStorage values

// Level ที่ระบบรู้จัก:
['guest', 'operator', 'admin', 'manager', 'supervisor', 'engineer']
```

### ตัวอย่างผลลัพธ์:
```
// เดิม (ผิด):
username: 'Operator'  ← level
username: 'guest'     ← level

// ใหม่ (ถูก):
username: 'gaiii'     ← ชื่อ user จริง
username: 'admin_user' ← ชื่อ user จริง
```

## 📊 Event Severity Levels

- **LOW**: การเพิ่มข้อมูลทั่วไป (Holiday, Email)
- **MEDIUM**: การจัดการข้อมูลสำคัญ (Schedule, Group, Location, Meter)
- **HIGH**: การจัดการระบบ (User, Role, Lognet, FT)
- **CRITICAL**: การลบข้อมูลสำคัญ (Delete Lognet)

## ⚡ Features

### Automatic Batching
- Events จะถูกเก็บใน queue และส่งเป็น batch ทุก 30 วินาที
- ลดการเรียก API และปรับปรุงประสิทธิภาพ

### Error Handling
- Retry mechanism สำหรับ failed requests
- Graceful degradation เมื่อ API ไม่พร้อมใช้งาน

### User Context Detection
- ระบบจะดึงข้อมูล user จาก localStorage และ JWT tokens อัตโนมัติ
- แยกแยะระหว่าง username จริงกับ user level
- รองรับทั้ง regular users และ guest users

### IP Detection
- ระบบจะพยายามดึง IP address ของผู้ใช้
- Fallback เป็น default IP หากไม่สามารถดึงได้

## 🎯 Best Practices

### 1. เรียกใช้หลังจาก API Success เท่านั้น
```typescript
// ✅ ถูกต้อง
const result = await createUserAPI(userData);
if (result.success) {
  await logUserAdd(userData);  // เรียกหลัง API success
}

// ❌ ผิด
await logUserAdd(userData);    // เรียกก่อน API
const result = await createUserAPI(userData);
```

### 2. ใส่ข้อมูลที่เป็นประโยชน์ใน metadata
```typescript
// ✅ ดี
await logMeterAdd({
  meterId: 'M001',
  meterName: 'Main Building Meter',
  location: 'Building A',
  type: 'Electric'
});

// ❌ ไม่ดี
await logMeterAdd({});
```

### 3. Handle Errors อย่างเหมาะสม
```typescript
try {
  const result = await createMeterAPI(meterData);
  if (result.success) {
    await logMeterAdd(meterData);
  }
} catch (error) {
  console.error('Failed to create meter:', error);
  // ไม่ต้อง log error ของการสร้าง meter
  // เก็บเฉพาะ success events
}
```

### 4. ไม่ Log ข้อมูลลับ
```typescript
// ❌ อันตราย
await logUserAdd({
  username: 'john',
  password: 'secret123',  // ไม่ควร log password
  email: 'john@example.com'
});

// ✅ ปลอดภัย
await logUserAdd({
  username: 'john',
  email: 'john@example.com',
  role: 'operator'
});
```

## 📈 Monitoring

### Event Dashboard (`/events`)
- ดู events ที่เกิดขึ้นในระบบ (View Only)
- กรองตามวันที่, เวลา, และประเภท event
- ค้นหา events ตามคำสำคัญ
- Export events เป็น PDF, CSV, หรือ Image
- ส่งรายงาน events ผ่าน Email หรือ LINE
- **ไม่ log การเข้าถึงหน้านี้**

### Real-time Monitoring
Events จะถูกส่งไปยัง server และเก็บใน database เพื่อการวิเคราะห์และ monitoring

## 🔍 Troubleshooting

### Events ไม่ถูกส่ง
1. ตรวจสอบ network connection
2. ตรวจสอบ API endpoint ใน browser console
3. ดู error messages ใน console

### Username แสดงเป็น Level แทนชื่อจริง
1. ใช้ Debug button ในหน้า Event
2. ตรวจสอบ JWT token payload
3. ตรวจสอบ localStorage: `userUsername`, `userEmail`, `auth_token`

### Performance Issues
1. ปรับ batch size และ flush interval
2. ลด frequency ของการ log events
3. ใช้ async logging เสมอ

## 🚀 Migration จากระบบเก่า

หากมีการใช้ Event Logging แบบเก่า ให้:

1. **ลบการ log ที่ไม่จำเป็น**:
   ```typescript
   // ลบออก
   logDataAccess('Page Name');
   logUserAction('Search');
   logExportData('PDF', 'Table Data');
   ```

2. **เปลี่ยนเป็น event ใหม่**:
   ```typescript
   // เปลี่ยนจาก
   logConfigChange('User Settings', changes);
   
   // เป็น
   logUserSetRole(userData, roleData);
   ```

3. **เพิ่ม logging ในจุดสำคัญ**:
   ```typescript
   // เพิ่มใน create/edit/delete functions
   await logMeterAdd(meterData);
   await logHolidayEdit(holidayData);
   await logUserDelete(userData);
   
