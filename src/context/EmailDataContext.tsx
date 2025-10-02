import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/services/api';

interface EmailDataContextType {
  // Email data
  emailList: any[];
  setEmailList: (data: any[]) => void;
  
  // Line data  
  lineList: any[];
  setLineList: (data: any[]) => void;
  
  // Groups data
  emailGroups: any[];
  setEmailGroups: (data: any[]) => void;
  
  lineGroups: any[];
  setLineGroups: (data: any[]) => void;
  
  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Refresh functions
  refreshEmailData: () => Promise<void>;
  refreshLineData: () => Promise<void>;
  refreshGroupData: () => Promise<void>;
}

const EmailDataContext = createContext<EmailDataContextType | null>(null);

export function EmailDataProvider({ children }: { children: React.ReactNode }) {
  const [emailList, setEmailList] = useState<any[]>([]);
  const [lineList, setLineList] = useState<any[]>([]);
  const [emailGroups, setEmailGroups] = useState<any[]>([]);
  const [lineGroups, setLineGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch email data (from Email.tsx tab "email")
  const refreshEmailData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUsers({
        page: 1,
        limit: 1000,
        sortBy: 'id',
        sortOrder: 'ASC'
      });
      
      if (response.success && response.data) {
        console.log('🔍 EmailDataContext - Raw API response:', response.data);
        console.log('🔍 EmailDataContext - Sample user fields:', response.data.length > 0 ? Object.keys(response.data[0]) : 'No users');
        console.log('🔍 EmailDataContext - Sample user data:', response.data.length > 0 ? response.data[0] : 'No users');
        
        // Transform user data to match Email.tsx format
        const emailData = response.data
          .filter((user: any) => user.email && user.email.trim() !== '')
          .map((user: any) => ({
            id: user.id,
            displayName: user.username || '',
            email: user.email || '',
            groups: user.group_name ? [user.group_name] : [],
            name: `${user.name || ''} ${user.surname || ''}`.trim(),
            phone: user.phone || '',
            lineId: user.lineId || '',
            enabled: user.status === 'active'
          }));
        setEmailList(emailData);
        console.log('📧 EmailDataContext - Email data loaded:', emailData);
      }
    } catch (error) {
      console.error('Failed to fetch email data:', error);
      setEmailList([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch line data (from Email.tsx tab "line")
  const refreshLineData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUsers({
        page: 1,
        limit: 1000,
        sortBy: 'id',
        sortOrder: 'ASC'
      });
      
      if (response.success && response.data) {
        // Transform user data to match Email.tsx line format
        const lineData = response.data
          .filter((user: any) => user.lineId && user.lineId.trim() !== '')
          .map((user: any) => ({
            id: user.id,
            lineId: user.lineId,
            displayName: `${user.name || user.username}${user.surname ? ' ' + user.surname : ''}`,
            username: user.username,
            groups: user.group_name ? [user.group_name] : [],
            line_groups: user.line_group_name ? [user.line_group_name] : [],
            name: user.name || user.username,
            email: user.email,
            token: `line${user.id}_token_${Math.random().toString(36).substr(2, 9)}`,
            enabled: user.status === 'active'
          }));
        setLineList(lineData);
        console.log('📱 EmailDataContext - Line data loaded:', lineData);
      }
    } catch (error) {
      console.error('Failed to fetch line data:', error);
      setLineList([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch group data
  const refreshGroupData = async () => {
    try {
      setLoading(true);
      
      // Fetch email groups
      const emailGroupsResponse = await apiClient.getGroups();
      if (emailGroupsResponse.success && emailGroupsResponse.data) {
        setEmailGroups(emailGroupsResponse.data);
        console.log('📧 EmailDataContext - Email groups loaded:', emailGroupsResponse.data);
      }
      
      // Fetch line groups
      const lineGroupsResponse = await apiClient.getLineGroups();
      if (lineGroupsResponse.success && lineGroupsResponse.data) {
        setLineGroups(lineGroupsResponse.data);
        console.log('📱 EmailDataContext - Line groups loaded:', lineGroupsResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      setEmailGroups([]);
      setLineGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Load all data on mount
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        refreshEmailData(),
        refreshLineData(),
        refreshGroupData()
      ]);
    };
    
    loadAllData();
  }, []);

  const value: EmailDataContextType = {
    emailList,
    setEmailList,
    lineList,
    setLineList,
    emailGroups,
    setEmailGroups,
    lineGroups,
    setLineGroups,
    loading,
    setLoading,
    refreshEmailData,
    refreshLineData,
    refreshGroupData
  };

  return (
    <EmailDataContext.Provider value={value}>
      {children}
    </EmailDataContext.Provider>
  );
}

export function useEmailData() {
  const context = useContext(EmailDataContext);
  if (!context) {
    throw new Error('useEmailData must be used within an EmailDataProvider');
  }
  return context;
}
