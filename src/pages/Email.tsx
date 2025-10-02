import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  logEmailAdd, 
  logEmailGroupAdd, 
  logLineAdd, 
  logLineGroupAdd, 
  logUserAddToGroup, 
  logUserMoveToGroup 
} from '@/services/eventLogger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Settings2, Edit3, Mail, ChevronUp, ChevronDown, Users, ChevronRight, Square, Check, Search, MailPlus } from 'lucide-react';
import { BsLine } from 'react-icons/bs';
import { TbDeviceMobilePlus } from 'react-icons/tb';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/usePermissions';



// Shared Context Menu Component
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
  row: EmailRow;
  onEdit: (row: EmailRow) => void;
  onSelect: (row: EmailRow) => void;
  onAddToGroup: (row: EmailRow) => void;
  onMoveToGroup: (row: EmailRow) => void;
  onDelete: (row: EmailRow) => void;
  isSelected: boolean;
  canWrite: boolean;
}) => (
  <ContextMenuContent>
    <ContextMenuItem 
      onClick={() => canWrite ? onEdit(row) : undefined}
      disabled={!canWrite}
      className={!canWrite ? "opacity-50 cursor-not-allowed" : ""}
    >
      <Edit3 className="w-3 h-3 mr-2" />
      Edit
    </ContextMenuItem>
    <ContextMenuItem onClick={() => onSelect(row)}>
      {isSelected ? (
        <>
          <Check className="w-3 h-3 mr-2" />
          Deselect
        </>
      ) : (
        <>
          <Square className="w-3 h-3 mr-2" />
          Select
        </>
      )}
    </ContextMenuItem>
    <ContextMenuItem 
      onClick={() => canWrite ? onAddToGroup(row) : undefined}
      disabled={!canWrite}
      className={!canWrite ? "opacity-50 cursor-not-allowed" : ""}
    >
      <Plus className="w-3 h-3 mr-2" />
      Add to Group
    </ContextMenuItem>
    <ContextMenuItem 
      onClick={() => canWrite ? onMoveToGroup(row) : undefined}
      disabled={!canWrite}
      className={!canWrite ? "opacity-50 cursor-not-allowed" : ""}
    >
      <ChevronRight className="w-3 h-3 mr-2" />
      Move to Group
    </ContextMenuItem>
    <ContextMenuItem 
      onClick={() => canWrite ? onDelete(row) : undefined}
      disabled={!canWrite}
      className={`${!canWrite ? "opacity-50 cursor-not-allowed" : "text-red-600 focus:text-red-600"}`}
    >
      <Trash2 className="w-3 h-3 mr-2" />
      Delete
    </ContextMenuItem>
  </ContextMenuContent>
);
import { PageLayout } from '@/components/layout/PageLayout';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { apiClient, CreateUserRequest } from '@/services/api';
import { 
  Users as UsersIcon, 
} from 'lucide-react';
interface EmailRow {
  id: number;
  displayName: string;
  email: string;
  groups: string[];
  line_groups?: string[];
  name: string;
  phone: string;
  lineId: string;
  enabled: boolean;
}

