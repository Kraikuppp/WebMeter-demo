// Event Logger Service - สำหรับเก็บ events อัตโนมัติ
import { apiClient } from './api';

// Event Types สำหรับเหตุการณ์สำคัญเท่านั้น
export enum EventType {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  
  // Export Data Management
  SCHEDULE_ADD = 'SCHEDULE_ADD',
  
  // Email/Line Management  
  EMAIL_ADD = 'EMAIL_ADD',
  EMAIL_GROUP_ADD = 'EMAIL_GROUP_ADD',
  LINE_ADD = 'LINE_ADD',
  LINE_GROUP_ADD = 'LINE_GROUP_ADD',
  USER_ADD_TO_GROUP = 'USER_ADD_TO_GROUP',
  USER_MOVE_TO_GROUP = 'USER_MOVE_TO_GROUP',
  
  // User Management
  USER_ADD = 'USER_ADD',
  USER_DELETE = 'USER_DELETE',
  ROLE_ADD = 'ROLE_ADD',
  USER_SET_ROLE = 'USER_SET_ROLE',
  
  // Meter Tree Management
  LOCATION_ADD = 'LOCATION_ADD',
  LOCATION_EDIT = 'LOCATION_EDIT',
  LOCATION_DELETE = 'LOCATION_DELETE',
  LOGNET_ADD = 'LOGNET_ADD',
  LOGNET_EDIT = 'LOGNET_EDIT',
  LOGNET_DELETE = 'LOGNET_DELETE',
  METER_ADD = 'METER_ADD',
  METER_EDIT = 'METER_EDIT',
  METER_DELETE = 'METER_DELETE',
  FLOOR_ADD = 'FLOOR_ADD',
  FLOOR_EDIT = 'FLOOR_EDIT',
  FLOOR_DELETE = 'FLOOR_DELETE',
  METER_ONLINE_ENABLE = 'METER_ONLINE_ENABLE',
  METER_ONLINE_DISABLE = 'METER_ONLINE_DISABLE',
  FILE_IMPORT = 'FILE_IMPORT',
  
  // Holiday/FT Management
  HOLIDAY_ADD = 'HOLIDAY_ADD',
  HOLIDAY_EDIT = 'HOLIDAY_EDIT',
  HOLIDAY_DELETE = 'HOLIDAY_DELETE',
  FT_SET = 'FT_SET',
  FT_EDIT = 'FT_EDIT',
  FT_DELETE = 'FT_DELETE',
  FT_ACTIVATE = 'FT_ACTIVATE',
  FT_DEACTIVATE = 'FT_DEACTIVATE',
  
  // System Events
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SECURITY_EVENT = 'SECURITY_EVENT'
}

export enum EventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface EventLogData {
  eventType: EventType;
  event: string;
  description?: string;
  severity?: EventSeverity;
  user?: string;
  ip?: string;
  lognetIp?: string;
  metadata?: Record<string, any>;
}

class EventLogger {
  private static instance: EventLogger;
  private isEnabled: boolean = true;
  private queue: EventLogData[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    // Initialize event logger
    this.setupAutoFlush();
  }

  public static getInstance(): EventLogger {
    if (!EventLogger.instance) {
      EventLogger.instance = new EventLogger();
    }
    return EventLogger.instance;
  }

