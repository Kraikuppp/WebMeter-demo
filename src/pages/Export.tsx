  // Mapping parameter id to actual DB key
  const parameterDbMapping = {
    frequency: 'param_01_freqency',
    volt_an: 'param_02_voltage_phase_1',
    volt_bn: 'param_03_voltage_phase_2',
    volt_cn: 'param_04_voltage_phase_3',
    volt_ln_avg: 'param_05_voltage_avg_phase',
    volt_ab: 'param_06_voltage_line_1_2',
    volt_bc: 'param_07_voltage_line_2_3',
    volt_ca: 'param_08_voltage_line_3_1',
    volt_ll_avg: 'param_09_voltage_avg_line',
    current_a: 'param_10_current_phase_a',
    current_b: 'param_11_current_phase_b',
    current_c: 'param_12_current_phase_c',
    current_avg: 'param_13_current_avg_phase',
    current_in: 'param_14_current_neutral',
    watt_a: 'param_15_power_phase_a',
    watt_b: 'param_16_power_phase_b',
    watt_c: 'param_17_power_phase_c',
    watt_total: 'param_18_power_total_system',
    var_a: 'param_19_reactive_power_phase_a',
    var_b: 'param_20_reactive_power_phase_b',
    var_c: 'param_21_reactive_power_phase_c',
    var_total: 'param_22_reactive_power_total',
    va_a: 'param_23_apparent_power_phase_a',
    va_b: 'param_24_apparent_power_phase_b',
    va_c: 'param_25_apparent_power_phase_c',
    va_total: 'param_26_apparent_power_total',
    pf_a: 'param_27_power_factor_phase_a',
    pf_b: 'param_28_power_factor_phase_b',
    pf_c: 'param_29_power_factor_phase_c',
    pf_total: 'param_30_power_factor_total',
    demand_w: 'param_31_power_demand',
    demand_var: 'param_32_reactive_power_demand',
    demand_va: 'param_33_apparent_power_demand',
    import_kwh: 'param_34_import_kwh',
    export_kwh: 'param_35_export_kwh',
    import_kvarh: 'param_36_import_kvarh',
    export_kvarh: 'param_37_export_kvarh',
    thdv: 'param_38_thdv',
    thdi: 'param_39_thdi',
  };
import React, { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logScheduleAdd } from '@/services/eventLogger';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Upload, Clock, Menu, Eye, Trash2, ToggleLeft, ToggleRight, FileText, Power } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { useMeterTree } from '@/context/MeterTreeContext';
import { useEmailData } from '@/context/EmailDataContext';
import { TimeInput24 } from '@/components/ui/time-input-24';
import apiClient from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import useCustomSwal from '@/utils/swal';
import { usePermissions } from '@/hooks/usePermissions';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { exportTableData } from '@/utils/exportUtils';

// Types and functions for email functionality
interface EmailData {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  export_type: string;
  date_range: string;
  time_range: string;
  meters: string;
  parameters: string;
}

// Mock function for bulk email sending (replace with actual implementation)
const sendBulkEmails = async (emailDataList: EmailData[]) => {
  // This should be replaced with actual email sending logic
  console.log('📧 Sending bulk emails:', emailDataList);
  return { success: true, message: 'Emails sent successfully' };
};

const MySwal = withReactContent(Swal);

