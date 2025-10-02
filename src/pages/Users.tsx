import React, { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { apiClient, User as ApiUser, CreateUserRequest, handleApiError } from '@/services/api';
import { logUserAdd, logUserDelete, logRoleAdd, logUserSetRole } from '@/services/eventLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEventLogger } from '@/hooks/useEventLogger';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Shield,
  Mail,
  MapPin,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  Edit3,
  Square,
  Check,
  Copy,
  UserX,
  Search,
  Key,
  Plus,
  Save,
  ZoomIn,
  Eye,
  EyeOff,
  UserCog
} from 'lucide-react';
import { FaUserShield } from "react-icons/fa";

// Use API User interface instead of local interface
type User = ApiUser;

// Role and Permission interfaces
interface Permission {
  id: number;
  permission_name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  role_name: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_count: number;
  permissions: Permission[];
}

interface CreateRoleRequest {
  role_name: string;
}

type SortField = 'id' | 'name' | 'surname' | 'username' | 'email' | 'phone' | 'lineId' | 'address' | 'level' | 'status' | 'note';
type SortDirection = 'asc' | 'desc';

export default function Users() {
  // Permissions
  const { permissions: userPermissions, isAdmin } = usePermissions();
  const userManagementPermissions = userPermissions?.['User Management'] || { read: false, write: false, report: false };
  
  // Toast notifications
  const { toast } = useToast();
  
  // Define modules list for permissions
  const modules = [
    'Dashboard',
    'Online Data', 
    'Table Data',
    'Graph Data',
    'Compare Graph',
    'Energy Graph',
    'Demand Graph', 
    'Line Graph',
    'TOU Compare',
    'TOU Energy',
    'TOU Demand',
    'Export',
    'Event',
    'Meter Tree',
    'Config',
    'Email - Email List',
    'Email - Setup & Edit',
    'User Management',
    'User Permissions'
  ];
  
  // API State Management
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // Form State for Add Dialog
  const [newUserForm, setNewUserForm] = useState<CreateUserRequest>({
    username: '',
    email: '',
    password: '',
    name: '',
    surname: '',
    address: '',
    phone: '',
    lineId: '',
    level: 'Operator',
    status: 'active',
    note: ''
  });

  // Confirm password state
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Form State for Role Dialog  
  const [newRoleForm, setNewRoleForm] = useState<CreateRoleRequest>({
    role_name: ''
  });
  
  // UI State
  const [selectedTab, setSelectedTab] = useState('user');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditingField, setInlineEditingField] = useState<string | null>(null);
  const [selectedPermissionLevel, setSelectedPermissionLevel] = useState<string>('engineer');
  const [customPermissions, setCustomPermissions] = useState<{[key: string]: {read: boolean, write: boolean}}>({});

  // Context menu and multi-selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [contextMenuRow, setContextMenuRow] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPermissionMenu, setShowPermissionMenu] = useState<boolean>(false);
  
  // Group expansion state for user levels
  const [expandedUserGroups, setExpandedUserGroups] = useState<Set<string>>(new Set());
  
  // Group expansion state for permission groups
  const [expandedPermissionGroups, setExpandedPermissionGroups] = useState<Set<string>>(new Set());

  // Authorize tab state
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [copyFromRole, setCopyFromRole] = useState<string>('');
  const [showCopyDialog, setShowCopyDialog] = useState<boolean>(false);
  const [rolePermissions, setRolePermissions] = useState<{[key: string]: {[module: string]: {read: boolean, write: boolean, report: boolean}}}>({});
  

  const [newRoleName, setNewRoleName] = useState<string>('');
  const [showAddRoleDialog, setShowAddRoleDialog] = useState<boolean>(false);
  
  // Authorize tab sorting state
  const [authorizeSortField, setAuthorizeSortField] = useState<'no' | 'page' | 'view' | 'edit' | 'report' | null>(null);
  const [authorizeSortDirection, setAuthorizeSortDirection] = useState<'asc' | 'desc'>('asc');

  // API Functions
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getUsers({
        search: searchTerm,
        sortBy: sortField || 'id',
        sortOrder: sortDirection.toUpperCase() as 'ASC' | 'DESC',
        page: 1,
        limit: 100
      });
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch users');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      console.log('🔍 === FETCHING ROLES FROM DATABASE ===');
      const response = await fetch('http://localhost:3001/api/roles');
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Loaded roles from database:', data.data.length, 'roles');
        setUserRoles(data.data);
        
        // Update rolePermissions with data from database
        const dbRolePermissions = {};
        data.data.forEach(role => {
          dbRolePermissions[role.role_name] = {};
          if (role.permissions && Array.isArray(role.permissions)) {
            role.permissions.forEach(perm => {
              dbRolePermissions[role.role_name][perm.module] = {
                read: Boolean(perm.can_read),
                write: Boolean(perm.can_write), 
                report: Boolean(perm.can_report)
              };
            });
          }
        });
        
        // Merge with existing rolePermissions
        setRolePermissions(prev => ({
          ...prev,
          ...dbRolePermissions
        }));
        
        console.log('📊 Updated rolePermissions with database data');
      } else {
        throw new Error(data.error || 'Failed to fetch roles');
      }
    } catch (err) {
      console.error('❌ Failed to fetch roles:', err);
    }
  };

  // ฟังก์ชันสำหรับตรวจสอบ token
  const validateToken = () => {
    console.log('🔍 === TOKEN VALIDATION START ===');
    const token = localStorage.getItem('authToken');
    console.log('📝 Current token:', token ? 'exists' : 'missing');
    
    if (!token) {
      console.log('❌ No token found');
      
      // ตรวจสอบ user data
      const userUsername = localStorage.getItem('userUsername');
      const userRole = localStorage.getItem('userRole');
      const userLevel = localStorage.getItem('userLevel');
      
      console.log('📝 === DETAILED LOCALSTORAGE DEBUG ===');
      console.log('- userUsername:', userUsername);
      console.log('- userRole:', userRole);
      console.log('- userLevel:', userLevel);
      console.log('- isGuest:', localStorage.getItem('isGuest'));
      console.log('- googleUser:', localStorage.getItem('googleUser'));
      
      // สร้าง mock token ชั่วคราวเพื่อให้ระบบทำงานได้
      if (userUsername) {
        console.log('⚠️ User data exists but no valid token - creating temporary mock token');
        
        const effectiveRole = userRole || userLevel || 'Admin';
        const mockPayload = {
          userId: Date.now(),
          username: userUsername,
          role: effectiveRole,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };
        
        const mockToken = 'mock.' + btoa(JSON.stringify(mockPayload)) + '.signature';
        localStorage.setItem('authToken', mockToken);
        console.log('✅ Temporary mock token created for development');
        
        return true;
      }
      
      return false;
    }
    
    try {
      // Parse JWT payload
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('❌ Invalid token format');
        return false;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && now > payload.exp) {
        console.log('❌ Token expired');
        localStorage.clear();
        return false;
      }
      
      console.log('✅ Token is valid');
      console.log('📝 Token payload:', payload);
      console.log('📝 Token expires in:', payload.exp - now, 'seconds');
      return true;
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return false;
    }
  };

  // ฟังก์ชันสำหรับอัปเดต role ของ user
  const handleUpdateUserRole = async (userId: number, newRoleName: string) => {
    try {
      console.log('🔄 === UPDATING USER ROLE ===');
      console.log('📝 Target user ID:', userId);
      console.log('📝 New role name:', newRoleName);
      
      // ตรวจสอบ token ก่อน
      console.log('🔍 Validating token...');
      if (!validateToken()) {
        console.log('❌ Token validation failed, redirecting to login...');
        window.location.href = '/login';
        return { success: false, error: 'No authentication token' };
      }
      
      const token = localStorage.getItem('authToken');
      console.log('📝 Token for API call:', token ? 'exists' : 'missing');
      console.log('📝 Token preview:', token ? token.substring(0, 20) + '...' : 'none');
      
      // สร้าง headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Added Authorization header with token');
      } else {
        // ถ้าไม่มี token ให้ส่ง user data แทน
        const userUsername = localStorage.getItem('userUsername');
        const userRole = localStorage.getItem('userRole');
        if (userUsername && userRole) {
          headers['X-User-Username'] = userUsername;
          headers['X-User-Role'] = userRole;
          console.log('⚠️ Added fallback headers:', { userUsername, userRole });
        }
      }
      
      console.log('📡 === API CALL DEBUG ===');
      console.log('📡 Headers to send:', headers);
      console.log('📡 Request URL:', `http://localhost:3001/api/users/${userId}/role`);
      console.log('📡 Request body:', { roleName: newRoleName });
      
      const response = await fetch(`http://localhost:3001/api/users/${userId}/role`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          roleName: newRoleName
        })
      });
      
      console.log('📡 API Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      
      console.log('📊 API Response:', { status: response.status, data });
      
      if (response.status === 401) {
        // Token หมดอายุ - redirect ไป login
        console.log('🔄 Token expired, redirecting to login...');
        localStorage.clear();
        window.location.href = '/login';
        return { success: false, error: 'Session expired' };
      }
      
      if (response.status === 403) {
        // Permission denied - แสดง error แต่ไม่ redirect
        console.log('❌ Permission denied:', data.error);
        return { success: false, error: data.error || 'Permission denied' };
      }
      
      if (data.success) {
        console.log('✅ User role updated successfully:', data.data);
        
        // อัปเดต users list
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { 
                  ...user, 
                  level: newRoleName as User['level'], 
                  role_name: newRoleName,
                  role_id: data.data.changes.roleId 
                } as User
              : user
          )
        );
        
        // Log event
        const updatedUser = users.find(u => u.id === userId);
        if (updatedUser) {
          await logUserSetRole(updatedUser.username, newRoleName);
        }
        
        return { success: true, data: data.data };
      } else {
        throw new Error(data.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      return { success: false, error: error.message };
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/roles/permissions/all');
      const data = await response.json();
      
      if (data.success) {
        setPermissions(data.data);
        
        // Convert backend permissions to frontend format
        const backendPermissions = {};
        data.data.forEach(role => {
          backendPermissions[role.role_name] = {};
          role.permissions.forEach(perm => {
            backendPermissions[role.role_name][perm.module] = {
              read: perm.read,
              write: perm.write,
              report: perm.report
            };
          });
        });
        
        // Merge with existing rolePermissions, keeping backend data as priority
        setRolePermissions(prev => {
          const merged = { ...prev };
          Object.keys(backendPermissions).forEach(roleName => {
            merged[roleName] = {
              ...merged[roleName],
              ...backendPermissions[roleName]
            };
          });
          return merged;
        });
        
        console.log('✅ Loaded permissions from backend for', Object.keys(backendPermissions).length, 'roles');
      } else {
        throw new Error(data.error || 'Failed to fetch permissions');
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  // Load users on component mount and when search/sort changes
  useEffect(() => {
    // เพิ่ม delay เล็กน้อยเพื่อให้ token ถูกเก็บก่อน
    const initializeComponent = async () => {
      console.log('🔍 === USERS PAGE INITIALIZATION ===');
      
      // รอ 100ms เพื่อให้ localStorage update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Debug localStorage
      console.log('📦 === USERS PAGE LOCALSTORAGE DEBUG ===');
      console.log('- authToken:', localStorage.getItem('authToken') ? 'exists' : 'missing');
      console.log('- userUsername:', localStorage.getItem('userUsername'));
      console.log('- userRole:', localStorage.getItem('userRole'));
      console.log('- userLevel:', localStorage.getItem('userLevel'));
      console.log('- isGuest:', localStorage.getItem('isGuest'));
      console.log('- googleUser:', localStorage.getItem('googleUser'));
      
      // ตรวจสอบว่า localStorage มีข้อมูลครบหรือไม่
      const hasUserData = localStorage.getItem('userUsername') && 
                         (localStorage.getItem('userRole') || localStorage.getItem('userLevel'));
      console.log('📝 Has sufficient user data:', hasUserData);
      
      // ตรวจสอบ token
      const hasValidToken = validateToken();
      if (!hasValidToken) {
        console.log('❌ No valid token, redirecting to login...');
        window.location.href = '/login';
        return;
      }
      
      // ตรวจสอบ permission สำหรับ User Management
      if (!userManagementPermissions.read) {
        console.log('❌ No read permission for User Management, redirecting...');
        window.location.href = '/dashboard';
        return;
      }
      
      console.log('✅ Token validation and permission check passed, loading data...');
      console.log('📝 User Management Permissions:', userManagementPermissions);
      console.log('📝 isAdmin:', isAdmin);
      console.log('📝 All permissions:', userPermissions);
      fetchUsers();
      fetchRoles();
      fetchPermissions();
    };
    
    initializeComponent();
  }, []);

  // Initialize permissions for new roles
  useEffect(() => {
    if (userRoles.length > 0) {
      setRolePermissions(prev => {
        const updated = { ...prev };
        
        userRoles.forEach(role => {
          if (!updated[role.role_name]) {
            // Initialize with default permissions for new roles
            updated[role.role_name] = {};
            modules.forEach(module => {
              updated[role.role_name][module] = {
                read: false,
                write: false,
                report: false
              };
            });
          }
        });
        
        return updated;
      });
    }
  }, [userRoles]);

  // Handle clicking outside permission menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPermissionMenu) {
        setShowPermissionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPermissionMenu]);

  // Set default selected role when userRoles are loaded
  useEffect(() => {
    if (userRoles.length > 0 && !selectedRole) {
      setSelectedRole(userRoles[0].role_name);
    }
  }, [userRoles, selectedRole]);

  // Auto-expand permission groups when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      const userLevels = Array.from(new Set(users.map(user => user.role_name))).filter(Boolean);
      setExpandedPermissionGroups(new Set(userLevels));
    }
  }, [users]);

  // API Functions for User Operations
  const handleCreateUser = async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.createUser(newUserForm);
      
      if (response.success) {
        // Log user creation event
        await logUserAdd({
          username: newUserForm.username,
          email: newUserForm.email,
          name: newUserForm.name,
          surname: newUserForm.surname,
          level: newUserForm.level,
          status: newUserForm.status
        });
        
        await fetchUsers(); // Refresh the list
        setIsAddDialogOpen(false);
        setNewUserForm({
          username: '',
          email: '',
          password: '',
          name: '',
          surname: '',
          address: '',
          phone: '',
          lineId: '',
          level: 'Operator',
          status: 'active',
          note: ''
        });
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to create user');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Failed to create user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserAPI = async (updatedUser: User) => {
    try {
      setLoading(true);
      
      // Prepare update data - exclude fields that shouldn't be updated
      const { id, created_at, updated_at, last_login, role_name, ...updateData } = updatedUser;
      
      // Ensure required fields are present and filter out undefined values
      const finalUpdateData: any = {};
      
      if (updateData.username !== undefined) finalUpdateData.username = updateData.username;
      if (updateData.email !== undefined) finalUpdateData.email = updateData.email;
      if (updateData.name !== undefined) finalUpdateData.name = updateData.name;
      if (updateData.surname !== undefined) finalUpdateData.surname = updateData.surname || '';
      if (updateData.address !== undefined) finalUpdateData.address = updateData.address;
      if (updateData.phone !== undefined) finalUpdateData.phone = updateData.phone;
      if (updateData.lineId !== undefined) finalUpdateData.lineId = updateData.lineId;
      if (updateData.level !== undefined) finalUpdateData.level = updateData.level;
      if (updateData.status !== undefined) finalUpdateData.status = updateData.status;
      if (updateData.note !== undefined) finalUpdateData.note = updateData.note;
      
      console.log('📝 === FRONTEND UPDATE DEBUG ===');
      console.log('📝 Original updatedUser:', updatedUser);
      console.log('📝 Extracted updateData:', updateData);
      console.log('📝 Final update data:', finalUpdateData);
      console.log('📝 User ID:', id);
      
      const response = await apiClient.updateUser(id, finalUpdateData);
      
      console.log('API Response:', response); // Debug log
      
      if (response.success) {
        await fetchUsers(); // Refresh the list
        setIsEditDialogOpen(false);
        setEditingUser(null);
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to update user');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Failed to update user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Role Management Functions
  const handleCreateRole = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('http://localhost:3001/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRoleForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Log role creation event
        await logRoleAdd({
          role_name: newRoleForm.role_name
        });
        
        await fetchRoles(); // Refresh the list
        setIsAddRoleDialogOpen(false);
        setNewRoleForm({
          role_name: ''
        });
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to create role');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
      console.error('Failed to create role:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost:3001/api/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_name: editingRole.role_name,
          description: editingRole.description,
          permissions: editingRole.permissions.map(p => p.id)
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchRoles(); // Refresh the list
        setIsEditRoleDialogOpen(false);
        setEditingRole(null);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
      console.error('Failed to update role:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoleAPI = async (roleId: number) => {
    try {
      // Find the role to get its name
      const roleToDelete = userRoles.find(role => role.id === roleId);
      if (!roleToDelete) {
        toast({
          title: "Error",
          description: "Role not found",
          variant: "destructive",
        });
        return;
      }

      // Check if there are users assigned to this role
      const usersWithThisRole = users.filter(user => user.role_name === roleToDelete.role_name);
      
      if (usersWithThisRole.length > 0) {
        // Show toast notification that role cannot be deleted
        toast({
          title: "Cannot Delete Role",
          description: `${usersWithThisRole.length} user(s) in role "${roleToDelete.role_name}" Please move user out of this role before deleting`,
          variant: "destructive",
        });
        
        console.log('🚫 Cannot delete role - users still assigned:', {
          roleName: roleToDelete.role_name,
          usersCount: usersWithThisRole.length,
          users: usersWithThisRole.map(u => ({ id: u.id, username: u.username, name: u.name }))
        });
        
        return;
      }

      if (!confirm(`Are you sure you want to delete the role "${roleToDelete.role_name}"? This action cannot be undone.`)) {
        return;
      }
      
      setLoading(true);
      
      const response = await fetch(`http://localhost:3001/api/roles/${roleId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchRoles(); // Refresh the list
        setError(null);
        
        // Show success toast
        toast({
          title: "Role Deleted",
          description: `Role "${roleToDelete.role_name}" has been deleted successfully`,
          variant: "default",
        });
        
        console.log('✅ Role deleted successfully:', roleToDelete.role_name);
      } else {
        throw new Error(data.error || 'Failed to delete role');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete role';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      console.error('Failed to delete role:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: 'active' | 'inactive') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const message = newStatus === 'inactive' 
        ? 'Are you sure you want to deactivate this user?' 
        : 'Are you sure you want to activate this user?';
      
      if (!confirm(message)) {
        return;
      }
      
      setLoading(true);
      
      const response = await apiClient.updateUserStatus(userId, newStatus);
      
      if (response.success) {
        await fetchUsers(); // Refresh the list
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to update user status');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Failed to update user status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetUserPermissionByRole = async (userId: number, roleName: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      console.log('🎯 === SET USER ROLE DEBUG ===');
      console.log('📝 User ID:', userId);
      console.log('📝 Target Role:', roleName);
      console.log('📝 Current User:', { id: user.id, username: user.username, level: user.level });

      const message = `Are you sure you want to set ${user.name} ${user.surname}'s permissions based on the "${roleName}" role?`;
      
      if (!confirm(message)) {
        console.log('❌ User cancelled role change');
        return;
      }
      
      setLoading(true);
      
      // Update user's role_id instead of level
      console.log('🔄 Updating user role_id:', { userId, roleName });
      
      // Use the new API endpoint for updating role
      const response = await handleUpdateUserRole(userId, roleName);
      
      if (response.success) {
        // Log user role assignment event
        await logUserSetRole(
          {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            surname: user.surname,
            previousLevel: user.level
          },
          {
            role_name: roleName,
            newLevel: roleName
          }
        );
        
        await fetchUsers(); // Refresh the list
        setError(null);
      } else {
        console.error('❌ API Response Error:', response);
        
        // แสดง error message ให้ user เห็น
        alert(`Failed to update user role: ${response.error || 'Unknown error'}`);
        
        throw new Error(response.error || 'Failed to update user permissions');
      }
    } catch (err) {
      console.error('❌ Full error details:', err);
      console.error('❌ Error response:', err.response);
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Failed to update user permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAuthorizeSort = (field: 'no' | 'page' | 'view' | 'edit' | 'report') => {
    if (authorizeSortField === field) {
      setAuthorizeSortDirection(authorizeSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAuthorizeSortField(field);
      setAuthorizeSortDirection('asc');
    }
  };

  const getSortedUsers = () => {
    // First filter by search term
    let filteredUsers = users;
    if (searchTerm.trim()) {
      filteredUsers = users.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.name} ${user.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.phone || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.lineId || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.address || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.level?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.note || '')?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Only sort if a sort field is selected
    if (!sortField) {
      return filteredUsers;
    }

    // Then sort the filtered results
    return [...filteredUsers].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Handle level sorting by priority
      if (sortField === 'level') {
        // Create dynamic level priority based on userRoles order
        const levelPriority = userRoles.reduce((acc, role, index) => {
          acc[role.role_name] = index + 1;
          return acc;
        }, {} as Record<string, number>);
        aValue = levelPriority[aValue as string] || userRoles.length + 1;
        bValue = levelPriority[bValue as string] || userRoles.length + 1;
      }

      // Handle status sorting by priority (active first)
      if (sortField === 'status') {
        const statusPriority = { 'active': 1, 'inactive': 2 };
        aValue = statusPriority[aValue as keyof typeof statusPriority] || 3;
        bValue = statusPriority[bValue as keyof typeof statusPriority] || 3;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Group users by their access level
  const getGroupedUsers = () => {
    const sortedUsers = getSortedUsers();
    const grouped = new Map<string, User[]>();
    const levelOptions = userRoles.map(role => role.role_name);
    
    levelOptions.forEach(level => {
      const usersInLevel = sortedUsers.filter(user => user.role_name === level);
      if (usersInLevel.length > 0) {
        grouped.set(level, usersInLevel);
      }
    });
    
    return grouped;
  };
  
  // Toggle user group expansion
  const toggleUserGroup = (groupName: string) => {
    setExpandedUserGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Toggle permission group expansion
  const togglePermissionGroup = (groupName: string) => {
    setExpandedPermissionGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Get users grouped by permission level
  const getGroupedUsersByPermission = () => {
    const sortedUsers = getSortedUsers();
    const grouped = new Map<string, User[]>();
    
    // Get all unique levels from actual users data
    const userLevels = Array.from(new Set(sortedUsers.map(user => user.role_name))).filter(Boolean);
    
    console.log('Debug Permissions Tab - Total users:', users.length);
    console.log('Debug Permissions Tab - Sorted users:', sortedUsers.length);
    console.log('Debug Permissions Tab - User levels found:', userLevels);
    
    // Group users by their actual level
    userLevels.forEach(level => {
      const usersInLevel = sortedUsers.filter(user => user.role_name === level);
      if (usersInLevel.length > 0) {
        grouped.set(level, usersInLevel);
        console.log(`Debug Permissions Tab - Level ${level}: ${usersInLevel.length} users`);
      }
    });
    
    console.log('Debug Permissions Tab - Final grouped data:', grouped);
    return grouped;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="w-3 h-3" /> : 
            <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'Admin':
        return (
          <Badge className="bg-destructive text-destructive-foreground rounded-none">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      case 'Manager':
        return (
          <Badge className="bg-orange-500 text-white rounded-none">
            <UsersIcon className="w-3 h-3 mr-1" />
            Manager
          </Badge>
        );
      case 'Supervisor':
        return (
          <Badge className="bg-blue-500 text-white rounded-none">
            <UsersIcon className="w-3 h-3 mr-1" />
            Supervisor
          </Badge>
        );
      case 'Engineer':
        return (
          <Badge className="bg-green-500 text-white rounded-none">
            <UsersIcon className="w-3 h-3 mr-1" />
            Engineer
          </Badge>
        );
      case 'Operator':
        return (
          <Badge className="bg-purple-500 text-white rounded-none">
            <UsersIcon className="w-3 h-3 mr-1" />
            Operator
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 text-white rounded-none">
            <UsersIcon className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string, userId: number) => {
    return (
      <div 
        className={`flex items-center justify-center ${!isMultiSelectMode ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => {
          if (!isMultiSelectMode) {
            handleStatusToggle(userId, status as 'active' | 'inactive');
          }
        }}
        title={!isMultiSelectMode ? `Click to ${status === 'active' ? 'deactivate' : 'activate'} user` : ''}
      >
        <div className={`w-3 h-3 rounded-full transition-transform ${
          status === 'active' ? 'bg-green-500' : 'bg-red-500'
        } ${!isMultiSelectMode ? 'hover:scale-110' : ''}`}></div>
      </div>
    );
  };

  const InlineEditCell = ({ 
    user, 
    field, 
    value, 
    isEditing, 
    className = "text-xs" 
  }: {
    user: User;
    field: keyof User;
    value: string;
    isEditing: boolean;
    className?: string;
  }) => {
    if (isEditing) {
      if (field === 'status') {
        return (
          <td className={className}>
            <Select 
              value={value}
              onValueChange={(newValue) => {
                handleInlineEdit(user.id, field, newValue);
                handleInlineEditComplete();
              }}
            >
              <SelectTrigger className="h-6 text-xs rounded-none border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </td>
        );
      } else {
        return (
          <td className={className}>
            <Input
              value={value}
              onChange={(e) => handleInlineEdit(user.id, field, e.target.value)}
              onBlur={handleInlineEditComplete}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInlineEditComplete();
                if (e.key === 'Escape') handleInlineEditComplete();
              }}
              className="h-6 text-xs rounded-none border-primary"
              autoFocus
            />
          </td>
        );
      }
    }
    
    return (
      <td 
        className={`${className} ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
        onDoubleClick={() => handleDoubleClick(user.id, field)}
        title={!isMultiSelectMode ? "Double-click to edit" : ""}
      >
        {field === 'email' && (
          <div className="flex items-center space-x-1">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <span className="text-foreground text-xs">{value}</span>
          </div>
        )}
        {field === 'address' && (
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-foreground text-xs">{value}</span>
          </div>
        )}
        {!['email', 'address'].includes(field) && (
          <span className="text-foreground text-xs">{value}</span>
        )}
      </td>
    );
  };

  const handleEditUser = (user: User) => {
    console.log('handleEditUser called with user:', user); // Debug log
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
    try {
      if (!confirm('Are you sure you want to delete this user?')) {
        return;
      }
      
      // Find user data before deletion for logging
      const userToDelete = users.find(user => user.id === id);
      
      setLoading(true);
      
      const response = await apiClient.deleteUser(id);
      
      if (response.success) {
        // Log user deletion event
        if (userToDelete) {
          await logUserDelete({
            id: userToDelete.id,
            username: userToDelete.username,
            email: userToDelete.email,
            name: userToDelete.name,
            surname: userToDelete.surname,
            level: userToDelete.level
          });
        }
        
        await fetchUsers(); // Refresh the list
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to delete user');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Failed to delete user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = () => {
    console.log('handleUpdateUser called with editingUser:', editingUser); // Debug log
    if (editingUser) {
      handleUpdateUserAPI(editingUser);
    } else {
      console.error('editingUser is null or undefined');
    }
  };

  const handleDoubleClick = (userId: number, field: string) => {
    // Prevent inline editing when in multi-select mode
    if (isMultiSelectMode) {
      return;
    }
    
    if (['name', 'username', 'email', 'phone', 'lineId', 'address', 'note', 'status'].includes(field)) {
      setInlineEditingId(userId);
      setInlineEditingField(field);
    }
  };

  const handleRightClick = (user: User) => {
    setContextMenuRow(user);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(user.id)) {
        newSet.delete(user.id);
      } else {
        newSet.add(user.id);
      }
      return newSet;
    });
  };

  const handleToggleMultiSelect = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) {
      setSelectedUsers(new Set());
      // Cancel any ongoing inline editing
      setInlineEditingId(null);
      setInlineEditingField(null);
    }
  };

  const handleBulkStatusChange = (status: 'active' | 'inactive') => {
    const selectedUsersList = users.filter(user => selectedUsers.has(user.id));
    const message = status === 'inactive' 
      ? `Are you sure you want to deactivate ${selectedUsersList.length} user(s)?`
      : `Are you sure you want to activate ${selectedUsersList.length} user(s)?`;
    
    if (confirm(message)) {
      setUsers(users.map(user => 
        selectedUsers.has(user.id) ? { ...user, status } : user
      ));
      setSelectedUsers(new Set());
      setIsMultiSelectMode(false);
    }
  };

  const handleBulkDelete = () => {
    const selectedUsersList = users.filter(user => selectedUsers.has(user.id));
    if (confirm(`Are you sure you want to delete ${selectedUsersList.length} user(s)? This action cannot be undone.`)) {
      setUsers(users.filter(user => !selectedUsers.has(user.id)));
      setSelectedUsers(new Set());
      setIsMultiSelectMode(false);
    }
  };

  const handleBulkLevelChange = (level: User['level']) => {
    const selectedUsersList = users.filter(user => selectedUsers.has(user.id));
    if (confirm(`Are you sure you want to change the access level of ${selectedUsersList.length} user(s) to ${level}?`)) {
      setUsers(users.map(user => 
        selectedUsers.has(user.id) ? { ...user, level } : user
      ));
      setSelectedUsers(new Set());
      setIsMultiSelectMode(false);
    }
  };

  const handleSingleUserLevelChange = (userId: number, level: User['level']) => {
    const user = users.find(u => u.id === userId);
    if (user && confirm(`Are you sure you want to change ${user.name} ${user.surname}'s access level to ${level}?`)) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, level } : u
      ));
    }
  };

  const handleInlineEdit = (userId: number, field: keyof User, value: string) => {
    // Update local state immediately for responsive UI
    setUsers(users.map(user => 
      user.id === userId ? { ...user, [field]: value } : user
    ));
  };

  const handleInlineEditComplete = async () => {
    if (inlineEditingId && inlineEditingField) {
      const user = users.find(u => u.id === inlineEditingId);
      if (user) {
        try {
          const { id, created_at, updated_at, last_login, role_name, ...updateData } = user;
          await apiClient.updateUser(id, updateData);
          // Refresh to get latest data from server
          await fetchUsers();
        } catch (err) {
          const errorMessage = handleApiError(err);
          setError(errorMessage);
          console.error('Failed to update user:', err);
          // Refresh to revert changes on error
          await fetchUsers();
        }
      }
    }
    setInlineEditingId(null);
    setInlineEditingField(null);
  };

  const handleStatusToggle = (userId: number, currentStatus: 'active' | 'inactive') => {
    handleToggleUserStatus(userId, currentStatus);
  };

  const getPermissionsByLevel = (level: string) => {
    const baseModules = [
      'Dashboard',
      'Online Data', 
      'Table Data',
      'Graph Data',
      'Compare Graph',
      'Energy Graph',
      'Demand Graph', 
      'Line Graph',
      'TOU Compare',
      'TOU Energy',
      'TOU Demand',
      'Export',
      'Event',
      'Meter Tree',
      'Config',
      'Email - Email List',
      'Email - Setup & Edit',
      'User Management',
      'User Permissions'
    ];

    let defaultPermissions;
    switch (level.toLowerCase()) {
      case 'admin':
        defaultPermissions = baseModules.map(module => ({ 
          module, 
          read: true, 
          write: true 
        }));
        break;
      
      case 'manager':
        defaultPermissions = baseModules.map(module => ({ 
          module, 
          read: true, 
          write: !['User Permissions', 'Email - Setup & Edit'].includes(module)
        }));
        break;
      
      case 'supervisor':
        defaultPermissions = baseModules.map(module => ({ 
          module, 
          read: !['User Management', 'User Permissions'].includes(module), 
          write: !['User Management', 'User Permissions', 'Email - Setup & Edit'].includes(module)
        }));
        break;
      
      case 'engineer':
        defaultPermissions = baseModules.map(module => ({ 
          module, 
          read: !['User Management', 'User Permissions', 'Config'].includes(module), 
          write: !['User Management', 'User Permissions', 'Email - Setup & Edit', 'Meter Tree', 'Config'].includes(module)
        }));
        break;
      
      case 'operator':
        defaultPermissions = baseModules.map(module => ({ 
          module, 
          read: ['Dashboard', 'Export'].includes(module), 
          write: ['Dashboard', 'Export'].includes(module)
        }));
        break;
      
      default:
        defaultPermissions = baseModules.map(module => ({ 
          module, 
          read: false, 
          write: false 
        }));
    }

    // Apply custom permissions if they exist
    return defaultPermissions.map(permission => {
      const customKey = `${level}-${permission.module}`;
      if (customPermissions[customKey]) {
        return {
          ...permission,
          read: customPermissions[customKey].read,
          write: customPermissions[customKey].write
        };
      }
      return permission;
    });
  };

  const handleCustomPermissionChange = (module: string, type: 'read' | 'write', value: boolean) => {
    const customKey = `${selectedPermissionLevel}-${module}`;
    setCustomPermissions(prev => ({
      ...prev,
      [customKey]: {
        ...prev[customKey],
        read: type === 'read' ? value : prev[customKey]?.read ?? getDefaultPermission(module, 'read'),
        write: type === 'write' ? value : prev[customKey]?.write ?? getDefaultPermission(module, 'write')
      }
    }));
  };

  const getDefaultPermission = (module: string, type: 'read' | 'write'): boolean => {
    const defaultPerms = getPermissionsByLevel(selectedPermissionLevel);
    const perm = defaultPerms.find(p => p.module === module);
    return perm ? perm[type] : false;
  };

  const resetPermissions = () => {
    setCustomPermissions({});
  };

  // Authorize tab functions
  const handlePermissionChange = (role: string, module: string, type: 'read' | 'write' | 'report', value: boolean) => {
    setRolePermissions(prev => {
      const newPermissions = {
        ...prev,
        [role]: {
          ...prev[role],
          [module]: {
            ...prev[role][module],
            [type]: value
          }
        }
      };
      
      // If disabling read, also disable write and report
      if (type === 'read' && !value) {
        newPermissions[role][module].write = false;
        newPermissions[role][module].report = false;
      }
      
      return newPermissions;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      setSaveLoading(true);
      
      // Find the role ID
      const role = userRoles.find(r => r.role_name === selectedRole);
      if (!role) {
        throw new Error('Role not found');
      }
      
      // Convert permissions to API format
      const permissionsData = Object.entries(rolePermissions[selectedRole] || {}).map(([module, perms]) => ({
        module: String(module), // Ensure module is string
        read: Boolean(perms.read),
        write: Boolean(perms.write),
        report: Boolean(perms.report)
      }));
      
      console.log('💾 Saving permissions for role:', role.role_name);
      console.log('📋 Permissions data:', permissionsData);
      console.log('🔍 Role permissions state:', rolePermissions[selectedRole]);
      
      const response = await fetch(`http://localhost:3001/api/roles/${role.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: permissionsData }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Permissions saved successfully');
        
        // Refresh roles data to show updated permissions
        await fetchRoles();
        
        // Show success message
        alert('Permissions saved successfully!');
      } else {
        throw new Error(data.error || 'Failed to save permissions');
      }
    } catch (err) {
      console.error('❌ Failed to save permissions:', err);
      alert('Failed to save permissions: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCopyPermissions = () => {
    if (!copyFromRole || !selectedRole || copyFromRole === selectedRole) return;
    
    const sourcePermissions = rolePermissions[copyFromRole];
    if (!sourcePermissions) return;
    
    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: { ...sourcePermissions }
    }));
    
    setShowCopyDialog(false);
    setCopyFromRole('');
  };

  const handleSelectAllPermissions = (type: 'read' | 'write' | 'report', value: boolean) => {
    if (!selectedRole) return;
    
    setRolePermissions(prev => {
      const newPermissions = { ...prev };
      const rolePerms = { ...newPermissions[selectedRole] };
      
      modules.forEach(moduleName => {
        // modules is an array of strings, so moduleName is always a string
        if (!rolePerms[moduleName]) {
          rolePerms[moduleName] = { read: false, write: false, report: false };
        }
        
        if (type === 'read') {
          rolePerms[moduleName].read = value;
          // If disabling read, also disable write and report
          if (!value) {
            rolePerms[moduleName].write = false;
            rolePerms[moduleName].report = false;
          }
        } else if (type === 'write') {
          // Can only enable write if read is enabled
          if (value && rolePerms[moduleName].read) {
            rolePerms[moduleName].write = value;
          } else if (!value) {
            rolePerms[moduleName].write = false;
          }
        } else if (type === 'report') {
          // Can only enable report if read is enabled
          if (value && rolePerms[moduleName].read) {
            rolePerms[moduleName].report = value;
          } else if (!value) {
            rolePerms[moduleName].report = false;
          }
        }
      });
      
      newPermissions[selectedRole] = rolePerms;
      return newPermissions;
    });
  };
  const getPermissionStats = (role: string) => {
    const permissions = rolePermissions[role];
    if (!permissions) return { read: 0, write: 0, report: 0, total: modules.length };
    
    let readCount = 0, writeCount = 0, reportCount = 0;
    
    modules.forEach(moduleName => {
      // modules is an array of strings, so moduleName is always a string
      const perm = permissions[moduleName];
      if (perm?.read) readCount++;
      if (perm?.write) writeCount++;
      if (perm?.report) reportCount++;
    });
    
    return { read: readCount, write: writeCount, report: reportCount, total: modules.length };
  };

  const handleAddRole = () => {
    if (newRoleName.trim() && !userRoles.map(role => role.role_name).includes(newRoleName.trim())) {
      // This is deprecated - use API instead
      console.warn('Use handleCreateRole API instead');
      // Create default permissions for new role
      const defaultPermissions: {[key: string]: {read: boolean, write: boolean, report: boolean}} = {};
      modules.forEach(moduleName => {
        // modules is an array of strings, so moduleName is always a string
        defaultPermissions[moduleName] = { read: false, write: false, report: false };
      });
      
      setRolePermissions(prev => ({
        ...prev,
        [newRoleName.trim()]: defaultPermissions
      }));
      setNewRoleName('');
      setShowAddRoleDialog(false);
    }
  };

  const handleDeleteRole = (roleToDelete: string) => {
    if (confirm(`Are you sure you want to delete the role "${roleToDelete}"?`)) {
      // This is deprecated - use handleDeleteRoleAPI instead
      console.warn('Use handleDeleteRoleAPI instead');
      setRolePermissions(prev => {
        const newPermissions = { ...prev };
        delete newPermissions[roleToDelete];
        return newPermissions;
      });
      if (selectedRole === roleToDelete) {
        setSelectedRole(userRoles[0]?.role_name || '');
      }
    }
  };

  const moduleConfigs = [
    { name: 'Dashboard', permissions: ['view'] },
    { name: 'Table Data', permissions: ['view', 'report'] },
    { name: 'Online Data', permissions: ['view', 'report'] },
    { name: 'Graph Data', permissions: ['view'] },
    { name: 'Line Graph', permissions: ['view', 'report'] },
    { name: 'Demand Graph', permissions: ['view', 'report'] },
    { name: 'Energy Graph', permissions: ['view', 'report'] },
    { name: 'Compare Graph', permissions: ['view', 'report'] },
    { name: 'TOU', permissions: ['view'] },
    { name: 'TOU Demand Graph', permissions: ['view', 'report'] },
    { name: 'TOU Energy Graph', permissions: ['view', 'report'] },
    { name: 'TOU Compare Graph', permissions: ['view', 'report'] },
    { name: 'Charge', permissions: ['view', 'report'] },
    { name: 'Event', permissions: ['view', 'report'] },
    { name: 'Config', permissions: ['view'] },
    { name: 'Export Data', permissions: ['view', 'report'] },
    { name: 'Email Line', permissions: ['view', 'edit'] },
    { name: 'User Management', permissions: ['view', 'edit'] },
    { name: 'Meter Tree', permissions: ['view', 'edit'] },
    { name: 'Holiday', permissions: ['view', 'edit'] }
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-9xl mx-auto">
          <div className="bg-white rounded-none shadow-sm">
            {/* User Management Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <UsersIcon className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-semibold text-gray-900">User Management</h1>
              </div>
            </div>

            <Tabs defaultValue="user" className="w-full">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 px-0 pt-0">
                <TabsList className="h-10 p-1 bg-gray-100 rounded-none">
                  <TabsTrigger 
                    value="user" 
                    className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-none"
                  >
                    User List
                  </TabsTrigger>
                  <TabsTrigger 
                    value="grant" 
                    className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-none"
                  >
                    Permissions
                  </TabsTrigger>
                  <TabsTrigger 
                    value="authorize" 
                    className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-none"
                  >
                    Authorize
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* User List Tab */}
              <TabsContent value="user" className="p-6 space-y-4">
                <div className="flex items-center justify-between -mt-2 mb-4">
                  {/* Bulk Actions */}
                  {isMultiSelectMode && selectedUsers.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        {selectedUsers.size} user(s) selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusChange('active')}
                        className="text-xs h-7 rounded-none"
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Activate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusChange('inactive')}
                        className="text-xs h-7 rounded-none"
                      >
                        <UserX className="w-3 h-3 mr-1" />
                        Deactivate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="text-xs h-7 rounded-none text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 ml-auto">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 h-8 text-xs rounded-none border-gray-300 min-w-64"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {/* Add User Button - Only show if user has write permission */}
                    {userManagementPermissions.write && (
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="text-xs h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-none">
                            <UserPlus className="w-3 h-3 mr-1" />
                            Add User
                          </Button>
                        </DialogTrigger>
                    
                    <DialogContent className="sm:max-w-4xl rounded-none border-none max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Show error message if any */}
                        {error && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                            {error}
                          </div>
                        )}
                        
                        {/* Horizontal Form Layout */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name-Lastname</Label>
                            <Input 
                              id="name" 
                              placeholder="Enter full name" 
                              className="rounded-none"
                              value={`${newUserForm.name} ${newUserForm.surname}`.trim()}
                              onChange={(e) => {
                                const fullName = e.target.value.trim();
                                const parts = fullName.split(' ').filter(part => part.length > 0);
                                const firstName = parts[0] || '';
                                const lastName = parts.slice(1).join(' ') || '';
                                setNewUserForm({...newUserForm, name: firstName, surname: lastName});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input 
                              id="username" 
                              placeholder="Enter username" 
                              className="rounded-none"
                              value={newUserForm.username}
                              onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                              id="email" 
                              type="email" 
                              placeholder="user@example.com" 
                              className="rounded-none"
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input 
                              id="phone" 
                              placeholder="Enter phone number" 
                              className="rounded-none"
                              value={newUserForm.phone}
                              onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="lineId">Line ID</Label>
                            <Input 
                              id="lineId" 
                              placeholder="Enter Line ID" 
                              className="rounded-none"
                              value={newUserForm.lineId}
                              onChange={(e) => setNewUserForm({...newUserForm, lineId: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select 
                              value={newUserForm.level.toLowerCase()} 
                              onValueChange={(value) => {
                                const selectedRole = userRoles.find(role => role.role_name.toLowerCase() === value.toLowerCase());
                                if (selectedRole) {
                                  setNewUserForm({...newUserForm, level: selectedRole.role_name as User['level']});
                                }
                              }}
                            >
                              <SelectTrigger className="rounded-none">
                                <SelectValue placeholder="Select access level" />
                              </SelectTrigger>
                              <SelectContent className="rounded-none">
                                {userRoles.map((role) => (
                                  <SelectItem key={role.id} value={role.role_name.toLowerCase()}>
                                    {role.role_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                              <Input 
                                id="password" 
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter password" 
                                className="rounded-none pr-10"
                                value={newUserForm.password}
                                onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                              <Input 
                                id="confirmPassword" 
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm password" 
                                className="rounded-none pr-10"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input 
                            id="address" 
                            placeholder="User address" 
                            className="rounded-none"
                            value={newUserForm.address}
                            onChange={(e) => setNewUserForm({...newUserForm, address: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="note">Note</Label>
                          <Input 
                            id="note" 
                            placeholder="Additional notes or comments" 
                            className="rounded-none"
                            value={newUserForm.note}
                            onChange={(e) => setNewUserForm({...newUserForm, note: e.target.value})}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsAddDialogOpen(false);
                              setError(null);
                              setConfirmPassword('');
                              setShowPassword(false);
                              setShowConfirmPassword(false);
                            }} 
                            className="rounded-none"
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateUser} 
                            className="rounded-none"
                            disabled={loading || !newUserForm.username || !newUserForm.email || !newUserForm.password || !newUserForm.name || newUserForm.password !== confirmPassword}
                          >
                            {loading ? 'Creating...' : 'Create User'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  )}
                </div>

                {/* Edit User Dialog */}
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="sm:max-w-4xl rounded-none border-none max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                          Update user account information and permissions.
                        </DialogDescription>
                      </DialogHeader>
                      {editingUser && (
                        <div className="space-y-4">
                          {/* Show error message if any */}
                          {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                              {error}
                            </div>
                          )}
                          
                          {/* Horizontal Form Layout */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Name-Lastname</Label>
                              <Input 
                                id="edit-name" 
                                value={`${editingUser.name} ${editingUser.surname}`.trim()}
                                onChange={(e) => {
                                  const fullName = e.target.value.trim();
                                  const parts = fullName.split(' ').filter(part => part.length > 0);
                                  const firstName = parts[0] || '';
                                  const lastName = parts.slice(1).join(' ') || '';
                                  setEditingUser({...editingUser, name: firstName, surname: lastName});
                                }}
                                className="rounded-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-username">Username</Label>
                              <Input 
                                id="edit-username" 
                                value={editingUser.username}
                                onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                                className="rounded-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-email">Email</Label>
                              <Input 
                                id="edit-email" 
                                type="email" 
                                value={editingUser.email}
                                onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                className="rounded-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-phone">Phone</Label>
                              <Input 
                                id="edit-phone" 
                                value={editingUser.phone || ''}
                                onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                                className="rounded-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-lineId">Line ID</Label>
                              <Input 
                                id="edit-lineId" 
                                value={editingUser.lineId || ''}
                                onChange={(e) => setEditingUser({...editingUser, lineId: e.target.value})}
                                className="rounded-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-role">Role</Label>
                              <Select 
                                value={editingUser.level.toLowerCase()} 
                                onValueChange={(value) => {
                                  const selectedRole = userRoles.find(role => role.role_name.toLowerCase() === value.toLowerCase());
                                  if (selectedRole) {
                                    setEditingUser({...editingUser, level: selectedRole.role_name as User['level']});
                                  }
                                }}
                              >
                                <SelectTrigger className="rounded-none">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                  {userRoles.map((role) => (
                                    <SelectItem key={role.id} value={role.role_name.toLowerCase()}>{role.role_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-status">Status</Label>
                              <Select 
                                value={editingUser.status} 
                                onValueChange={(value) => setEditingUser({...editingUser, status: value as 'active' | 'inactive'})}
                              >
                                <SelectTrigger className="rounded-none">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-address">Address</Label>
                              <Input 
                                id="edit-address" 
                                value={editingUser.address || ''}
                                onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                                className="rounded-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-note">Note</Label>
                            <Input 
                              id="edit-note" 
                              value={editingUser.note || ''}
                              onChange={(e) => setEditingUser({...editingUser, note: e.target.value})}
                              className="rounded-none"
                            />
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setIsEditDialogOpen(false);
                                setEditingUser(null);
                                setError(null);
                              }} 
                              className="rounded-none"
                              disabled={loading}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleUpdateUser} 
                              className="rounded-none"
                              disabled={loading || !editingUser.username || !editingUser.email || !editingUser.name}
                            >
                              {loading ? 'Updating...' : 'Update User'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
                    <div className="flex items-center">
                      <span className="font-medium">Error:</span>
                      <span className="ml-2">{error}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setError(null);
                          fetchUsers();
                        }}
                        className="ml-auto text-xs h-6 rounded-none"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}

                {/* User List Table */}
                <div className="border border-gray-200 rounded-none overflow-hidden">
                  {loading && (
                    <div className="bg-blue-50 border-b border-blue-200 text-blue-700 px-4 py-2 text-sm">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                        Loading users...
                      </div>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 tracking-wider w-12 cursor-pointer hover:bg-gray-100 select-none">
                            <div className="flex items-center justify-center space-x-1" onClick={() => handleSort('id')}>
                              <span>No.</span>
                              {sortField === 'id' && (
                                sortDirection === 'asc' ? 
                                  <ChevronUp className="w-3 h-3" /> : 
                                  <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </th>
                                                      <SortableHeader field="username">User</SortableHeader>
                          <SortableHeader field="email">Email</SortableHeader>
                          <SortableHeader field="name">Name-Lastname</SortableHeader>
                          <SortableHeader field="phone">Phone</SortableHeader>
                          <SortableHeader field="lineId">Line ID</SortableHeader>
                          <SortableHeader field="address">Address</SortableHeader>
                          <SortableHeader field="level">Role</SortableHeader>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                            <div className="flex items-center justify-center space-x-1" onClick={() => handleSort('status')}>
                              <span>Active</span>
                              {sortField === 'status' && (
                                sortDirection === 'asc' ? 
                                  <ChevronUp className="w-3 h-3" /> : 
                                  <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </th>
                          <SortableHeader field="note">Note</SortableHeader>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {!loading && getSortedUsers().length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <UsersIcon className="w-12 h-12 text-gray-300 mb-2" />
                                <p className="text-sm font-medium">No users found</p>
                                <p className="text-xs text-gray-400">
                                  {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first user'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          getSortedUsers().map((user, index) => (
                          userManagementPermissions.write ? (
                            <ContextMenu key={user.id}>
                              <ContextMenuTrigger asChild>
                                <tr 
                                  className={`hover:bg-gray-50 cursor-pointer ${selectedUsers.has(user.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                  onContextMenu={() => handleRightClick(user)}
                                  onClick={() => {
                                    if (isMultiSelectMode) {
                                      handleSelectUser(user);
                                    }
                                  }}
                                >
                                <td className="px-2 py-2 text-center w-12">
                                  {isMultiSelectMode && (
                                    <div 
                                      className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded cursor-pointer mr-2 ${
                                        selectedUsers.has(user.id) 
                                          ? 'bg-primary border-primary' 
                                          : 'border-gray-300 hover:border-gray-400'
                                      }`}
                                      onClick={() => handleSelectUser(user)}
                                    >
                                      {selectedUsers.has(user.id) && (
                                        <Check className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-500">{index + 1}</span>
                                </td>
                                <td className="px-3 py-2">
                                  {inlineEditingId === user.id && inlineEditingField === 'username' ? (
                                    <Input
                                      value={user.username}
                                      onChange={(e) => handleInlineEdit(user.id, 'username', e.target.value)}
                                      onBlur={handleInlineEditComplete}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineEditComplete();
                                        if (e.key === 'Escape') handleInlineEditComplete();
                                      }}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-xs text-gray-900 cursor-pointer"
                                      onClick={() => handleDoubleClick(user.id, 'username')}
                                      onDoubleClick={() => handleDoubleClick(user.id, 'username')}
                                    >
                                      {user.username}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {inlineEditingId === user.id && inlineEditingField === 'email' ? (
                                    <Input
                                      value={user.email}
                                      onChange={(e) => handleInlineEdit(user.id, 'email', e.target.value)}
                                      onBlur={handleInlineEditComplete}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineEditComplete();
                                        if (e.key === 'Escape') handleInlineEditComplete();
                                      }}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-xs text-primary cursor-pointer"
                                      onClick={() => handleDoubleClick(user.id, 'email')}
                                      onDoubleClick={() => handleDoubleClick(user.id, 'email')}
                                    >
                                      {user.email}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {inlineEditingId === user.id && inlineEditingField === 'name' ? (
                                    <Input
                                      value={`${user.name} ${user.surname}`}
                                      onChange={(e) => {
                                        const fullName = e.target.value;
                                        const parts = fullName.split(' ');
                                        const firstName = parts[0] || '';
                                        const lastName = parts.slice(1).join(' ') || '';
                                        handleInlineEdit(user.id, 'name', firstName);
                                        handleInlineEdit(user.id, 'surname', lastName);
                                      }}
                                      onBlur={handleInlineEditComplete}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineEditComplete();
                                        if (e.key === 'Escape') handleInlineEditComplete();
                                      }}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-xs text-gray-900 cursor-pointer"
                                      onClick={() => handleDoubleClick(user.id, 'name')}
                                      onDoubleClick={() => handleDoubleClick(user.id, 'name')}
                                    >
                                      {`${user.name} ${user.surname}`}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {inlineEditingId === user.id && inlineEditingField === 'phone' ? (
                                    <Input
                                      value={user.phone || ''}
                                      onChange={(e) => handleInlineEdit(user.id, 'phone', e.target.value)}
                                      onBlur={handleInlineEditComplete}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineEditComplete();
                                        if (e.key === 'Escape') handleInlineEditComplete();
                                      }}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-xs text-gray-900 cursor-pointer"
                                      onClick={() => handleDoubleClick(user.id, 'phone')}
                                      onDoubleClick={() => handleDoubleClick(user.id, 'phone')}
                                    >
                                      {user.phone || ''}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {inlineEditingId === user.id && inlineEditingField === 'lineId' ? (
                                    <Input
                                      value={user.lineId || ''}
                                      onChange={(e) => handleInlineEdit(user.id, 'lineId', e.target.value)}
                                      onBlur={handleInlineEditComplete}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineEditComplete();
                                        if (e.key === 'Escape') handleInlineEditComplete();
                                      }}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-xs text-primary cursor-pointer"
                                      onClick={() => handleDoubleClick(user.id, 'lineId')}
                                      onDoubleClick={() => handleDoubleClick(user.id, 'lineId')}
                                    >
                                      {user.lineId || ''}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {inlineEditingId === user.id && inlineEditingField === 'address' ? (
                                    <Input
                                      value={user.address || ''}
                                      onChange={(e) => handleInlineEdit(user.id, 'address', e.target.value)}
                                      onBlur={handleInlineEditComplete}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineEditComplete();
                                        if (e.key === 'Escape') handleInlineEditComplete();
                                      }}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-xs text-gray-900 cursor-pointer"
                                      onClick={() => handleDoubleClick(user.id, 'address')}
                                      onDoubleClick={() => handleDoubleClick(user.id, 'address')}
                                    >
                                      {user.address || ''}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="text-xs text-gray-900">{user.role_name || user.level}</span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div 
                                    className={`inline-block w-3 h-3 rounded-sm cursor-pointer ${
                                      user.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                    onClick={() => handleStatusToggle(user.id, user.status)}
                                  ></div>
                                </td>
                                <td className="px-3 py-2">
                                  {inlineEditingId === user.id && inlineEditingField === 'note' ? (
                                    <Input
                                      value={user.note || ''}
                                      onChange={(e) => handleInlineEdit(user.id, 'note', e.target.value)}
                                      onBlur={handleInlineEditComplete}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineEditComplete();
                                        if (e.key === 'Escape') handleInlineEditComplete();
                                      }}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-xs text-gray-900 cursor-pointer"
                                      onClick={() => handleDoubleClick(user.id, 'note')}
                                      onDoubleClick={() => handleDoubleClick(user.id, 'note')}
                                    >
                                      {user.note || ''}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem onClick={() => handleEditUser(user)}>
                                <Edit3 className="w-3 h-3 mr-2" />
                                Edit
                              </ContextMenuItem>

                              <ContextMenuItem onClick={() => handleStatusToggle(user.id, user.status)}>
                                {user.status === 'active' ? (
                                  <>
                                    <UserX className="w-3 h-3 mr-2" />
                                    Set Inactive
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-3 h-3 mr-2" />
                                    Set Active
                                  </>
                                )}
                              </ContextMenuItem>

                              {/* Permission Menu */}
                              {userRoles.map((role) => (
                                <ContextMenuItem 
                                  key={role.id}
                                  onClick={() => handleSetUserPermissionByRole(user.id, role.role_name)}
                                  className={user.role_name === role.role_name ? 'bg-blue-50 text-blue-700' : ''}
                                >
                                  <UserCog className="w-3 h-3 mr-2" />
                                  Set as {role.role_name}
                                  {user.role_name === role.role_name && (
                                    <Check className="w-3 h-3 ml-auto text-blue-600" />
                                  )}
                                </ContextMenuItem>
                              ))}

                              {isMultiSelectMode && selectedUsers.size > 0 && (
                                <>
                                  <ContextMenuItem onClick={() => handleBulkStatusChange('active')}>
                                    <Shield className="w-3 h-3 mr-2" />
                                    Activate Selected
                                  </ContextMenuItem>
                                  <ContextMenuItem onClick={() => handleBulkStatusChange('inactive')}>
                                    <UserX className="w-3 h-3 mr-2" />
                                    Deactivate Selected
                                  </ContextMenuItem>
                                  <ContextMenuItem onClick={handleBulkDelete} className="text-red-600">
                                    <Trash2 className="w-3 h-3 mr-2" />
                                    Delete Selected
                                  </ContextMenuItem>
                                </>
                              )}
                              <ContextMenuItem onClick={() => handleDeleteUser(user.id)} className="text-red-600">
                                <Trash2 className="w-3 h-3 mr-2" />
                                Delete
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                          ) : (
                            // Read-only view without context menu
                            <tr 
                              key={user.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-2 py-2 text-center w-12">
                                <span className="text-xs text-gray-500">{index + 1}</span>
                              </td>
                              <td className="px-2 py-2 text-xs">{user.username}</td>
                              <td className="px-2 py-2 text-xs">{user.name}</td>
                              <td className="px-2 py-2 text-xs">{user.surname}</td>
                              <td className="px-2 py-2 text-xs">{user.email}</td>
                              <td className="px-2 py-2 text-xs">{user.phone || '-'}</td>
                              <td className="px-2 py-2 text-xs">{user.lineId || '-'}</td>
                              <td className="px-2 py-2 text-xs">{user.address || '-'}</td>
                              <td className="px-2 py-2 text-xs">
                                <Badge variant={user.level === 'Admin' ? 'default' : user.level === 'Manager' ? 'secondary' : 'outline'} className="text-xs rounded-none">
                                  {user.level}
                                </Badge>
                              </td>
                              <td className="px-2 py-2 text-xs">
                                <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="text-xs rounded-none">
                                  {user.status}
                                </Badge>
                              </td>
                              <td className="px-2 py-2 text-xs">{user.note || '-'}</td>
                            </tr>
                          )
                        ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Permissions Tab */}
              <TabsContent value="grant" className="p-6 space-y-4">
  {/* User List by Permission Groups */}
  <div className="space-y-4"> 
    {Array.from(getGroupedUsersByPermission().entries()).map(([level, usersInLevel], groupIndex) => (
      <div key={level} className="border border-gray-200 rounded-none bg-white">
        {/* Group Header */}
        <div 
          className="bg-gray-50 px-2 py-1.5 border-b border-gray-200 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
          onClick={() => togglePermissionGroup(level)}
        >
          <div className="flex items-center space-x-1.5">
            {expandedPermissionGroups.has(level) ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
            <UsersIcon className="w-3 h-3 text-gray-600" />
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-semibold text-gray-700">{level}</h3>
              <span className="text-xs text-gray-500 bg-gray-200 px-1 py-0.5 rounded text-[10px]">{groupIndex + 1}</span>
            </div>
          </div>
        </div>
        
        {/* Group Users Table - Show only when expanded */}
        {expandedPermissionGroups.has(level) && (
          <div className="bg-white">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-12 px-1.5 py-1 text-center text-xs font-semibold text-gray-500 tracking-wider">No.</th>
                  <th className="w-25 px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider">User</th>
                  <th className="w-45 px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider">Email</th>
                  <th className="w-35 px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider">Name-Lastname</th>
                  <th className="w-35 px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider">Address</th>
                  <th className="w-20 px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider">Level</th>
                  <th className="w-30 px-2 py-1 text-center text-xs font-semibold text-gray-500 tracking-wider">Active</th>
                  <th className="w-auto px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersInLevel.map((user, index) => 
                  userManagementPermissions.write ? (
                    <ContextMenu key={user.id}>
                    <ContextMenuTrigger asChild>
                      <tr 
                        key={user.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onContextMenu={() => handleRightClick(user)}
                      >
                        <td className="w-12 px-1.5 py-1 text-center">
                          <span className="text-xs text-gray-500">{groupIndex + 1}.{index + 1}</span>
                        </td>
                        <td className="w-24 px-2 py-1">
                          <div className="truncate">
                            <span className="text-xs text-gray-900">{user.username}</span>
                          </div>
                        </td>
                        <td className="w-40 px-2 py-1">
                          <div className="truncate">
                            <span className="text-xs text-primary">{user.email}</span>
                          </div>
                        </td>
                        <td className="w-32 px-2 py-1">
                          <div className="truncate">
                            <span className="text-xs text-gray-900">{`${user.name} ${user.surname}`}</span>
                          </div>
                        </td>
                        <td className="w-32 px-2 py-1">
                          <div className="truncate">
                            <span className="text-xs text-gray-900">{user.address || ''}</span>
                          </div>
                        </td>
                        <td className="w-20 px-2 py-1">
                          <div className="truncate">
                            <span className="text-xs text-gray-900">{user.level}</span>
                          </div>
                        </td>
                        <td className="w-16 px-2 py-1 text-center">
                          <div 
                            className={`inline-block w-2.5 h-2.5 rounded-sm cursor-pointer ${
                              user.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            onClick={() => handleStatusToggle(user.id, user.status)}
                          ></div>
                        </td>
                        <td className="w-auto px-2 py-1">
                          <div className="truncate">
                            <span className="text-xs text-gray-900">{user.note || ''}</span>
                          </div>
                        </td>
                      </tr>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditUser(user)}>
                        <Edit3 className="w-3 h-3 mr-2" />
                        Edit User
                      </ContextMenuItem>

                      <ContextMenuItem onClick={() => handleStatusToggle(user.id, user.status)}>
                        {user.status === 'active' ? (
                          <>
                            <UserX className="w-3 h-3 mr-2" />
                            Set Inactive
                          </>
                        ) : (
                          <>
                            <Shield className="w-3 h-3 mr-2" />
                            Set Active
                          </>
                        )}
                      </ContextMenuItem>

                      {/* Permission Menu */}
                      {userRoles.map((role) => (
                        <ContextMenuItem 
                          key={role.id}
                          onClick={() => handleSetUserPermissionByRole(user.id, role.role_name)}
                          className={user.role_name === role.role_name ? 'bg-blue-50 text-blue-700' : ''}
                        >
                          <UserCog className="w-3 h-3 mr-2" />
                          Set as {role.role_name}
                          {user.role_name === role.role_name && (
                            <Check className="w-3 h-3 ml-auto text-blue-600" />
                          )}
                        </ContextMenuItem>
                      ))}

                      <ContextMenuItem onClick={() => handleDeleteUser(user.id)} className="text-red-600">
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete User
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  ) : (
                    // Read-only view without context menu
                    <tr 
                      key={user.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="w-12 px-1.5 py-1 text-center">
                        <span className="text-xs text-gray-500">{groupIndex + 1}.{index + 1}</span>
                      </td>
                      <td className="w-24 px-2 py-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">{user.name?.charAt(0)}</span>
                          </div>
                          <span className="text-xs font-medium text-gray-700">{user.username}</span>
                        </div>
                      </td>
                      <td className="w-45 px-2 py-1 text-xs text-gray-600">{user.email}</td>
                      <td className="w-35 px-2 py-1 text-xs text-gray-600">{user.name} {user.surname}</td>
                      <td className="w-35 px-2 py-1 text-xs text-gray-600">{user.address || '-'}</td>
                      <td className="w-20 px-2 py-1">
                        <Badge variant={user.level === 'Admin' ? 'default' : 'outline'} className="text-xs rounded-none">
                          {user.level}
                        </Badge>
                      </td>
                      <td className="w-30 px-2 py-1 text-center">
                        <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="text-xs rounded-none">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="w-auto px-2 py-1 text-xs text-gray-600">{user.note || '-'}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ))}
  </div>
</TabsContent>

              {/* Authorize Tab */}
              <TabsContent value="authorize" className="p-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Role Selection */}
                  <div className="lg:col-span-1">
                    <div className="bg-white border border-gray-200 rounded-none">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-medium text-gray-700 flex items-center">
                            <FaUserShield className="w-3 h-3 mr-2" />
                            Authorize Management
                          </h3>
                          {/* Add Role Button - Only show if user has write permission */}
                          {userManagementPermissions.write && (
                            <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  className="text-xs h-6 bg-primary hover:bg-primary/90 text-white rounded-none"
                                >
                                  <FaUserShield className="w-3 h-3 mr-1" />
                                  <span>Add</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="text-base">New Role</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
                                    <Input
                                      value={newRoleForm.role_name}
                                      onChange={e => setNewRoleForm({...newRoleForm, role_name: e.target.value})}
                                      className="h-8 text-xs rounded-none"
                                      placeholder="Enter name"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2 pt-4">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-xs h-8 rounded-none"
                                      onClick={() => {
                                        setNewRoleForm({
                                          role_name: ''
                                        });
                                        setIsAddRoleDialogOpen(false);
                                      }}
                                      disabled={loading}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      size="sm"
                                      className="text-xs h-8 rounded-none"
                                      onClick={handleCreateRole}
                                      disabled={loading || !newRoleForm.role_name.trim()}
                                    >
                                      {loading ? 'Creating...' : 'Add'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        
                        {/* Role List */}
                        <div className="space-y-1">
                          {userRoles.map((role, index) => {
                            const userCount = users.filter(u => u.role_name === role.role_name).length;
                            const stats = getPermissionStats(role.role_name);
                            
                            return (
                              <div key={role.id} className="border border-gray-200 rounded-none">
                                <div className="flex items-center justify-between p-2">
                                  <button
                                    className={`flex-1 text-left px-2 py-1.5 text-xs rounded-none ${
                                      selectedRole === role.role_name 
                                        ? 'bg-primary text-white' 
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                    onClick={() => setSelectedRole(role.role_name)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs w-4 text-center">{index + 1}</span>
                                        <FaUserShield className="w-3 h-3" />
                                        <span className="font-medium">{role.role_name}</span>
                                      </div>
                                      <Badge className="text-[10px] px-1 py-0 bg-blue-100 text-blue-800 rounded-none">
                                        {userCount} users
                                      </Badge>
                                    </div>
                                  </button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 ml-1"
                                    onClick={() => handleDeleteRoleAPI(role.id)}
                                    title={!userManagementPermissions.write ? "You don't have write permission for User Management" : "Delete Role"}
                                    disabled={!userManagementPermissions.write}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Grid */}
                  <div className="lg:col-span-3">
                    <div className="bg-white border border-gray-200 rounded-none">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-medium text-gray-700">
                            Authorize : <span className="font-semibold text-primary">{selectedRole}</span>
                          </h3>
                          <div className="flex items-center space-x-2">
                            {/* Copy Permissions Button */}
                            <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 rounded-none"
                                  disabled={!selectedRole}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy From
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="text-base">Copy Permissions</DialogTitle>
                                  <DialogDescription className="text-xs">
                                    Copy permissions from another role to <strong>{selectedRole}</strong>
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 block mb-1">Copy from role</label>
                                    <Select value={copyFromRole} onValueChange={setCopyFromRole}>
                                      <SelectTrigger className="h-8 text-xs rounded-none">
                                        <SelectValue placeholder="Select role to copy from" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-none">
                                        {userRoles
                                          .filter(role => role.role_name !== selectedRole)
                                          .map(role => (
                                            <SelectItem key={role.id} value={role.role_name}>
                                              {role.role_name}
                                            </SelectItem>
                                          ))
                                        }
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex justify-end gap-2 pt-4">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-xs h-8 rounded-none"
                                      onClick={() => {
                                        setShowCopyDialog(false);
                                        setCopyFromRole('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      size="sm"
                                      className="text-xs h-8 rounded-none"
                                      onClick={handleCopyPermissions}
                                      disabled={!copyFromRole || !userManagementPermissions.write}
                                      title={!userManagementPermissions.write ? "You don't have write permission for User Management" : ""}
                                    >
                                      Copy Permissions
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {/* Save Button */}
                            <Button 
                              size="sm"
                              className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white rounded-none"
                              onClick={handleSavePermissions}
                              disabled={!selectedRole || saveLoading || !userManagementPermissions.write}
                              title={!userManagementPermissions.write ? "You don't have write permission for User Management" : ""}
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {saveLoading ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none w-12" onClick={() => handleAuthorizeSort('no')}>
                                <div className="flex items-center justify-center space-x-1">
                                  <span>No.</span>
                                  {authorizeSortField === 'no' && (
                                    authorizeSortDirection === 'asc' ? 
                                      <ChevronUp className="w-3 h-3" /> : 
                                      <ChevronDown className="w-3 h-3" />
                                  )}
                                </div>
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleAuthorizeSort('page')}>
                                <div className="flex items-center space-x-1">
                                  <span>Page</span>
                                  {authorizeSortField === 'page' && (
                                    authorizeSortDirection === 'asc' ? 
                                      <ChevronUp className="w-3 h-3" /> : 
                                      <ChevronDown className="w-3 h-3" />
                                  )}
                                </div>
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleAuthorizeSort('view')} title="สิทธิ์ในการดูข้อมูล/เข้าถึงหน้านี้">
                                <div className="flex items-center justify-center space-x-1">
                                  <span>View</span>
                                  <Checkbox
                                    checked={(() => {
                                      const stats = getPermissionStats(selectedRole);
                                      return stats.read === stats.total && stats.total > 0;
                                    })()}
                                    onCheckedChange={(checked) => handleSelectAllPermissions('read', checked as boolean)}
                                    className="ml-1 rounded-none"
                                    disabled={!selectedRole || !userManagementPermissions.write}
                                  />
                                  {authorizeSortField === 'view' && (
                                    authorizeSortDirection === 'asc' ? 
                                      <ChevronUp className="w-3 h-3" /> : 
                                      <ChevronDown className="w-3 h-3" />
                                  )}
                                </div>
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleAuthorizeSort('edit')} title="สิทธิ์ในการแก้ไข/เพิ่ม/ลบข้อมูล">
                                <div className="flex items-center justify-center space-x-1">
                                  <span>Edit</span>
                                  <Checkbox
                                    checked={(() => {
                                      const stats = getPermissionStats(selectedRole);
                                      return stats.write === stats.total && stats.total > 0;
                                    })()}
                                    onCheckedChange={(checked) => handleSelectAllPermissions('write', checked as boolean)}
                                    className="ml-1 rounded-none"
                                    disabled={!selectedRole || !userManagementPermissions.write}
                                  />
                                  {authorizeSortField === 'edit' && (
                                    authorizeSortDirection === 'asc' ? 
                                      <ChevronUp className="w-3 h-3" /> : 
                                      <ChevronDown className="w-3 h-3" />
                                  )}
                                </div>
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleAuthorizeSort('report')} title="สิทธิ์ในการส่งออกรายงาน/ดาวน์โหลดข้อมูล">
                                <div className="flex items-center justify-center space-x-1">
                                  <span>Report</span>
                                  <Checkbox
                                    checked={(() => {
                                      const stats = getPermissionStats(selectedRole);
                                      return stats.report === stats.total && stats.total > 0;
                                    })()}
                                    onCheckedChange={(checked) => handleSelectAllPermissions('report', checked as boolean)}
                                    className="ml-1 rounded-none"
                                    disabled={!selectedRole || !userManagementPermissions.write}
                                  />
                                  {authorizeSortField === 'report' && (
                                    authorizeSortDirection === 'asc' ? 
                                      <ChevronUp className="w-3 h-3" /> : 
                                      <ChevronDown className="w-3 h-3" />
                                  )}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(() => {
                              let sortedModules = [...moduleConfigs];
                              
                              if (authorizeSortField) {
                                sortedModules.sort((a, b) => {
                                  let aValue: any, bValue: any;
                                  const aName = a.name;
                                  const bName = b.name;
                                  
                                  switch (authorizeSortField) {
                                    case 'no':
                                      aValue = moduleConfigs.indexOf(a);
                                      bValue = moduleConfigs.indexOf(b);
                                      break;
                                    case 'page':
                                      aValue = aName.toLowerCase();
                                      bValue = bName.toLowerCase();
                                      break;
                                    case 'view':
                                      aValue = rolePermissions[selectedRole]?.[aName]?.read ? 1 : 0;
                                      bValue = rolePermissions[selectedRole]?.[bName]?.read ? 1 : 0;
                                      break;
                                    case 'edit':
                                      aValue = rolePermissions[selectedRole]?.[aName]?.write ? 1 : 0;
                                      bValue = rolePermissions[selectedRole]?.[bName]?.write ? 1 : 0;
                                      break;
                                    case 'report':
                                      aValue = rolePermissions[selectedRole]?.[aName]?.report ? 1 : 0;
                                      bValue = rolePermissions[selectedRole]?.[bName]?.report ? 1 : 0;
                                      break;
                                    default:
                                      return 0;
                                  }
                                  
                                  if (authorizeSortDirection === 'asc') {
                                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                                  } else {
                                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                                  }
                                });
                              }
                              
                              return sortedModules.map((moduleConfig, index) => {
                                const moduleName = moduleConfig.name;
                                const availablePermissions = moduleConfig.permissions;
                                
                                return (
                                  <tr key={moduleName} className="hover:bg-gray-50">
                                    <td className="px-2 py-2 text-center w-12">
                                      <span className="text-xs text-gray-500">{index + 1}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="text-xs text-gray-900">{moduleName}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {availablePermissions.includes('view') ? (
                                        <Checkbox
                                          checked={rolePermissions[selectedRole]?.[moduleName]?.read || false}
                                          onCheckedChange={(checked) => 
                                            handlePermissionChange(selectedRole, moduleName, 'read', checked as boolean)
                                          }
                                          className="rounded-none"
                                          disabled={!userManagementPermissions.write}
                                        />
                                      ) : (
                                        <span className="text-gray-300">-</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {availablePermissions.includes('edit') ? (
                                        <Checkbox
                                          checked={rolePermissions[selectedRole]?.[moduleName]?.write || false}
                                          onCheckedChange={(checked) => 
                                            handlePermissionChange(selectedRole, moduleName, 'write', checked as boolean)
                                          }
                                          disabled={!rolePermissions[selectedRole]?.[moduleName]?.read || !userManagementPermissions.write}
                                          className="rounded-none"
                                        />
                                      ) : (
                                        <span className="text-gray-300">-</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {availablePermissions.includes('report') ? (
                                        <Checkbox
                                          checked={rolePermissions[selectedRole]?.[moduleName]?.report || false}
                                          onCheckedChange={(checked) => 
                                            handlePermissionChange(selectedRole, moduleName, 'report', checked as boolean)
                                          }
                                          disabled={!rolePermissions[selectedRole]?.[moduleName]?.read || !userManagementPermissions.write}
                                          className="rounded-none"
                                        />
                                      ) : (
                                        <span className="text-gray-300">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}