  // เปิด/ปิดการเก็บ event logs
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`🔄 Event Logger ${enabled ? 'enabled' : 'disabled'}`);
  }

  // เก็บ event log
  public async log(eventData: EventLogData): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // เพิ่มข้อมูลพื้นฐาน
      const enrichedEvent: EventLogData = {
        ...eventData,
        user: eventData.user || this.getCurrentUser(),
        ip: eventData.ip || this.getCurrentUserIP(),
        lognetIp: eventData.lognetIp || this.getCurrentUserIP(),
        severity: eventData.severity || EventSeverity.LOW
      };

      console.log('📝 Logging event:', enrichedEvent);

      // เพิ่มลง queue
      this.queue.push(enrichedEvent);

      // ถ้าเป็น event ที่สำคัญ ส่งทันที
      if (eventData.severity === EventSeverity.CRITICAL || eventData.severity === EventSeverity.HIGH) {
        await this.flush();
      }
    } catch (error) {
      console.error('❌ Error logging event:', error);
    }
  }

  // ส่ง events ที่อยู่ใน queue ไปยัง API
  private async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      console.log(`📤 Flushing ${eventsToSend.length} events to API`);

      // ส่งทีละ event (ในระบบจริงอาจส่งเป็น batch)
      for (const eventData of eventsToSend) {
        try {
          const response = await apiClient.createEvent({
            username: eventData.user || 'system',
            ip: eventData.ip || '127.0.0.1',
            lognetIp: eventData.lognetIp || '127.0.0.1',
            event: eventData.event,
            description: eventData.description || JSON.stringify({
              type: eventData.eventType,
              severity: eventData.severity,
              metadata: eventData.metadata
            })
          });

          if (response.success) {
            console.log('✅ Event logged successfully:', eventData.event);
          } else {
            console.error('❌ Failed to log event:', response.error);
            // ใส่กลับเข้า queue หากส่งไม่สำเร็จ
            this.queue.unshift(eventData);
          }
        } catch (error) {
          console.error('❌ Error sending event:', error);
          // ใส่กลับเข้า queue หากส่งไม่สำเร็จ
          this.queue.unshift(eventData);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Auto-flush ทุก 30 วินาที
  private setupAutoFlush(): void {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, 30000); // 30 seconds
  }

  // Helper methods
  private getCurrentUser(): string {
    try {
      // ใช้วิธีเดียวกับ navigation แต่แยก username และ level ให้ชัดเจน
      const token = localStorage.getItem('auth_token');
      let username = localStorage.getItem('userUsername') || localStorage.getItem('userEmail') || '';
      let actualUsername = username; // เก็บ username จริงไว้ก่อน
      
      console.log('🔍 Event Logger Debug:');
      console.log('📝 Initial userUsername:', localStorage.getItem('userUsername'));
      console.log('📝 Initial userEmail:', localStorage.getItem('userEmail'));
      
      // ลองดึงจาก JWT token ถ้ามี
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1] || ''));
          console.log('🔓 Token payload:', payload);
          
          // ใน navigation: if (payload?.name) username = payload.name;
          // แต่ payload.name อาจเป็น level ไม่ใช่ username จริง
          // ใช้ลำดับความสำคัญ: username > displayName > name > email
          if (payload.username) {
            actualUsername = payload.username;
            console.log('✅ Using payload.username:', actualUsername);
          } else if (payload.displayName) {
            actualUsername = payload.displayName;
            console.log('✅ Using payload.displayName:', actualUsername);
          } else if (payload.name && !['guest', 'operator', 'admin', 'manager', 'supervisor', 'engineer'].includes(payload.name.toLowerCase())) {
            // ใช้ payload.name เฉพาะเมื่อไม่ใช่ level
            actualUsername = payload.name;
            console.log('✅ Using payload.name (not a level):', actualUsername);
          } else if (payload.name) {
            // ถ้า payload.name เป็น level แต่ไม่มี username อื่น ให้ใช้ name ก่อน
            actualUsername = payload.name;
            console.log('✅ Using payload.name (might be username):', actualUsername);
          } else if (payload.email) {
            actualUsername = payload.email;
            console.log('✅ Using payload.email:', actualUsername);
          } else {
            console.log('⚠️ No suitable username field found in payload');
          }
        } catch (decodeError) {
          console.error('❌ Error decoding token:', decodeError);
        }
      }
      
      // ถ้ายังไม่มี username ลองหาจาก authToken
      if (!actualUsername || actualUsername === 'null' || actualUsername === 'undefined') {
        console.log('⚠️ No username from auth_token, trying authToken...');
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          try {
            const payload = JSON.parse(atob(authToken.split('.')[1] || ''));
            console.log('🔓 AuthToken payload:', payload);
            actualUsername = payload.username || payload.displayName || payload.email || '';
            console.log('✅ Using username from authToken:', actualUsername);
          } catch (decodeError) {
            console.error('❌ Error decoding authToken:', decodeError);
          }
        }
      }
      
      // ถ้ามี username ให้ใช้ (ไม่ override เป็น guest)
      if (actualUsername && actualUsername !== 'null' && actualUsername !== 'undefined') {
        console.log('✅ Final username:', actualUsername);
        return actualUsername;
      }
      
      // เฉพาะเมื่อไม่มี username จริงเลย ถึงจะใช้ 'guest'
      const isGuest = localStorage.getItem('isGuest');
      if (isGuest === 'true') {
        console.log('👤 Guest user detected (no real username found)');
        return 'guest';
      }
      
    } catch (error) {
      console.error('❌ Error getting current user:', error);
    }
    
    console.log('⚠️ Event Logger - No user found, using anonymous');
    return 'anonymous';
  }

  private getCurrentUserIP(): string {
    // ในระบบจริงจะได้จาก server หรือ API
    return '192.168.1.100';
  }

  // Convenience methods สำหรับ event types ต่างๆ
  public async logLogin(username: string, success: boolean = true): Promise<void> {
    await this.log({
      eventType: EventType.LOGIN,
      event: success ? 'User Login Successful' : 'User Login Failed',
      description: `User ${username} ${success ? 'logged in' : 'failed to login'}`,
      severity: success ? EventSeverity.LOW : EventSeverity.MEDIUM,
      user: username,
      metadata: { success, timestamp: new Date().toISOString() }
    });
  }

  public async logLogout(username: string): Promise<void> {
    await this.log({
      eventType: EventType.LOGOUT,
      event: 'User Logout',
      description: `User ${username} logged out`,
      severity: EventSeverity.LOW,
      user: username,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  // Meter Tree Management
  public async logLocationAdd(locationData: any): Promise<void> {
    await this.log({
      eventType: EventType.LOCATION_ADD,
      event: 'Location Added',
      description: `User added new location`,
      severity: EventSeverity.MEDIUM,
      metadata: { locationData, timestamp: new Date().toISOString() }
    });
  }

  public async logLocationEdit(locationData: any): Promise<void> {
    await this.log({
      eventType: EventType.LOCATION_EDIT,
      event: 'Location Edited',
      description: `User edited location`,
      severity: EventSeverity.MEDIUM,
      metadata: { locationData, timestamp: new Date().toISOString() }
    });
  }

  public async logLocationDelete(locationData: any): Promise<void> {
    await this.log({
      eventType: EventType.LOCATION_DELETE,
      event: 'Location Deleted',
      description: `User deleted location`,
      severity: EventSeverity.HIGH,
      metadata: { locationData, timestamp: new Date().toISOString() }
    });
  }

  public async logLognetAdd(lognetData: any): Promise<void> {
    await this.log({
      eventType: EventType.LOGNET_ADD,
      event: 'Lognet Added',
      description: `User added new lognet`,
      severity: EventSeverity.HIGH,
      metadata: { lognetData, timestamp: new Date().toISOString() }
    });
  }

  public async logLognetEdit(lognetData: any): Promise<void> {
    await this.log({
      eventType: EventType.LOGNET_EDIT,
      event: 'Lognet Edited',
      description: `User edited lognet configuration`,
      severity: EventSeverity.HIGH,
      metadata: { lognetData, timestamp: new Date().toISOString() }
    });
  }

  public async logLognetDelete(lognetData: any): Promise<void> {
    await this.log({
      eventType: EventType.LOGNET_DELETE,
      event: 'Lognet Deleted',
      description: `User deleted lognet`,
      severity: EventSeverity.CRITICAL,
      metadata: { lognetData, timestamp: new Date().toISOString() }
    });
  }

  public async logMeterAdd(meterData: any): Promise<void> {
    await this.log({
      eventType: EventType.METER_ADD,
      event: 'Meter Added',
      description: `User added new meter`,
      severity: EventSeverity.MEDIUM,
      metadata: { meterData, timestamp: new Date().toISOString() }
    });
  }

  public async logMeterEdit(meterData: any): Promise<void> {
    await this.log({
      eventType: EventType.METER_EDIT,
      event: 'Meter Edited',
      description: `User edited meter configuration`,
      severity: EventSeverity.MEDIUM,
      metadata: { meterData, timestamp: new Date().toISOString() }
    });
  }

  public async logMeterDelete(meterData: any): Promise<void> {
    await this.log({
      eventType: EventType.METER_DELETE,
      event: 'Meter Deleted',
      description: `User deleted meter`,
      severity: EventSeverity.HIGH,
      metadata: { meterData, timestamp: new Date().toISOString() }
    });
  }

  public async logFloorAdd(floorData: any): Promise<void> {
    await this.log({
      eventType: EventType.FLOOR_ADD,
      event: 'Floor Added',
      description: `User added new floor`,
      severity: EventSeverity.MEDIUM,
      metadata: { floorData, timestamp: new Date().toISOString() }
    });
  }

  public async logFloorEdit(floorData: any): Promise<void> {
    await this.log({
      eventType: EventType.FLOOR_EDIT,
      event: 'Floor Edited',
      description: `User edited floor`,
      severity: EventSeverity.MEDIUM,
      metadata: { floorData, timestamp: new Date().toISOString() }
    });
  }

  public async logFloorDelete(floorData: any): Promise<void> {
    await this.log({
      eventType: EventType.FLOOR_DELETE,
      event: 'Floor Deleted',
      description: `User deleted floor`,
      severity: EventSeverity.HIGH,
      metadata: { floorData, timestamp: new Date().toISOString() }
    });
  }

  public async logMeterOnlineEnable(meterData: any): Promise<void> {
    await this.log({
      eventType: EventType.METER_ONLINE_ENABLE,
      event: 'Meter Online Enabled',
      description: `User enabled meter online monitoring`,
      severity: EventSeverity.MEDIUM,
      metadata: { meterData, timestamp: new Date().toISOString() }
    });
  }

  public async logMeterOnlineDisable(meterData: any): Promise<void> {
    await this.log({
      eventType: EventType.METER_ONLINE_DISABLE,
      event: 'Meter Online Disabled',
      description: `User disabled meter online monitoring`,
      severity: EventSeverity.MEDIUM,
      metadata: { meterData, timestamp: new Date().toISOString() }
    });
  }

  public async logFileImport(fileData: any): Promise<void> {
    await this.log({
      eventType: EventType.FILE_IMPORT,
      event: 'File Imported',
      description: `User imported configuration file`,
      severity: EventSeverity.HIGH,
      metadata: { fileData, timestamp: new Date().toISOString() }
    });
  }

  // Holiday/FT Management
  public async logHolidayAdd(holidayData: any): Promise<void> {
    await this.log({
      eventType: EventType.HOLIDAY_ADD,
      event: 'Holiday Added',
      description: `User added new holiday`,
      severity: EventSeverity.LOW,
      metadata: { holidayData, timestamp: new Date().toISOString() }
    });
  }

  public async logHolidayEdit(holidayData: any): Promise<void> {
    await this.log({
      eventType: EventType.HOLIDAY_EDIT,
      event: 'Holiday Edited',
      description: `User edited holiday`,
      severity: EventSeverity.LOW,
      metadata: { holidayData, timestamp: new Date().toISOString() }
    });
  }

  public async logHolidayDelete(holidayData: any): Promise<void> {
    await this.log({
      eventType: EventType.HOLIDAY_DELETE,
      event: 'Holiday Deleted',
      description: `User deleted holiday`,
      severity: EventSeverity.MEDIUM,
      metadata: { holidayData, timestamp: new Date().toISOString() }
    });
  }

  public async logFtSet(ftData: any): Promise<void> {
    await this.log({
      eventType: EventType.FT_SET,
      event: 'FT Rate Set',
      description: `User set FT rate configuration`,
      severity: EventSeverity.HIGH,
      metadata: { ftData, timestamp: new Date().toISOString() }
    });
  }

  public async logFtEdit(ftData: any): Promise<void> {
    await this.log({
      eventType: EventType.FT_EDIT,
      event: 'FT Rate Edited',
      description: `User edited FT rate configuration`,
      severity: EventSeverity.HIGH,
      metadata: { ftData, timestamp: new Date().toISOString() }
    });
  }

  public async logFtDelete(ftData: any): Promise<void> {
    await this.log({
      eventType: EventType.FT_DELETE,
      event: 'FT Rate Deleted',
      description: `User deleted FT rate configuration`,
      severity: EventSeverity.HIGH,
      metadata: { ftData, timestamp: new Date().toISOString() }
    });
  }

  public async logFtActivate(ftData: any): Promise<void> {
    await this.log({
      eventType: EventType.FT_ACTIVATE,
      event: 'FT Rate Activated',
      description: `User activated FT rate`,
      severity: EventSeverity.MEDIUM,
      metadata: { ftData, timestamp: new Date().toISOString() }
    });
  }

  public async logFtDeactivate(ftData: any): Promise<void> {
    await this.log({
      eventType: EventType.FT_DEACTIVATE,
      event: 'FT Rate Deactivated',
      description: `User deactivated FT rate`,
      severity: EventSeverity.MEDIUM,
      metadata: { ftData, timestamp: new Date().toISOString() }
    });
  }

  // Export Data Management
  public async logScheduleAdd(scheduleData: any): Promise<void> {
    await this.log({
      eventType: EventType.SCHEDULE_ADD,
      event: 'Schedule Added',
      description: `User added new export schedule`,
      severity: EventSeverity.MEDIUM,
      metadata: { scheduleData, timestamp: new Date().toISOString() }
    });
  }

  // Email/Line Management
  public async logEmailAdd(emailData: any): Promise<void> {
    await this.log({
      eventType: EventType.EMAIL_ADD,
      event: 'Email Added',
      description: `User added new email`,
      severity: EventSeverity.LOW,
      metadata: { emailData, timestamp: new Date().toISOString() }
    });
  }

  public async logEmailGroupAdd(groupData: any): Promise<void> {
    await this.log({
      eventType: EventType.EMAIL_GROUP_ADD,
      event: 'Email Group Added',
      description: `User added new email group`,
      severity: EventSeverity.MEDIUM,
      metadata: { groupData, timestamp: new Date().toISOString() }
    });
  }

  public async logLineAdd(lineData: any): Promise<void> {
    await this.log({
      eventType: EventType.LINE_ADD,
      event: 'LINE Contact Added',
      description: `User added new LINE contact`,
      severity: EventSeverity.LOW,
      metadata: { lineData, timestamp: new Date().toISOString() }
    });
  }

  public async logLineGroupAdd(groupData: any): Promise<void> {
    await this.log({
      eventType: EventType.LINE_GROUP_ADD,
      event: 'LINE Group Added',
      description: `User added new LINE group`,
      severity: EventSeverity.MEDIUM,
      metadata: { groupData, timestamp: new Date().toISOString() }
    });
  }

  public async logUserAddToGroup(userData: any, groupData: any): Promise<void> {
    await this.log({
      eventType: EventType.USER_ADD_TO_GROUP,
      event: 'User Added to Group',
      description: `User added member to group`,
      severity: EventSeverity.MEDIUM,
      metadata: { userData, groupData, timestamp: new Date().toISOString() }
    });
  }

  public async logUserMoveToGroup(userData: any, fromGroup: any, toGroup: any): Promise<void> {
    await this.log({
      eventType: EventType.USER_MOVE_TO_GROUP,
      event: 'User Moved Between Groups',
      description: `User moved member between groups`,
      severity: EventSeverity.MEDIUM,
      metadata: { userData, fromGroup, toGroup, timestamp: new Date().toISOString() }
    });
  }

  // User Management
  public async logUserAdd(userData: any): Promise<void> {
    await this.log({
      eventType: EventType.USER_ADD,
      event: 'User Added',
      description: `New user account created`,
      severity: EventSeverity.HIGH,
      metadata: { userData, timestamp: new Date().toISOString() }
    });
  }

  public async logUserDelete(userData: any): Promise<void> {
    await this.log({
      eventType: EventType.USER_DELETE,
      event: 'User Deleted',
      description: `User account deleted`,
      severity: EventSeverity.HIGH,
      metadata: { userData, timestamp: new Date().toISOString() }
    });
  }

  public async logRoleAdd(roleData: any): Promise<void> {
    await this.log({
      eventType: EventType.ROLE_ADD,
      event: 'Role Added',
      description: `New user role created`,
      severity: EventSeverity.HIGH,
      metadata: { roleData, timestamp: new Date().toISOString() }
    });
  }

  public async logUserSetRole(userData: any, roleData: any): Promise<void> {
    await this.log({
      eventType: EventType.USER_SET_ROLE,
      event: 'User Role Changed',
      description: `User role assignment changed`,
      severity: EventSeverity.HIGH,
      metadata: { userData, roleData, timestamp: new Date().toISOString() }
    });
  }

  public async logSecurityEvent(event: string, severity: EventSeverity = EventSeverity.HIGH): Promise<void> {
    await this.log({
      eventType: EventType.SECURITY_EVENT,
      event: `Security Event: ${event}`,
      description: event,
      severity,
      metadata: { timestamp: new Date().toISOString() }
    });
  }
}

// Export singleton instance
export const eventLogger = EventLogger.getInstance();

// Export convenience functions - เฉพาะเหตุการณ์สำคัญ
export const logEvent = (eventData: EventLogData) => eventLogger.log(eventData);

// Authentication
export const logLogin = (username: string, success?: boolean) => eventLogger.logLogin(username, success);
export const logLogout = (username: string) => eventLogger.logLogout(username);

// Export Data Management
export const logScheduleAdd = (scheduleData: any) => eventLogger.logScheduleAdd(scheduleData);

// Email/Line Management
export const logEmailAdd = (emailData: any) => eventLogger.logEmailAdd(emailData);
export const logEmailGroupAdd = (groupData: any) => eventLogger.logEmailGroupAdd(groupData);
export const logLineAdd = (lineData: any) => eventLogger.logLineAdd(lineData);
export const logLineGroupAdd = (groupData: any) => eventLogger.logLineGroupAdd(groupData);
export const logUserAddToGroup = (userData: any, groupData: any) => eventLogger.logUserAddToGroup(userData, groupData);
export const logUserMoveToGroup = (userData: any, fromGroup: any, toGroup: any) => eventLogger.logUserMoveToGroup(userData, fromGroup, toGroup);

// User Management
export const logUserAdd = (userData: any) => eventLogger.logUserAdd(userData);
export const logUserDelete = (userData: any) => eventLogger.logUserDelete(userData);
export const logRoleAdd = (roleData: any) => eventLogger.logRoleAdd(roleData);
export const logUserSetRole = (userData: any, roleData: any) => eventLogger.logUserSetRole(userData, roleData);

// Meter Tree Management
export const logLocationAdd = (locationData: any) => eventLogger.logLocationAdd(locationData);
export const logLocationEdit = (locationData: any) => eventLogger.logLocationEdit(locationData);
export const logLocationDelete = (locationData: any) => eventLogger.logLocationDelete(locationData);
export const logLognetAdd = (lognetData: any) => eventLogger.logLognetAdd(lognetData);
export const logLognetEdit = (lognetData: any) => eventLogger.logLognetEdit(lognetData);
export const logLognetDelete = (lognetData: any) => eventLogger.logLognetDelete(lognetData);
export const logMeterAdd = (meterData: any) => eventLogger.logMeterAdd(meterData);
export const logMeterEdit = (meterData: any) => eventLogger.logMeterEdit(meterData);
export const logMeterDelete = (meterData: any) => eventLogger.logMeterDelete(meterData);
export const logFloorAdd = (floorData: any) => eventLogger.logFloorAdd(floorData);
export const logFloorEdit = (floorData: any) => eventLogger.logFloorEdit(floorData);
export const logFloorDelete = (floorData: any) => eventLogger.logFloorDelete(floorData);
export const logMeterOnlineEnable = (meterData: any) => eventLogger.logMeterOnlineEnable(meterData);
export const logMeterOnlineDisable = (meterData: any) => eventLogger.logMeterOnlineDisable(meterData);
export const logFileImport = (fileData: any) => eventLogger.logFileImport(fileData);

// Holiday/FT Management
export const logHolidayAdd = (holidayData: any) => eventLogger.logHolidayAdd(holidayData);
export const logHolidayEdit = (holidayData: any) => eventLogger.logHolidayEdit(holidayData);
export const logHolidayDelete = (holidayData: any) => eventLogger.logHolidayDelete(holidayData);
export const logFtSet = (ftData: any) => eventLogger.logFtSet(ftData);
export const logFtEdit = (ftData: any) => eventLogger.logFtEdit(ftData);
export const logFtDelete = (ftData: any) => eventLogger.logFtDelete(ftData);
export const logFtActivate = (ftData: any) => eventLogger.logFtActivate(ftData);
export const logFtDeactivate = (ftData: any) => eventLogger.logFtDeactivate(ftData);

// System Events
export const logSecurityEvent = (event: string, severity?: EventSeverity) => eventLogger.logSecurityEvent(event, severity);