export default function Email() {
  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const emailPermissions = userPermissions?.['Email Line'] || { read: false, write: false, report: false };
  
  console.log('📝 Email Line Permissions:', emailPermissions);
  
  // สำหรับ select all
  const handleSelectAll = (rowsToSelect: EmailRow[]) => {
    setSelectedEmails(new Set(rowsToSelect.map(row => row.id)));
  };
  const handleDeselectAll = () => {
    setSelectedEmails(new Set());
  };
  const handleToggleSelectEmail = (id: number) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  // สำหรับ bulk group dialog
  const [bulkAddToGroupDialogOpen, setBulkAddToGroupDialogOpen] = useState(false);
  const [bulkMoveToGroupDialogOpen, setBulkMoveToGroupDialogOpen] = useState(false);
  const [selectedBulkGroup, setSelectedBulkGroup] = useState<string>('');
  // สำหรับ dialog เลือก group
  const [selectedGroupForDialog, setSelectedGroupForDialog] = useState<string>('');
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<keyof EmailRow | null>(null);
  // State for database groups
  const [dbGroups, setDbGroups] = useState<any[]>([]);
  const [dbLineGroups, setDbLineGroups] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('email');
  const [newRow, setNewRow] = useState<EmailRow>({
    id: Date.now(),
    displayName: '',
    email: '',
    groups: ['Emergency'],
    name: '',
    phone: '',
    lineId: '',
    enabled: true,
  });
  const [setupEdit, setSetupEdit] = useState(false);
  const [setupRow, setSetupRow] = useState<EmailRow>({ 
    id: 0,
    displayName: '',
    email: '',
    groups: ['Emergency'],
    name: '',
    phone: '',
    lineId: '',
    enabled: true
  });
  const [draftRows, setDraftRows] = useState<EmailRow[]>([]);
  
  // Add Email Modal state
  const [addEmailModalOpen, setAddEmailModalOpen] = useState(false);
  
  // Collapsible groups state - Initialize with all groups expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Context menu state
  const [contextMenuRow, setContextMenuRow] = useState<EmailRow | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<EmailRow | null>(null);
  const [editFormData, setEditFormData] = useState<EmailRow>({
    id: 0,
    displayName: '',
    email: '',
    groups: [''],
    name: '',
    phone: '',
    lineId: '',
    enabled: true,
  });
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  
  // Multi-selection state
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // Group management dialogs
  const [addToGroupDialogOpen, setAddToGroupDialogOpen] = useState(false);
  const [moveToGroupDialogOpen, setMoveToGroupDialogOpen] = useState(false);
  const [selectedRowForGroupAction, setSelectedRowForGroupAction] = useState<EmailRow | null>(null);
  
  // Group renaming state
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof EmailRow | 'no' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Group options state
  const [groupOptions, setGroupOptions] = useState<string[]>(['Emergency', 'BackOffice', 'Engineer', 'Routine']);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroupIdx, setEditingGroupIdx] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  
  // Delete confirmation dialog state
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ idx: number, name: string } | null>(null);
  
  // Add Group Modal state
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
  const [newGroupNameForModal, setNewGroupNameForModal] = useState('');
  const [selectedEmailsForGroup, setSelectedEmailsForGroup] = useState<Set<number>>(new Set());
  
  // Add Group Modal sorting state
  const [addGroupModalSortField, setAddGroupModalSortField] = useState<keyof EmailRow | 'no' | null>(null);
  const [addGroupModalSortDirection, setAddGroupModalSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Group context menu state
  const [groupContextMenuOpen, setGroupContextMenuOpen] = useState(false);
  const [selectedGroupForContext, setSelectedGroupForContext] = useState<string | null>(null);
  
  // Group edit/delete state
  const [editingEmailGroup, setEditingEmailGroup] = useState<any>(null);
  const [editingLineGroup, setEditingLineGroup] = useState<any>(null);
  const [editEmailGroupName, setEditEmailGroupName] = useState('');
  const [editLineGroupName, setEditLineGroupName] = useState('');
  const [editEmailGroupModalOpen, setEditEmailGroupModalOpen] = useState(false);
  const [editLineGroupModalOpen, setEditLineGroupModalOpen] = useState(false);
  
  // Ref for inline editing
  const inlineEditRef = useRef<HTMLInputElement>(null);

  // Handle click outside for inline editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inlineEditRef.current && !inlineEditRef.current.contains(event.target as Node)) {
        if (editingId !== null) {
          cancelInlineEdit();
        }
      }
    };

    if (editingId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingId]);

  // Fetch user data from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.getUsers({
          page: 1,
          limit: 1000,
          sortBy: 'id',
          sortOrder: 'ASC'
        });
        
        if (response.success && response.data) {
                      console.log('API Response data:', response.data); // Debug log
            console.log('API Response data with lineId and phone:', response.data.map((user: any) => ({ 
              id: user.id, 
              username: user.username,
              email: user.email,
              name: user.name,
              surname: user.surname,
              phone: user.phone, 
              lineId: user.lineId,
              group_name: user.group_name,
              status: user.status
            }))); // Debug log
            console.log('API Response data raw fields:', response.data.map((user: any) => Object.keys(user))); // Debug log
            console.log('API Response data raw values:', response.data.map((user: any) => Object.values(user))); // Debug log
            console.log('API Response data raw entries:', response.data.map((user: any) => Object.entries(user))); // Debug log
            console.log('API Response data raw entries with lineId and phone:', response.data.map((user: any) => Object.entries(user).filter(([key, value]) => key === 'lineId' || key === 'phone' || key === 'line_id'))); // Debug log
            console.log('API Response data raw entries with all fields:', response.data.map((user: any) => Object.entries(user))); // Debug log
            console.log('API Response data raw entries with all fields formatted:', response.data.map((user: any) => Object.entries(user).map(([key, value]) => `${key}: ${value}`))); // Debug log
            console.log('API Response data raw entries with all fields formatted for first user:', response.data.length > 0 ? Object.entries(response.data[0]).map(([key, value]) => `${key}: ${value}`) : 'No users'); // Debug log
            console.log('API Response data raw entries with all fields formatted for all users:', response.data.map((user: any, index: number) => `User ${index + 1}: ${Object.entries(user).map(([key, value]) => `${key}: ${value}`).join(', ')}`)); // Debug log
            console.log('API Response data raw entries with all fields formatted for all users with lineId and phone:', response.data.map((user: any, index: number) => `User ${index + 1}: lineId=${user.lineId}, phone=${user.phone}, line_id=${user.line_id}`)); // Debug log
            console.log('API Response data raw entries with all fields formatted for all users with lineId and phone and all fields:', response.data.map((user: any, index: number) => `User ${index + 1}: ${Object.entries(user).map(([key, value]) => `${key}=${value}`).join(', ')}`)); // Debug log
            console.log('API Response data raw entries with all fields formatted for all users with lineId and phone and all fields and null check:', response.data.map((user: any, index: number) => `User ${index + 1}: lineId=${user.lineId || 'null'}, phone=${user.phone || 'null'}, line_id=${user.line_id || 'null'}`)); // Debug log
            console.log('API Response data raw entries with all fields formatted for all users with lineId and phone and all fields and null check and hasOwnProperty:', response.data.map((user: any, index: number) => `User ${index + 1}: hasLineId=${user.hasOwnProperty('lineId')}, hasPhone=${user.hasOwnProperty('phone')}, hasLine_id=${user.hasOwnProperty('line_id')}`)); // Debug log
            console.log('API Response data raw entries with all fields formatted for all users with lineId and phone and all fields and null check and hasOwnProperty and in operator:', response.data.map((user: any, index: number) => `User ${index + 1}: inLineId=${'lineId' in user}, inPhone=${'phone' in user}, inLine_id=${'line_id' in user}`)); // Debug log
          // Transform user data to EmailRow format based on conditions
          const emailRows: EmailRow[] = response.data
            .filter((user: any) => {
              // Check if user has email or line_id
              const hasEmail = user.email && user.email.trim() !== '';
              const hasLineId = user.lineId && user.lineId.trim() !== '';
              
              // Only include users who have at least email or line_id
              return hasEmail || hasLineId;
            })
            .map((user: any) => {
              console.log('Processing user:', user); // Debug log for each user
              console.log('User line group fields:', {
                line_group_name: user.line_group_name,
                lineGroupName: user.lineGroupName,
                line_group: user.line_group,
                lineGroup: user.lineGroup,
                lineGroupId: user.lineGroupId,
                line_group_id: user.line_group_id
              }); // Debug log for line group fields
              
              // Try different possible field names for line group
              let lineGroups = [];
              if (user.line_group_name) {
                lineGroups = [user.line_group_name];
              } else if (user.lineGroupName) {
                lineGroups = [user.lineGroupName];
              } else if (user.line_group) {
                lineGroups = [user.line_group];
              } else if (user.lineGroup) {
                lineGroups = [user.lineGroup];
              }
              
              const transformedUser = {
            id: user.id,
            displayName: user.username || '',
            email: user.email || '',
            groups: user.group_name ? [user.group_name] : [],
                line_groups: lineGroups,
            name: `${user.name || ''} ${user.surname || ''}`.trim(),
            phone: user.phone || '',
            lineId: user.lineId || '',
            enabled: user.status === 'active'
              };
              console.log('Transformed user:', transformedUser); // Debug log for each transformed user
              return transformedUser;
            });
          
          console.log('Transformed emailRows:', emailRows); // Debug log
          console.log('Transformed emailRows with all fields:', emailRows.map(row => ({ 
            id: row.id, 
            displayName: row.displayName, 
            email: row.email,
            name: row.name,
            phone: row.phone, 
            lineId: row.lineId,
            groups: row.groups,
            enabled: row.enabled
          }))); // Debug log
          setRows(emailRows);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    const fetchGroups = async () => {
      try {
        const response = await apiClient.getGroups();
        if (response.success && response.data) {
          setDbGroups(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      }
    };

    const fetchLineGroups = async () => {
      try {
        console.log('Fetching line groups...'); // Debug log
        const response = await apiClient.getLineGroups();
        console.log('Line groups API response:', response); // Debug log
        if (response.success && response.data) {
          console.log('Setting dbLineGroups with data:', response.data); // Debug log
          setDbLineGroups(response.data);
        } else {
          console.log('No line groups data or API failed:', response); // Debug log
        }
      } catch (error) {
        console.error('Failed to fetch line groups:', error);
      }
    };
    fetchUsers();
    fetchGroups();
    fetchLineGroups();
  }, []);

  // Effect to expand new groups when they are added
  useEffect(() => {
    const allGroupNames = [];
    
    // Add email groups
    if (dbGroups.length > 0) {
      const emailGroupNames = dbGroups.map(group => group.name);
      allGroupNames.push(...emailGroupNames);
    }
    
    // Add line groups
    if (dbLineGroups.length > 0) {
      const lineGroupNames = dbLineGroups.map(group => group.name);
      allGroupNames.push(...lineGroupNames);
    }
    
    if (allGroupNames.length > 0) {
      setExpandedGroups(new Set(allGroupNames));
    }
  }, [dbGroups, dbLineGroups]);

  const handleAddGroup = () => {
    setAddGroupModalOpen(true);
  };

  // Add group to database
  const handleAddGroupToDatabase = async () => {
    const groupName = newRow.displayName.trim();
    if (!groupName) return;
    
    try {
      // Call backend API to add group
      const response = await apiClient.addGroup({ name: groupName });
      if (response.success && response.data) {
        // Add to UI only if backend succeeded
        setGroupOptions([...groupOptions, groupName]);
        // Update dbGroups with new group
        setDbGroups([...dbGroups, { id: response.data.id, name: groupName }]);
        
        // Log email group creation event
        await logEmailGroupAdd({
          groupId: response.data.id,
          groupName: groupName
        });
        
        // Expand the new group
        setExpandedGroups(prev => new Set([...prev, groupName]));
        
        // Reset form
        setNewRow({ ...newRow, displayName: '' });
        setAddGroupModalOpen(false);
        
        // Show success message
        console.log('Successfully added group to database:', response.data);
      } else {
        alert('Failed to add group to database: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding group:', err);
      alert('Error adding group: ' + (err.message || 'Unknown error'));
    }
  };

  // Add line group to database
  const handleAddLineGroupToDatabase = async () => {
    const groupName = newRow.displayName.trim();
    if (!groupName) return;
    
    try {
      // Call backend API to add line group
      const response = await apiClient.addLineGroup({ name: groupName });
      if (response.success && response.data) {
        // Update dbLineGroups with new group
        setDbLineGroups([...dbLineGroups, { id: response.data.id, name: groupName }]);
        
        // Log LINE group creation event
        await logLineGroupAdd({
          groupId: response.data.id,
          groupName: groupName
        });
        
        // Expand the new line group by default
        setExpandedGroups(prev => new Set([...prev, groupName]));
        
        // Reset form
        setNewRow({ ...newRow, displayName: '' });
        setAddGroupModalOpen(false);
        
        // Show success message
        console.log('Successfully added line group to database:', response.data);
      } else {
        alert('Failed to add line group to database: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding line group:', err);
      alert('Error adding line group: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCreateGroupWithEmails = async () => {
    const trimmedName = newGroupNameForModal.trim();
    if (trimmedName && !groupOptions.includes(trimmedName)) {
      try {
        // Add new group to database
        const response = await apiClient.addGroup({ name: trimmedName });
        if (response.success && response.data) {
          // Update both UI and dbGroups
          setGroupOptions([...groupOptions, trimmedName]);
          setDbGroups([...dbGroups, { id: response.data.id, name: trimmedName }]);
          
          // Expand the new group
          setExpandedGroups(prev => new Set([...prev, trimmedName]));
          
          // Add selected emails to the new group
          setRows(rows => rows.map(row => 
            selectedEmailsForGroup.has(row.id)
              ? { ...row, groups: [...row.groups, trimmedName] }
              : row
          ));
          
          // Reset modal state
          setNewGroupNameForModal('');
          setSelectedEmailsForGroup(new Set());
          setAddGroupModalOpen(false);
          // Reset sorting state
          setAddGroupModalSortField(null);
          setAddGroupModalSortDirection('asc');
          
          // Show success message
          console.log('Successfully created group with emails:', response.data);
        } else {
          alert('Failed to add group to database: ' + (response.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error creating group:', err);
        alert('Error creating group: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleCancelAddGroup = () => {
    setNewGroupNameForModal('');
    setSelectedEmailsForGroup(new Set());
    setAddGroupModalOpen(false);
    // Reset sorting state
    setAddGroupModalSortField(null);
    setAddGroupModalSortDirection('asc');
  };

  const handleSelectEmailForGroup = (emailId: number) => {
    setSelectedEmailsForGroup(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const handleEditGroup = (idx: number) => {
    if (editingGroupName.trim() && !groupOptions.includes(editingGroupName.trim())) {
      setGroupOptions(groupOptions.map((g, i) => i === idx ? editingGroupName.trim() : g));
      setEditingGroupIdx(null);
      setEditingGroupName('');
    }
  };

  const handleDeleteGroup = (idx: number) => {
    const group = groupOptions[idx];
    setGroupToDelete({ idx, name: group });
    setDeleteGroupDialogOpen(true);
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      const { idx, name } = groupToDelete;
      // Remove group from all emails that have it
      setRows(rows => rows.map(row => ({
        ...row,
        groups: row.groups.filter(g => g !== name)
      })));
      // Remove the group from groupOptions
      setGroupOptions(groupOptions.filter((_, i) => i !== idx));
      // Remove the group from expandedGroups
      setExpandedGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(name);
        return newSet;
      });
      setDeleteGroupDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  const cancelDeleteGroup = () => {
    setDeleteGroupDialogOpen(false);
    setGroupToDelete(null);
  };

  const handleEdit = (id: number, field: keyof EmailRow, value: string | string[]) => {
    setRows(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleAdd = async () => {
    // Validate based on active tab
    if (activeTab === 'email' || activeTab === 'setup') {
      // For Email tabs, require email
    if (!newRow.displayName || !newRow.email) return;
    } else if (activeTab === 'line' || activeTab === 'groupline') {
      // For Line tabs, require lineId
      if (!newRow.displayName || !newRow.lineId) return;
    }
    
    console.log('handleAdd called with newRow:', newRow); // Debug log
    console.log('Active tab:', activeTab); // Debug log
    
    // Find group object based on active tab
    let groupObj;
    if (activeTab === 'email' || activeTab === 'setup') {
      groupObj = dbGroups.find(g => g.name === newRow.groups[0]);
    } else if (activeTab === 'line' || activeTab === 'groupline') {
      groupObj = dbLineGroups.find(g => g.name === newRow.groups[0]);
    }
    
    // Prepare user payload based on active tab
    const status = newRow.enabled ? 'active' : 'inactive' as const;
    
    // ✅ แก้ไข validation issues
    const sanitizedUsername = newRow.displayName.replace(/[^a-zA-Z0-9]/g, ''); // ลบตัวอักษรพิเศษ
    const finalUsername = sanitizedUsername.length >= 3 ? sanitizedUsername : `user${Date.now()}`;
    const finalEmail = (activeTab === 'email' || activeTab === 'setup') ? newRow.email : `${finalUsername}@example.com`;
    const finalName = newRow.name && newRow.name.trim() ? newRow.name.trim() : newRow.displayName || 'User';
    
    const userPayload: CreateUserRequest = {
      username: finalUsername,
      email: finalEmail,
      password: 'defaultPassword123', // Default password for new users
      name: finalName, // ✅ ต้องไม่ว่าง
      surname: '', // Default empty surname
      phone: newRow.phone || '', // ปล่อยว่างถ้าไม่มี
      lineId: (activeTab === 'line' || activeTab === 'groupline') ? newRow.lineId : '', // Only set lineId for line tabs
      level: 'Operator', // Default level
      status,
      groupId: groupObj ? groupObj.id : null
    };
    
    try {
      // Add user to database
      console.log('🔍 === USER CREATION DEBUG ===');
      console.log('🔍 Original displayName:', newRow.displayName);
      console.log('🔍 Sanitized username:', finalUsername);
      console.log('🔍 Final email:', finalEmail);
      console.log('🔍 Final name:', finalName);
      console.log('🔍 Sending userPayload to API:', userPayload);
      
      const response = await apiClient.createUser(userPayload);
      console.log('🔍 API response after creating user:', response);
      
      if (response.success && response.data) {
        // Add to UI
        const newUserRow = {
          ...newRow,
          id: response.data.id,
          groups: [groupObj ? groupObj.name : (activeTab === 'email' || activeTab === 'setup') ? groupOptions[0] : '']
        };
        console.log('Adding new user row to UI:', newUserRow); // Debug log
        setRows([...rows, newUserRow]);
        
        // Log email/line creation event based on active tab
        if (activeTab === 'email' || activeTab === 'setup') {
          await logEmailAdd({
            userId: response.data.id,
            displayName: newRow.displayName,
            email: newRow.email,
            groupName: groupObj ? groupObj.name : 'Default'
          });
        } else if (activeTab === 'line' || activeTab === 'groupline') {
          await logLineAdd({
            userId: response.data.id,
            displayName: newRow.displayName,
            lineId: newRow.lineId,
            groupName: groupObj ? groupObj.name : 'Default'
          });
        }
        
        // Reset form
        setNewRow({ 
          id: Date.now(), 
          displayName: '', 
          email: '', 
          groups: [(activeTab === 'email' || activeTab === 'setup') ? groupOptions[0] : ''], 
          name: '', 
          phone: '', 
          lineId: '', 
          enabled: true 
        });
        setAddEmailModalOpen(false);
        
        // Show success message
        console.log('Successfully added user to database:', response.data);
      } else {
        console.error('❌ Failed to create user:', response);
        const errorMessage = response.details ? 
          `Validation errors: ${response.details.join(', ')}` : 
          (response.error || 'Unknown error');
        alert('Failed to add user to database: ' + errorMessage);
      }
    } catch (err: any) {
      console.error('❌ Error adding user:', err);
      const errorMessage = err?.response?.data?.details ? 
        `Validation errors: ${err.response.data.details.join(', ')}` :
        (err?.response?.data?.error || err?.message || 'Unknown error');
      alert('Error adding user: ' + errorMessage);
    }
  };

  const handleAddModalCancel = () => {
    setNewRow({ 
      id: Date.now(), 
      displayName: '', 
      email: '', 
      groups: [(activeTab === 'email' || activeTab === 'setup') ? groupOptions[0] : ''], 
      name: '', 
      phone: '', 
      lineId: '', 
      enabled: true 
    });
    setAddEmailModalOpen(false);
    setAddGroupModalOpen(false);
  };

  const handleEditModalCancel = () => {
    setEditModalOpen(false);
    setEditingRow(null);
    setEditFormData({
      id: 0,
      displayName: '',
      email: '',
      groups: [''],
      name: '',
      phone: '',
      lineId: '',
      enabled: true,
    });
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const toggleAllGroups = () => {
    if (expandedGroups.size === getGroupedEmails().size) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(getGroupedEmails().keys()));
    }
  };

  const handleDoubleClick = (row: EmailRow, field: keyof EmailRow) => {
    // Prevent inline editing when in multi-select mode
    if (isMultiSelectMode) {
      return;
    }
    setEditingId(row.id);
    setEditingField(field);
  };

  const handleRightClick = (row: EmailRow) => {
    setContextMenuRow(row);
    setContextMenuOpen(true);
  };

  const handleEditRow = (row: EmailRow) => {
    console.log('handleEditRow called with row:', row); // Debug log
    setEditingRow({ ...row });
    setEditFormData({ ...row });
    setEditModalOpen(true);
    setContextMenuOpen(false);
  };

  const handleSelectEmail = (row: EmailRow) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(row.id)) {
        newSet.delete(row.id);
      } else {
        newSet.add(row.id);
      }
      return newSet;
    });
    setContextMenuOpen(false);
  };

  const handleToggleMultiSelect = () => {
    setIsMultiSelectMode(prev => {
      if (prev) {
        setSelectedEmails(new Set()); // ออกจาก multi-select ล้างการเลือก
      }
      return !prev;
    });
    // Cancel any ongoing inline editing when entering multi-select mode
    setEditingId(null);
    setEditingField(null);
    setContextMenuOpen(false);
  };

  const handleSaveEdit = async () => {
    if (editFormData) {
      console.log('handleSaveEdit called with editFormData:', editFormData); // Debug log
      try {
        // Prepare update data
        const updateData: any = {
          username: editFormData.displayName,
          email: editFormData.email,
          name: editFormData.name,
          surname: '', // Add empty surname as it's required by database
          phone: editFormData.phone,
          lineId: editFormData.lineId,
          status: editFormData.enabled ? 'active' : 'inactive'
        };

        // Add group if available
        if (editFormData.groups && editFormData.groups.length > 0) {
          const groupObj = dbGroups.find(g => g.name === editFormData.groups[0]);
          if (groupObj) {
            updateData.groupId = groupObj.id;
          }
        }

        console.log('Sending update data:', updateData); // Debug log
        const response = await apiClient.updateUser(editFormData.id, updateData);
        console.log('API response after updating user:', response); // Debug log
        
        if (response.success) {
          // Update UI after successful database update
          console.log('Updating UI with editFormData:', editFormData); // Debug log
          setRows(rows => rows.map(row => row.id === editFormData.id ? editFormData : row));
          console.log(`Successfully updated user ${editFormData.displayName} in database`);
        } else {
          console.error('Failed to update user in database:', response.error, response.message);
          alert('Failed to update user in database: ' + (response.error || response.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user: ' + (error.message || 'Unknown error'));
      }
      
      setEditModalOpen(false);
      setEditingRow(null);
      setEditFormData({
        id: 0,
        displayName: '',
        email: '',
        groups: [''],
        name: '',
        phone: '',
        lineId: '',
        enabled: true,
      });
    }
  };

  const handleDeleteRow = async (row: EmailRow) => {
    if (confirm(`ต้องการลบ ${row.displayName} จริงๆใช่มั้ย?`)) {
      try {
        const response = await apiClient.deleteUser(row.id);
        if (response.success) {
          // Remove from UI after successful database deletion
    setRows(rows => rows.filter(r => r.id !== row.id));
          console.log(`Successfully deleted user ${row.displayName} from database`);
        } else {
          console.error('Failed to delete user from database:', response.error);
          alert('Failed to delete user from database: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + (error.message || 'Unknown error'));
      }
    }
    setContextMenuOpen(false);
  };

  const handleMoveToGroup = async (row: EmailRow, targetGroup: string) => {
    // อัปเดต group_id ใน database
    const groupObj = dbGroups.find(g => g.name === targetGroup);
    console.log('Moving user to group:', { userId: row.id, targetGroup, groupObj }); // Debug log
    
    if (groupObj) {
      try {
        const updateData = { groupId: groupObj.id };
        console.log('Sending update data:', updateData); // Debug log
        
        const response = await apiClient.updateUser(row.id, updateData);
        console.log('Update response:', response); // Debug log
        
        if (response.success) {
          // อัปเดต UI หลังจาก database อัปเดตสำเร็จ
          setRows(rows => rows.map(r => 
            r.id === row.id 
              ? { ...r, groups: [targetGroup] }
              : r
          ));
          console.log(`Successfully moved user ${row.displayName} to group ${targetGroup}`);
        } else {
          console.error('Failed to update user group in database:', response.error);
          alert('Failed to update user group in database');
        }
      } catch (error) {
        console.error('Error updating user group:', error);
        alert('Error updating user group: ' + error.message);
      }
    } else {
      console.error('Group not found:', targetGroup);
      alert('Group not found: ' + targetGroup);
    }
    setContextMenuOpen(false);
    setMoveToGroupDialogOpen(false);
    setSelectedRowForGroupAction(null);
  };

  const handleMoveToLineGroup = async (row: EmailRow, targetGroup: string) => {
    // อัปเดต line_group_id ใน database สำหรับ line groups
    const groupObj = dbLineGroups.find(g => g.name === targetGroup);
    console.log('Moving user to line group:', { userId: row.id, targetGroup, groupObj }); // Debug log
    
    if (groupObj) {
      try {
        const updateData = { lineGroupId: groupObj.id };
        console.log('Sending update data:', updateData); // Debug log
        
        const response = await apiClient.updateUser(row.id, updateData);
        console.log('Update response:', response); // Debug log
        
        if (response.success) {
          // อัปเดต UI หลังจาก database อัปเดตสำเร็จ
          setRows(rows => rows.map(r => 
            r.id === row.id 
              ? { ...r, line_groups: [targetGroup] }
              : r
          ));
          console.log(`Successfully moved user ${row.displayName} to line group ${targetGroup}`);
        } else {
          console.error('Failed to update user line group in database:', response.error);
          alert('Failed to update user line group in database');
        }
      } catch (error) {
        console.error('Error updating user line group:', error);
        alert('Error updating user line group: ' + error.message);
      }
    } else {
      console.error('Line group not found:', targetGroup);
      alert('Line group not found: ' + targetGroup);
    }
    setContextMenuOpen(false);
    setMoveToGroupDialogOpen(false);
    setSelectedRowForGroupAction(null);
  };

  const handleAddToGroup = async (row: EmailRow, targetGroup: string) => {
    // อัปเดต group_id ใน database
    const groupObj = dbGroups.find(g => g.name === targetGroup);
    if (groupObj) {
      try {
        const response = await apiClient.updateUser(row.id, { groupId: groupObj.id });
        if (response.success) {
          // อัปเดต UI หลังจาก database อัปเดตสำเร็จ
          setRows(rows => rows.map(r => 
            r.id === row.id 
              ? { ...r, groups: r.groups.includes(targetGroup) ? r.groups : [...r.groups, targetGroup] }
              : r
          ));
          
          // Log user add to group event
          await logUserAddToGroup(
            {
              userId: row.id,
              displayName: row.displayName,
              email: row.email
            },
            {
              groupId: groupObj.id,
              groupName: targetGroup
            }
          );
          
          console.log(`Successfully added user ${row.displayName} to group ${targetGroup}`);
        } else {
          console.error('Failed to update user group in database:', response.error);
          alert('Failed to update user group in database');
        }
      } catch (error) {
        console.error('Error updating user group:', error);
        alert('Error updating user group: ' + error.message);
      }
    }
    setContextMenuOpen(false);
    setAddToGroupDialogOpen(false);
    setSelectedRowForGroupAction(null);
  };

  const handleAddToLineGroup = async (row: EmailRow, targetGroup: string) => {
    // อัปเดต line_group_id ใน database สำหรับ line groups
    const groupObj = dbLineGroups.find(g => g.name === targetGroup);
    if (groupObj) {
      try {
        const response = await apiClient.updateUser(row.id, { lineGroupId: groupObj.id });
        if (response.success) {
          // อัปเดต UI หลังจาก database อัปเดตสำเร็จ
          setRows(rows => rows.map(r => 
            r.id === row.id 
              ? { ...r, line_groups: [targetGroup] }
              : r
          ));
          console.log(`Successfully added user ${row.displayName} to line group ${targetGroup}`);
        } else {
          console.error('Failed to update user line group in database:', response.error);
          alert('Failed to update user line group in database');
        }
      } catch (error) {
        console.error('Error updating user line group:', error);
        alert('Error updating user line group: ' + error.message);
      }
    }
    setContextMenuOpen(false);
    setAddToGroupDialogOpen(false);
    setSelectedRowForGroupAction(null);
  };

  const handleBulkDelete = async () => {
    if (confirm(`ต้องการลบ ${selectedEmails.size} users จริงๆใช่มั้ย?`)) {
      try {
        const deletePromises = Array.from(selectedEmails).map(userId => 
          apiClient.deleteUser(userId)
        );
        
        const results = await Promise.all(deletePromises);
        const allSuccessful = results.every(result => result.success);
        
        if (allSuccessful) {
          // Remove from UI after successful database deletion
      setRows(rows => rows.filter(r => !selectedEmails.has(r.id)));
          console.log(`Successfully deleted ${selectedEmails.size} users from database`);
        } else {
          console.error('Some users failed to delete from database');
          alert('Some users failed to delete from database');
        }
      } catch (error) {
        console.error('Error deleting users:', error);
        alert('Error deleting users: ' + (error.message || 'Unknown error'));
      }
      
      setSelectedEmails(new Set());
      setIsMultiSelectMode(false);
      setContextMenuOpen(false);
    }
  };

  const handleMoveMultipleToGroup = async (targetGroup: string) => {
    // อัปเดต group_id ใน database สำหรับทุก user ที่เลือก
    const groupObj = dbGroups.find(g => g.name === targetGroup);
    if (groupObj) {
      try {
        const updatePromises = Array.from(selectedEmails).map(userId => 
          apiClient.updateUser(userId, { groupId: groupObj.id })
        );
        
        const results = await Promise.all(updatePromises);
        const allSuccessful = results.every(result => result.success);
        
        if (allSuccessful) {
          // อัปเดต UI หลังจาก database อัปเดตสำเร็จ
          setRows(rows => rows.map(r => 
            selectedEmails.has(r.id)
              ? { ...r, groups: [targetGroup] }
              : r
          ));
          console.log(`Successfully moved ${selectedEmails.size} users to group ${targetGroup}`);
        } else {
          console.error('Some users failed to update in database');
          alert('Some users failed to update in database');
        }
      } catch (error) {
        console.error('Error updating users group:', error);
        alert('Error updating users group: ' + error.message);
      }
    }
    setSelectedEmails(new Set());
    setIsMultiSelectMode(false);
    setContextMenuOpen(false);
  };

  const handleAddMultipleToGroup = async (targetGroup: string) => {
    // อัปเดต group_id ใน database สำหรับทุก user ที่เลือก
    const groupObj = dbGroups.find(g => g.name === targetGroup);
    if (groupObj) {
      try {
        const updatePromises = Array.from(selectedEmails).map(userId => 
          apiClient.updateUser(userId, { groupId: groupObj.id })
        );
        
        const results = await Promise.all(updatePromises);
        const allSuccessful = results.every(result => result.success);
        
        if (allSuccessful) {
          // อัปเดต UI หลังจาก database อัปเดตสำเร็จ
          setRows(rows => rows.map(r => 
            selectedEmails.has(r.id)
              ? { ...r, groups: r.groups.includes(targetGroup) ? r.groups : [...r.groups, targetGroup] }
              : r
          ));
          console.log(`Successfully added ${selectedEmails.size} users to group ${targetGroup}`);
        } else {
          console.error('Some users failed to update in database');
          alert('Some users failed to update in database');
        }
      } catch (error) {
        console.error('Error updating users group:', error);
        alert('Error updating users group: ' + error.message);
      }
    }
    setSelectedEmails(new Set());
    setIsMultiSelectMode(false);
    setContextMenuOpen(false);
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      // Update group options
      setGroupOptions(groupOptions.map(g => g === oldName ? newName : g));
      // Update all rows that have this group
      setRows(rows.map(row => ({
        ...row,
        groups: row.groups.map(g => g === oldName ? newName : g)
      })));
    }
    // Always reset editing state, regardless of whether changes were made
    setRenamingGroup(null);
    setNewGroupName('');
  };

  const startGroupRename = (groupName: string) => {
    setRenamingGroup(groupName);
    setNewGroupName(groupName);
  };

  const handleInlineEdit = async (id: number, field: keyof EmailRow, value: string | string[]) => {
    console.log('handleInlineEdit called:', { id, field, value }); // Debug log
    // Update UI immediately for better user experience
    setRows(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
    setEditingId(null);
    setEditingField(null);

    // Save to database
    try {
      const row = rows.find(r => r.id === id);
      if (!row) return;

      // Prepare update data based on the field being edited
      const updateData: any = {};
      
      switch (field) {
        case 'displayName':
          updateData.username = value;
          break;
        case 'email':
          updateData.email = value;
          break;
        case 'name':
          updateData.name = value;
          updateData.surname = ''; // Add empty surname as it's required by database
          break;
        case 'phone':
          updateData.phone = value;
          break;
        case 'lineId':
          updateData.lineId = value;
          break;
        case 'enabled':
          updateData.status = value ? 'active' : 'inactive';
          break;
        case 'groups':
          if (Array.isArray(value) && value.length > 0) {
            const groupObj = dbGroups.find(g => g.name === value[0]);
            if (groupObj) {
              updateData.groupId = groupObj.id;
            }
          }
          break;
      }

      if (Object.keys(updateData).length > 0) {
        console.log('Sending inline update data:', updateData); // Debug log
        const response = await apiClient.updateUser(id, updateData);
        console.log('API response after inline update:', response); // Debug log
        if (response.success) {
          console.log(`Successfully updated ${field} for user ${row.displayName} in database`);
          console.log('UI should now show updated data for field:', field); // Debug log
        } else {
          console.error('Failed to update user in database:', response.error, response.message);
          // Revert UI change if database update failed
          setRows(rows => rows.map(row => row.id === id ? { ...row, [field]: row[field] } : row));
        }
      }
    } catch (error) {
      console.error('Error updating user:', error);
      // Revert UI change if database update failed
      const originalRow = rows.find(r => r.id === id);
      if (originalRow) {
        setRows(rows => rows.map(row => row.id === id ? { ...row, [field]: originalRow[field] } : row));
      }
    }
  };

  const startInlineEdit = (id: number, field: keyof EmailRow) => {
    // Prevent inline editing when in multi-select mode
    if (isMultiSelectMode) {
      return;
    }
    setEditingId(id);
    setEditingField(field);
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditingField(null);
  };

  // Group emails by their groups (only show groups that exist in groupOptions)
  const getGroupedEmails = () => {
    console.log('getGroupedEmails called, current rows:', rows); // Debug log
    const grouped = new Map<string, EmailRow[]>();
    
    // Filter emails based on search term first and only include users with email
    const filteredRows = rows.filter(row => {
      if (!row.enabled) return false;
      
      // Only include users who have email
      if (!row.email || row.email.trim() === '') return false;
      
      if (searchTerm.trim() === '') return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        row.displayName.toLowerCase().includes(searchLower) ||
        row.email.toLowerCase().includes(searchLower) ||
        row.name.toLowerCase().includes(searchLower) ||
        row.phone.toLowerCase().includes(searchLower) ||
        row.lineId.toLowerCase().includes(searchLower) ||
        row.groups.some(group => group.toLowerCase().includes(searchLower))
      );
    });
    console.log('filteredRows for grouped emails:', filteredRows); // Debug log
    console.log('filteredRows with all fields:', filteredRows.map(row => ({ 
      id: row.id, 
      displayName: row.displayName, 
      email: row.email,
      name: row.name,
      phone: row.phone, 
      lineId: row.lineId,
      groups: row.groups,
      enabled: row.enabled
    }))); // Debug log
    
    filteredRows.forEach(row => {
      console.log('Processing row for grouping:', row); // Debug log
      row.groups.forEach(group => {
        // Only include groups that exist in groupOptions
        if (groupOptions.includes(group)) {
          if (!grouped.has(group)) {
            grouped.set(group, []);
          }
          grouped.get(group)!.push(row);
        }
      });
    });
    
    // Sort emails within each group if sorting is enabled
    if (sortField) {
      grouped.forEach((emails, group) => {
        console.log(`Sorting emails in group ${group}:`, emails); // Debug log
        grouped.set(group, [...emails].sort((a, b) => {
          const aValue = a[sortField]?.toString().toLowerCase() || '';
          const bValue = b[sortField]?.toString().toLowerCase() || '';
          
          if (sortDirection === 'asc') {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        }));
      });
    }
    
    console.log('Final grouped emails:', grouped); // Debug log
    console.log('Grouped emails entries:', Array.from(grouped.entries())); // Debug log
    console.log('Grouped emails with lineId:', Array.from(grouped.entries()).map(([group, users]) => ({
      group,
      users: users.map(user => ({ id: user.id, displayName: user.displayName, lineId: user.lineId }))
    }))); // Debug log
    console.log('Grouped emails with phone:', Array.from(grouped.entries()).map(([group, users]) => ({
      group,
      users: users.map(user => ({ id: user.id, displayName: user.displayName, phone: user.phone }))
    }))); // Debug log
    console.log('Grouped emails with all fields:', Array.from(grouped.entries()).map(([group, users]) => ({
      group,
      users: users.map(user => ({ 
        id: user.id, 
        displayName: user.displayName, 
        email: user.email,
        name: user.name,
        phone: user.phone, 
        lineId: user.lineId,
        groups: user.groups,
        enabled: user.enabled
      }))
    }))); // Debug log
    return grouped;
  };

  const groupedEmails = getGroupedEmails();
  console.log('groupedEmails for Email groups display:', groupedEmails); // Debug log

  // Group line users by their line groups (only show users with lineId)
  const getGroupedLineEmails = () => {
    console.log('getGroupedLineEmails called, current rows:', rows); // Debug log
    console.log('Available dbLineGroups:', dbLineGroups); // Debug log
    const grouped = new Map<string, EmailRow[]>();
    
    // Filter emails based on search term first and only include users with lineId
    const filteredRows = rows.filter(row => {
      if (!row.enabled) return false;
      
      // Only include users who have lineId
      if (!row.lineId || row.lineId.trim() === '') return false;
      
      if (searchTerm.trim() === '') return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        row.displayName.toLowerCase().includes(searchLower) ||
        row.email.toLowerCase().includes(searchLower) ||
        row.name.toLowerCase().includes(searchLower) ||
        row.phone.toLowerCase().includes(searchLower) ||
        row.lineId.toLowerCase().includes(searchLower) ||
        (row.line_groups && row.line_groups.some(group => group.toLowerCase().includes(searchLower)))
      );
    });
    console.log('filteredRows for line groups:', filteredRows); // Debug log
    
    // First, create groups from dbLineGroups to ensure all groups are shown
    dbLineGroups.forEach(dbGroup => {
      if (!grouped.has(dbGroup.name)) {
        grouped.set(dbGroup.name, []);
      }
    });
    
    filteredRows.forEach(row => {
      console.log('Processing row for line grouping:', row); // Debug log
      console.log('Row line_groups:', row.line_groups); // Debug log
      
      if (row.line_groups && Array.isArray(row.line_groups) && row.line_groups.length > 0) {
        row.line_groups.forEach(group => {
          // Only include groups that exist in dbLineGroups
          if (dbLineGroups.some(dbGroup => dbGroup.name === group)) {
            if (!grouped.has(group)) {
              grouped.set(group, []);
            }
            grouped.get(group)!.push(row);
          }
        });
      } else {
        // If user has no line_groups but has lineId, put them in a default group if it exists
        const defaultGroup = dbLineGroups.find(g => g.name === 'Default' || g.name === 'Emergency');
        if (defaultGroup) {
          if (!grouped.has(defaultGroup.name)) {
            grouped.set(defaultGroup.name, []);
          }
          // Don't add to default group automatically - let users assign manually
        }
      }
    });
    
    // Sort emails within each group if sorting is enabled
    if (sortField) {
      grouped.forEach((emails, group) => {
        console.log(`Sorting line emails in group ${group}:`, emails); // Debug log
        grouped.set(group, [...emails].sort((a, b) => {
          const aValue = a[sortField]?.toString().toLowerCase() || '';
          const bValue = b[sortField]?.toString().toLowerCase() || '';
          
          if (sortDirection === 'asc') {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        }));
      });
    }
    
    console.log('Final grouped line emails:', grouped); // Debug log
    return grouped;
  };

  const groupedLineEmails = getGroupedLineEmails();
  console.log('groupedLineEmails for Line groups display:', groupedLineEmails); // Debug log

  const handleSetupSave = () => {
    setRows(rows => rows.map(row => row.id === setupRow.id ? { ...setupRow } : row));
    setSetupEdit(false);
  };

  const handleSetupCancel = () => {
    setSetupRow({ ...rows[0] });
    setSetupEdit(false);
  };

  const handleDraftEdit = (id: number, field: keyof EmailRow, value: string | boolean | string[]) => {
    setDraftRows(draftRows => draftRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleDraftAdd = () => {
    setDraftRows([...draftRows, { id: Date.now(), displayName: '', email: '', groups: [groupOptions[0]], name: '', phone: '', lineId: '', enabled: true }]);
  };

  const handleDraftDelete = (id: number) => {
    setDraftRows(draftRows => draftRows.filter(row => row.id !== id));
  };

  const handleDraftSave = () => {
    setRows(draftRows);
  };

  // Sorting function
  const handleSort = (field: keyof EmailRow | 'no') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted rows for Email List (only users with email)
  const getSortedRows = () => {
    console.log('getSortedRows called, current rows:', rows); // Debug log
    const enabledRows = rows.filter(row => row.enabled);
    console.log('enabledRows:', enabledRows); // Debug log
    
    // Filter users who have email for Email List tab
    const emailUsers = enabledRows.filter(row => row.email && row.email.trim() !== '');
    console.log('emailUsers (users with email):', emailUsers); // Debug log
    
    if (!sortField) {
      console.log('No sort field, returning emailUsers:', emailUsers); // Debug log
      return emailUsers;
    }
    if (sortField === 'no') {
      // Sort by original insertion order (id ascending/descending)
      const sortedRows = [...emailUsers].sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.id - b.id;
        } else {
          return b.id - a.id;
        }
      });
      console.log('Sorted by no field:', sortedRows); // Debug log
      return sortedRows;
    }
    const sortedRows = [...emailUsers].sort((a, b) => {
      const aValue = a[sortField]?.toString().toLowerCase() || '';
      const bValue = b[sortField]?.toString().toLowerCase() || '';
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    console.log('Final sorted rows for Email List:', sortedRows); // Debug log
    return sortedRows;
  };

  const sortedRows = getSortedRows();
  console.log('sortedRows for Email List display:', sortedRows); // Debug log

  // Get sorted rows for Line List (only users with lineId)
  const getSortedLineRows = () => {
    console.log('getSortedLineRows called, current rows:', rows); // Debug log
    const enabledRows = rows.filter(row => row.enabled);
    console.log('enabledRows for Line List:', enabledRows); // Debug log
    
    // Filter users who have lineId for Line List tab
    const lineUsers = enabledRows.filter(row => row.lineId && row.lineId.trim() !== '');
    console.log('lineUsers (users with lineId):', lineUsers); // Debug log
    
    if (!sortField) {
      console.log('No sort field, returning lineUsers:', lineUsers); // Debug log
      return lineUsers;
    }
    if (sortField === 'no') {
      // Sort by original insertion order (id ascending/descending)
      const sortedRows = [...lineUsers].sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.id - b.id;
        } else {
          return b.id - a.id;
        }
      });
      console.log('Sorted by no field for Line List:', sortedRows); // Debug log
      return sortedRows;
    }
    const sortedRows = [...lineUsers].sort((a, b) => {
      const aValue = a[sortField]?.toString().toLowerCase() || '';
      const bValue = b[sortField]?.toString().toLowerCase() || '';
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    console.log('Final sorted rows for Line List:', sortedRows); // Debug log
    return sortedRows;
  };

  const sortedLineRows = getSortedLineRows();
  console.log('sortedLineRows for Line List display:', sortedLineRows); // Debug log

  // Sortable Header Component
  const SortableHeader = ({ field, children }: { field: keyof EmailRow, children: React.ReactNode }) => (
    <th 
      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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

  // Add group context menu handlers
  const handleGroupRightClick = (groupName: string) => {
    setSelectedGroupForContext(groupName);
    setGroupContextMenuOpen(true);
  };

  const handleGroupDoubleClick = (groupName: string) => {
    setRenamingGroup(groupName);
    setNewGroupName(groupName);
  };

  const handleGroupEdit = (groupName: string) => {
    const idx = groupOptions.indexOf(groupName);
    if (idx !== -1) {
      setEditingGroupIdx(idx);
      setEditingGroupName(groupName);
    }
    setGroupContextMenuOpen(false);
  };

  const handleGroupDelete = (groupName: string) => {
    const idx = groupOptions.indexOf(groupName);
    if (idx !== -1) {
      handleDeleteGroup(idx);
    }
    setGroupContextMenuOpen(false);
  };

  // Email Group Edit/Delete functions
  const handleEditEmailGroup = (group: any) => {
    setEditingEmailGroup(group);
    setEditEmailGroupName(group.name);
    setEditEmailGroupModalOpen(true);
  };

  const handleDeleteEmailGroup = async (group: any) => {
    if (confirm(`ต้องการลบกลุ่ม "${group.name}" จริงๆใช่มั้ย?`)) {
      try {
        // Call API to delete email group
        const response = await apiClient.deleteGroup(group.id);
        if (response.success) {
          // Remove from UI
          setDbGroups(prev => prev.filter(g => g.id !== group.id));
          // Remove from expanded groups
          setExpandedGroups(prev => {
            const newSet = new Set(prev);
            newSet.delete(group.name);
            return newSet;
          });
          console.log(`Successfully deleted email group ${group.name} from database`);
        } else {
          alert('Failed to delete email group from database: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting email group:', error);
        alert('Error deleting email group: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleSaveEditEmailGroup = async () => {
    if (!editingEmailGroup || !editEmailGroupName.trim()) return;
    
    try {
      // Call API to update email group
      const response = await apiClient.updateGroup(editingEmailGroup.id, { name: editEmailGroupName.trim() });
      if (response.success) {
        const oldGroupName = editingEmailGroup.name;
        const newGroupName = editEmailGroupName.trim();
        
        // Update UI
        setDbGroups(prev => prev.map(g => 
          g.id === editingEmailGroup.id ? { ...g, name: newGroupName } : g
        ));
        
        // Update rows to reflect the new group name
        setRows(prev => prev.map(row => ({
          ...row,
          groups: row.groups.map(group => group === oldGroupName ? newGroupName : group)
        })));
        
        // Update expanded groups if name changed
        if (oldGroupName !== newGroupName) {
          setExpandedGroups(prev => {
            const newSet = new Set(prev);
            newSet.delete(oldGroupName);
            newSet.add(newGroupName);
            return newSet;
          });
        }
        
        console.log(`Successfully updated email group ${oldGroupName} to ${newGroupName}`);
        setEditEmailGroupModalOpen(false);
        setEditingEmailGroup(null);
        setEditEmailGroupName('');
      } else {
        alert('Failed to update email group in database: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating email group:', error);
      alert('Error updating email group: ' + (error.message || 'Unknown error'));
    }
  };

  // Line Group Edit/Delete functions
  const handleEditLineGroup = (groupName: string) => {
    const group = dbLineGroups.find(g => g.name === groupName);
    if (group) {
      setEditingLineGroup(group);
      setEditLineGroupName(group.name);
      setEditLineGroupModalOpen(true);
    }
  };

  const handleDeleteLineGroup = async (groupName: string) => {
    const group = dbLineGroups.find(g => g.name === groupName);
    if (!group) return;

    if (confirm(`ต้องการลบกลุ่ม "${groupName}" จริงๆใช่มั้ย?`)) {
      try {
        // Call API to delete line group
        const response = await apiClient.deleteLineGroup(group.id);
        if (response.success) {
          // Remove from UI
          setDbLineGroups(prev => prev.filter(g => g.id !== group.id));
          // Remove from expanded groups
          setExpandedGroups(prev => {
            const newSet = new Set(prev);
            newSet.delete(groupName);
            return newSet;
          });
          console.log(`Successfully deleted line group ${groupName} from database`);
        } else {
          alert('Failed to delete line group from database: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting line group:', error);
        alert('Error deleting line group: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleSaveEditLineGroup = async () => {
    if (!editingLineGroup || !editLineGroupName.trim()) return;
    
    try {
      // Call API to update line group
      const response = await apiClient.updateLineGroup(editingLineGroup.id, { name: editLineGroupName.trim() });
      if (response.success) {
        const oldGroupName = editingLineGroup.name;
        const newGroupName = editLineGroupName.trim();
        
        // Update UI
        setDbLineGroups(prev => prev.map(g => 
          g.id === editingLineGroup.id ? { ...g, name: newGroupName } : g
        ));
        
        // Update rows to reflect the new line group name
        setRows(prev => prev.map(row => ({
          ...row,
          line_groups: row.line_groups ? row.line_groups.map(group => group === oldGroupName ? newGroupName : group) : []
        })));
        
        // Update expanded groups if name changed
        if (oldGroupName !== newGroupName) {
          setExpandedGroups(prev => {
            const newSet = new Set(prev);
            newSet.delete(oldGroupName);
            newSet.add(newGroupName);
            return newSet;
          });
        }
        
        console.log(`Successfully updated line group ${oldGroupName} to ${newGroupName}`);
        setEditLineGroupModalOpen(false);
        setEditingLineGroup(null);
        setEditLineGroupName('');
      } else {
        alert('Failed to update line group in database: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating line group:', error);
      alert('Error updating line group: ' + (error.message || 'Unknown error'));
    }
  };

  // Add Group Modal sorting function
  const handleAddGroupModalSort = (field: keyof EmailRow | 'no') => {
    if (addGroupModalSortField === field) {
      setAddGroupModalSortDirection(addGroupModalSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAddGroupModalSortField(field);
      setAddGroupModalSortDirection('asc');
    }
  };

  // Get sorted rows for Add Group Modal
  const getAddGroupModalSortedRows = () => {
    const enabledRows = rows.filter(row => row.enabled);
    if (!addGroupModalSortField) return enabledRows;
    if (addGroupModalSortField === 'no') {
      return [...enabledRows].sort((a, b) => {
        if (addGroupModalSortDirection === 'asc') {
          return a.id - b.id;
        } else {
          return b.id - a.id;
        }
      });
    }
    return [...enabledRows].sort((a, b) => {
      const aValue = a[addGroupModalSortField]?.toString().toLowerCase() || '';
      const bValue = b[addGroupModalSortField]?.toString().toLowerCase() || '';
      
      if (addGroupModalSortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  // Sortable Header Component for Add Group Modal
  const AddGroupModalSortableHeader = ({ field, children }: { field: keyof EmailRow | 'no', children: React.ReactNode }) => (
    <th 
      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleAddGroupModalSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {addGroupModalSortField === field && (
          addGroupModalSortDirection === 'asc' ? 
            <ChevronUp className="w-3 h-3" /> : 
            <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-9xl mx-auto">
          {/* Main Content */}
          <div className="bg-white rounded-none shadow-sm">
            {/* Email Management Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-semibold text-gray-900">Email Management</h1>
              </div>
            </div>

            <Tabs defaultValue="email" className="w-full" onValueChange={setActiveTab}>
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 px-0 pt-0">
                <TabsList className="h-10 p-1 bg-gray-100 rounded-none">
                  <TabsTrigger 
                    value="email" 
                    className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-none"
                  >
                    Email List
                  </TabsTrigger>
                  <TabsTrigger 
                    value="setup" 
                    className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-none"
                  >
                    Group Email
                  </TabsTrigger>
                  <TabsTrigger 
                    value="line" 
                    className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-none"
                  >
                    Line List
                  </TabsTrigger>
                  <TabsTrigger 
                    value="groupline" 
                    className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-none"
                  >
                    Group Line
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Email List Tab */}
              <TabsContent value="email" className="p-6 space-y-4">
                <div className="flex items-center justify-end -mt-2 mb-4">
                  {/* Bulk Actions for Multi-Select */}
                  {isMultiSelectMode && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={selectedEmails.size === sortedRows.length ? "outline" : "default"}
                        className="text-xs h-8 rounded-none"
                        onClick={() => {
                          if (selectedEmails.size === sortedRows.length) {
                            handleDeselectAll();
                          } else {
                            handleSelectAll(sortedRows);
                          }
                        }}
                      >
                        {selectedEmails.size === sortedRows.length ? "Unselect All" : "Select All"}
                      </Button>
                      <span className="text-xs text-gray-700">Selected: {selectedEmails.size}</span>
                      <Button size="sm" className="text-xs h-8 bg-red-500 hover:bg-red-600 text-white rounded-none" onClick={handleBulkDelete} disabled={selectedEmails.size === 0 || !emailPermissions.write} title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                      <Button size="sm" className="text-xs h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-none" onClick={() => setBulkAddToGroupDialogOpen(true)} disabled={selectedEmails.size === 0 || !emailPermissions.write} title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
                        <Plus className="w-3 h-3 mr-1" /> Add to Group
                      </Button>
                      <Button size="sm" className="text-xs h-8 bg-primary hover:bg-primary/90 text-white rounded-none" onClick={() => setBulkMoveToGroupDialogOpen(true)} disabled={selectedEmails.size === 0 || !emailPermissions.write} title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
                        <ChevronRight className="w-3 h-3 mr-1" /> Move to Group
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {/* Search Box */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400"/>
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
                    <Dialog open={addEmailModalOpen} onOpenChange={setAddEmailModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          className="text-xs h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-none"
                          disabled={!emailPermissions.write}
                          title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
                        >
                          <MailPlus className="w-3 h-3 mr-1" />
                          Add Email
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-base">New Email Contact</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">User</label>
                              <Input
                                value={newRow.displayName}
                                onChange={e => setNewRow({...newRow, displayName: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter username"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Email Address</label>
                              <Input
                                value={newRow.email}
                                onChange={e => setNewRow({...newRow, email: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="user@example.com"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Group</label>
                              <Select value={newRow.groups[0]} onValueChange={val => setNewRow({...newRow, groups: [val]})}>
                                <SelectTrigger className="h-8 text-xs rounded-none">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {dbLineGroups.map(group => (
                                    <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Name-Lastname</label>
                              <Input
                                value={newRow.name}
                                onChange={e => setNewRow({...newRow, name: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter full name"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Phone</label>
                              <Input
                                value={newRow.phone}
                                onChange={e => setNewRow({...newRow, phone: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter phone number"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-8 rounded-none"
                              onClick={handleAddModalCancel}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
                              onClick={handleAdd}
                              disabled={!emailPermissions.write}
                              title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
                            >
                              Add Email
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Simple Email List Table */}
                <div className="border border-gray-200 rounded-none overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {/* Checkbox for select all */}
                          {isMultiSelectMode && (
                            <th className="px-2 py-2 text-center w-8">
                              <Checkbox
                                checked={selectedEmails.size === sortedRows.length && sortedRows.length > 0}
                                onCheckedChange={() => {
                                  if (selectedEmails.size === sortedRows.length) {
                                    handleDeselectAll();
                                  } else {
                                    handleSelectAll(sortedRows);
                                  }
                                }}
                              />
                            </th>
                          )}
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 tracking-wider w-12 cursor-pointer hover:bg-gray-100 select-none">
                            <div className="flex items-center justify-center space-x-1" onClick={() => handleSort('no')}>
                              <span>No.</span>
                              {sortField === 'no' && (
                                sortDirection === 'asc' ? 
                                  <ChevronUp className="w-3 h-3" /> : 
                                  <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </th>
                          <SortableHeader field="displayName">User</SortableHeader>
                          <SortableHeader field="email">Email</SortableHeader>
                          <SortableHeader field="name">Name-Lastname</SortableHeader>
                          <SortableHeader field="phone">Phone</SortableHeader>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedRows.filter(row => {
                          if (searchTerm.trim() === '') return true;
                          const searchLower = searchTerm.toLowerCase();
                          return (
                            row.displayName.toLowerCase().includes(searchLower) ||
                            row.email.toLowerCase().includes(searchLower) ||
                            row.name.toLowerCase().includes(searchLower) ||
                            row.phone.toLowerCase().includes(searchLower) ||
                            row.lineId.toLowerCase().includes(searchLower) ||
                            row.groups.some(group => group.toLowerCase().includes(searchLower))
                          );
                        }).map((row, index) => (
                          <ContextMenu key={row.id} 
                            onOpenChange={open => {
                              setContextMenuOpen(open);
                            }}
                          >
                            <ContextMenuTrigger asChild>
                              <tr 
                                className={`hover:bg-gray-50 cursor-pointer ${selectedEmails.has(row.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                onContextMenu={() => handleRightClick(row)}
                              >
                                {/* Checkbox for each row */}
                                {isMultiSelectMode && (
                                  <td className="px-2 py-2 text-center w-8">
                                    <Checkbox
                                      checked={selectedEmails.has(row.id)}
                                      onCheckedChange={() => handleToggleSelectEmail(row.id)}
                                    />
                                  </td>
                                )}
                                <td className="px-2 py-2 text-center w-12">
                                  <span className="text-xs text-gray-500">{index + 1}</span>
                                </td>
                                <td className="px-3 py-2">
                                  {editingId === row.id && editingField === 'displayName' ? (
                                    <Input
                                      ref={inlineEditRef}
                                      value={row.displayName}
                                      onChange={e => handleInlineEdit(row.id, 'displayName', e.target.value)}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && cancelInlineEdit()}
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs text-gray-900 px-1 py-0.5 rounded ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                                      onClick={() => !isMultiSelectMode && startInlineEdit(row.id, 'displayName')}
                                      onDoubleClick={() => !isMultiSelectMode && handleDoubleClick(row, 'displayName')}
                                    >
                                      {row.displayName || <span className="text-gray-400 italic">{!isMultiSelectMode ? 'Click to edit' : 'Select mode active'}</span>}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {editingId === row.id && editingField === 'email' ? (
                                    <Input
                                      ref={inlineEditRef}
                                      value={row.email}
                                      onChange={e => handleInlineEdit(row.id, 'email', e.target.value)}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && cancelInlineEdit()}
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs text-gray-900 px-1 py-0.5 rounded ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                                      onClick={() => !isMultiSelectMode && startInlineEdit(row.id, 'email')}
                                      onDoubleClick={() => !isMultiSelectMode && handleDoubleClick(row, 'email')}
                                    >
                                      {row.email || <span className="text-gray-400 italic">{!isMultiSelectMode ? 'Click to edit' : 'Select mode active'}</span>}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {editingId === row.id && editingField === 'name' ? (
                                    <Input
                                      ref={inlineEditRef}
                                      value={row.name}
                                      onChange={e => handleInlineEdit(row.id, 'name', e.target.value)}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && cancelInlineEdit()}
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs text-gray-900 px-1 py-0.5 rounded ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                                      onClick={() => !isMultiSelectMode && startInlineEdit(row.id, 'name')}
                                      onDoubleClick={() => !isMultiSelectMode && handleDoubleClick(row, 'name')}
                                    >
                                      {row.name || <span className="text-gray-400 italic">{!isMultiSelectMode ? 'Click to edit' : 'Select mode active'}</span>}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {editingId === row.id && editingField === 'phone' ? (
                                    <Input
                                      ref={inlineEditRef}
                                      value={row.phone}
                                      onChange={e => handleInlineEdit(row.id, 'phone', e.target.value)}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && cancelInlineEdit()}
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs text-gray-900 px-1 py-0.5 rounded ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                                      onClick={() => !isMultiSelectMode && startInlineEdit(row.id, 'phone')}
                                      onDoubleClick={() => !isMultiSelectMode && handleDoubleClick(row, 'phone')}
                                    >
                                      {row.phone || <span className="text-gray-400 italic">{!isMultiSelectMode ? 'Click to edit' : 'Select mode active'}</span>}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            </ContextMenuTrigger>
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
                              canWrite={emailPermissions.write}
                            />

                          </ContextMenu>
                        ))}
                      </tbody>
                    </table>
                                    </div>
                                  </div>
              </TabsContent>

              {/* Group List Tab */}
              <TabsContent value="setup" className="p-6 space-y-4">
                <div className="flex items-center justify-end -mt-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400"/>
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
                    <Dialog open={addGroupModalOpen} onOpenChange={setAddGroupModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          className="text-xs h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-none"
                          disabled={!emailPermissions.write}
                          title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Group
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                                  <DialogHeader>
                          <DialogTitle className="text-base">New Group Name</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Input
                                value={newRow.displayName}
                                onChange={e => setNewRow({...newRow, displayName: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter Group name"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-8 rounded-none"
                              onClick={handleAddModalCancel}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
                              onClick={handleAddGroupToDatabase}
                              disabled={!emailPermissions.write}
                              title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
                            >
                              Add Group
                            </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                  </div>
                </div>

                {/* Expandable Group List */}
                <div className="space-y-2">
                  {dbGroups.filter(g => {
                    if (searchTerm.trim() === '') return true;
                    return g.name.toLowerCase().includes(searchTerm.toLowerCase());
                  }).map((group, groupIndex) => {
                    const usersInGroup = rows.filter(row => row.enabled && Array.isArray(row.groups) && row.groups.includes(group.name));
                    const isExpanded = expandedGroups.has(group.name);
                    
                    return (
                      <div key={group.id} className="border border-gray-200 rounded-none bg-white shadow-sm">
                        {/* Group Header */}
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <div 
                              className="bg-gray-50 px-2 py-1.5 border-b border-gray-200 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                              onClick={() => toggleGroup(group.name)}
                            >
                              <div className="flex items-center space-x-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-500" />
                                )}
                                <UsersIcon className="w-3 h-3 text-gray-600" />
                              
                                <div className="flex items-center space-x-1.5">
                                  <h3 className="text-xs font-semibold text-gray-700">{group.name}</h3>
                                  <span className="text-xs text-gray-500 bg-gray-200 px-1 py-0.5 rounded text-[10px]">{groupIndex + 1}</span>
                                </div>
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleEditEmailGroup(group)}>
                              <Edit3 className="w-3 h-3 mr-2" />
                              Edit Group
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => handleDeleteEmailGroup(group)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete Group
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>

                        {/* Group Users Table - Show only when expanded */}
                        {isExpanded && (
                          <div className="bg-white">
                            <table className="w-full table-fixed">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="w-12 px-1.5 py-1 text-center text-xs font-semibold text-gray-500 tracking-wider">No.</th>
                                  <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider" style={{width: '25%'}}>User</th>
                                  <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider" style={{width: '35%'}}>Email</th>
                                  <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider" style={{width: '25%'}}>Name-Lastname</th>
                                  <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider" style={{width: '15%'}}>Phone</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {usersInGroup.map((user, index) => (
                                  <ContextMenu key={user.id}>
                                    <ContextMenuTrigger asChild>
                                      <tr 
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onContextMenu={() => handleRightClick(user)}
                                      >
                                        <td className="w-12 px-1.5 py-1 text-center">
                                          <span className="text-xs text-gray-500">{groupIndex + 1}.{index + 1}</span>
                                        </td>
                                        <td className="w-24 px-2 py-1">
                                          <div className="truncate">
                                            <span className="text-xs text-gray-900">{user.displayName}</span>
                                          </div>
                                        </td>
                                        <td className="w-40 px-2 py-1">
                                          <div className="truncate">
                                            <span className="text-xs text-primary">{user.email}</span>
                                          </div>
                                        </td>
                                        <td className="w-32 px-2 py-1">
                                          <div className="truncate">
                                            <span className="text-xs text-gray-900">{user.name}</span>
                                          </div>
                                        </td>
                                        <td className="w-24 px-2 py-1">
                                          <div className="truncate">
                                            <span className="text-xs text-gray-900">{user.phone || ''}</span>
                                          </div>
                                        </td>
                                        
                                      </tr>
                                    </ContextMenuTrigger>
                                    <SharedContextMenu
                                      row={user}
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
                                      isSelected={selectedEmails.has(user.id)}
                                      canWrite={emailPermissions.write}
                                    />
                                  </ContextMenu>
                                ))}
                                {usersInGroup.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-2 py-4 text-center text-xs text-gray-400">
                                      No users in this group
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                                      </div>
                        )}
                                    </div>
                    );
                  })}
                  
                  {dbGroups.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <span className="text-sm">No groups found</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Line List Tab */}
              <TabsContent value="line" className="p-6 space-y-4">
                <div className="flex items-center justify-end -mt-2 mb-4">
                  {/* Bulk Actions for Multi-Select */}
                  {isMultiSelectMode && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={selectedEmails.size === sortedLineRows.length ? "outline" : "default"}
                        className="text-xs h-8 rounded-none"
                        onClick={() => {
                          if (selectedEmails.size === sortedLineRows.length) {
                            handleDeselectAll();
                          } else {
                            handleSelectAll(sortedLineRows);
                          }
                        }}
                      >
                        {selectedEmails.size === sortedLineRows.length ? "Unselect All" : "Select All"}
                      </Button>
                      <span className="text-xs text-gray-700">Selected: {selectedEmails.size}</span>
                      <Button size="sm" className="text-xs h-8 bg-red-500 hover:bg-red-600 text-white rounded-none" onClick={handleBulkDelete} disabled={selectedEmails.size === 0 || !emailPermissions.write} title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                      <Button size="sm" className="text-xs h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-none" onClick={() => setBulkAddToGroupDialogOpen(true)} disabled={selectedEmails.size === 0 || !emailPermissions.write} title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
                        <Plus className="w-3 h-3 mr-1" /> Add to Group
                      </Button>
                      <Button size="sm" className="text-xs h-8 bg-primary hover:bg-primary/90 text-white rounded-none" onClick={() => setBulkMoveToGroupDialogOpen(true)} disabled={selectedEmails.size === 0 || !emailPermissions.write} title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}>
                        <ChevronRight className="w-3 h-3 mr-1" /> Move to Group
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {/* Search Box */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400"/>
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
                    <Dialog open={addEmailModalOpen} onOpenChange={setAddEmailModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          className="text-xs h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-none"
                          disabled={!emailPermissions.write}
                          title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
                        >
                          <TbDeviceMobilePlus className="w-3 h-3 mr-1" />
                          Add Line
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                          <DialogTitle className="text-base">New Line Contact</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">User</label>
                              <Input
                                value={newRow.displayName}
                                onChange={e => setNewRow({...newRow, displayName: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter username"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Line ID</label>
                              <Input
                                value={newRow.lineId}
                                onChange={e => setNewRow({...newRow, lineId: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter Line ID"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Group</label>
                              <Select value={newRow.groups[0]} onValueChange={val => setNewRow({...newRow, groups: [val]})}>
                                        <SelectTrigger className="h-8 text-xs rounded-none">
                                  <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                  {dbLineGroups.map(group => (
                                            <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Name-Lastname</label>
                              <Input
                                value={newRow.name}
                                onChange={e => setNewRow({...newRow, name: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter full name"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Phone</label>
                              <Input
                                value={newRow.phone}
                                onChange={e => setNewRow({...newRow, phone: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter phone number"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-8 rounded-none"
                              onClick={handleAddModalCancel}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
                              onClick={handleAdd}
                            >
                              Add Line
                            </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                  </div>
                </div>

                {/* Line List Table */}
                <div className="border border-gray-200 rounded-none overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {/* Checkbox for select all */}
                          {isMultiSelectMode && (
                            <th className="px-2 py-2 text-center w-8">
                              <Checkbox
                                checked={selectedEmails.size === sortedLineRows.length && sortedLineRows.length > 0}
                                onCheckedChange={() => {
                                  if (selectedEmails.size === sortedLineRows.length) {
                                    handleDeselectAll();
                                  } else {
                                    handleSelectAll(sortedLineRows);
                                  }
                                }}
                              />
                            </th>
                          )}
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 tracking-wider w-12 cursor-pointer hover:bg-gray-100 select-none">
                            <div className="flex items-center justify-center space-x-1" onClick={() => handleSort('no')}>
                              <span>No.</span>
                              {sortField === 'no' && (
                                sortDirection === 'asc' ? 
                                  <ChevronUp className="w-3 h-3" /> : 
                                  <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </th>
                          <SortableHeader field="displayName">User</SortableHeader>
                          <SortableHeader field="lineId">Line ID</SortableHeader>
                          <SortableHeader field="name">Name-Lastname</SortableHeader>
                          <SortableHeader field="phone">Phone</SortableHeader>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedLineRows.filter(row => {
                          if (searchTerm.trim() === '') return true;
                          const searchLower = searchTerm.toLowerCase();
                          return (
                            row.displayName.toLowerCase().includes(searchLower) ||
                            row.lineId.toLowerCase().includes(searchLower) ||
                            row.name.toLowerCase().includes(searchLower) ||
                            row.phone.toLowerCase().includes(searchLower) ||
                            row.email.toLowerCase().includes(searchLower) ||
                            (row.line_groups && row.line_groups.some(group => group.toLowerCase().includes(searchLower)))
                          );
                        }).map((row, index) => (
                          <ContextMenu key={row.id} 
                            onOpenChange={open => {
                              setContextMenuOpen(open);
                            }}
                          >
                            <ContextMenuTrigger asChild>
                              <tr 
                                className={`hover:bg-gray-50 cursor-pointer ${selectedEmails.has(row.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                onContextMenu={() => handleRightClick(row)}
                              >
                                {/* Checkbox for each row */}
                                {isMultiSelectMode && (
                                  <td className="px-2 py-2 text-center w-8">
                                    <Checkbox
                                      checked={selectedEmails.has(row.id)}
                                      onCheckedChange={() => handleToggleSelectEmail(row.id)}
                                    />
                                  </td>
                                )}
                                <td className="px-2 py-2 text-center w-12">
                                  <span className="text-xs text-gray-500">{index + 1}</span>
                                </td>
                                <td className="px-3 py-2">
                                  {editingId === row.id && editingField === 'displayName' ? (
                                    <Input
                                      ref={inlineEditRef}
                                      value={row.displayName}
                                      onChange={e => handleInlineEdit(row.id, 'displayName', e.target.value)}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && cancelInlineEdit()}
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs text-gray-900 px-1 py-0.5 rounded ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                                      onClick={() => !isMultiSelectMode && startInlineEdit(row.id, 'displayName')}
                                      onDoubleClick={() => !isMultiSelectMode && handleDoubleClick(row, 'displayName')}
                                    >
                                      {row.displayName || <span className="text-gray-400 italic">{!isMultiSelectMode ? 'Click to edit' : 'Select mode active'}</span>}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {editingId === row.id && editingField === 'lineId' ? (
                                    <Input
                                      ref={inlineEditRef}
                                      value={row.lineId}
                                      onChange={e => handleInlineEdit(row.id, 'lineId', e.target.value)}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && cancelInlineEdit()}
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs text-gray-900 px-1 py-0.5 rounded ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                                      onClick={() => !isMultiSelectMode && startInlineEdit(row.id, 'lineId')}
                                      onDoubleClick={() => !isMultiSelectMode && handleDoubleClick(row, 'lineId')}
                                    >
                                      {row.lineId || <span className="text-gray-400 italic">{!isMultiSelectMode ? 'Click to edit' : 'Select mode active'}</span>}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {editingId === row.id && editingField === 'name' ? (
                                    <Input
                                      ref={inlineEditRef}
                                      value={row.name}
                                      onChange={e => handleInlineEdit(row.id, 'name', e.target.value)}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && cancelInlineEdit()}
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs text-gray-900 px-1 py-0.5 rounded ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                                      onClick={() => !isMultiSelectMode && startInlineEdit(row.id, 'name')}
                                      onDoubleClick={() => !isMultiSelectMode && handleDoubleClick(row, 'name')}
                                    >
                                      {row.name || <span className="text-gray-400 italic">{!isMultiSelectMode ? 'Click to edit' : 'Select mode active'}</span>}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {editingId === row.id && editingField === 'phone' ? (
                                    <Input
                                      ref={inlineEditRef}
                                      value={row.phone}
                                      onChange={e => handleInlineEdit(row.id, 'phone', e.target.value)}
                                      className="h-6 text-xs rounded-none"
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && cancelInlineEdit()}
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs text-gray-900 px-1 py-0.5 rounded ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
                                      onClick={() => !isMultiSelectMode && startInlineEdit(row.id, 'phone')}
                                      onDoubleClick={() => !isMultiSelectMode && handleDoubleClick(row, 'phone')}
                                    >
                                      {row.phone || <span className="text-gray-400 italic">{!isMultiSelectMode ? 'Click to edit' : 'Select mode active'}</span>}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            </ContextMenuTrigger>
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
                              canWrite={emailPermissions.write}
                            />
                          </ContextMenu>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Group Line Tab */}
              <TabsContent value="groupline" className="p-6 space-y-4">
                <div className="flex items-center justify-end -mt-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400"/>
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
                    <Dialog open={addGroupModalOpen} onOpenChange={setAddGroupModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          className="text-xs h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-none"
                          disabled={!emailPermissions.write}
                          title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Group
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle className="text-base">New Group Name</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Input
                                value={newRow.displayName}
                                onChange={e => setNewRow({...newRow, displayName: e.target.value})}
                                className="h-8 text-xs rounded-none"
                                placeholder="Enter Group name"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-8 rounded-none"
                              onClick={handleAddModalCancel}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
                              onClick={handleAddLineGroupToDatabase}
                              disabled={!emailPermissions.write}
                              title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
                            >
                              Add Group
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Expandable Group Line List */}
                <div className="space-y-2">
                  {Array.from(groupedLineEmails.entries()).map(([groupName, usersInGroup], groupIndex) => {
                    const isExpanded = expandedGroups.has(groupName);
                    
                    return (
                      <div key={groupName} className="border border-gray-200 rounded-none bg-white shadow-sm">
                        {/* Group Header */}
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <div 
                              className="bg-gray-50 px-2 py-1.5 border-b border-gray-200 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                              onClick={() => toggleGroup(groupName)}
                            >
                              <div className="flex items-center space-x-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-500" />
                                )}
                                <UsersIcon className="w-3 h-3 text-gray-600" />
                              
                                <div className="flex items-center space-x-1.5">
                                  <h3 className="text-xs font-semibold text-gray-700">{groupName}</h3>
                                  <span className="text-xs text-gray-500 bg-gray-200 px-1 py-0.5 rounded text-[10px]">{groupIndex + 1}</span>
                                </div>
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleEditLineGroup(groupName)}>
                              <Edit3 className="w-3 h-3 mr-2" />
                              Edit Group
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => handleDeleteLineGroup(groupName)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete Group
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>

                        {/* Group Users Table - Show only when expanded */}
                        {isExpanded && (
                          <div className="bg-white">
                            <table className="w-full table-fixed">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="w-12 px-1.5 py-1 text-center text-xs font-semibold text-gray-500 tracking-wider">No.</th>
                                   <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider" style={{width: '25%'}}>User</th>
                                   <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider" style={{width: '30%'}}>Line ID</th>
                                   <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider" style={{width: '25%'}}>Name-Lastname</th>
                                   <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 tracking-wider" style={{width: '20%'}}>Phone</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {usersInGroup.map((user, index) => (
                                  <ContextMenu key={user.id}>
                                    <ContextMenuTrigger asChild>
                                      <tr 
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onContextMenu={() => handleRightClick(user)}
                                      >
                                        <td className="w-12 px-1.5 py-1 text-center">
                                          <span className="text-xs text-gray-500">{groupIndex + 1}.{index + 1}</span>
                                        </td>
                                        <td className="w-24 px-2 py-1">
                                          <div className="truncate">
                                            <span className="text-xs text-gray-900">{user.displayName}</span>
                                          </div>
                                        </td>
                                        <td className="w-32 px-2 py-1">
                                          <div className="truncate">
                                            <span className="text-xs text-primary">{user.lineId || ''}</span>
                                          </div>
                                        </td>
                                        <td className="w-32 px-2 py-1">
                                          <div className="truncate">
                                            <span className="text-xs text-gray-900">{user.name}</span>
                                          </div>
                                        </td>
                                        <td className="w-24 px-2 py-1">
                                          <div className="truncate">
                                            <span className="text-xs text-gray-900">{user.phone || ''}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    </ContextMenuTrigger>
                                    <SharedContextMenu
                                      row={user}
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
                                      isSelected={selectedEmails.has(user.id)}
                                      canWrite={emailPermissions.write}
                                    />
                                  </ContextMenu>
                                ))}
                                {usersInGroup.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-2 py-4 text-center text-xs text-gray-400">
                                      No users in this group
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {groupedLineEmails.size === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <span className="text-sm">No line groups found</span>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Edit User Modal - Shared across all tabs */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-base">Edit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">User</label>
                      <Input
                        value={editFormData.displayName}
                        onChange={e => setEditFormData({...editFormData, displayName: e.target.value})}
                        className="h-8 text-xs rounded-none"
                        placeholder="Enter username"
                      />
          </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Email Address</label>
                      <Input
                        value={editFormData.email}
                        onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                        className="h-8 text-xs rounded-none"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Group</label>
                      <Select value={editFormData.groups[0]} onValueChange={val => setEditFormData({...editFormData, groups: [val]})}>
                        <SelectTrigger className="h-8 text-xs rounded-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dbGroups.map(group => (
                            <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Name-Lastname</label>
                      <Input
                        value={editFormData.name}
                        onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                        className="h-8 text-xs rounded-none"
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Phone</label>
                      <Input
                        value={editFormData.phone}
                        onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                        className="h-8 text-xs rounded-none"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Line ID</label>
                      <Input
                        value={editFormData.lineId}
                        onChange={e => setEditFormData({...editFormData, lineId: e.target.value})}
                        className="h-8 text-xs rounded-none"
                        placeholder="Enter Line ID"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
                      <Select value={editFormData.enabled ? 'active' : 'inactive'} onValueChange={val => setEditFormData({...editFormData, enabled: val === 'active'})}>
                        <SelectTrigger className="h-8 text-xs rounded-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8 rounded-none"
                      onClick={handleEditModalCancel}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
                      onClick={handleSaveEdit}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add to Group Dialog - Conditional content based on active tab */}
            {addToGroupDialogOpen && selectedRowForGroupAction && (
              <Dialog open={addToGroupDialogOpen} onOpenChange={setAddToGroupDialogOpen}>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      {activeTab === 'line' || activeTab === 'groupline' ? 'Add to Line Group' : 'Add to Group'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedGroupForDialog} onValueChange={val => setSelectedGroupForDialog(val)}>
                      <SelectTrigger className="h-8 text-xs rounded-none">
                        <SelectValue placeholder={activeTab === 'line' || activeTab === 'groupline' ? 'Select line group' : 'Select group'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(activeTab === 'line' || activeTab === 'groupline' ? dbLineGroups : dbGroups).map(group => (
                          <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-none" onClick={() => {
                        setAddToGroupDialogOpen(false);
                        setSelectedGroupForDialog('');
                      }}>Cancel</Button>
                      <Button size="sm" className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none" onClick={() => {
                        if (selectedGroupForDialog) {
                          if (activeTab === 'line' || activeTab === 'groupline') {
                            handleAddToLineGroup(selectedRowForGroupAction, selectedGroupForDialog);
                          } else {
                            handleAddToGroup(selectedRowForGroupAction, selectedGroupForDialog);
                          }
                        }
                      }}>Add</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Move to Group Dialog - Conditional content based on active tab */}
            {moveToGroupDialogOpen && selectedRowForGroupAction && (
              <Dialog open={moveToGroupDialogOpen} onOpenChange={setMoveToGroupDialogOpen}>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      {activeTab === 'line' || activeTab === 'groupline' ? 'Move to Line Group' : 'Move to Group'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedGroupForDialog} onValueChange={val => setSelectedGroupForDialog(val)}>
                      <SelectTrigger className="h-8 text-xs rounded-none">
                        <SelectValue placeholder={activeTab === 'line' || activeTab === 'groupline' ? 'Select line group' : 'Select group'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(activeTab === 'line' || activeTab === 'groupline' ? dbLineGroups : dbGroups).map(group => (
                          <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-none" onClick={() => {
                        setMoveToGroupDialogOpen(false);
                        setSelectedGroupForDialog('');
                      }}>Cancel</Button>
                      <Button size="sm" className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none" onClick={() => {
                        if (selectedGroupForDialog) {
                          if (activeTab === 'line' || activeTab === 'groupline') {
                            handleMoveToLineGroup(selectedRowForGroupAction, selectedGroupForDialog);
                          } else {
                            handleMoveToGroup(selectedRowForGroupAction, selectedGroupForDialog);
                          }
                        }
                      }}>Move</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Bulk Add to Group Dialog - Shared across all tabs */}
            {bulkAddToGroupDialogOpen && (
              <Dialog open={bulkAddToGroupDialogOpen} onOpenChange={setBulkAddToGroupDialogOpen}>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle className="text-base">Add Selected to Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedBulkGroup} onValueChange={val => setSelectedBulkGroup(val)}>
                      <SelectTrigger className="h-8 text-xs rounded-none">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {dbGroups.map(group => (
                          <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-none" onClick={() => {
                        setBulkAddToGroupDialogOpen(false);
                        setSelectedBulkGroup('');
                      }}>Cancel</Button>
                      <Button size="sm" className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none" onClick={() => {
                        if (selectedBulkGroup) handleAddMultipleToGroup(selectedBulkGroup);
                        setBulkAddToGroupDialogOpen(false);
                        setSelectedBulkGroup('');
                      }}>Add</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Bulk Move to Group Dialog - Shared across all tabs */}
            {bulkMoveToGroupDialogOpen && (
              <Dialog open={bulkMoveToGroupDialogOpen} onOpenChange={setBulkMoveToGroupDialogOpen}>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle className="text-base">Move Selected to Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedBulkGroup} onValueChange={val => setSelectedBulkGroup(val)}>
                      <SelectTrigger className="h-8 text-xs rounded-none">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {dbGroups.map(group => (
                          <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-none" onClick={() => {
                        setBulkMoveToGroupDialogOpen(false);
                        setSelectedBulkGroup('');
                      }}>Cancel</Button>
                      <Button size="sm" className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none" onClick={() => {
                        if (selectedBulkGroup) handleMoveMultipleToGroup(selectedBulkGroup);
                        setBulkMoveToGroupDialogOpen(false);
                        setSelectedBulkGroup('');
                      }}>Move</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Edit Email Group Modal */}
            <Dialog open={editEmailGroupModalOpen} onOpenChange={setEditEmailGroupModalOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-base">Edit Email Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Group Name</label>
                    <Input
                      value={editEmailGroupName}
                      onChange={e => setEditEmailGroupName(e.target.value)}
                      className="h-8 text-xs rounded-none"
                      placeholder="Enter group name"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8 rounded-none"
                      onClick={() => {
                        setEditEmailGroupModalOpen(false);
                        setEditingEmailGroup(null);
                        setEditEmailGroupName('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
                      onClick={handleSaveEditEmailGroup}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Line Group Modal */}
            <Dialog open={editLineGroupModalOpen} onOpenChange={setEditLineGroupModalOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-base">Edit Line Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Group Name</label>
                    <Input
                      value={editLineGroupName}
                      onChange={e => setEditLineGroupName(e.target.value)}
                      className="h-8 text-xs rounded-none"
                      placeholder="Enter group name"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8 rounded-none"
                      onClick={() => {
                        setEditLineGroupModalOpen(false);
                        setEditingLineGroup(null);
                        setEditLineGroupName('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      className="text-xs h-8 bg-primary hover:bg-primary/90 rounded-none"
                      onClick={handleSaveEditLineGroup}
                      disabled={!emailPermissions.write}
                      title={!emailPermissions.write ? "You don't have write permission for Email Line" : ""}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
