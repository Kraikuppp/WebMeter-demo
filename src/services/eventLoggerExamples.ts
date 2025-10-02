// ตัวอย่างการใช้งาน Event Logger - เฉพาะเหตุการณ์สำคัญ
import { 
  // Authentication
  logLogin, 
  logLogout,
  
  // Export Data Management
  logScheduleAdd,
  
  // Email/Line Management
  logEmailAdd,
  logEmailGroupAdd,
  logLineAdd,
  logLineGroupAdd,
  logUserAddToGroup,
  logUserMoveToGroup,
  
  // User Management
  logUserAdd,
  logRoleAdd,
  logUserSetRole,
  
  // Meter Tree Management
  logLocationAdd,
  logLocationEdit,
  logLocationDelete,
  logLognetAdd,
  logLognetEdit,
  logLognetDelete,
  logMeterAdd,
  logMeterEdit,
  logMeterDelete,
  logFloorAdd,
  logFloorEdit,
  logFloorDelete,
  logMeterOnlineEnable,
  logMeterOnlineDisable,
  logFileImport,
  
  // Holiday/FT Management
  logHolidayAdd,
  logHolidayEdit,
  logHolidayDelete,
  logFtSet,
  logFtEdit,
  logFtDelete,
  logFtActivate,
  logFtDeactivate,
  
  // System Events
  logSecurityEvent,
  EventSeverity 
} from './eventLogger';

// ตัวอย่างการใช้งานในหน้าต่างๆ

// === 1. Authentication ===
export const handleLogin = async (username: string, success: boolean) => {
  await logLogin(username, success);
};

export const handleLogout = async (username: string) => {
  await logLogout(username);
};

// === 2. Export Data Management ===
export const handleAddSchedule = async (scheduleData: any) => {
  await logScheduleAdd(scheduleData);
};

// === 3. Email/Line Management ===
export const handleAddEmail = async (emailData: any) => {
  await logEmailAdd(emailData);
};

export const handleAddEmailGroup = async (groupData: any) => {
  await logEmailGroupAdd(groupData);
};

export const handleAddLineContact = async (lineData: any) => {
  await logLineAdd(lineData);
};

export const handleAddLineGroup = async (groupData: any) => {
  await logLineGroupAdd(groupData);
};

export const handleAddUserToGroup = async (userData: any, groupData: any) => {
  await logUserAddToGroup(userData, groupData);
};

export const handleMoveUserToGroup = async (userData: any, fromGroup: any, toGroup: any) => {
  await logUserMoveToGroup(userData, fromGroup, toGroup);
};

// === 4. User Management ===
export const handleAddUser = async (userData: any) => {
  await logUserAdd(userData);
};

export const handleAddRole = async (roleData: any) => {
  await logRoleAdd(roleData);
};

export const handleSetUserRole = async (userData: any, roleData: any) => {
  await logUserSetRole(userData, roleData);
};

// === 5. Meter Tree Management ===
export const handleAddLocation = async (locationData: any) => {
  await logLocationAdd(locationData);
};

export const handleEditLocation = async (locationData: any) => {
  await logLocationEdit(locationData);
};

export const handleDeleteLocation = async (locationData: any) => {
  await logLocationDelete(locationData);
};

export const handleAddLognet = async (lognetData: any) => {
  await logLognetAdd(lognetData);
};

export const handleEditLognet = async (lognetData: any) => {
  await logLognetEdit(lognetData);
};

export const handleDeleteLognet = async (lognetData: any) => {
  await logLognetDelete(lognetData);
};

export const handleAddMeter = async (meterData: any) => {
  await logMeterAdd(meterData);
};

export const handleEditMeter = async (meterData: any) => {
  await logMeterEdit(meterData);
};

export const handleDeleteMeter = async (meterData: any) => {
  await logMeterDelete(meterData);
};

export const handleAddFloor = async (floorData: any) => {
  await logFloorAdd(floorData);
};

export const handleEditFloor = async (floorData: any) => {
  await logFloorEdit(floorData);
};

export const handleDeleteFloor = async (floorData: any) => {
  await logFloorDelete(floorData);
};

export const handleEnableMeterOnline = async (meterData: any) => {
  await logMeterOnlineEnable(meterData);
};

export const handleDisableMeterOnline = async (meterData: any) => {
  await logMeterOnlineDisable(meterData);
};

