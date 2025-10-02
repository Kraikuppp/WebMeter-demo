// Hook สำหรับ Event Logging - เฉพาะเหตุการณ์สำคัญ
import { useCallback } from 'react';
import { 
  eventLogger, 
  EventType, 
  EventSeverity,
  logLogin,
  logLogout,
  logSecurityEvent
} from '@/services/eventLogger';

export const useEventLogger = () => {
  // Authentication logging - เฉพาะเหตุการณ์สำคัญ
  const logAuthentication = useCallback((username: string, success: boolean, action: 'login' | 'logout') => {
    if (action === 'login') {
      logLogin(username, success);
    } else {
      logLogout(username);
    }
  }, []);

  // Security event logging
  const logSecurity = useCallback((event: string, severity: EventSeverity = EventSeverity.HIGH) => {
    logSecurityEvent(event, severity);
  }, []);

  // ⚠️ Deprecated functions - ไม่ใช้แล้วในระบบใหม่
  const logPageAccess = useCallback((pageName: string) => {
    console.warn('⚠️ logPageAccess is deprecated - ระบบใหม่ไม่เก็บ page access events');
  }, []);

  const logExport = useCallback((exportType: string, dataType: string, recordCount?: number) => {
    console.warn('⚠️ logExport is deprecated - ระบบใหม่ไม่เก็บ export events');
  }, []);

  const logReportSend = useCallback((reportType: string, recipients: string[], method: 'email' | 'line') => {
    console.warn('⚠️ logReportSend is deprecated - ระบบใหม่ไม่เก็บ report send events');
  }, []);

  const logAction = useCallback((action: string, details?: any) => {
    console.warn('⚠️ logAction is deprecated - ระบบใหม่ไม่เก็บ user action events');
  }, []);

  const logError = useCallback((error: string, details?: any) => {
    console.warn('⚠️ logError is deprecated - ระบบใหม่ไม่เก็บ system error events');
  }, []);

  const logConfigurationChange = useCallback((configType: string, changes: Record<string, any>) => {
    console.warn('⚠️ logConfigurationChange is deprecated - ใช้ specific event functions แทน');
  }, []);

  const logDataManipulation = useCallback((operation: string, resource: string, details?: any) => {
    console.warn('⚠️ logDataManipulation is deprecated - ใช้ specific event functions แทน');
  }, []);

  const logSearch = useCallback((searchType: string, filters: any, resultCount?: number) => {
    console.warn('⚠️ logSearch is deprecated - ระบบใหม่ไม่เก็บ search events');
  }, []);

  const logNavigation = useCallback((from: string, to: string) => {
    console.warn('⚠️ logNavigation is deprecated - ระบบใหม่ไม่เก็บ navigation events');
  }, []);

  return {
    // ✅ Active functions - เฉพาะเหตุการณ์สำคัญ
    logAuthentication,
    logSecurity,
    
    // ⚠️ Deprecated functions - ยังคงไว้เพื่อ backward compatibility
    logPageAccess,
    logExport,
    logReportSend,
    logAction,
    logError,
    logConfigurationChange,
    logDataManipulation,
    logSearch,
    logNavigation,
    
    // Direct access to event logger
    eventLogger,
    
    // Event types and severities for custom logging
    EventType,
    EventSeverity
  };
};

// Export individual logging functions for convenience - เฉพาะที่ยังใช้งาน
export {
  logLogin,
  logLogout,
  logSecurityEvent,
  EventType,
  EventSeverity
};

// ⚠️ Deprecated exports - ไม่ใช้แล้วในระบบใหม่
// logDataAccess, logConfigChange, logSystemError, logUserAction, logExportData, logSendReport
// ใช้ specific event functions ใน eventLogger.ts แทน
