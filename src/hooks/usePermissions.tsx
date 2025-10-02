import React, { useState, useEffect, createContext, useContext } from 'react';

interface User {
  username: string;
  role: string;
}

interface Permissions {
  [module: string]: {
    read: boolean;
    write: boolean;
    report: boolean;
  };
}

interface UsePermissionsReturn {
  user: User | null;
  permissions: Permissions;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  hasPermission: (module: string, action: 'read' | 'write' | 'report') => boolean;
}

// สร้าง Context สำหรับ Permissions
const PermissionsContext = createContext<UsePermissionsReturn | null>(null);

// Hook สำหรับใช้ Context
export function usePermissions(): UsePermissionsReturn {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

// Hook สำหรับ Provider (internal use)
function usePermissionsProvider(): UsePermissionsReturn {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
    
    // ฟัง event เมื่อมีการเปลี่ยนแปลง user data
    const handleUserDataUpdate = () => {
      console.log('🔄 User data updated - reloading permissions...');
      loadPermissions();
    };
    
    window.addEventListener('userDataUpdated', handleUserDataUpdate);
    
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ตรวจสอบ token และข้อมูล user (ลำดับสำคัญ: authToken ก่อน auth_token)
      const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      const userUsername = localStorage.getItem('userUsername');
      const isGuest = localStorage.getItem('isGuest') === 'true';

      console.log('🔐 Loading permissions...', {
        hasToken: !!token,
        userUsername,
        isGuest,
        tokenLength: token?.length,
        allLocalStorage: {
          auth_token: !!localStorage.getItem('auth_token'),
          authToken: !!localStorage.getItem('authToken'),
          userUsername: localStorage.getItem('userUsername'),
          isGuest: localStorage.getItem('isGuest'),
          userRole: localStorage.getItem('userRole')
        }
      });

      // ถ้ามี token ให้ดึงข้อมูลจาก JWT payload
      let jwtPayload = null;
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          jwtPayload = JSON.parse(window.atob(base64));
          console.log('🔍 JWT Payload:', jwtPayload);
        } catch (error) {
          console.error('❌ Error parsing JWT:', error);
        }
      }

      if (!token || isGuest) {
        console.log('❌ No valid token or user is guest');
        // ถ้าเป็น guest ให้ใช้ default guest permissions
        setUser({ username: 'guest', role: 'Guest' });
        
        // สร้าง guest permissions (หน้าที่อนุญาตให้ guest เข้าถึง)
        const guestPermissions = {
          'Dashboard': { read: true, write: false, report: false },
          'Table Data': { read: true, write: false, report: false },
          'Graph Data': { read: true, write: false, report: false },
          'Line Graph': { read: true, write: false, report: false },
          'Demand Graph': { read: true, write: false, report: false },
          'Energy Graph': { read: true, write: false, report: false },
          'Compare Graph': { read: true, write: false, report: false }
        };
        setPermissions(guestPermissions);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // ใช้ข้อมูลจาก JWT payload ถ้ามี
      const finalUsername = jwtPayload?.username || userUsername;
      const userRole = jwtPayload?.role || jwtPayload?.level || 'Guest';
      
      console.log('👤 User info from JWT/localStorage:', {
        finalUsername,
        userRole,
        fromJWT: !!jwtPayload
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://webmeter-backend-demo.onrender.com/api' : 'http://localhost:3001/api')}/permissions/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Permissions loaded from API:', data.data);
        
        // ใช้ข้อมูล user จาก API หรือ fallback เป็น JWT/localStorage
        const apiUser = data.data.user;
        const finalUser = {
          username: apiUser?.username || finalUsername,
          role: apiUser?.role || userRole
        };
        
        console.log('👤 Final user data:', finalUser);
        
        setUser(finalUser);
        setPermissions(data.data.permissions);
        setIsAdmin(data.data.isAdmin || false);
      } else {
        console.error('❌ Failed to load permissions:', data.error);
        setError(data.error || 'Failed to load permissions');
        
        // ถ้า API ล้มเหลว ให้ใช้ข้อมูลจาก JWT/localStorage
        setUser({ username: finalUsername, role: userRole });
        setPermissions({
          'Dashboard': { read: true, write: false, report: false },
          'Table Data': { read: true, write: false, report: false },
          'Graph Data': { read: true, write: false, report: false },
          'Line Graph': { read: true, write: false, report: false },
          'Demand Graph': { read: true, write: false, report: false },
          'Energy Graph': { read: true, write: false, report: false },
          'Compare Graph': { read: true, write: false, report: false }
        });
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('❌ Error loading permissions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      // ถ้าเกิด error ให้ใช้ข้อมูลจาก localStorage หรือ fallback เป็น guest
      const fallbackUsername = localStorage.getItem('userUsername') || 'guest';
      const fallbackRole = localStorage.getItem('userRole') || 'Guest';
      
      setUser({ username: fallbackUsername, role: fallbackRole });
      setPermissions({
        'Dashboard': { read: true, write: false, report: false },
        'Table Data': { read: true, write: false, report: false },
        'Graph Data': { read: true, write: false, report: false },
        'Line Graph': { read: true, write: false, report: false },
        'Demand Graph': { read: true, write: false, report: false },
        'Energy Graph': { read: true, write: false, report: false },
        'Compare Graph': { read: true, write: false, report: false }
      });
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: string, action: 'read' | 'write' | 'report'): boolean => {
    if (isAdmin) {
      console.log(`🔓 Admin access granted for ${module}.${action}`);
      return true;
    }

    const modulePermissions = permissions[module];
    if (!modulePermissions) {
      console.log(`❌ No permissions found for module: ${module}`);
      return false;
    }

    const hasAccess = modulePermissions[action] || false;
    console.log(`🔍 Permission check: ${module}.${action} = ${hasAccess}`);
    return hasAccess;
  };

  return {
    user,
    permissions,
    isAdmin,
    loading,
    error,
    hasPermission
  };
}

// PermissionsProvider Component
interface PermissionsProviderProps {
  children: React.ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const permissionsValue = usePermissionsProvider();
  
  return (
    <PermissionsContext.Provider value={permissionsValue}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ProtectedComponent สำหรับป้องกันการเข้าถึงตาม permissions
interface ProtectedComponentProps {
  children: React.ReactNode;
  module: string;
  action?: 'read' | 'write' | 'report';
  fallback?: React.ReactNode;
}

export function ProtectedComponent({ 
  children, 
  module, 
  action = 'read', 
  fallback 
}: ProtectedComponentProps) {
  const { hasPermission, loading, isAdmin } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Admin มีสิทธิ์ทุกอย่าง
  if (isAdmin) {
    return <>{children}</>;
  }

  // ตรวจสอบสิทธิ์
  if (hasPermission(module, action)) {
    return <>{children}</>;
  }

  // ถ้าไม่มีสิทธิ์ ให้แสดง fallback หรือข้อความเริ่มต้น
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-red-500 text-6xl mb-4">🚫</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Access Denied
      </h2>
      <p className="text-gray-600 mb-4">
        You don't have permission to access this {module} module.
      </p>
      <p className="text-sm text-gray-500">
        Required permission: {action} access to {module}
      </p>
    </div>
  );
}