export default function Export() {
  const { toast } = useToast();
  const { showSuccessToast, showErrorToast, showConfirmDialog } = useCustomSwal();
  
  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const exportPermissions = userPermissions?.['Export Data'] || { read: false, write: false, report: false };
  
  console.log('📝 Export Data Permissions:', exportPermissions);
  
  // Use EmailData context to get data from Email.tsx
  const { 
    emailList, 
    lineList, 
    emailGroups, 
    lineGroups, 
    loading: emailDataLoading,
    refreshEmailData,
    refreshLineData,
    refreshGroupData
  } = useEmailData();

  // Debug: Log data from context
  console.log('🔍 Export.tsx - Data from EmailDataContext:', {
    emailList: emailList.length,
    lineList: lineList.length,
    emailGroups: emailGroups.length,
    lineGroups: lineGroups.length,
    emailDataLoading
  });
  
  // Helper function for padding numbers
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const { buildingNodes, systemNodes, loading: meterTreeLoading } = useMeterTree();

  // ใช้ buildingNodes เป็นหลัก ถ้าไม่มีให้ใช้ systemNodes
  const rootNodes = buildingNodes && buildingNodes.length > 0 ? buildingNodes : systemNodes;

  // Debug: ดูข้อมูล rootNodes
  // console.log('rootNodes:', rootNodes);
  // console.log('rootNodes length:', rootNodes?.length);
  // console.log('buildingNodes:', buildingNodes);
  // console.log('systemNodes:', systemNodes);
  // console.log('meterTreeLoading:', meterTreeLoading);
  // สร้างวันที่ปัจจุบัน
const today = new Date();

// แปลงเป็นรูปแบบ ddmmyyyy
const day = String(today.getDate()).padStart(2, '0');
const month = String(today.getMonth() + 1).padStart(2, '0'); // เดือนเริ่มจาก 0
const year = today.getFullYear();

  // Check if meter data is loading from database
  // After 5 seconds, use fallback data even if still loading
  const [usesFallback, setUsesFallback] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (meterTreeLoading || !rootNodes || rootNodes.length === 0) {
        console.log('Using fallback meter data after timeout');
        setUsesFallback(true);
      }
    }, 3000); // 3 seconds timeout
    
    return () => clearTimeout(timer);
  }, [meterTreeLoading, rootNodes]);
  
  const isMeterDataLoading = !usesFallback && (meterTreeLoading || !rootNodes || rootNodes.length === 0);

  // Sample data สำหรับทดสอบ
  const sampleData = [
    
  ];

  // ใช้ข้อมูลจาก database ถ้ามี หรือใช้ sample data เป็น fallback
  const treeData = (rootNodes && rootNodes.length > 0) || usesFallback ? 
    (rootNodes && rootNodes.length > 0 ? rootNodes : sampleData) : 
    sampleData;

  // ฟังก์ชันดึงชื่อมิเตอร์ทั้งหมดจาก tree (iconType === 'meter') พร้อม location
  function getAllMetersFromTree(nodes, parentPath = '') {
    let meters = [];
    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      if (node.iconType === 'meter' && node.name) {
        meters.push({ 
          id: node.id, 
          name: node.name,
          location: parentPath || 'Root',
          slave_id: node.slave_id ?? node.id // Ensure slave_id exists
        });
      }
      if (node.children) {
        meters = meters.concat(getAllMetersFromTree(node.children, currentPath));
      }
    }
    return meters;
  }
  const meterList = getAllMetersFromTree(treeData || []);

  console.log('meterList:', meterList);

  // Use data from EmailDataContext instead of local state

  // Effect to expand all groups when data is loaded from EmailDataContext
  useEffect(() => {
    if (emailGroups.length > 0) {
      const emailGroupNames = emailGroups.map(group => group.name);
      setExpandedEmailGroups(new Set(emailGroupNames));
    }
  }, [emailGroups]);

  useEffect(() => {
    if (lineGroups.length > 0) {
      const lineGroupNames = lineGroups.map(group => group.name);
      setExpandedLineGroups(new Set(lineGroupNames));
    }
  }, [lineGroups]);





  // state สำหรับ search และ meter selection
  const [searchTerm, setSearchTerm] = useState('');
  const [meterSelection, setMeterSelection] = useState({});
  
  // Filter meters based on search term
  const filteredMeterList = meterList.filter(meter => {
    const matchesSearch = meter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meter.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });
  
  // sync meterSelection กับ meterList
  React.useEffect(() => {
    const initial = {};
    meterList.forEach(m => { initial[m.id] = meterSelection[m.id] ?? false; });
    setMeterSelection(initial);
    // eslint-disable-next-line
  }, [JSON.stringify(meterList)]);
  
  const toggleMeter = (id) => {
    setMeterSelection(sel => ({ ...sel, [id]: !sel[id] }));
  };

  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateTo, setDateTo] = useState<Date>(() => new Date());
  const [timeFrom, setTimeFrom] = useState(() => {
    // กำหนด default เป็น 00:00 เสมอ และบังคับให้เป็น 24-hour format
    return '00:00';
  });
  const [timeTo, setTimeTo] = useState(() => {
    const now = new Date();
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [selectedMeter, setSelectedMeter] = useState('msb-ew-1');
  const [exportType, setExportType] = useState('daily');
  const [readTime, setReadTime] = useState('15min');
  const [exportFormat, setExportFormat] = useState('excel');
  const [selectedEmailList, setSelectedEmailList] = useState([]);
  const [selectedLineList, setSelectedLineList] = useState([]);
  const [listType, setListType] = useState('email'); // 'email' or 'line'
  
  // Email group management for email format
  const [expandedEmailGroups, setExpandedEmailGroups] = useState<Set<string>>(new Set());
  const [selectedEmailGroups, setSelectedEmailGroups] = useState<Set<string>>(new Set());
  
  // Line group management for line format
  const [expandedLineGroups, setExpandedLineGroups] = useState<Set<string>>(new Set());
  const [selectedLineGroups, setSelectedLineGroups] = useState<Set<string>>(new Set());
  
  const [autoExportFrequency, setAutoExportFrequency] = useState('daily');
  const [autoExportTime, setAutoExportTime] = useState('08:00');
  const [autoExportDay, setAutoExportDay] = useState('monday'); // For weekly
  const [autoExportDate, setAutoExportDate] = useState(1); // For monthly (1-31)

  // 🔍 Real-time logging for date/time selection
  useEffect(() => {
    console.log('🔍 === REAL-TIME DATE/TIME SELECTION LOG ===');
    console.log('📅 Date From:', dateFrom ? format(dateFrom, 'dd/MM/yyyy (EEEE)') : 'Not selected');
    console.log('📅 Date To:', dateTo ? format(dateTo, 'dd/MM/yyyy (EEEE)') : 'Not selected');
    console.log('⏰ Time From:', timeFrom);
    console.log('⏰ Time To:', timeTo);
    console.log('🕐 Auto Export Time:', autoExportTime);
    console.log('📊 Export Type:', exportType);
    console.log('📊 Export Format:', exportFormat);
    console.log('🔄 Auto Export Frequency:', autoExportFrequency);
    
    // แสดงช่วงเวลาที่จะส่งไปยัง API
    if (dateFrom && dateTo) {
      const dateFromStr = format(dateFrom, 'yyyy-MM-dd');
      const dateToStr = format(dateTo, 'yyyy-MM-dd');
      console.log('📡 API Parameters:');
      console.log(`   dateFrom: ${dateFromStr}`);
      console.log(`   dateTo: ${dateToStr}`);
      console.log(`   timeFrom: ${timeFrom}`);
      console.log(`   timeTo: ${timeTo}`);
      console.log(`   Full range: ${dateFromStr} ${timeFrom} - ${dateToStr} ${timeTo}`);
    }
    
    console.log('================================================');
  }, [dateFrom, dateTo, timeFrom, timeTo, autoExportTime, exportType, exportFormat, autoExportFrequency]);

  
  // Define type for auto export schedule
  type AutoExportSchedule = {
    id: number;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    day?: string;
    date?: number;
    exportType: string;
    exportFormat: string;
    readTime: string;
    meters: string[];
    parameters: string[];
    filePath: string;
    emailList: number[] | null;
    lineList: number[] | null;
    enabled: boolean;
    created: string;
    createdBy: string;
    // ✅ เพิ่ม date/time fields
    dateFrom?: string;
    dateTo?: string;
    timeFrom?: string;
    timeTo?: string;
  };

  // Store configured auto export schedules
  const [autoExportSchedules, setAutoExportSchedules] = useState<AutoExportSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Modal state for schedule details
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfiguredSchedules, setShowConfiguredSchedules] = useState(true);
  
  // Generate default file path with current date
  const generateDefaultFilePath = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateString = `${day}${month}${year}`;
    
    if (exportFormat === 'email') {
      if (listType === 'email') {
        const selectedEmails = emailList.filter(email => selectedEmailList.includes(email.id));
        if (selectedEmails.length > 0) {
          return `Email will be sent to: ${selectedEmails.map(email => `${email.displayName} (${email.email})`).join(', ')}`;
        }
        return 'No email recipients selected';
      } else {
        // When listType is 'line' but exportFormat is 'email', show email groups
        const selectedEmails = emailList.filter(email => selectedEmailList.includes(email.id));
        if (selectedEmails.length > 0) {
          return `Email group notification will be sent to: ${selectedEmails.map(email => `${email.displayName} (${email.email})`).join(', ')}`;
        }
        return 'No email groups selected';
      }
    } else if (exportFormat === 'line') {
      if (listType === 'email') {
        const selectedEmails = emailList.filter(email => selectedEmailList.includes(email.id));
        if (selectedEmails.length > 0) {
          return `Email will be sent to: ${selectedEmails.map(email => `${email.displayName} (${email.email})`).join(', ')}`;
        }
        return 'No email recipients selected';
      } else {
        const selectedLines = lineList.filter(line => selectedLineList.includes(line.id));
        if (selectedLines.length > 0) {
          return `Line notification will be sent to: ${selectedLines.map(line => `${line.displayName} (Line ID: ${line.line_messaging_id || line.lineId})`).join(', ')}`;
        }
        return 'No Line recipients selected';
      }
    } else {
      const extension = exportFormat === 'pdf' ? 'pdf' : 'xlsx';
      return `C:\\My Report\\export_${dateString}.${extension}`;
    }
  };
  
  const [filePath, setFilePath] = useState(generateDefaultFilePath());
  

  
  // Group emails by their groups
  const getGroupedEmails = () => {
    const grouped = new Map<string, typeof emailList>();
    const groupNames = emailGroups.map(group => group.name);
    
    emailList.forEach(email => {
      email.groups.forEach(group => {
        if (groupNames.includes(group)) {
          if (!grouped.has(group)) {
            grouped.set(group, []);
          }
          grouped.get(group)!.push(email);
        }
      });
    });
    
    return grouped;
  };
  
  // Toggle email group expansion
  const toggleEmailGroup = (groupName: string) => {
    setExpandedEmailGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };
  
  // Toggle entire email group selection
  const toggleEmailGroupSelection = (groupName: string) => {
    const groupEmails = getGroupedEmails().get(groupName) || [];
    const groupEmailIds = groupEmails.map(email => email.id);
    
    const allSelected = groupEmailIds.every(id => selectedEmailList.includes(id));
    
    if (allSelected) {
      // Unselect all emails in this group
      setSelectedEmailList(prev => prev.filter(id => !groupEmailIds.includes(id)));
      setSelectedEmailGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupName);
        return newSet;
      });
    } else {
      // Select all emails in this group
      setSelectedEmailList(prev => {
        const newIds = groupEmailIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
      setSelectedEmailGroups(prev => {
        const newSet = new Set(prev);
        newSet.add(groupName);
        return newSet;
      });
    }
  };
  
  // Toggle individual email selection
  const toggleEmailSelection = (emailId: number) => {
    setSelectedEmailList(prev => {
      if (prev.includes(emailId)) {
        return prev.filter(id => id !== emailId);
      } else {
        return [...prev, emailId];
      }
    });
  };
  
  // Group lines by their groups
  const getGroupedLines = () => {
    const grouped = new Map<string, typeof lineList>();
    const groupNames = lineGroups.map(group => group.name);
    
    console.log('🔍 getGroupedLines - lineGroups:', lineGroups);
    console.log('🔍 getGroupedLines - groupNames:', groupNames);
    console.log('🔍 getGroupedLines - lineList:', lineList);
    
    lineList.forEach(line => {
      console.log('🔍 Processing line:', line, 'line_groups:', line.line_groups);
      if (line.line_groups && Array.isArray(line.line_groups)) {
        line.line_groups.forEach(group => {
          console.log('🔍 Checking group:', group, 'in groupNames:', groupNames.includes(group));
          if (groupNames.includes(group)) {
            if (!grouped.has(group)) {
              grouped.set(group, []);
            }
            grouped.get(group)!.push(line);
          }
        });
      }
    });
    
    console.log('🔍 getGroupedLines - result:', grouped);
    return grouped;
  };
  
  // Toggle line group expansion
  const toggleLineGroup = (groupName: string) => {
    setExpandedLineGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };
  
  // Toggle entire line group selection
  const toggleLineGroupSelection = (groupName: string) => {
    const groupLines = getGroupedLines().get(groupName) || [];
    const groupLineIds = groupLines.map(line => line.id);
    
    const allSelected = groupLineIds.every(id => selectedLineList.includes(id));
    
    if (allSelected) {
      // Unselect all lines in this group
      setSelectedLineList(prev => prev.filter(id => !groupLineIds.includes(id)));
      setSelectedLineGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupName);
        return newSet;
      });
    } else {
      // Select all lines in this group
      setSelectedLineList(prev => {
        const newIds = groupLineIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
      setSelectedLineGroups(prev => {
        const newSet = new Set(prev);
        newSet.add(groupName);
        return newSet;
      });
    }
  };
  
  // Toggle individual line selection
  const toggleLineSelection = (lineId: number) => {
    setSelectedLineList(prev => {
      if (prev.includes(lineId)) {
        return prev.filter(id => id !== lineId);
      } else {
        return [...prev, lineId];
      }
    });
  };
  
  // Auto export settings for each export type
  const [autoExportSettings, setAutoExportSettings] = useState({
    instant_pe: { enabled: false, time: '00:00' },
    tou_pe: { enabled: false, time: '00:00' },
    daily: { enabled: false, time: '00:00' },
    weekly: { enabled: false, time: '00:00' },
    monthly: { enabled: false, time: '00:00' },
    compare_pe: { enabled: false, time: '00:00' }
  });

  // Load export schedules from database
  const loadExportSchedules = async () => {
    try {
      setLoadingSchedules(true);
      console.log('📋 Loading export schedules from database...');
      
      const response = await apiClient.getExportSchedules();
      
      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} export schedules`);
        
        // ✅ Debug: ตรวจสอบ date/time fields ใน database response
        if (response.data.length > 0) {
          const firstSchedule = response.data[0];
          console.log('🔍 === SCHEDULE DATE/TIME FIELDS DEBUG ===');
          console.log('🔍 First schedule from database:', {
            id: firstSchedule.id,
            date_from: firstSchedule.date_from,
            date_to: firstSchedule.date_to,
            time_from: firstSchedule.time_from,
            time_to: firstSchedule.time_to
          });
          console.log('🔍 Has date/time fields:', {
            hasDateFrom: !!firstSchedule.date_from,
            hasDateTo: !!firstSchedule.date_to,
            hasTimeFrom: !!firstSchedule.time_from,
            hasTimeTo: !!firstSchedule.time_to
          });
          console.log('================================');
        }
        
        // Convert database format to local format
        const schedules: AutoExportSchedule[] = response.data.map(dbSchedule => ({
          id: dbSchedule.id,
          frequency: dbSchedule.frequency,
          time: dbSchedule.time,
          day: dbSchedule.day_of_week,
          date: dbSchedule.day_of_month,
          exportType: dbSchedule.export_type,
          exportFormat: dbSchedule.export_format,
          readTime: dbSchedule.read_time,
          meters: dbSchedule.meters,
          parameters: dbSchedule.parameters,
          filePath: dbSchedule.file_path,
          emailList: dbSchedule.email_list,
          lineList: dbSchedule.line_list,
          enabled: dbSchedule.enabled,
          created: new Date(dbSchedule.created_at).toISOString().split('T')[0],
          createdBy: dbSchedule.created_by,
          // ✅ เพิ่ม date/time fields จาก database
          dateFrom: dbSchedule.date_from,
          dateTo: dbSchedule.date_to,
          timeFrom: dbSchedule.time_from,
          timeTo: dbSchedule.time_to
        }));
        
        setAutoExportSchedules(schedules);
      } else {
        console.error('❌ Failed to load export schedules:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading export schedules:', error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Load schedules on component mount
  React.useEffect(() => {
    loadExportSchedules();
  }, []);

  // Update file path when export format changes
  React.useEffect(() => {
    setFilePath(generateDefaultFilePath());
  }, [exportFormat, selectedEmailList, selectedLineList, listType]);

  const parameterList = [
    { id: 'frequency', label: 'Frequency' },
    { id: 'volt_an', label: 'Volt AN' },
    { id: 'volt_bn', label: 'Volt BN' },
    { id: 'volt_cn', label: 'Volt CN' },
    { id: 'volt_ln_avg', label: 'Volt LN Avg' },
    { id: 'volt_ab', label: 'Volt AB' },
    { id: 'volt_bc', label: 'Volt BC' },
    { id: 'volt_ca', label: 'Volt CA' },
    { id: 'volt_ll_avg', label: 'Volt LL Avg' },
    { id: 'current_a', label: 'Current A' },
    { id: 'current_b', label: 'Current B' },
    { id: 'current_c', label: 'Current C' },
    { id: 'current_avg', label: 'Current Avg' },
    { id: 'current_in', label: 'Current IN' },
    { id: 'watt_a', label: 'Watt A' },
    { id: 'watt_b', label: 'Watt B' },
    { id: 'watt_c', label: 'Watt C' },
    { id: 'watt_total', label: 'Watt Total' },
    { id: 'var_a', label: 'Var A' },
    { id: 'var_b', label: 'Var B' },
    { id: 'var_c', label: 'Var C' },
    { id: 'var_total', label: 'Var total' },
    { id: 'va_a', label: 'VA A' },
    { id: 'va_b', label: 'VA B' },
    { id: 'va_c', label: 'VA C' },
    { id: 'va_total', label: 'VA Total' },
    { id: 'pf_a', label: 'PF A' },
    { id: 'pf_b', label: 'PF B' },
    { id: 'pf_c', label: 'PF C' },
    { id: 'pf_total', label: 'PF Total' },
    { id: 'demand_w', label: 'Demand W' },
    { id: 'demand_var', label: 'Demand Var' },
    { id: 'demand_va', label: 'Demand VA' },
    { id: 'import_kwh', label: 'Import kWh' },
    { id: 'export_kwh', label: 'Export kWh' },
    { id: 'import_kvarh', label: 'Import kVarh' },
    { id: 'export_kvarh', label: 'Export kVarh' },
    { id: 'thdv', label: 'THDV' },
    { id: 'thdi', label: 'THDI' },
  ];
  const [selectedParameters, setSelectedParameters] = useState(parameterList.map(p => p.id));
  const allSelected = selectedParameters.length === parameterList.length;
  const toggleSelectAll = () => {
    setSelectedParameters(allSelected ? [] : parameterList.map(p => p.id));
  };
  const toggleParameter = (id: string) => {
    setSelectedParameters(selectedParameters.includes(id)
      ? selectedParameters.filter(pid => pid !== id)
      : [...selectedParameters, id]);
  };

  // 🔍 Real-time logging for meter and parameter selection
  useEffect(() => {
    const selectedMeters = Object.entries(meterSelection)
      .filter(([id, selected]) => selected)
      .map(([id, selected]) => {
        const meter = meterList.find(m => m.id === id);
        return meter ? `${meter.name} (ID: ${id})` : `Unknown meter (ID: ${id})`;
      });
    
    const selectedParams = selectedParameters || [];

    console.log('🔍 === REAL-TIME METER/PARAMETER SELECTION LOG ===');
    console.log('🏭 Selected Meters:', selectedMeters.length > 0 ? selectedMeters : 'None selected');
    console.log('📊 Selected Parameters:', selectedParams.length > 0 ? selectedParams : 'None selected');
    console.log('📋 Read Time:', readTime);
    
    if (selectedMeters.length > 0 && selectedParams.length > 0) {
      console.log('✅ Ready for export/schedule creation');
    } else {
      console.log('⚠️ Missing selections - need both meters and parameters');
    }
    console.log('================================================');
  }, [meterSelection, selectedParameters, readTime, meterList]);

  // ฟังก์ชันดึงข้อมูลจาก API
  const fetchMeterData = async (slaveIds: number[], parameters: string[], dateFrom: Date, dateTo: Date, timeFrom: string, timeTo: string, readTime: string) => {
    try {
      console.log('🚀 Fetching meter data for export:', {
        slaveIds,
        parameters,
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        timeFrom,
        timeTo,
        readTime
      });

      // Map selected parameters to DB columns and always include reading_timestamp
      const columns = ['reading_timestamp', 'slave_id', ...parameters.map(paramId => parameterDbMapping[paramId])];

      // Map readTime to backend interval (expects '1','5','15')
      const interval = (() => {
        const rt = (readTime || '').toLowerCase();
        if (rt.includes('15')) return '15';
        if (rt.includes('5')) return '5';
        if (rt.includes('1')) return '1';
        return undefined;
      })();
      const params = {
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        timeFrom,
        timeTo,
        columns,
        slaveIds,
        interval
      };

      const response = await apiClient.getTableData(params);
      
      if (response.success && response.data) {
        console.log('✅ Data fetched successfully:', response.data);
        return response.data;
      } else {
        console.error('❌ Failed to fetch data:', response.error);
        throw new Error(response.error || 'Failed to fetch meter data');
      }
    } catch (error) {
      console.error('❌ Error fetching meter data:', error);
      throw error;
    }
  };

  // ฟังก์ชันจัดรูปแบบข้อมูลสำหรับ export
  const formatExportData = (data: any[], selectedMeters: any[], selectedParams: string[]) => {
    const formattedData: string[] = [];
    
    console.log('🔍 === FORMAT EXPORT DATA DEBUG ===');
    console.log('📊 Total data rows:', data.length);
    console.log('🔢 Selected meters:', selectedMeters);
    console.log('📋 Selected parameters:', selectedParams);
    
    if (data.length > 0) {
      console.log('🔍 Sample data row:', data[0]);
      console.log('🔍 Available columns in data:', Object.keys(data[0]));
    }
    
    selectedMeters.forEach((meter, meterIndex) => {
      console.log(`\n🔍 Processing meter: ${meter.name} (slave_id: ${meter.slave_id})`);
      
      // Header สำหรับแต่ละมิเตอร์
      formattedData.push('='.repeat(80));
      formattedData.push(`WebMeter Report [${meter.name}]`);
      formattedData.push(`From ${format(dateFrom!, 'dd MMMM yyyy')} ${timeFrom} - ${format(dateTo!, 'dd MMMM yyyy')} ${timeTo}`);
      formattedData.push('='.repeat(80));
      formattedData.push('');
      
      // กรองข้อมูลของมิเตอร์นี้ - ใช้การเปรียบเทียบที่แน่นอน
      const meterData = data.filter(row => {
        const rowSlaveId = Number(row.slave_id);
        const meterSlaveId = Number(meter.slave_id);
        const match = rowSlaveId === meterSlaveId;
        console.log(`🔍 Comparing: row.slave_id=${row.slave_id} (${typeof row.slave_id}) vs meter.slave_id=${meter.slave_id} (${typeof meter.slave_id}) = ${match}`);
        return match;
      });
      
      console.log(`📊 Found ${meterData.length} rows for meter ${meter.name}`);
      
      if (meterData.length === 0) {
        console.log(`⚠️ No data found for meter ${meter.name} (slave_id: ${meter.slave_id})`);
        formattedData.push('No data available for this meter');
        formattedData.push('');
        return;
      }
      
      // เรียงลำดับตาม timestamp
      meterData.sort((a, b) => new Date(a.reading_timestamp || a.timestamp || a.time).getTime() - new Date(b.reading_timestamp || b.timestamp || b.time).getTime());
      
      // สร้างตารางข้อมูล
      meterData.forEach((row, index) => {
        const timestamp = new Date(row.reading_timestamp || row.timestamp || row.time);
        const timeStr = format(timestamp, 'HH.mm');
        
        console.log(`🔍 Processing row ${index + 1}/${meterData.length} for ${meter.name}:`, {
          timestamp: row.reading_timestamp || row.timestamp || row.time,
          slave_id: row.slave_id
        });
        
        // Header สำหรับแต่ละ timestamp
        formattedData.push(`Time: ${timeStr}`);
        formattedData.push('-'.repeat(40));
        
        // สร้างแถวข้อมูลสำหรับ timestamp นี้
        const timeData: string[] = [];
        
        selectedParams.forEach(paramId => {
          const param = parameterList.find(p => p.id === paramId);
          const dbKey = parameterDbMapping[paramId];
          
          // ลองหาค่าจากหลายแหล่ง
          let value = row[dbKey]; // จาก database column
          if (value === null || value === undefined) {
            value = row[paramId]; // จาก parameter id
          }
          if (value === null || value === undefined) {
            value = row[param?.label]; // จาก parameter label
          }
          
          console.log(`🔍 Param ${paramId}: dbKey=${dbKey}, value=${value}, param.label=${param?.label}`);
          
          if (value !== null && value !== undefined && value !== '') {
            // จัดรูปแบบให้ชัดเจน
            const formattedValue = `  ${param?.label.padEnd(20)} : ${value}`;
            timeData.push(formattedValue);
          } else {
            console.log(`⚠️ No value found for parameter ${paramId} (${param?.label})`);
          }
        });
        
        // เพิ่มแถวข้อมูลลงใน formattedData
        timeData.forEach(dataLine => {
          formattedData.push(dataLine);
        });
        
        formattedData.push(''); // เว้นบรรทัดหลังจบแต่ละ timestamp
      });
      
      // เพิ่มเส้นแบ่งหลังจบแต่ละมิเตอร์
      if (meterIndex < selectedMeters.length - 1) {
        formattedData.push('='.repeat(80));
        formattedData.push('');
      }
    });
    
    console.log('🔍 === FORMAT EXPORT DATA COMPLETED ===');
    console.log('📊 Total formatted lines:', formattedData.length);
    
    return formattedData.join('\n');
  };

  const handleExport = async () => {
    // Export functionality would be implemented here
    const selectedMeterIds = Object.keys(meterSelection).filter(id => meterSelection[id]);
    
    // Validate selections
    if (selectedMeterIds.length === 0) {
      showErrorToast('Please Select Meter');
      return;
    }
    
    if (selectedParameters.length === 0) {
      showErrorToast('Please Select Parameters');
      return;
    }
    
    // Additional validation for email and line formats
    if (exportFormat === 'email' && listType === 'email' && selectedEmailList.length === 0) {
      showErrorToast('Please Select Email List');
      return;
    }
    
    if (exportFormat === 'email' && listType === 'line' && selectedEmailList.length === 0) {
      showErrorToast('Please Select Line List');
      return;
    }
    
    if (exportFormat === 'line' && listType === 'email' && selectedLineList.length === 0) {
      showErrorToast('Please Select Line List');
      return;
    }
    
    if (exportFormat === 'line' && listType === 'line' && selectedLineList.length === 0) {
      showErrorToast('Please Select Line List');
      return;
    }

    if (!dateFrom || !dateTo) {
      showErrorToast('Please Select Date ');
      return;
    }
    
    if (!timeFrom || !timeTo) {
      showErrorToast('Please Select Time ');
      return;
    }

    // ดึงข้อมูลมิเตอร์ที่เลือกและ slave IDs
    const selectedMeters = selectedMeterIds.map(id => {
      const meter = meterList.find(m => m.id === id);
      return {
        id: meter?.id,
        name: meter?.name,
        location: meter?.location,
        slave_id: meter?.slave_id
      };
    }).filter(meter => meter.slave_id);

    console.log('🔍 === EXPORT DEBUG ===');
    console.log('🔢 Selected meter IDs:', selectedMeterIds);
    console.log('📋 Selected meters:', selectedMeters);
    console.log('📊 Meter list:', meterList);

    if (selectedMeters.length === 0) {
      showErrorToast('Selected Meter has no Slave ID');
      return;
    }

    // Ensure slaveIds are unique and correct type
    const slaveIds = Array.from(new Set(selectedMeters.map(meter => typeof meter.slave_id === 'number' ? meter.slave_id : Number(meter.slave_id))));
    console.log('🔍 Export Debug: slaveIds to backend:', slaveIds, 'selectedMeters:', selectedMeters);

    try {
      // แสดง loading
      showSuccessToast('Loading Data...');
      
      // ดึงข้อมูลจาก API
      const meterData = await fetchMeterData(
        slaveIds,
        selectedParameters,
        dateFrom,
        dateTo,
        timeFrom,
        timeTo,
        readTime
      );

      // ตรวจสอบรูปแบบข้อมูลที่ได้จาก API
      let rawData = [];
      console.log('🔍 === API RESPONSE DEBUG ===');
      console.log('📊 Raw API response:', meterData);
      console.log('📊 Response type:', typeof meterData);
      console.log('📊 Is array:', Array.isArray(meterData));
      
      if (Array.isArray(meterData)) {
        rawData = meterData;
        console.log('✅ Using direct array data');
      } else if (meterData && Array.isArray(meterData.data)) {
        rawData = meterData.data;
        console.log('✅ Using meterData.data array');
      } else if (meterData && meterData.data) {
        rawData = meterData.data;
        console.log('✅ Using meterData.data (not array)');
      } else {
        rawData = [];
        console.log('⚠️ No data found, using empty array');
      }
      
      console.log('📊 Final rawData length:', rawData.length);
      if (rawData.length > 0) {
        console.log('📊 Sample rawData row:', rawData[0]);
        console.log('📊 Available columns:', Object.keys(rawData[0]));
      }

      // จัดรูปแบบข้อมูล
      const formattedData = formatExportData(rawData, selectedMeters, selectedParameters);

      const exportData = {
        meters: selectedMeterIds,
        parameters: selectedParameters,
        dateFrom,
        dateTo,
        timeFrom,
        timeTo,
        exportType,
        exportFormat,
        readTime,
        emailList: (exportFormat === 'email' || exportFormat === 'line') && listType === 'email' ? selectedEmailList : null,
        lineList: (exportFormat === 'email' || exportFormat === 'line') && listType === 'line' ? selectedLineList : null,
        autoExport: (autoExportSettings && autoExportSettings[exportType] && autoExportSettings[exportType].enabled) ? {
          time: autoExportSettings[exportType].time,
          type: exportType
        } : null,
        filePath
      };
    
    try {
      // Generate export content based on format
        console.log('Export Debug:', { exportFormat, listType, selectedLineList, selectedEmailList });
        console.log('Export format check:', exportFormat, exportFormat === 'line');
        
        if (exportFormat === 'line') {
          // For LINE export - vertical format per requested style
          const lineContent = buildLineContentVertical(selectedMeters as any, selectedParameters, rawData);
          
          console.log('Line content:', lineContent);
          
          // Send LINE notification directly
          try {
            const lineIds = selectedLineList.map(lineId => {
              const line = lineList.find(l => l.id === lineId);
              return line?.line_messaging_id || line?.lineId;
            }).filter(Boolean);
            
            if (lineIds.length > 0) {
              // LINE Export: Show success and log details for manual sending
              const results = [];
              
              console.log('🚀 LINE Export Details:');
              console.log('- Line IDs:', lineIds);
              console.log('- Message Content:');
              console.log(lineContent);
              console.log('\n📋 Manual curl command to send this message:');
              
              for (const lineId of lineIds) {
                const curlCommand = `curl -sS -X POST https://api.line.me/v2/bot/message/push -H "Content-Type: application/json" -H "Authorization: Bearer la2YkrnQ21S8cScbkSBDJfWlGJo7h8kbmny0v0ZsNKycUHx0fSM4TaWnXhnGNU+cUVUzjfSaVX9ziI14lCy31z+Y/GkbLMGDFQCiTvBvbNCITamTNDhrcid44rsSLoE8bxxqoQAwig/lgOBYbDqjOQdB04t89/1O/w1cDnyilFU=" -d '{"to":"${lineId}","messages":[{"type":"text","text":"${lineContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}]}'`;
                
                console.log(`\nFor LINE ID ${lineId}:`);
                console.log(curlCommand);
                
                results.push({ 
                  lineId, 
                  success: true, 
                  data: { 
                    message: 'LINE message prepared for sending',
                    timestamp: new Date().toISOString(),
                    curlCommand: curlCommand
                  } 
                });
              }
              
              // AUTO-SEND: Use dedicated LINE server
              console.log('🚀 Sending LINE messages via dedicated server...');
              let sentSuccessfully = 0;
              let totalMessages = lineIds.length;
              
              for (const lineId of lineIds) {
                try {
                  //console.log(`📱 Sending to LINE ID: ${lineId}`);
                  
                  const response = await fetch('http://localhost:3002/send-line', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      lineId: lineId,
                      message: lineContent
                    })
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    //console.log('✅ LINE message sent successfully:', data);
                    sentSuccessfully++;
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    //console.error('❌ Failed to send LINE message:', errorData);
                    
                    // Show specific error message based on error type
                    if (errorData.error === 'LINE Channel Access Token not configured') {
                      showErrorToast('❌ LINE Token Access Token not configured Please contact admin');
                    } else if (errorData.status === 400) {
                      if (errorData.error === 'Failed to send messages to LINE') {
                        showErrorToast('❌ Failed to send messages to LINE Please contact admin');
                        
                        // Show detailed troubleshooting dialog
                        setTimeout(() => {
                          MySwal.fire({
                            icon: 'error',
                            title: '❌ Failed to send messages to LINE Please contact admin',
                            html: `
                              <div style="text-align: left; padding: 10px;">
                                <p><strong>🔍 สาเหตุที่เป็นไปได้:</strong></p>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                  <li>LINE ID is not correct</li>
                                  <li>ยังไม่ได้เพิ่ม Bot เป็นเพื่อนใน LINE</li>
                                  <li>Bot is blocked</li>
                                  <li>Message is too long (${errorData.messageLength} characters)</li>
                                </ul>
                                <hr style="margin: 15px 0;">
                                <p><strong>🛠️ วิธีแก้ไข:</strong></p>
                                <ol style="margin: 10px 0; padding-left: 20px;">
                                  <li>ตรวจสอบ LINE ID ที่ถูกต้อง</li>
                                  <li>เพิ่ม Bot เป็นเพื่อนใน LINE</li>
                                  <li>ลองส่งข้อความสั้นๆ ก่อน</li>
                                  <li>ตรวจสอบว่า Bot ยังไม่ได้ถูกบล็อก</li>
                                </ol>
                                ${errorData.troubleshooting ? `
                                  <hr style="margin: 15px 0;">
                                  <p><strong>📋 คำแนะนำเพิ่มเติม:</strong></p>
                                  <ul style="margin: 10px 0; padding-left: 20px;">
                                    ${errorData.troubleshooting.map(step => `<li>${step}</li>`).join('')}
                                  </ul>
                                ` : ''}
                              </div>
                            `,
                            confirmButtonText: 'เข้าใจแล้ว',
                            confirmButtonColor: '#dc3545'
                          });
                        }, 500);
                      } else {
                        showErrorToast('❌ LINE API Error: ข้อมูลไม่ถูกต้อง');
                      }
                    } else if (errorData.status === 401) {
                      showErrorToast('❌ LINE Token ไม่ถูกต้องหรือหมดอายุ');
                    } else if (errorData.status === 403) {
                      showErrorToast('❌ Bot ถูกบล็อกหรือไม่มีสิทธิ์ส่งข้อความ');
                    } else {
                      showErrorToast(`❌ LINE Error: ${errorData.error || 'ไม่สามารถส่งข้อความได้'}`);
                    }
                  }
                  
                } catch (error) {
                  console.error('❌ Error sending LINE message:', error);
                }
              }
              
              // Show success message with SweetAlert2
              // if (sentSuccessfully > 0) {
              //   showSuccessToast(
              //     `ส่ง LINE message สำเร็จ! (${sentSuccessfully}/${totalMessages} ข้อความ)`
              //   );
                
              //   // Show detailed success dialog
              //   setTimeout(() => {
              //     MySwal.fire({
              //       icon: 'success',
              //       title: '🎉 ส่ง LINE Message สำเร็จ!',
              //       html: `
              //         <div style="text-align: left; padding: 10px;">
              //           <p><strong>📱 ส่งสำเร็จ:</strong> ${sentSuccessfully}/${totalMessages} ข้อความ</p>
              //           <p><strong>✅ สถานะ:</strong> ข้อความถูกส่งไปยัง LINE แล้ว</p>
              //           <p><strong>🔍 การตรวจสอบ:</strong> กรุณาเช็ค LINE chat ของคุณ</p>
              //           <hr style="margin: 15px 0;">
              //           <p style="color: #28a745;"><strong>🚀 ระบบ WebMeter + LINE Integration ทำงานสมบูรณ์!</strong></p>
              //         </div>
              //       `,
              //       confirmButtonText: 'เข้าใจแล้ว',
              //       confirmButtonColor: '#28a745',
              //       timer: 5000,
              //       timerProgressBar: true
              //     });
              //   }, 500);
              // } else {
              //   showErrorToast('ไม่สามารถส่ง LINE message ได้');
                
              //   // Show detailed error dialog with troubleshooting steps
              //   setTimeout(() => {
              //     MySwal.fire({
              //       icon: 'error',
              //       title: '❌ ส่ง LINE Message ไม่สำเร็จ',
              //       html: `
              //         <div style="text-align: left; padding: 10px;">
              //           <p><strong>🔍 สาเหตุที่เป็นไปได้:</strong></p>
              //           <ul style="margin: 10px 0; padding-left: 20px;">
              //             <li>LINE Access Token ไม่ได้ตั้งค่าหรือหมดอายุ</li>
              //             <li>LINE ID ไม่ถูกต้องหรือไม่ได้เพิ่ม Bot เป็นเพื่อน</li>
              //             <li>ข้อความยาวเกินไป (จำกัด 5,000 ตัวอักษร)</li>
              //             <li>LINE API มีข้อจำกัดการส่งข้อความ</li>
              //           </ul>
              //           <hr style="margin: 15px 0;">
              //           <p><strong>🛠️ วิธีแก้ไข:</strong></p>
              //           <ol style="margin: 10px 0; padding-left: 20px;">
              //             <li>ติดต่อผู้ดูแลระบบเพื่อตรวจสอบ LINE Token</li>
              //             <li>ตรวจสอบว่าได้เพิ่ม Bot เป็นเพื่อนใน LINE แล้ว</li>
              //             <li>ลองส่งข้อความสั้นๆ ก่อน</li>
              //           </ol>
              //         </div>
              //       `,
              //       confirmButtonText: 'เข้าใจแล้ว',
              //       confirmButtonColor: '#dc3545'
              //     });
              //   }, 500);
              // }
              
              const successCount = results.filter(r => r.success).length;
              const response = { success: successCount > 0, results, successCount };
              
              console.log('LINE send results:', response);
              
              if (response.success) {
                showSuccessToast('Send LINE successfully');
              } else {
                const failedResults = response.results.filter(r => !r.success);
                console.error('Failed LINE sends:', failedResults);
                toast({
                  title: "Failed to send LINE",
                  variant: "destructive",
                  duration: 5000,
                });
              }
            } else {
              toast({
                title: "Not Found LINE ID",
                variant: "destructive",
                duration: 5000,
              });
            }
          } catch (error) {
            console.error('Error sending LINE notification:', error);
            toast({
              title: "Failed to send LINE",
              description: "Error sending LINE notification",
              variant: "destructive",
              duration: 5000,
            });
          }
          
          return; // หยุดการทำงานที่นี่ ไม่ให้ไปสร้างไฟล์
          
        } else if (exportFormat === 'email') {
          if (listType === 'email') {
            // For Email export - send email via EmailJS
            const emailRecipients = selectedEmailList.map(emailId => {
              const email = emailList.find(e => e.id === emailId);
              return email;
            }).filter(Boolean);
            
            console.log('📧 Sending emails via EmailJS to:', emailRecipients.length, 'recipients');
            
            try {
              // Prepare email data for each recipient
              const emailDataList: EmailData[] = emailRecipients.map(email => ({
                to_email: email.email,
                to_name: email.displayName,
                subject: `WebMeter Export Report - ${exportType} - ${new Date().toLocaleDateString()}`,
                message: `"WebMeter Export Report"
Export Type: ${exportType}
Date : ${dateFrom ? format(dateFrom, 'dd MMM yyyy') : ''} - ${dateTo ? format(dateTo, 'dd MMM yyyy') : ''}
Time : ${timeFrom} - ${timeTo}
Read Time: ${readTime}

Selected Meters:
${selectedMeters.map(meter => {
  return `- ${meter.name} (${meter.location})`;
}).join('\n')}

${formattedData}

WebMeter by Amptron Thailand Co.,Ltd.`,
                export_type: exportType,
                date_range: `${dateFrom?.toLocaleDateString()} - ${dateTo?.toLocaleDateString()}`,
                time_range: `${timeFrom} - ${timeTo}`,
                meters: selectedMeterIds.map(id => {
                  const meter = meterList.find(m => m.id === id);
                  return meter?.name;
                }).join(', '),
                parameters: selectedParameters.map(paramId => {
                  const param = parameterList.find(p => p.id === paramId);
                  return param?.label;
                }).join(', ')
              }));
              
              // Send bulk emails via EmailJS
              const result = await sendBulkEmails(emailDataList);
              
              if (result.success) {
                showSuccessToast(`ส่ง Email สำเร็จไปยัง ${emailRecipients.length} ผู้รับ via EmailJS`);
                console.log('✅ EmailJS bulk send successful:', result);
              } else {
                showErrorToast(`ส่ง Email ล้มเหลว: ${result.message}`);
                console.error('❌ EmailJS bulk send failed:', result);
              }
            } catch (error) {
              showErrorToast(`ส่ง Email ล้มเหลว: ${error.message}`);
              console.error('❌ EmailJS send error:', error);
            }
          }
          
// Removed stray template literal block. Only jsPDF logic is present for PDF export.
        } else if (exportFormat === 'pdf' || exportFormat === 'excel') {
          // Use exportTableData utility like TableData.tsx
          console.log('📄 Using exportTableData utility for', exportFormat);
          
          // Helper functions like TableData.tsx
          const formatDateTime = (dateTimeString: string): string => {
            if (!dateTimeString) return '--/--/---- --:--';
            try {
              const date = new Date(dateTimeString);
              if (isNaN(date.getTime())) {
                return dateTimeString;
              }
              const day = date.getDate().toString().padStart(2, '0');
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
              const month = monthNames[date.getMonth()];
              const year = date.getFullYear();
              const hours = date.getHours().toString().padStart(2, '0');
              const minutes = date.getMinutes().toString().padStart(2, '0');
              return `${hours}:${minutes} ${day} ${month} ${year}`;
            } catch {
              return dateTimeString;
            }
          };

          const getColumnValue = (row: any, columnName: string): string => {
            const dbKey = parameterDbMapping[columnName];
            const param = parameterList.find(p => p.id === columnName);
            const value = row[dbKey] ?? (param?.label ? row[param.label] : undefined);
            
            if (value === undefined || value === null) return '-';
            
            if (typeof value === 'number') {
              // คอลัมน์ที่ไม่มีทศนิยม (Demand และ kWh/kVarh)
              if (columnName === 'demand_w' || columnName === 'demand_var' || columnName === 'demand_va' ||
                  columnName === 'import_kwh' || columnName === 'export_kwh' || 
                  columnName === 'import_kvarh' || columnName === 'export_kvarh') {
                return Math.round(value).toString();
              }
              return value.toFixed(2);
            }
            return value.toString();
          };

          // Prepare data for export
          const exportData = [];
          selectedMeters.forEach(meter => {
            const meterRows = (rawData || []).filter(row => String(row.slave_id) === String(meter.slave_id));
            meterRows.sort((a, b) => new Date(a.reading_timestamp || a.timestamp || a.time).getTime() - new Date(b.reading_timestamp || b.timestamp || b.time).getTime());
            exportData.push(...meterRows);
          });

          const meterNames = selectedMeters.map(m => m.name).join(', ');
          const fileName = `export_${day}${month}${year}`;
          const fromDateStr = dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '';
          const toDateStr = dateTo ? format(dateTo, 'dd/MM/yyyy') : '';

          try {
            await exportTableData({
              type: exportFormat === 'pdf' ? 'pdf' : exportFormat === 'excel' ? 'excel' : 'csv',
              fileName,
              fromDate: fromDateStr,
              toDate: toDateStr,
              timeFrom,
              timeTo,
              meterName: meterNames,
              columns: selectedParameters.map(paramId => {
                const param = parameterList.find(p => p.id === paramId);
                return param?.label || paramId;
              }),
              data: exportData,
              formatDateTime,
              getColumnValue: (row: any, col: string) => {
                // Find parameter ID from label
                const param = parameterList.find(p => p.label === col);
                const paramId = param?.id || col;
                return getColumnValue(row, paramId);
              },
            });

            console.log('✅ Export completed successfully using exportTableData');
            showSuccessToast(`${exportFormat.toUpperCase()} file exported successfully!`);

          } catch (error) {
            console.error('❌ Error using exportTableData:', error);
            showErrorToast(`Failed to export ${exportFormat.toUpperCase()} file: ${error.message}`);
          }
        }
        
        console.log(`File exported successfully to: ${filePath}`);
        showSuccessToast(`Export file successfully: ${filePath}`);
      
    } catch (error) {
      console.error('Export failed:', error);
      if (error.message && error.message.includes('Failed to fetch meter data')) {
        showErrorToast(`ไม่สามารถดึงข้อมูลมิเตอร์ได้: ${error.message}`);
      } else {
        showErrorToast(`Export ล้มเหลว: ${error.message}`);
      }
    }
    
    console.log('Exporting data...', exportData);
  } catch (error) {
    console.error('Export failed:', error);
    showErrorToast(`Export ล้มเหลว: ${error.message}`);
  }
};

  // Add new auto export schedule
  const handleAddAutoExport = async () => {
    const selectedMeterIds = Object.keys(meterSelection).filter(id => meterSelection[id]);
    
    // Show meter selection debug info
    console.log('🎯 === METER SELECTION DEBUG ===');
    console.log('🎯 Selected meter IDs:', selectedMeterIds);
    selectedMeterIds.forEach((meterId, index) => {
      console.log(`🎯 Meter ${index + 1}: ${meterId} (will be converted to slave_id)`);
    });
    console.log('🎯 Total meters selected:', selectedMeterIds.length);
    console.log('================================');
    
    // Validate selections before adding schedule
    if (selectedMeterIds.length === 0) {
      showErrorToast('กรุณาเลือกมิเตอร์อย่างน้อย 1 ตัวก่อนเพิ่มตารางเวลา Auto Export');
      return;
    }
    
    if (selectedParameters.length === 0) {
      showErrorToast('กรุณาเลือก Parameters อย่างน้อย 1 รายการก่อนเพิ่มตารางเวลา Auto Export');
      return;
    }

    try {
      console.log('📝 Creating new export schedule...');
      
      // 🔍 Debug: ตรวจสอบค่า timeTo ก่อนสร้าง schedule
      console.log('🔍 === TIME VALIDATION BEFORE SCHEDULE CREATION ===');
      console.log('🔍 timeFrom value:', timeFrom, '(type:', typeof timeFrom, ')');
      console.log('🔍 timeTo value:', timeTo, '(type:', typeof timeTo, ')');
      console.log('🔍 timeTo is falsy:', !timeTo);
      console.log('🔍 timeTo || "23:59" would result in:', timeTo || '23:59');
      console.log('🔍 timeTo length:', timeTo ? timeTo.length : 'N/A');
      console.log('🔍 timeTo === "":', timeTo === '');
      console.log('🔍 timeTo === null:', timeTo === null);
      console.log('🔍 timeTo === undefined:', timeTo === undefined);
      
      // ตรวจสอบ current time สำหรับ fallback
      const currentTime = (() => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      })();
      console.log('🔍 Current time for fallback:', currentTime);
      console.log('🔍 Will use time_to:', timeTo || currentTime);
      console.log('================================');
      
      // Get current user (you might want to get this from authentication context)
      const currentUser = localStorage.getItem('userUsername') || 'Current User';
      
      const scheduleData = {
        frequency: autoExportFrequency as 'daily' | 'weekly' | 'monthly',
        time: autoExportTime,
        day_of_week: autoExportFrequency === 'weekly' ? autoExportDay : undefined,
        day_of_month: autoExportFrequency === 'monthly' ? autoExportDate : undefined,
        export_type: exportType,
        export_format: exportFormat,
        read_time: readTime,
        meters: selectedMeterIds,
        parameters: selectedParameters,
        file_path: filePath,
        email_list: exportFormat === 'email' && listType === 'email' ? selectedEmailList : null,
        line_list: exportFormat === 'line' && listType === 'line' ? selectedLineList : null,
        created_by: currentUser,
        // Add user selected date/time for auto export - use actual datetime from date pickers
        // ✅ แก้ไข: ใช้ timezone ของประเทศไทย (UTC+7) และ format เดียวกับ manual export
        date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') + 'T' + (timeFrom || '00:00') + ':00+07:00' : null,
        date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') + 'T' + (timeTo || '23:59') + ':00+07:00' : null,
        // ✅ แก้ไข: ใช้เวลาที่ผู้ใช้เลือกจริงๆ แทนที่จะใช้เวลาจาก Date object
        time_from: timeFrom || '00:00',
        time_to: timeTo || currentTime  // ใช้ current time แทน 23:59
      };

      console.log('📊 Schedule data:', scheduleData);
      
      // Show detailed date/time mapping
      console.log('📊 === FINAL DATE/TIME MAPPING (THAILAND TIMEZONE) ===');
      console.log('📅 Frontend dateFrom:', dateFrom);
      console.log('📅 Frontend dateFrom ISO (old):', dateFrom ? dateFrom.toISOString() : 'null');
      console.log('📅 Frontend dateFrom formatted:', dateFrom ? format(dateFrom, 'yyyy-MM-dd') : 'null');
      console.log('📅 Frontend dateTo:', dateTo);
      console.log('📅 Frontend dateTo ISO (old):', dateTo ? dateTo.toISOString() : 'null');
      console.log('📅 Frontend dateTo formatted:', dateTo ? format(dateTo, 'yyyy-MM-dd') : 'null');
      console.log('⏰ Frontend timeFrom:', timeFrom);
      console.log('⏰ Frontend timeTo:', timeTo);
      console.log('🇹🇭 Thailand timezone format:');
      console.log('📅 Sending date_from (UTC+7):', scheduleData.date_from);
      console.log('📅 Sending date_to (UTC+7):', scheduleData.date_to);
      console.log('⏰ Sending time_from:', scheduleData.time_from);
      console.log('⏰ Sending time_to:', scheduleData.time_to);
      console.log('🔍 === TIME COMPARISON ===');
      console.log('🔍 User selected time range:', `${timeFrom} - ${timeTo}`);
      console.log('🔍 Saved to database:', `${scheduleData.time_from} - ${scheduleData.time_to}`);
      console.log('🔍 Times match:', timeFrom === scheduleData.time_from && timeTo === scheduleData.time_to ? '✅ YES' : '❌ NO');
      console.log('================================');
      
      // Show detailed meter and parameter mapping
      console.log('📊 === SCHEDULE DATA DETAILS ===');
      console.log('📊 Meters to be saved:', scheduleData.meters);
      console.log('📊 Parameters to be saved:', scheduleData.parameters);
      console.log('📊 Export format:', exportFormat);
      console.log('📊 List type:', listType);
      console.log('📊 Selected email list:', selectedEmailList);
      console.log('📊 Selected line list:', selectedLineList);
      console.log('📊 Final email_list in schedule:', scheduleData.email_list);
      console.log('📊 Final line_list in schedule:', scheduleData.line_list);
      console.log('📊 === DATE TIME SELECTION DEBUG ===');
      console.log('📅 Date From (dateFrom state):', dateFrom);
      console.log('📅 Date To (dateTo state):', dateTo);
      console.log('⏰ Time From (timeFrom state):', timeFrom);
      console.log('⏰ Time To (timeTo state):', timeTo);
      console.log('🕐 Auto Export Time (autoExportTime state):', autoExportTime);
      console.log('📊 Export settings being sent:', {
        frequency: scheduleData.frequency,
        time: scheduleData.time,
        export_type: scheduleData.export_type,
        export_format: scheduleData.export_format
      });
      console.log('📊 Note: Auto export will use current date/time (like manual export logic)');
      console.log('================================');
      console.log('================================');

      // Save to database
      const response = await apiClient.createExportSchedule(scheduleData);
      
      if (response.success && response.data) {
        console.log('✅ Export schedule created in database:', response.data);
        
        // Convert database response to local format
        const newSchedule: AutoExportSchedule = {
          id: response.data.id,
          frequency: response.data.frequency,
          time: response.data.time,
          day: response.data.day_of_week,
          date: response.data.day_of_month,
          exportType: response.data.export_type,
          exportFormat: response.data.export_format,
          readTime: response.data.read_time,
          meters: response.data.meters,
          parameters: response.data.parameters,
          filePath: response.data.file_path,
          emailList: response.data.email_list,
          lineList: response.data.line_list,
          enabled: response.data.enabled,
          created: new Date(response.data.created_at).toISOString().split('T')[0],
          createdBy: response.data.created_by
        };
        
        // Update local state
        setAutoExportSchedules(prev => [...prev, newSchedule]);
        
        // Log schedule creation event
        logScheduleAdd({
          scheduleId: newSchedule.id,
          frequency: newSchedule.frequency,
          time: newSchedule.time,
          exportType: newSchedule.exportType,
          exportFormat: newSchedule.exportFormat,
          metersCount: selectedMeterIds.length,
          parametersCount: selectedParameters.length,
          emailRecipientsCount: newSchedule.emailList ? newSchedule.emailList.length : 0,
          lineRecipientsCount: newSchedule.lineList ? newSchedule.lineList.length : 0
        });
        
        showSuccessToast('Add Auto Export Successfully!');
      } else {
        console.error('❌ Failed to create export schedule:', response.error);
        showErrorToast(`ไม่สามารถสร้างตารางเวลา Auto Export ได้: ${response.error}`);
      }
    } catch (error) {
      console.error('❌ Error creating export schedule:', error);
      showErrorToast(`เกิดข้อผิดพลาดในการสร้างตารางเวลา Auto Export: ${error.message}`);
    }
  };

  // Toggle schedule enabled/disabled
  const toggleSchedule = async (id) => {
    try {
      const schedule = autoExportSchedules.find(s => s.id === id);
      if (!schedule) return;

      console.log(`🔄 Toggling schedule ${id} enabled status...`);
      
      const response = await apiClient.updateExportSchedule(id, {
        enabled: !schedule.enabled
      });

      if (response.success) {
        console.log('✅ Schedule updated in database');
        
        // Update local state
        setAutoExportSchedules(prev => 
          prev.map(schedule => 
            schedule.id === id 
              ? { ...schedule, enabled: !schedule.enabled }
              : schedule
          )
        );
        
        showSuccessToast(`Auto Export ${!schedule.enabled ? 'Enabled' : 'Disabled'}`);
      } else {
        console.error('❌ Failed to update schedule:', response.error);
        showErrorToast(`ไม่สามารถอัปเดตตารางเวลาได้: ${response.error}`);
      }
    } catch (error) {
      console.error('❌ Error updating schedule:', error);
      showErrorToast(`เกิดข้อผิดพลาดในการอัปเดตตารางเวลา: ${error.message}`);
    }
  };

  // Remove schedule
  const removeSchedule = async (id) => {
    try {
      console.log(`🗑️ Deleting schedule ${id}...`);
      
      const response = await apiClient.deleteExportSchedule(id);

      if (response.success) {
        console.log('✅ Schedule deleted from database');
        
        // Update local state
        setAutoExportSchedules(prev => prev.filter(schedule => schedule.id !== id));
        
        showSuccessToast('Delete Auto Export Successfully');
      } else {
        console.error('❌ Failed to delete schedule:', response.error);
        showErrorToast(`Delete Auto Export Failed: ${response.error}`);
      }
    } catch (error) {
      console.error('❌ Error deleting schedule:', error);
      showErrorToast(`Error: ${error.message}`);
    }
  };

  // Get readable frequency text
  const getFrequencyText = (schedule) => {
    switch (schedule.frequency) {
      case 'daily':
        return `Daily at ${schedule.time}`;
      case 'weekly':
        return `Weekly on ${schedule.day} at ${schedule.time}`;
      case 'monthly':
        return `Monthly on day ${schedule.date} at ${schedule.time}`;
      default:
        return schedule.frequency;
    }
  };

  // Get schedule display info
  const getScheduleDisplayInfo = (schedule) => {
    let exportTypeText = schedule.exportType.charAt(0).toUpperCase() + schedule.exportType.slice(1);
    
    // Handle special cases for export type display
    if (schedule.exportType === 'tou_pe') {
      exportTypeText = 'TOU PE';
    } else if (schedule.exportType === 'compare_pe') {
      exportTypeText = 'Compare PE';
    }
    
    const exportFormatText = schedule.exportFormat.toUpperCase();
    const frequencyText = schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1);
    
    let displayText = `${exportTypeText} • ${exportFormatText} • ${frequencyText} • H:${schedule.time}`;
    
    if (schedule.frequency === 'monthly') {
      displayText = `${exportTypeText} • ${exportFormatText} • ${frequencyText} • D:${schedule.date} H:${schedule.time}`;
    } else if (schedule.frequency === 'weekly') {
      const dayText = schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1);
      displayText = `${exportTypeText} • ${exportFormatText} • ${frequencyText} • ${dayText} H:${schedule.time}`;
    }
    
    return {
      firstLine: displayText,
      secondLine: `Read Time: ${schedule.readTime}`
    };
  };

  // Show schedule detail modal
  const showScheduleDetail = (schedule) => {
    setSelectedScheduleDetail(schedule);
    setShowDetailModal(true);
  };

  const handleClear = () => {
    // Clear all selections and reset to defaults
    
    // Reset meter selection (ล้างการเลือกมิเตอร์ทั้งหมด)
    const clearedMeterSelection = {};
    meterList.forEach(m => { clearedMeterSelection[m.id] = false; });
    setMeterSelection(clearedMeterSelection);
    
    // Reset search term (ล้างคำค้นหา)
    setSearchTerm('');
    
    // Reset parameters to none selected (ล้างการเลือก parameters ทั้งหมด)
    setSelectedParameters([]);
    
    // Reset dates to default (รีเซ็ตวันที่กลับไปเป็นค่าเริ่มต้น)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setDateFrom(today);
    setDateTo(new Date());
    
    // Reset times to default (รีเซ็ตเวลากลับไปเป็นค่าเริ่มต้น)
    setTimeFrom('00:00');
    setTimeTo(`${pad(today.getHours())}:${pad(today.getMinutes())}`);
    
    // Reset export type to default (รีเซ็ต export type กลับไปเป็น Normal)
    setExportType('normal');
    
    // Reset export format to default (รีเซ็ต export format กลับไปเป็น Excel)
    setExportFormat('excel');
    
    // Reset read time to default (รีเซ็ต read time กลับไปเป็น 15 นาที)
    setReadTime('15min');
    
    // Reset auto export settings (รีเซ็ตการตั้งค่า auto export)
    setAutoExportFrequency('daily');
    setAutoExportTime('08:00');
    setAutoExportDay('monday');
    setAutoExportDate(1);
    
    // Reset auto export settings for all types
    setAutoExportSettings({
      instant_pe: { enabled: false, time: '00:00' },
      tou_pe: { enabled: false, time: '00:00' },
      daily: { enabled: false, time: '00:00' },
      weekly: { enabled: false, time: '00:00' },
      monthly: { enabled: false, time: '00:00' },
      compare_pe: { enabled: false, time: '00:00' }
    });
    
    // Reset email and line list selections
    setSelectedEmailList([]);
    setSelectedLineList([]);
    
    // Reset email group states
    const emailGroupNames = emailGroups.map(group => group.name);
    setExpandedEmailGroups(new Set(emailGroupNames));
    setSelectedEmailGroups(new Set());
    
    // Reset line group states
    const lineGroupNames = lineGroups.map(group => group.name);
    setExpandedLineGroups(new Set(lineGroupNames));
    setSelectedLineGroups(new Set());
    
    // Reset list type to email
    setListType('email');
  };

  const handleBrowseFile = () => {
    // For email and line formats, browse function is not applicable
    if (exportFormat === 'email' || exportFormat === 'line') {
      showErrorToast(`Browse file ไม่สามารถใช้ได้กับรูปแบบ ${exportFormat}`);
      return;
    }
    
    // สร้าง input element สำหรับเลือกไฟล์
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = exportFormat === 'pdf' ? '.pdf' : '.xlsx,.xls';
    input.multiple = false;
    
    // เมื่อเลือกไฟล์แล้ว
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // ใช้ชื่อไฟล์ที่เลือก แต่เปลี่ยน path เป็น default path
        const fileName = file.name;
        const defaultPath = 'C:\\My Report\\';
        setFilePath(defaultPath + fileName);
      }
    };
    
    // เปิด file dialog
    input.click();
  };

  const toggleAutoExport = (type: string) => {
    setAutoExportSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled
      }
    }));
  };

  const updateAutoExportTime = (type: string, time: string) => {
    setAutoExportSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        time: time
      }
    }));
  };

  function ParamCheckbox({ id, label }: { id: string; label: string }) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="checkbox"
          id={id}
          className="accent-primary rounded-none border h-3 w-3 border-gray-300"
          checked={selectedParameters.includes(id)}
          onChange={() => toggleParameter(id)}
        />
        <label htmlFor={id} className="text-xs cursor-pointer select-none break-words">{label}</label>
      </div>
    );
  }

  // Helper: units map and number formatter
  const parameterUnits: Record<string, string> = {
    'Frequency': 'Hz',
    'Volt AN': 'V', 'Volt BN': 'V', 'Volt CN': 'V', 'Volt LN Avg': 'V',
    'Volt AB': 'V', 'Volt BC': 'V', 'Volt CA': 'V', 'Volt LL Avg': 'V',
    'Current A': 'A', 'Current B': 'A', 'Current C': 'A', 'Current Avg': 'A', 'Current IN': 'A',
    'Watt A': 'W', 'Watt B': 'W', 'Watt C': 'W', 'Watt Total': 'W',
    'Var A': 'Var', 'Var B': 'Var', 'Var C': 'Var', 'Var total': 'Var',
    'VA A': 'VA', 'VA B': 'VA', 'VA C': 'VA', 'VA Total': 'VA',
    'PF A': '', 'PF B': '', 'PF C': '', 'PF Total': '',
    'Demand W': 'W', 'Demand Var': 'Var', 'Demand VA': 'VA',
    'Import kWh': 'kWh', 'Export kWh': 'kWh', 'Import kVarh': 'kvarh', 'Export kVarh': 'kvarh',
    'THDV': '%', 'THDI': '%'
  };

  const formatNumber = (val: any): string => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (!isFinite(num)) return String(val ?? '-');
    const rounded = Math.abs(num) < 0.0005 ? 0 : num;
    const fixed = Math.abs(rounded) >= 100 ? rounded.toFixed(1) : rounded.toFixed(2);
    return fixed.replace(/\.0+$/, '').replace(/(\..*?)0+$/, '$1');
  };

  // Helper: build vertical LINE message content
  const buildLineContentVertical = (
    meters: Array<{ id: string; name: string; location: string; slave_id: number|string }>,
    params: string[],
    dataRows: any[]
  ): string => {
    const dateFromStr = dateFrom ? format(dateFrom, 'dd MMM yyyy') : '';
    const dateToStr = dateTo ? format(dateTo, 'dd MMM yyyy') : '';

    const meterBlocks = meters.map((meter, meterIndex) => {
      const rows = (dataRows || [])
        .filter(r => String(r.slave_id) === String(meter.slave_id))
        .sort((a, b) => new Date(a.reading_timestamp || a.timestamp || a.time).getTime() - new Date(b.reading_timestamp || b.timestamp || b.time).getTime());

      if (rows.length === 0) {
        return `WebMeter Report [${meter.name}]\nFrom ${dateFromStr} ${timeFrom} - ${dateToStr} ${timeTo}\n\n- No data -`;
      }

      const lines: string[] = [];
      
      // Header สำหรับแต่ละมิเตอร์
      lines.push('='.repeat(50));
      lines.push(`WebMeter Report [${meter.name}]`);
      lines.push(`From ${dateFromStr} ${timeFrom} - ${dateToStr} ${timeTo}`);
      lines.push('='.repeat(50));
      lines.push('');
      
      rows.forEach(row => {
        const ts = new Date(row.reading_timestamp || row.timestamp || row.time);
        const timeStr = format(ts, 'HH.mm');
        
        // Header สำหรับแต่ละ timestamp
        lines.push(`Time: ${timeStr}`);
        lines.push('-'.repeat(30));
        
        params.forEach(pid => {
          const meta = parameterList.find(p => p.id === pid);
          const dbKey = parameterDbMapping[pid];
          const raw = row[dbKey] ?? (meta?.label ? row[meta.label] : undefined) ?? row[pid];
          if (raw === null || raw === undefined) return;
          const valStr = formatNumber(raw);
          const unit = parameterUnits[meta?.label || pid] ?? '';
          // จัดรูปแบบให้ชัดเจน
          lines.push(`  ${(meta?.label || pid).padEnd(15)} : ${valStr}${unit ? ' ' + unit : ''}`);
        });
        
        lines.push(''); // เว้นบรรทัดหลังจบแต่ละ timestamp
      });

      // เพิ่มเส้นแบ่งหลังจบแต่ละมิเตอร์
      if (meterIndex < meters.length - 1) {
        lines.push('='.repeat(50));
        lines.push('');
      }
      
      return lines.join('\n');
    });

    return meterBlocks.join('\n');
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-9xl mx-auto">
          <div className="bg-white rounded-none shadow-sm">
            <div className="flex items-center gap-2 p-4">
              <Upload className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-gray-900">Export Data</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-full min-h-0 p-4 pt-0">
              {emailDataLoading ? (
                <div className="col-span-4 flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading data...</p>
                  </div>
                </div>
              ) : (
                <div className="col-span-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                  {/* Meter Selection */}
                  <div className="border border-gray-200 bg-white p-2 flex flex-col flex-1 min-h-[575px] shadow-sm">
                    <div className="font-semibold text-black mb-3 flex items-center justify-between text-sm h-8">
                      <span className="text-sm">Meter Selection</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={Object.values(meterSelection).every(Boolean) ? "default" : "outline"}
                          className={`h-6 px-2 text-xs rounded-none ${
                            Object.values(meterSelection).every(Boolean) 
                              ? 'bg-primary text-white hover:bg-primary/90' 
                              : 'text-gray-500 border-gray-300 bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => {
                            const allSelected = Object.values(meterSelection).every(Boolean);
                            const newSelection = {};
                            meterList.forEach(m => { newSelection[m.id] = !allSelected; });
                            setMeterSelection(newSelection);
                          }}
                        >
                          All
                        </Button>
                      </div>
                    </div> 
                    {/* Search Box */}
                    <div className="mb-2">
                      <Input
                        placeholder="Search..."
                        className="h-7 text-xs rounded-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    


                    {/* All Meters List */}
                    <div className="flex-1 max-h-[400px] overflow-y-auto border border-gray-100">
                      <div className="space-y-1 p-1">
                        {isMeterDataLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-xs text-gray-600">Loading meters from database...</p>
                          </div>
                        ) : (
                          <>
                                                        {filteredMeterList.map(meter => (
                              <div 
                                key={meter.id} 
                                className="border border-gray-200 bg-white p-2 hover:bg-gray-50 cursor-pointer"
                                title={`${meter.name}
Location: ${meter.location}`}
                              >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={meter.id}
                                className="accent-primary border h-3 w-3 border-gray-300"
                                checked={!!meterSelection[meter.id]}
                                onChange={() => toggleMeter(meter.id)}
                              />
                                                              <div className="flex-1 min-w-0">
                                  <label htmlFor={meter.id} className="text-xs cursor-pointer block truncate font-medium">
                                    {meter.name}
                                  </label>
                                  <span className="text-xs text-gray-500 block truncate">
                                    {meter.location}
                                  </span>
                                </div>
                            </div>
                          </div>
                        ))}
                        
                        {filteredMeterList.length === 0 && (
                          <div className="text-gray-500 text-xs p-3 text-center border border-gray-200 bg-gray-50">
                            {searchTerm ? 'No meters found matching your search' : 'No meters available'}
                          </div>
                        )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
        
                  {/* Parameters */}
                  <div className="border border-gray-200 rounded-none bg-white p-2 flex flex-col flex-1 min-h-[500px] shadow-sm">
                    <div className="flex items-center justify-between mb-1 h-8">
                      <div className="font-semibold text-black flex items-center gap-1 text-sm">
                        <FileText className="w-3 h-3" />
                        <span className="text-sm">Parameters</span>
                      </div>
                      <Button
                        size="sm"
                        variant={allSelected ? "default" : "outline"}
                        className={`h-6 px-2 text-xs rounded-none ${
                          allSelected 
                            ? 'bg-primary text-white hover:bg-primary/90' 
                            : 'text-gray-500 border-gray-300 bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={toggleSelectAll}
                      >
                        All
                      </Button>
                    </div>
                    <div className="text-xs">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-1">
                          {parameterList.slice(0, Math.ceil(parameterList.length / 2)).map(param => (
                            <ParamCheckbox 
                              key={param.id}
                              id={param.id} 
                              label={param.label}
                            />
                          ))}
                        </div>
                        
                        {/* Column 2 */}
                        <div className="flex flex-col gap-1">
                          {parameterList.slice(Math.ceil(parameterList.length / 2)).map(param => (
                            <ParamCheckbox 
                              key={param.id}
                              id={param.id} 
                              label={param.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Export Settings */}
                  <div className="border border-gray-200 rounded-none bg-white p-4 flex flex-col flex-1 min-h-[500px] shadow-sm">
                    <div className="font-semibold text-black mb-3 flex items-center gap-2 text-sm h-4">
                      <Upload className="w-3 h-3" />
                      <span className="text-sm">Export Manual</span>
                    </div>
                    <div className="space-y-2">
                      {/* From */}
                      <div>
                        <Label className="text-xs font-bold text-gray-700 mb-1 block">From</Label>
                        <div className="flex gap-2 items-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-35 justify-start text-left font-normal text-xs h-7 bg-white border-gray-300 rounded-none px-2",
                                  !dateFrom && "text-muted-foreground"
                                )}
                              >
                                
                                {dateFrom ? format(dateFrom, 'dd MMMM yyyy') : 'Select date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start" style={{ minWidth: '280px' }}>
                              <Calendar
                                mode="single"
                                selected={dateFrom}
                                onSelect={setDateFrom}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {/* Replace TimeInput24 with regular input for now */}
                          <TimeInput24 
                              value={timeFrom}
                              onChange={setTimeFrom}
                              className="h-7 w-10 text-xs rounded-none border-gray-200 px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                           />
                        </div>
                      </div>
                      {/* To */}
                      <div>
                        <Label className="text-xs font-bold text-gray-700 mb-1 block">To</Label>
                        <div className="flex gap-2 items-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-35 justify-start text-left font-normal text-xs h-7 bg-white border-gray-300 rounded-none px-2",
                                  !dateTo && "text-muted-foreground"
                                )}
                              >
                               
                                {dateTo ? format(dateTo, 'dd MMMM yyyy') : 'Select date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start" style={{ minWidth: '280px' }}>
                              <Calendar
                                mode="single"
                                selected={dateTo}
                                onSelect={setDateTo}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {/* Replace TimeInput24 with regular input for now */}
                            <TimeInput24 
                              value={timeTo}
                              onChange={setTimeTo}
                              className="h-7 w-10 text-xs rounded-none border-gray-200 px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                           />
                                                  </div>
                      </div>
                      
                      {/* Read Time */}
                      <div>
                        <Label className="text-xs font-semibold mb-1 block rounded-none">Read Time</Label>
                        <Select value={readTime} onValueChange={setReadTime}>
                          <SelectTrigger className="h-8 text-xs bg-white border-gray-300 rounded-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1min" className="text-xs">1 Minute</SelectItem>
                            <SelectItem value="3min" className="text-xs">3 Minute</SelectItem>
                            <SelectItem value="5min" className="text-xs">5 Minute</SelectItem>
                            <SelectItem value="15min" className="text-xs">15 Minute</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Export Type */}
                      <div>
                        <Label className="text-xs font-semibold mb-1 block rounded-none">Export Type</Label>
                        <div className="flex flex-col gap-1">
                          {[
                            { value: 'daily', label: 'Daily' },
                            { value: 'weekly', label: 'Weekly' },
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'compare_pe', label: 'Compare PE' },
                            { value: 'tou_pe', label: 'TOU PE' },
                          ].map(opt => (
                            <div key={opt.value} className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-normal flex-1">
                                <input 
                                  type="radio" 
                                  name="exportType" 
                                  value={opt.value}
                                  checked={exportType === opt.value}
                                  onChange={() => {
                                    setExportType(opt.value);
                                    // Auto-select parameters for Daily, Weekly, Monthly - select all parameters
                                    if (opt.value === 'daily' || opt.value === 'weekly' || opt.value === 'monthly') {
                                      setSelectedParameters(parameterList.map(p => p.id));
                                    }
                                    // Auto-select parameters for Compare PE
                                    if (opt.value === 'compare_pe') {
                                      setSelectedParameters(['demand_w', 'demand_var', 'demand_va', 'import_kwh', 'export_kwh', 'import_kvarh', 'export_kvarh']);
                                    }
                                    // Auto-select parameters for TOU PE
                                    if (opt.value === 'tou_pe') {
                                      setSelectedParameters(['demand_w', 'demand_var', 'demand_va', 'import_kwh', 'export_kwh', 'import_kvarh', 'export_kvarh']);
                                    }
                                  }}
                                  className="accent-primary w-3 h-3 border border-gray-300 focus:ring-2 focus:ring-primary rounded-none"
                                />
                                <span>{opt.label}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Export Format */}
                      <div>
                        <Label className="text-xs font-semibold mb-1 block rounded-none">Export Format</Label>
                        <div className="flex gap-3 flex-wrap">
                          <label className="flex items-center gap-1 cursor-pointer text-xs font-normal">
                            <input 
                              type="radio" 
                              name="exportFormat" 
                              value="excel"
                              checked={exportFormat === 'excel'}
                              onChange={() => setExportFormat('excel')}
                              className="accent-primary w-3 h-3 border border-gray-300 focus:ring-2 focus:ring-primary rounded-none"
                            />
                            <span>Excel</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-xs font-normal">
                            <input 
                              type="radio" 
                              name="exportFormat" 
                              value="pdf"
                              checked={exportFormat === 'pdf'}
                              onChange={() => setExportFormat('pdf')}
                              className="accent-primary w-3 h-3 border border-gray-300 focus:ring-2 focus:ring-primary rounded-none"
                            />
                            <span>PDF</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-xs font-normal">
                            <input 
                              type="radio" 
                              name="exportFormat" 
                              value="email"
                              checked={exportFormat === 'email'}
                              onChange={() => setExportFormat('email')}
                              className="accent-primary w-3 h-3 border border-gray-300 focus:ring-2 focus:ring-primary rounded-none"
                            />
                            <span>Email</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-xs font-normal">
                            <input 
                              type="radio" 
                              name="exportFormat" 
                              value="line"
                              checked={exportFormat === 'line'}
                              onChange={() => setExportFormat('line')}
                              className="accent-primary w-3 h-3 border border-gray-300 focus:ring-2 focus:ring-primary rounded-none"
                            />
                            <span>Line</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Email/Line List Selection - shown when email or line format is selected */}
                      {(exportFormat === 'email' || exportFormat === 'line') && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-semibold block rounded-none">
                              {exportFormat === 'email' ? 'Email Recipients' : 'Line Recipients'}
                            </Label>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setListType(listType === 'email' ? 'line' : 'email')}
                                  className={`text-xs px-3 py-1.5 transition-colors ${
                                    listType === 'email'
                                      ? 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                                      : 'text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400'
                                  }`}
                                >
                                  {listType === 'email' 
                                    ? (exportFormat === 'email' ? 'Email List' : 'Line List')
                                    : 'Group List'
                                  }
                                </button>
                              </div>
                              
                              {/* Select All button */}
                              {(listType === 'email' || listType === 'line') && (
                                <button
                                  onClick={() => {
                                    if (listType === 'email') {
                                      const allSelected = emailList.every(email => selectedEmailList.includes(email.id));
                                      if (allSelected) {
                                        setSelectedEmailList([]);
                                      } else {
                                        setSelectedEmailList(emailList.map(email => email.id));
                                      }
                                    } else {
                                      // For line format
                                      if (exportFormat === 'line') {
                                        // Use different logic based on current display mode
                                        if (listType === 'line') {
                                          // Line Group mode - select all lines from all groups
                                          const groupedLines = getGroupedLines();
                                          const allGroupLines = Array.from(groupedLines.values()).flat();
                                          const allSelected = allGroupLines.every(line => selectedLineList.includes(line.id));
                                          if (allSelected) {
                                            setSelectedLineList([]);
                                          } else {
                                            setSelectedLineList(allGroupLines.map(line => line.id));
                                          }
                                        } else {
                                          // Line List mode - select all individual lines
                                          const allSelected = lineList.every(line => selectedLineList.includes(line.id));
                                          if (allSelected) {
                                            setSelectedLineList([]);
                                          } else {
                                            setSelectedLineList(lineList.map(line => line.id));
                                          }
                                        }
                                      }
                                    }
                                  }}
                                  className={`text-xs px-3 py-1.5 transition-colors ${
                                    (listType === 'email' && exportFormat === 'email' && emailList.every(email => selectedEmailList.includes(email.id))) ||
                                    (listType === 'line' && exportFormat === 'email' && (() => {
                                      const groupedEmails = getGroupedEmails();
                                      const allGroupEmails = Array.from(groupedEmails.values()).flat();
                                      return allGroupEmails.every(email => selectedEmailList.includes(email.id));
                                    })()) ||
                                    (listType === 'email' && exportFormat === 'line' && lineList.every(line => selectedLineList.includes(line.id))) ||
                                    (listType === 'line' && exportFormat === 'line' && (() => {
                                      const groupedLines = getGroupedLines();
                                      const allGroupLines = Array.from(groupedLines.values()).flat();
                                      return allGroupLines.every(line => selectedLineList.includes(line.id));
                                    })())
                                      ? 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                                      : 'text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400'
                                  }`}
                                >
                                  All
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="max-h-64 overflow-y-auto border border-gray-200 bg-gray-50">
                            {listType === 'email' && exportFormat === 'email' ? (
                              // Email List View - Show as flat list
                              <div className="space-y-1 p-2">
                                {emailList.length > 0 ? (
                                  emailList.map(email => (
                                    <div key={email.id} className="flex items-center gap-2 bg-white p-2 border border-gray-100 hover:bg-gray-50">
                                      <input
                                        type="checkbox"
                                        id={`email-${email.id}`}
                                        className="accent-primary border h-3 w-3 border-gray-300"
                                        checked={selectedEmailList.includes(email.id)}
                                        onChange={() => toggleEmailSelection(email.id)}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <label htmlFor={`email-${email.id}`} className="text-xs cursor-pointer block truncate font-medium">
                                          {email.displayName}
                                        </label>
                                        <span className="text-xs text-gray-500 block truncate">
                                          {email.email}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-xs">
                                    {emailDataLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูล Email'}
                                  </div>
                                )}
                              </div>
                            ) : listType === 'email' && exportFormat === 'line' ? (
                              // Line List View - Show as flat list with lineId and displayName
                              <div className="space-y-1 p-2">
                                {lineList.length > 0 ? (
                                  lineList.map(line => (
                                    <div key={line.id} className="flex items-center gap-2 bg-white p-2 border border-gray-100 hover:bg-gray-50">
                                      <input
                                        type="checkbox"
                                        id={`line-${line.id}`}
                                        className="accent-primary border h-3 w-3 border-gray-300"
                                        checked={selectedLineList.includes(line.id)}
                                        onChange={() => toggleLineSelection(line.id)}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <label htmlFor={`line-${line.id}`} className="text-xs cursor-pointer block truncate font-medium">
                                          {line.displayName}
                                        </label>
                                        <span className="text-xs text-gray-500 block truncate">
                                          Line ID: {line.line_messaging_id || line.lineId}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-xs">
                                    {emailDataLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูล LINE'}
                                  </div>
                                )}
                              </div>
                            ) : listType === 'line' && exportFormat === 'email' ? (
                              // Show Email Groups when exportFormat is email and listType is line
                              <div className="space-y-1 p-2">
                                {Array.from(getGroupedEmails().entries()).length > 0 ? (
                                  Array.from(getGroupedEmails().entries()).map(([group, emails]) => (
                                    <div key={group} className="flex items-center gap-2 bg-white p-2 border border-gray-100 hover:bg-gray-50 cursor-pointer"
                                         onClick={() => toggleEmailGroupSelection(group)}>
                                      <input
                                        type="checkbox"
                                        id={`email-group-${group}`}
                                        className="accent-primary border h-3 w-3 border-gray-300"
                                        checked={emails.every(email => selectedEmailList.includes(email.id))}
                                        onChange={() => toggleEmailGroupSelection(group)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <label htmlFor={`email-group-${group}`} className="text-xs cursor-pointer block truncate font-medium">
                                          {group}
                                        </label>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-xs">
                                    {emailDataLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูล Email Groups'}
                                  </div>
                                )}
                              </div>
                            ) : listType === 'line' && exportFormat === 'line' ? (
                              // Show Line Groups when exportFormat is line and listType is line
                              <div className="space-y-1 p-2">
                                {Array.from(getGroupedLines().entries()).length > 0 ? (
                                  Array.from(getGroupedLines().entries()).map(([group, lines]) => (
                                    <div key={group} className="flex items-center gap-2 bg-white p-2 border border-gray-100 hover:bg-gray-50 cursor-pointer"
                                         onClick={() => toggleLineGroupSelection(group)}>
                                      <input
                                        type="checkbox"
                                        id={`line-group-${group}`}
                                        className="accent-primary border h-3 w-3 border-gray-300"
                                        checked={lines.every(line => selectedLineList.includes(line.id))}
                                        onChange={() => toggleLineGroupSelection(group)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <label htmlFor={`line-group-${group}`} className="text-xs cursor-pointer block truncate font-medium">
                                          {group}
                                        </label>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-xs">
                                    {emailDataLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูล LINE Groups'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Show Line Groups when exportFormat is line and listType is line
                              <div className="space-y-1 p-2">
                                {Array.from(getGroupedLines().entries()).map(([group, lines]) => (
                                  <div key={group} className="flex items-center gap-2 bg-white p-2 border border-gray-100 hover:bg-gray-50 cursor-pointer"
                                       onClick={() => toggleLineGroupSelection(group)}>
                                    <input
                                      type="checkbox"
                                      id={`line-group-${group}`}
                                      className="accent-primary border h-3 w-3 border-gray-300"
                                      checked={lines.every(line => selectedLineList.includes(line.id))}
                                      onChange={() => toggleLineGroupSelection(group)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <label htmlFor={`line-group-${group}`} className="text-xs cursor-pointer block truncate font-medium">
                                        {group}
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Export Buttons */}
                      <div className="flex gap-2 mt-2">
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 h-8 text-xs rounded-none shadow"
                          onClick={handleExport}
                          disabled={!exportPermissions.write}
                          title={!exportPermissions.write ? "You don't have write permission for Export Data" : ""}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {Object.values(autoExportSettings).some(setting => setting.enabled) ? 'Schedule Export' : 'Export'}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full h-8 text-xs rounded-none border-gray-300 bg-white"
                          onClick={handleClear}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Auto Export Card */}
                  <div className="border border-gray-200 rounded-none bg-white p-4 flex flex-col flex-1 min-h-[500px] shadow-sm">
                    <div className="font-semibold text-black mb-3 flex items-center gap-2 text-sm h-4">
                      <Clock className="w-3 h-3" />
                      <span className="text-sm">Export Auto</span>
                      <button
                        onClick={() => setShowConfiguredSchedules(!showConfiguredSchedules)}
                        className="ml-auto p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-none"
                        title={showConfiguredSchedules ? "Hide Configured Schedules" : "Show Configured Schedules"}
                      >
                        <Menu className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-4 text-xs">
                      {/* Auto Export Configuration */}
                      {/* Frequency Selection */}
                      <div className="flex gap-4 mb-3">
                        <div className="flex-[2]">
                          <Label className="text-xs font-semibold mb-1 block">Export Type</Label>
                          <Select value={autoExportFrequency} onValueChange={setAutoExportFrequency}>
                            <SelectTrigger className="h-8 text-xs bg-white border-gray-300 rounded-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                              <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                              <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex-1">
                          <Label className="text-xs font-semibold mb-1 block">Time</Label>
                          {/* Auto Export Time Input - แก้ไขให้ใช้ autoExportTime state */}
                          <TimeInput24 
                              value={autoExportTime}
                              onChange={setAutoExportTime}
                              className="h-7 w-10 text-xs rounded-none border-gray-200 px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                           />
                        </div>
                      </div>

                      {/* Day Selection for Weekly */}
                      {autoExportFrequency === 'weekly' && (
                        <div className="mb-3">
                          <Label className="text-xs font-semibold mb-1 block">Day of Week</Label>
                          <Select value={autoExportDay} onValueChange={setAutoExportDay}>
                            <SelectTrigger className="h-8 text-xs bg-white border-gray-300 rounded-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monday" className="text-xs">Monday</SelectItem>
                              <SelectItem value="tuesday" className="text-xs">Tuesday</SelectItem>
                              <SelectItem value="wednesday" className="text-xs">Wednesday</SelectItem>
                              <SelectItem value="thursday" className="text-xs">Thursday</SelectItem>
                              <SelectItem value="friday" className="text-xs">Friday</SelectItem>
                              <SelectItem value="saturday" className="text-xs">Saturday</SelectItem>
                              <SelectItem value="sunday" className="text-xs">Sunday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Date Selection for Monthly */}
                      {autoExportFrequency === 'monthly' && (
                        <div className="mb-3">
                          <Label className="text-xs font-semibold mb-1 block">Day of Month</Label>
                          <Select value={autoExportDate.toString()} onValueChange={(value) => setAutoExportDate(parseInt(value))}>
                            <SelectTrigger className="h-8 text-xs bg-white border-gray-300 rounded-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={day.toString()} className="text-xs">
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Add Schedule Button */}
                      <Button
                        type="button"
                        className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 rounded-none"
                        onClick={handleAddAutoExport}
                        disabled={!exportPermissions.write}
                        title={!exportPermissions.write ? "You don't have write permission for Export Data" : ""}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Add Schedule
                      </Button>
                    </div>

                    {/* Existing Schedules */}
                    {(autoExportSchedules.length > 0 || loadingSchedules) && showConfiguredSchedules && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold block">
                          Export List ({loadingSchedules ? '...' : autoExportSchedules.length})
                        </Label>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {loadingSchedules ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                              <p className="text-xs text-gray-600">Loading schedules...</p>
                            </div>
                          ) : (
                            autoExportSchedules.map((schedule, index) => {
                            const displayInfo = getScheduleDisplayInfo(schedule);
                            return (
                              <div key={schedule.id} className="border border-gray-200 bg-white text-xs rounded-none">
                                {/* Schedule Header */}
                                <div className="flex items-center justify-between p-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400 font-medium min-w-[16px] text-center">
                                        {index + 1}.
                                      </span>
                                      <div className="font-medium text-gray-800">{displayInfo.firstLine}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => toggleSchedule(schedule.id)}
                                      className={`px-2 py-1 text-xs rounded-none flex items-center gap-1 ${
                                        schedule.enabled 
                                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                      }`}
                                      title={schedule.enabled ? 'Disable Schedule' : 'Enable Schedule'}
                                      disabled={!exportPermissions.write}
                                    >
                                      <Power className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => showScheduleDetail(schedule)}
                                      className="px-2 py-1 text-xs bg-primary text-white rounded-none hover:bg-primary/90 flex items-center gap-1"
                                      title="View Details"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => removeSchedule(schedule.id)}
                                      className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-none hover:bg-red-200 flex items-center gap-1"
                                      title="Delete Schedule"
                                      disabled={!exportPermissions.write}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                          )}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {autoExportSchedules.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-xs">No auto export schedules configured</div>
                        <div className="text-xs mt-1">Enable auto export to create your first schedule</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDetailModal && selectedScheduleDetail && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-none shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Schedule Details</h2>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Schedule Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-1">Created by</Label>
                  <div className="text-sm text-gray-800">{selectedScheduleDetail.createdBy}</div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-1">Status</Label>
                  <div className={`text-sm font-medium ${
                    selectedScheduleDetail.enabled ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {selectedScheduleDetail.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-1">Frequency</Label>
                  <div className="text-sm text-gray-800">{getFrequencyText(selectedScheduleDetail)}</div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-1">Created Date</Label>
                  <div className="text-sm text-gray-800">{selectedScheduleDetail.created}</div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-1">Export Type</Label>
                  <div className="text-sm text-gray-800 capitalize">{selectedScheduleDetail.exportType}</div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-1">Export Format</Label>
                  <div className="text-sm text-gray-800 uppercase">{selectedScheduleDetail.exportFormat}</div>
                </div>
                
                {/* File Path */}
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-1">File Path</Label>
                  <div className="text-sm text-gray-800 bg-gray-50 p-2 border border-gray-200 rounded break-all min-h-[40px] flex items-center">
                    {selectedScheduleDetail.filePath || 'D:\\WebMeter-Demo\\server\\exports\\export_27092025.xlsx'}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-1">Read Time</Label>
                  <div className="text-sm text-gray-800">{selectedScheduleDetail.readTime}</div>
                </div>
              </div>
              
              {/* Date/Time Range Section */}
              {(selectedScheduleDetail.dateFrom || selectedScheduleDetail.dateTo || selectedScheduleDetail.timeFrom || selectedScheduleDetail.timeTo) && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <Label className="text-sm font-semibold text-blue-800 block mb-2">📅 Selected Date/Time Range</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium text-blue-600 block mb-1">Date From</Label>
                      <div className="text-sm text-blue-800">
                        {selectedScheduleDetail.dateFrom ? 
                          new Date(selectedScheduleDetail.dateFrom).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          }) : 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-blue-600 block mb-1">Date To</Label>
                      <div className="text-sm text-blue-800">
                        {selectedScheduleDetail.dateTo ? 
                          new Date(selectedScheduleDetail.dateTo).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          }) : 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-blue-600 block mb-1">Time From</Label>
                      <div className="text-sm text-blue-800">{selectedScheduleDetail.timeFrom || 'Not specified'}</div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-blue-600 block mb-1">Time To</Label>
                      <div className="text-sm text-blue-800">{selectedScheduleDetail.timeTo || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-white border border-blue-100 rounded">
                    <Label className="text-xs font-medium text-blue-600 block mb-1">📊 Full Range</Label>
                    <div className="text-sm text-blue-800 font-medium">
                      {selectedScheduleDetail.dateFrom && selectedScheduleDetail.dateTo && selectedScheduleDetail.timeFrom && selectedScheduleDetail.timeTo ? 
                        `${new Date(selectedScheduleDetail.dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${selectedScheduleDetail.timeFrom} - ${new Date(selectedScheduleDetail.dateTo).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${selectedScheduleDetail.timeTo}` :
                        'Date/Time range not fully specified'
                      }
                    </div>
                  </div>
                </div>
              )}
              
              {/* Selected Meters */}
              <div>
                <Label className="text-sm font-semibold text-gray-600 block mb-2">
                  Selected Meters ({selectedScheduleDetail.meters?.length || 0})
                </Label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 bg-gray-50">
                  {selectedScheduleDetail.meters?.length > 0 ? (
                    <div className="space-y-1 p-2">
                      {selectedScheduleDetail.meters.map(meterId => {
                        const meter = meterList.find(m => m.id === meterId);
                        return (
                          <div key={meterId} className="flex items-center justify-between bg-white p-2 border border-gray-100">
                            <div>
                              <div className="text-sm font-medium text-gray-800">
                                {meter?.name || meterId}
                              </div>
                              <div className="text-xs text-gray-500">
                                {meter?.location || 'Unknown location'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No meters selected
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Email/Line Recipients */}
              {(selectedScheduleDetail.emailList?.length > 0 || selectedScheduleDetail.lineList?.length > 0) && (
                <div>
                  <Label className="text-sm font-semibold text-gray-600 block mb-2">
                    {selectedScheduleDetail.emailList?.length > 0 ? 'Selected Email Recipients' : 'Selected Line Recipients'} 
                    ({selectedScheduleDetail.emailList?.length || selectedScheduleDetail.lineList?.length || 0})
                  </Label>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 bg-gray-50">
                    {selectedScheduleDetail.emailList?.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {selectedScheduleDetail.emailList.map(emailId => {
                          const email = emailList.find(e => e.id === emailId);
                          return (
                            <div key={emailId} className="flex items-center justify-between bg-white p-2 border border-gray-100">
                              <div>
                                <div className="text-sm font-medium text-gray-800">
                                  {email?.displayName || emailId}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {email?.email || 'Unknown email'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : selectedScheduleDetail.lineList?.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {selectedScheduleDetail.lineList.map(lineId => {
                          const line = lineList.find(l => l.id === lineId);
                          return (
                            <div key={lineId} className="flex items-center justify-between bg-white p-2 border border-gray-100">
                              <div>
                                <div className="text-sm font-medium text-gray-800">
                                  {line?.displayName || lineId}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Line ID: {line?.line_messaging_id || line?.lineId || 'Unknown line ID'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No recipients selected
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Parameters */}
              <div>
                <Label className="text-sm font-semibold text-gray-600 block mb-2">
                  Selected Parameters ({selectedScheduleDetail.parameters?.length || 0})
                </Label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 bg-gray-50">
                  {selectedScheduleDetail.parameters?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {selectedScheduleDetail.parameters.map(paramId => {
                        const param = parameterList.find(p => p.id === paramId);
                        return (
                          <div key={paramId} className="bg-white p-2 border border-gray-100 text-sm">
                            {param?.label || paramId}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No parameters selected
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowDetailModal(false)}
                className="rounded-none"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