export const handleImportFile = async (fileData: any) => {
  await logFileImport(fileData);
};

// === 6. Holiday/FT Management ===
export const handleAddHoliday = async (holidayData: any) => {
  await logHolidayAdd(holidayData);
};

export const handleEditHoliday = async (holidayData: any) => {
  await logHolidayEdit(holidayData);
};

export const handleDeleteHoliday = async (holidayData: any) => {
  await logHolidayDelete(holidayData);
};

export const handleSetFt = async (ftData: any) => {
  await logFtSet(ftData);
};

export const handleEditFt = async (ftData: any) => {
  await logFtEdit(ftData);
};

export const handleDeleteFt = async (ftData: any) => {
  await logFtDelete(ftData);
};

export const handleActivateFt = async (ftData: any) => {
  await logFtActivate(ftData);
};

export const handleDeactivateFt = async (ftData: any) => {
  await logFtDeactivate(ftData);
};

// === 7. System Events ===
export const handleSecurityEvent = async (event: string, severity: EventSeverity = EventSeverity.HIGH) => {
  await logSecurityEvent(event, severity);
};

// ตัวอย่างการใช้งานในระบบ Security
export const securityEventExamples = {
  // เมื่อมีการพยายาม access ที่ไม่ได้รับอนุญาต
  onUnauthorizedAccess: async (resource: string, username: string) => {
    await handleSecurityEvent(`Unauthorized access attempt: ${resource} by ${username}`, EventSeverity.HIGH);
  },

  // เมื่อมีการ login จาก IP ใหม่
  onNewIPLogin: async (username: string, ip: string) => {
    await handleSecurityEvent(`Login from new IP: ${username} from ${ip}`, EventSeverity.MEDIUM);
  },

  // เมื่อมีการเปลี่ยน password
  onPasswordChange: async (username: string) => {
    await handleSecurityEvent(`Password changed: ${username}`, EventSeverity.LOW);
  },

  // เมื่อมี rate limiting
  onRateLimit: async (endpoint: string, ip: string) => {
    await handleSecurityEvent(`Rate limit exceeded: ${endpoint} from ${ip}`, EventSeverity.MEDIUM);
  }
};

// ตัวอย่างการใช้งานในหน้าต่างๆ:

/*
=== ในหน้า Export Data ===
const handleCreateSchedule = async (scheduleData: any) => {
  try {
    const result = await createScheduleAPI(scheduleData);
    if (result.success) {
      await handleAddSchedule(scheduleData);
      toast.success('Schedule created successfully');
    }
  } catch (error) {
    console.error('Failed to create schedule:', error);
  }
};

=== ในหน้า Email Management ===
const handleCreateEmailGroup = async (groupData: any) => {
  try {
    const result = await createEmailGroupAPI(groupData);
    if (result.success) {
      await handleAddEmailGroup(groupData);
      toast.success('Email group created successfully');
    }
  } catch (error) {
    console.error('Failed to create email group:', error);
  }
};

=== ในหน้า User Management ===
const handleCreateUser = async (userData: any) => {
  try {
    const result = await createUserAPI(userData);
    if (result.success) {
      await handleAddUser(userData);
      toast.success('User created successfully');
    }
  } catch (error) {
    console.error('Failed to create user:', error);
  }
};

=== ในหน้า Meter Tree ===
const handleCreateMeter = async (meterData: any) => {
  try {
    const result = await createMeterAPI(meterData);
    if (result.success) {
      await handleAddMeter(meterData);
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
        await handleEnableMeterOnline(meterData);
      } else {
        await handleDisableMeterOnline(meterData);
      }
      toast.success(`Meter online ${enabled ? 'enabled' : 'disabled'}`);
    }
  } catch (error) {
    console.error('Failed to toggle meter online:', error);
  }
};

=== ในหน้า Holiday Management ===
const handleCreateHoliday = async (holidayData: any) => {
  try {
    const result = await createHolidayAPI(holidayData);
    if (result.success) {
      await handleAddHoliday(holidayData);
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
        await handleActivateFt(ftData);
      } else {
        await handleDeactivateFt(ftData);
      }
      toast.success(`FT ${active ? 'activated' : 'deactivated'}`);
    }
  } catch (error) {
    console.error('Failed to toggle FT:', error);
  }
};
*/
