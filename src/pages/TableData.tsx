import React, { useState, useRef, useEffect, useContext } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../hooks/usePermissions';
import { useReactToPrint } from 'react-to-print';
import { exportTableData } from '../utils/exportUtils';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Download, FileText, Search, Table, Rows, Columns, Printer, ArrowLeft, ArrowRight, BarChart3, Image as ImageIcon, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import useCustomSwal from '@/utils/swal';
import { cn } from '@/lib/utils';
import { TableColumnContext, columnOptions } from '../components/ui/sidebar-menu';
import { useMeterTree } from '@/context/MeterTreeContext';
import { TimeInput24 } from '@/components/ui/time-input-24';
import { apiClient, TableDataRow as ApiTableDataRow, handleApiError } from '@/services/api';
import { TrendChart } from '@/components/charts/TrendChart';
import { DateNavigation, PrintModal } from '@/components/ui';
import { useEmailData } from '@/context/EmailDataContext';
import { useDateNavigation } from '@/hooks/use-date-navigation';
import { handleSendReport as utilHandleSendReport, fetchReportGroups, type SendReportPayload, type ReportData } from '@/utils/reportUtils';

const scrollbarStyles = `
  :root {
    --sidebar-width: 350px;
  }
  
  [data-sidebar-collapsed="true"] {
    --sidebar-width: 0px;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 6px;
    border: 2px solid #f1f5f9;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
  
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: #f1f5f9;
  }

  /* Enhanced horizontal scrollbar for better visibility */
  .horizontal-scroll-only::-webkit-scrollbar:vertical {
    display: none;
  }
  
  .horizontal-scroll-only {
    scrollbar-width: thin;
    scrollbar-color: #94a3b8 #f1f5f9;
  }

  /* Table container with improved scroll behavior */
  .table-container {
    position: relative;
    width: 100%;
    max-width: 100%;
    border-radius: 8px;
    overflow: hidden;
  }

  .table-scroll-wrapper {
    overflow-x: auto;
    overflow-y: auto;
    position: relative;
    scrollbar-width: thin;
    scrollbar-color: #94a3b8 #f1f5f9;
    height: 100%;
  }

  /* Enhanced scrollbar styling */
  .table-scroll-wrapper::-webkit-scrollbar {
    height: 16px;
    width: 16px;
  }

  .table-scroll-wrapper::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .table-scroll-wrapper::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 8px;
    border: 2px solid #f1f5f9;
    box-shadow: inset 0 0 4px rgba(0,0,0,0.1);
  }

  .table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }

  .table-scroll-wrapper::-webkit-scrollbar-corner {
    background: #f1f5f9;
  }

  /* Sticky column enhancement */
  .sticky-time-column {
    position: sticky !important;
    left: 0 !important;
    z-index: 20 !important;
    box-shadow: 2px 0 8px rgba(0,0,0,0.12);
  }

  .sticky-time-header {
    position: sticky !important;
    left: 0 !important;
    z-index: 30 !important;
    box-shadow: 2px 0 8px rgba(0,0,0,0.18);
  }
`;

// ใช้ interface จาก API แทน
interface TableDataRow extends ApiTableDataRow {}

export default function TableData({ selectedMeterName }: { selectedMeterName?: string }) {
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const { showSuccessToast, showErrorToast } = useCustomSwal();
  const { hasPermission } = usePermissions();
  const emailDataCtx = (() => { try { return useEmailData(); } catch { return null as any; } })();

  // Set default language to English on mount
  useEffect(() => {
    setLanguage('EN');
  }, [setLanguage]);

  // Modal export state (must be inside the component)
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  
  // Date navigation hook - initialize with current date range
  const { dateRange, navigateDate, formatDateRange } = useDateNavigation({
    from: dateFrom || new Date(),
    to: dateTo || new Date()
  });
  
  // ตั้งค่า default date/time: from = วันนี้ เวลา 00:00, to = วันนี้ เวลา ณ ปัจจุบัน
  useEffect(() => {
    if (!dateFrom) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      setDateFrom(todayStart);
      setTimeFrom('00:00');
    }
    if (!dateTo) {
      const now = new Date();
      setDateTo(now);
      // Format current time as HH:mm
      const pad = (n) => n.toString().padStart(2, '0');
      const hh = pad(now.getHours());
      const mm = pad(now.getMinutes());
      setTimeTo(`${hh}:${mm}`);
    }
  }, []);
  const [tableOrientation, setTableOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<ApiTableDataRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(350); // State สำหรับขนาด sidebar
  const [itemsPerPage, setItemsPerPage] = useState(39); // Default 39 items
  const [currentPage, setCurrentPage] = useState(1);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { selectedNodeId, rootNodes, onlineNodes, selectedSlaveIds, selectedMeterNames } = useMeterTree();
  
  // ใช้ context สำหรับ selected columns
  const context = useContext(TableColumnContext);
  const contextSelectedColumns = context?.selectedColumns || [];
  
  // ใช้ selectedSlaveIds จาก Context แทน local state

  // โหลดข้อมูลอัตโนมัติเมื่อเลือกมิเตอร์ใหม่
  useEffect(() => {
    if (selectedSlaveIds.length > 0 && dateFrom && dateTo) {
      // โหลดข้อมูลใหม่เมื่อเลือกมิเตอร์ใหม่
      console.log('🔄 Auto-loading data for selected meter(s):', selectedSlaveIds);
      loadTableData();
    }
  }, [selectedSlaveIds]); // ไม่ต้องใส่ dateFrom, dateTo ใน dependency เพราะจะทำให้โหลดซ้ำ

  // ตรวจสอบสถานะ sidebar และปรับ CSS variable
  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebar = document.querySelector('[data-sidebar]');
      const isCollapsed = sidebar?.getAttribute('data-state') === 'collapsed';
      document.documentElement.style.setProperty(
        '--sidebar-width', 
        isCollapsed ? '0px' : '350px'
      );
    };

    // เรียกครั้งแรก
    updateSidebarWidth();

    // ตรวจสอบการเปลี่ยนแปลง
    const observer = new MutationObserver(updateSidebarWidth);
    const sidebar = document.querySelector('[data-sidebar]');
    
    if (sidebar) {
      observer.observe(sidebar, { 
        attributes: true, 
        attributeFilter: ['data-state'] 
      });
    }

    return () => observer.disconnect();
  }, []);

  // ฟังก์ชันกรองข้อมูลตามช่วงเวลา 15 นาทีที่ถูกต้อง
  const filterDataBy15MinuteInterval = (data: ApiTableDataRow[]): ApiTableDataRow[] => {
    if (data.length === 0) return data;
    
    const filteredData: ApiTableDataRow[] = [];
    
    // เรียงข้อมูลตามเวลา
    const sortedData = [...data].sort((a, b) => {
      const timeA = new Date(a.reading_timestamp || a.time);
      const timeB = new Date(b.reading_timestamp || b.time);
      return timeA.getTime() - timeB.getTime();
    });
    
    // หาเวลาเริ่มต้น (ปัดลงไปที่ 15 นาทีที่ใกล้ที่สุด)
    const startTime = new Date(sortedData[0].reading_timestamp || sortedData[0].time);
    const startMinutes = startTime.getMinutes();
    const startHour = startTime.getHours();
    
    // ปัดเวลาเริ่มต้นลงไปที่ 15 นาทีที่ใกล้ที่สุด
    let adjustedStartMinutes = Math.floor(startMinutes / 15) * 15;
    const adjustedStartTime = new Date(startTime);
    adjustedStartTime.setMinutes(adjustedStartMinutes, 0, 0); // ตั้งวินาทีและมิลลิวินาทีเป็น 0
    
    // สร้างช่วงเวลา 15 นาที
    const timeSlots: Date[] = [];
    let currentSlot = new Date(adjustedStartTime);
    
    // สร้างช่วงเวลาทั้งหมดในวันนั้น
    while (currentSlot.getDate() === startTime.getDate()) {
      timeSlots.push(new Date(currentSlot));
      currentSlot.setMinutes(currentSlot.getMinutes() + 15);
    }
    
    // กรองข้อมูลตามช่วงเวลา 15 นาที
    timeSlots.forEach(slotTime => {
      // หาข้อมูลที่ใกล้เคียงกับช่วงเวลานี้ที่สุด
      let closestRow: ApiTableDataRow | null = null;
      let minTimeDiff = Infinity;
      
      sortedData.forEach(row => {
        const rowTime = new Date(row.reading_timestamp || row.time);
        const timeDiff = Math.abs(rowTime.getTime() - slotTime.getTime());
        
        // ถ้าข้อมูลอยู่ในช่วงเวลา 15 นาทีนี้ และใกล้เคียงที่สุด
        if (timeDiff < minTimeDiff && timeDiff <= 7.5 * 60 * 1000) { // 7.5 นาที = ครึ่งหนึ่งของ 15 นาที
          minTimeDiff = timeDiff;
          closestRow = row;
        }
      });
      
      // เพิ่มข้อมูลที่ใกล้เคียงที่สุด
      if (closestRow) {
        filteredData.push(closestRow);
      }
    });
    
    // เรียงข้อมูลตามเวลาอีกครั้ง
    filteredData.sort((a, b) => {
      const timeA = new Date(a.reading_timestamp || a.time);
      const timeB = new Date(b.reading_timestamp || b.time);
      return timeA.getTime() - timeB.getTime();
    });
    
    console.log('⏰ กรองข้อมูล 15 นาที:', {
      'ข้อมูลเดิม': data.length,
      'ข้อมูลหลังกรอง': filteredData.length,
      'ตัวอย่างเวลาที่เลือก': filteredData.slice(0, 10).map(row => 
        formatDateTime(row.reading_timestamp || row.time)
      ),
      'ช่วงเวลาเริ่มต้น': adjustedStartTime.toLocaleTimeString(),
      'จำนวนช่วงเวลา': timeSlots.length
    });
    
    return filteredData;
  };

  // ใช้ selectedSlaveIds จาก Context แทนการคำนวณเอง

  // ฟังก์ชันโหลดข้อมูลจาก API
  const loadTableData = async () => {
    if (!dateFrom || !dateTo) {
      setError('Please select a date range');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = {
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        timeFrom,
        timeTo,
        columns: contextSelectedColumns.length > 0 ? contextSelectedColumns : undefined,
        slaveIds: selectedSlaveIds.length > 0 ? selectedSlaveIds : undefined, // ใช้ slaveIds จาก Context
      };

      // Log ข้อมูลการดึงข้อมูล
      console.log('🚀 === DATA LOADING LOG ===');
      console.log('📅 Date Range:', `${params.dateFrom} ${params.timeFrom} to ${params.dateTo} ${params.timeTo}`);
      console.log('🔢 Slave IDs to fetch:', params.slaveIds);
      console.log('📊 Selected Columns:', params.columns);
      console.log('🔍 Full API Parameters:', params);
      console.log('================================');

      // console.log('🔍 ส่งพารามิเตอร์ไปยัง API:', params);
      
      const response = await apiClient.getTableData(params);
      
      // console.log('📊 ผลลัพธ์จาก API:', response);
      console.log('📊 response.success:', response.success);

      // // Log ผลลัพธ์ที่ได้รับ
      // console.log('📈 === API RESPONSE LOG ===');
      // console.log('✅ Success:', response.success);
      // console.log('🔢 Total rows received:', Array.isArray(response.data) ? response.data.length : 0);
      // if (Array.isArray(response.data) && response.data.length > 0) {
      //   console.log('📋 First row received:');
      //   console.log('   - Time:', response.data[0].time);
      //   console.log('   - Slave ID:', response.data[0].slave_id);
      //   console.log('   - Frequency:', response.data[0].Frequency);
      //   console.log('   - Voltage Avg:', response.data[0]['Volt LN Avg']);
      //   console.log('   - Current Avg:', response.data[0]['Current Avg']);
      //   console.log('   - Power Total:', response.data[0]['Watt Total']);
      // }
      // console.log('📊 Response data type:', typeof response.data);
      // console.log('================================');
      // console.log('📊 response.data:', response.data);
      // console.log('📊 typeof response.data:', typeof response.data);
      // console.log('📊 Array.isArray(response.data):', Array.isArray(response.data));
      
      if (response.success && response.data) {
        let rawData: ApiTableDataRow[] = [];
        
        // ตรวจสอบว่า response.data เป็น array หรือ object
        if (Array.isArray(response.data)) {
          // ถ้าเป็น array แสดงว่าข้อมูลอยู่ในนี้เลย
          // console.log('✅ ข้อมูลที่ได้รับ (array):', response.data);
          // console.log('📈 จำนวนข้อมูล:', response.data.length);
          // console.log('🔍 ตัวอย่างข้อมูลแถวแรก:', response.data[0]);
          // console.log('🗂️ Keys ของข้อมูลแถวแรก:', response.data[0] ? Object.keys(response.data[0]) : 'ไม่มีข้อมูล');
          
          rawData = response.data;
        } else {
          // ถ้าเป็น object ให้ดูว่าข้อมูลอยู่ที่ไหน
          // console.log('✅ ข้อมูลที่ได้รับ (object):', response.data);
          // console.log('📋 Keys ใน response.data:', Object.keys(response.data));
          
          // ลองหาใน properties ต่างๆ - ตรวจสอบว่าเป็น array หรือไม่
          rawData = Array.isArray(response.data.data) ? response.data.data : 
                   Array.isArray(response.data) ? response.data : [];
          // console.log('📈 จำนวนข้อมูล:', rawData.length);
          // console.log('🔍 ตัวอย่างข้อมูลแถวแรก:', rawData[0]);
          // console.log('🗂️ Keys ของข้อมูลแถวแรก:', rawData[0] ? Object.keys(rawData[0]) : 'ไม่มีข้อมูล');
        }
        
        // กรองข้อมูลให้ห่างกัน 15 นาที
        const filteredData = filterDataBy15MinuteInterval(rawData);
        setTableData(filteredData);
        
        setIsLoaded(true);
      } else {
        console.error('❌ Error:', response.message);
        setError(response.message || 'Error loading data');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  
  function findNodeById(nodes, id) {
    // ตรวจสอบว่า nodes เป็น array หรือไม่
    if (!nodes || !Array.isArray(nodes)) {
      console.log('❌ findNodeById: nodes is not available or not an array');
      console.log(`🚀 nodes:`, nodes);
      console.log(`🚀 nodes type:`, typeof nodes);
      console.log(`🚀 nodes is array:`, Array.isArray(nodes));
      return null;
    }
    
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }


  // State for export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailGroups, setEmailGroups] = useState<{ id: number; name: string }[]>([]);
  const [lineGroups, setLineGroups] = useState<{ id: number; name: string }[]>([]);
  const [emailList, setEmailList] = useState<any[]>([]);
  const [lineList, setLineList] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Fetch email and line groups using utility
  useEffect(() => {
    const loadGroups = async () => {
      const groups = await fetchReportGroups();
      setEmailGroups(groups.emailGroups);
      setLineGroups(groups.lineGroups);
      setEmailList(groups.emailList);
      setLineList(groups.lineList);
    };
    
    loadGroups();
  }, []);

  // Modal export handler
  async function handleExport(type: 'pdf' | 'csv' | 'image' | 'text') {
    if (!isLoaded || paginatedData.length === 0) {
      alert('Please Load Data before export');
      return;
    }
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const defaultFileName = `TableData_${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${thaiYear}`;
    const fromDateStr = dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '-';
    const toDateStr = dateTo ? format(dateTo, 'dd/MM/yyyy') : '-';
    // ระบุชื่อมิเตอร์ที่จะส่งออก โดยให้ความสำคัญจาก context ก่อน
    const getMeterNameForExport = () => {
      // 1) ถ้ามีชื่อจาก context ที่ Sidebar ตั้งไว้ ให้ใช้ตัวแรก (TableData เลือกได้ตัวเดียว)
      if (Array.isArray(selectedMeterNames) && selectedMeterNames.length > 0) {
        return selectedMeterNames[0];
      }

      // 2) ใช้ selectedNodeId หาใน tree
      if (selectedNodeId && rootNodes && Array.isArray(rootNodes)) {
        const selectedNode = findNodeById(rootNodes, selectedNodeId);
        if (selectedNode && selectedNode.name) return selectedNode.name;
      }

      // 3) ถ้ายังไม่ได้ ใช้ prop เป็นตัวสุดท้าย (รองรับกรณีเรียกใช้แบบกำหนด prop)
      if (typeof selectedMeterName === 'string' && selectedMeterName.trim() !== '') {
        return selectedMeterName;
      }

      // 4) Fallback
      return 'All Meters';
    };
    const meterNameForExport = getMeterNameForExport();
    console.log('✅ Export meter name resolved:', {
      fromSelectedMeterNames: Array.isArray(selectedMeterNames) ? selectedMeterNames : null,
      fromSelectedNode: selectedNodeId,
      fromProp: selectedMeterName,
      finalName: meterNameForExport
    });
    await exportTableData({
      type,
      fileName: defaultFileName,
      fromDate: fromDateStr,
      toDate: toDateStr,
      timeFrom,
      timeTo,
      meterName: meterNameForExport,
      columns: displayColumns,
      data: filteredData,
      formatDateTime,
      getColumnValue,
    });
  }

  // Send report handler using utility
  async function handleSendReport(payload: SendReportPayload) {
    if (!isLoaded || filteredData.length === 0) {
      showErrorToast('Please load data before sending');
      return;
    }

    setIsSending(true);
    try {
      const meterNameForExport = (() => {
        if (Array.isArray(selectedMeterNames) && selectedMeterNames.length > 0) return selectedMeterNames[0];
        if (selectedNodeId && rootNodes && Array.isArray(rootNodes)) return findNodeById(rootNodes, selectedNodeId)?.name || 'All Meters';
        return 'All Meters';
      })();

      const dateRangeText = `${format(dateFrom!, 'dd MMM yyyy')} ${timeFrom} - ${format(dateTo!, 'dd MMM yyyy')} ${timeTo}`;
      const timeRangeText = `${timeFrom} - ${timeTo}`;

      const reportData: ReportData = {
        filteredData,
        displayColumns,
        meterName: meterNameForExport,
        dateRange: dateRangeText,
        timeRange: timeRangeText,
        formatDateTime,
        getColumnValue
      };

      const groups = {
        emailGroups,
        lineGroups,
        emailList,
        lineList
      };

      await utilHandleSendReport(
        payload,
        reportData,
        groups,
        showSuccessToast,
        showErrorToast,
        emailDataCtx
      );
      
    } catch (error) {
      console.error('Error sending report:', error);
      
      // ตรวจสอบ error type และแสดง message ที่เหมาะสม
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('413') || errorMessage.includes('Payload Too Large') || errorMessage.includes('EmailJSResponseStatus')) {
        showErrorToast('ไฟล์ใหญ่เกินไป กรุณาลดจำนวนข้อมูลหรือเลือก export type อื่น');
      } else if (errorMessage.includes('EmailJS')) {
        showErrorToast('เกิดข้อผิดพลาดในการส่ง email กรุณาลองใหม่อีกครั้ง');
      } else {
        showErrorToast('Failed to send report');
      }
    } finally {
      setIsSending(false);
    }
  }

  function headersToCSV(headers: string[]) {
    return headers.map(h => '"' + h.replace(/"/g, '""') + '"').join(',');
  }

  // ฟังก์ชันสำหรับสลับระหว่าง table และ graph
  const toggleViewMode = () => {
    if (!isLoaded || filteredData.length === 0) {
      showErrorToast('Please load data before showing graph');
      return;
    }
    setViewMode(viewMode === 'table' ? 'graph' : 'table');
  };

  // ฟังก์ชันสำหรับแปลงข้อมูลให้เป็นรูปแบบที่ chart ใช้ได้
  const prepareChartData = () => {
    return filteredData.map(row => {
      const chartPoint: any = {
        name: formatDateTime(row.reading_timestamp || row.time)
      };
      
      // เพิ่มข้อมูลคอลัมน์ที่เลือกไว้
      displayColumns.forEach((col, index) => {
        const value = row[col];
        if (typeof value === 'number') {
          chartPoint[`value${index === 0 ? '' : index + 1}`] = value;
          chartPoint[`${col}`] = value;
        }
      });
      
      return chartPoint;
    });
  };

  // ตัวอย่าง: สมมติ sampleData มี field meterName (หรือใช้ row.time แทนถ้าไม่มี)
  let filteredData = tableData;
  if (selectedNodeId && rootNodes && Array.isArray(rootNodes)) {
    const selectedNode = findNodeById(rootNodes, selectedNodeId);
    if (selectedNode && selectedNode.name) {
      // ถ้า tableData มี meterName ให้ filter ตามชื่อ node
      // filteredData = tableData.filter(row => row.meterName === selectedNode.name);
      // ถ้าไม่มี meterName ให้ filter อื่นหรือแสดงทั้งหมด (ตัวอย่างนี้แสดงทั้งหมด)
      filteredData = tableData;
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // ตั้งค่า default date/time เป็นวันปัจจุบัน 00:00 ถึง วันปัจจุบัน เวลาปัจจุบัน
  useEffect(() => {
    if (!dateFrom) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      setDateFrom(startOfDay);
      setTimeFrom('00:00');
    }
    if (!dateTo) {
      const now = new Date();
      setDateTo(now);
      setTimeTo(now.toTimeString().slice(0,5));
    }
  }, []);

  // Reset isLoaded เมื่อมีการเปลี่ยน filter
  useEffect(() => {
    setIsLoaded(false);
  }, [dateFrom, dateTo, timeFrom, timeTo]);

  // Debug: แสดงข้อมูลเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    // console.log('🔍 Debug - filteredData.length:', filteredData.length);
    // console.log('🔍 Debug - tableData.length:', tableData.length);
    // console.log('🔍 Debug - isLoaded:', isLoaded);
    if (tableData.length > 0) {
      // console.log('🔍 Debug - ตัวอย่างข้อมูลแถวแรก:', tableData[0]);
      // console.log('🔍 Debug - Keys ในข้อมูล:', Object.keys(tableData[0]));
    }
  }, [tableData, filteredData, isLoaded]);

  // ฟังก์ชันสำหรับจัดรูปแบบวันเวลา (แบบสั้น)
  const formatDateTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString);
    
    // จัดรูปแบบวันที่: HH:MM DD Month YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes} ${day} ${month} ${year}`;
  };

  // ฟังก์ชันสำหรับแสดงค่าในแต่ละคอลัมน์
  const getColumnValue = (row: ApiTableDataRow, columnName: string): string => {
    // ใช้ชื่อคอลัมน์ UI โดยตรง เพราะ backend ได้ mapping ให้แล้ว
    const value = row[columnName];
    
    // Debug: แสดงข้อมูลที่ค้นหา (แสดงเฉพาะ 1 คอลัมน์แรกเพื่อไม่ให้ log เยอะเกินไป)
    if (tableData.length > 0 && columnName === 'Frequency') {
      // console.log(`🔍 หาค่าคอลัมน์ UI "${columnName}" ในแถว:`, row);
      // console.log(`📋 Keys ที่มีในข้อมูล:`, Object.keys(row));
      // console.log(`💾 ค่าที่ได้จาก "${columnName}":`, value);
    }
    
    if (value === undefined || value === null) return '-';
    
    // แปลงค่าตามประเภทคอลัมน์
    if (typeof value === 'number') {
      // คอลัมน์ที่ไม่มีทศนิยม (Demand และ kWh/kVarh)
      if (columnName === 'Demand W' || columnName === 'Demand Var' || columnName === 'Demand VA' ||
          columnName === 'Import kWh' || columnName === 'Export kWh' || 
          columnName === 'Import kVarh' || columnName === 'Export kVarh') {
        return Math.round(value).toString();
      }
      
      // คอลัมน์อื่นๆ แสดงทศนิยม 2 หลัก
      return value.toFixed(2);
    }
    
    return value.toString();
  };

  // กำหนดคอลัมน์ที่ต้องการแสดง - แสดงทั้งหมดเสมอ
  const allColumns = [
    'Frequency',
    'Volt AN', 
    'Volt BN',
    'Volt CN',
    'Volt LN Avg',
    'Volt AB',
    'Volt BC', 
    'Volt CA',
    'Volt LL Avg',
    'Current A',
    'Current B',
    'Current C', 
    'Current Avg',
    'Current IN',
    'Watt A',
    'Watt B',
    'Watt C',
    'Watt Total',
    'Var A',
    'Var B',
    'Var C',
    'Var total',
    'VA A',
    'VA B',
    'VA C',
    'VA Total',
    'PF A',
    'PF B',
    'PF C',
    'PF Total',
    'Demand W',
    'Demand Var',
    'Demand VA',
    'Import kWh',
    'Export kWh',
    'Import kVarh',
    'Export kVarh',
    'THDV',
    'THDI'
  ];

  // ใช้คอลัมน์ที่เลือกจาก sidebar เสมอ (ไม่ fallback ไป allColumns)
  const displayColumns = contextSelectedColumns;

  // Debug: แสดงข้อมูลเพื่อตรวจสอบ
  // console.log('🎯 TABLE DATA DEBUG:');
  // console.log('   - contextSelectedColumns:', contextSelectedColumns);
  // console.log('   - contextSelectedColumns.length:', contextSelectedColumns.length);
  // console.log('   - displayColumns:', displayColumns);
  // console.log('   - displayColumns.length:', displayColumns.length);
  // console.log('   - Logic: contextSelectedColumns.length > 0 ?', contextSelectedColumns.length > 0);
  // console.log('   - Using:', contextSelectedColumns.length > 0 ? 'contextSelectedColumns' : 'allColumns');

  // // Handle scroll shadows
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const container = tableContainerRef.current;
    
    if (container && element) {
      const scrollLeft = element.scrollLeft;
      const scrollWidth = element.scrollWidth;
      const clientWidth = element.clientWidth;
      
      // Add 'scrolled' class when scrolled right
      if (scrollLeft > 10) {
        container.classList.add('scrolled');
      } else {
        container.classList.remove('scrolled');
      }
      
      // Add 'scrolled-end' class when near the end
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        container.classList.add('scrolled-end');
      } else {
        container.classList.remove('scrolled-end');
      }
    }
  };

  return (
    <PageLayout>
      <style>{scrollbarStyles}</style>
      <div className="pt-0 pb-6 animate-fade-in ml-0 sm:ml-2 md:ml-4 lg:ml-8">
        {/* Header */}
        <div className="flex justify-center -mt-2 px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <Card className="bg-transparent shadow-none border-none w-full max-w-full rounded-t-xl rounded-b-none">
            <CardContent className="p-2 bg-transparent shadow-none">
              <div className="flex flex-wrap items-center gap-2 bg-white rounded-t-xl rounded-b-none px-2 py-1 justify-center text-xs">
                {/* Table Orientation Toggle */}
                <div className="flex items-center gap-0.5 mr-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={(tableOrientation === 'horizontal' ? 'bg-primary text-white ' : 'bg-secondary text-black ') + 'h-7 px-2 text-xs rounded-none'}
                    onClick={() => setTableOrientation(tableOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                    aria-label="Toggle Table Orientation"
                  >
                    {tableOrientation === 'horizontal' ? (
                      <>
                        {language === 'TH' ? 'แนวนอน' : 'Hor'}
                      </>
                    ) : (
                      <>
                        {language === 'TH' ? 'แนวตั้ง' : 'Ver'}
                      </>
                    )}
                  </Button>
                </div>
                
                {/* From - To group in one flex row */}
                <div className="flex items-center gap-2">
                  {/* From */}
                  <span className="text-xs font-bold text-black">{language === 'TH' ? 'จาก' : 'From'}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                            "h-7 px-1 text-xs rounded bg-white border-none shadow-none ring-0 focus:ring-0 hover:bg-white hover:text-black",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        {dateFrom ? format(dateFrom, "dd MMMM yyyy") : "--/--/----"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <TimeInput24
                    value={timeFrom}
                    onChange={setTimeFrom}
                    className="h-7 w-10 text-xs rounded-none border-gray-200 px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  {/* To */}
                  <span className="text-xs font-bold text-black ml-0">{language === 'TH' ? 'ถึง' : 'To'}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                            "h-7 px-1 text-xs rounded bg-white border-none shadow-none ring-0 focus:ring-0 hover:bg-white hover:text-black",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        {dateTo ? format(dateTo, "dd MMMM yyyy") : "--/--/----"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <TimeInput24
                    value={timeTo}
                    onChange={setTimeTo}
                    className="h-7 w-10 text-xs rounded-none border-gray-200 px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                
                {/* Load, Export, Show Graph Buttons */}
                <Button
                  className={
                    cn(
                      "h-7 px-2 text-xs rounded-none shadow flex items-center",
                      isLoading
                        ? "bg-gray-300 text-gray-400 cursor-default"
                        : "bg-primary hover:bg-primary/90 focus:bg-primary active:bg-primary text-white"
                    )
                  }
                  disabled={isLoading}
                  onClick={loadTableData}
                >
                  <Search className="w-4 h-4 mr-0" />
                  {isLoading ? (language === 'TH' ? 'กำลังโหลด...' : 'Loading...') : (language === 'TH' ? 'โหลด' : 'Load')}
                </Button>
                
                {/* Date Navigation */}
                <DateNavigation 
                  onNavigate={(direction) => {
                    navigateDate(direction);
                    // Update the local date states to match the navigation
                    const { from, to } = dateRange;
                    setDateFrom(from);
                    setDateTo(to);
                    setTimeFrom(from.toTimeString().slice(0, 5));
                    setTimeTo(to.toTimeString().slice(0, 5));
                  }}
                  className="ml-1"
                />
                {/* Show Print button only if user has report permission */}
                {hasPermission('Table Data', 'report') && (
                  <Button
                    className="h-7 px-2 text-xs rounded-none bg-muted hover:bg-primary shadow flex items-center ml-1"
                    variant="outline"
                    onClick={() => setShowExportModal(true)}
                    disabled={!isLoaded || paginatedData.length === 0 || isLoading}
                  >
                    <Printer className="w-4 h-4 mr-0" />
                  </Button>
                )}
                <PrintModal
                  isOpen={showExportModal}
                  onClose={() => setShowExportModal(false)}
                  onExport={handleExport}
                  onSendReport={hasPermission('Table Data', 'report') ? handleSendReport : undefined}
                  isLoaded={isLoaded}
                  hasData={paginatedData.length > 0}
                  isLoading={isLoading}
                  isSending={isSending}
                  emailGroups={emailGroups}
                  lineGroups={lineGroups}
                  emailList={emailList}
                  lineList={lineList}
                />
                <Button 
                  className="h-7 px-2 text-xs rounded-none bg-secondary hover:bg-secondary/80 shadow flex items-center ml-1" 
                  variant="outline"
                  onClick={toggleViewMode}
                  disabled={!isLoaded || filteredData.length === 0 || isLoading}
                >
                  <BarChart3 className="w-4 h-4 mr-0" />
                  {viewMode === 'table' ? (language === 'TH' ? 'แสดงกราฟ' : 'Show Graph') : (language === 'TH' ? 'แสดงตาราง' : 'Show Table')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* แสดงข้อมูลมิเตอร์ที่เลือก */}
        {selectedNodeId && rootNodes && Array.isArray(rootNodes) && (
          <div className="px-4 sm:px-6 lg:px-8 mb-4">
            <Card className="shadow-sm border-blue-200">
              <CardContent className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-blue-800">
                        {language === 'TH' ? 'มิเตอร์ที่เลือก:' : 'Selected Meter:'} {(() => {
                          const selectedMeter = findNodeById(rootNodes, selectedNodeId);
                          return selectedMeter?.name || 'N/A';
                        })()}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        {(() => {
                          const selectedMeter = findNodeById(rootNodes, selectedNodeId);
                          if (selectedMeter) {
                            return (
                              <>
                                <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    {language === 'TH' ? 'Slave ID' : 'Slave ID'}
                                  </div>
                                  <div className="text-sm font-semibold text-blue-900 mt-1">
                                    {selectedMeter.slave_id || 'N/A'}
                                  </div>
                                </div>
                                
                                <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    {language === 'TH' ? 'ประเภท' : 'Class'}
                                  </div>
                                  <div className="text-sm font-semibold text-blue-900 mt-1">
                                    {selectedMeter.meter_class || 'N/A'}
                                  </div>
                                </div>
                                
                                <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    {language === 'TH' ? 'ชนิด' : 'Type'}
                                  </div>
                                  <div className="text-sm font-semibold text-blue-900 mt-1">
                                    {selectedMeter.type || 'N/A'}
                                  </div>
                                </div>
                                
                                <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    {language === 'TH' ? 'ตำแหน่ง' : 'Location'}
                                  </div>
                                  <div className="text-sm font-semibold text-blue-900 mt-1">
                                    {selectedMeter.location || 'N/A'}
                                  </div>
                                </div>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      {(() => {
                        const selectedMeter = findNodeById(rootNodes, selectedNodeId);
                        if (selectedMeter && (selectedMeter.building || selectedMeter.floor)) {
                          return (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              {selectedMeter.building && (
                                <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    {language === 'TH' ? 'อาคาร' : 'Building'}
                                  </div>
                                  <div className="text-sm font-semibold text-blue-900 mt-1">
                                    {selectedMeter.building}
                                  </div>
                                </div>
                              )}
                              
                              {selectedMeter.floor && (
                                <div className="bg-white/70 p-2 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    {language === 'TH' ? 'ชั้น' : 'Floor'}
                                  </div>
                                  <div className="text-sm font-semibold text-blue-900 mt-1">
                                    {selectedMeter.floor}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 bg-white/70 px-3 py-2 rounded-lg border border-blue-100">
                    <div className="text-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1 animate-pulse"></div>
                      {language === 'TH' ? 'สถานะ: ออนไลน์' : 'Status: Online'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Table - ปรับให้ชิดกับส่วน filter */}
        <div className="px-4 sm:px-6 lg:px-8">
          <Card className="shadow-card rounded-none -mt-2 w-full">
            <CardContent className="p-0">
              {error && (
                <div className="p-4 text-red-600 bg-red-50 border-b">
                  {error}
                </div>
              )}
             
              <div
                className="w-full max-w-[calc(100vw-var(--sidebar-width))]"
                style={{
                  height: paginatedData.length > 0 && paginatedData.length < 4
                    ? `${Math.max(200, paginatedData.length * 40 + 100)}px`
                    : 'calc(100vh - 130px)'
                }}
              >
                {viewMode === 'graph' ? (
                  // Graph View
                  <div className="h-full p-4">
                    {displayColumns.length === 0 ? (
                      <div className="text-center p-4 text-gray-500">
                        กรุณาเลือกคอลัมน์ที่ต้องการแสดงในกราฟจาก sidebar
                      </div>
                    ) : (
                      <div className="h-full">
                        <div className="bg-white rounded-lg shadow p-4 h-full">
                          <div style={{ height: 'calc(100% - 20px)' }}>
                            <TrendChart
                              data={prepareChartData()}
                              height={500}
                              color={`hsl(210, 70%, 50%)`}
                              showSecondLine={displayColumns.length > 1}
                              color2={`hsl(120, 70%, 50%)`}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Table View (existing code)
                  <>
                {tableOrientation === 'horizontal' ? (
                  <div className="h-full border border-gray-200 relative">
                    {/* Table container with fixed height and horizontal scroll */}
                    <div 
                      ref={tableScrollRef}
                      className="h-full overflow-x-auto overflow-y-auto custom-scrollbar table-scroll-wrapper" 
                      onScroll={handleScroll}
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
                    >
                      <table className="text-[10px] border-collapse" style={{ width: 'max-content', minWidth: '100%' }}>
                      <thead className="sticky top-0 z-40 text-[10px]">
                        <tr>
                          <th 
                            className="text-left p-1 font-semibold bg-cyan-500 text-white border-r border-white"
                            style={{ 
                              position: 'sticky', 
                              left: 0, 
                              top: 0,
                              zIndex: 100,
                              backgroundColor: '#06b6d4',
                              boxShadow: '2px 0 8px rgba(0,0,0,0.18)',
                              width: '130px',
                              minWidth: '130px',
                              maxWidth: '130px'
                            }}
                          >
                            {language === 'TH' ? 'เวลา' : 'Time'}
                          </th>
                          {displayColumns.map((col) => (
                            <th 
                              key={col} 
                              className="text-center p-1 font-semibold whitespace-nowrap bg-cyan-500 text-white border-r border-white last:border-r-0"
                              style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.length === 0 ? (
                          <tr>
                            <td colSpan={displayColumns.length + 1} className="text-center p-4 text-gray-500 bg-white text-xs">
                              {isLoaded ? 'No data found in the selected time range' : 'Please Load to get data'}
                            </td>
                          </tr>
                        ) : (
                          paginatedData.map((row, index) => (
                            <tr
                              key={startIndex + index}
                              className={`border-t border-gray-200 hover:bg-cyan-50 transition-colors ${
                                (startIndex + index) % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                            >
                              <td
                                className="p-1 text-foreground font-medium border-r border-gray-200 text-[10px]"
                                style={{
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 30,
                                  backgroundColor: (startIndex + index) % 2 === 0 ? 'white' : '#f9fafb',
                                  boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
                                  width: '130px',
                                  minWidth: '130px',
                                  maxWidth: '130px'
                                }}
                              >
                                {formatDateTime(row.reading_timestamp || row.time)}
                              </td>
                              {displayColumns.map((col) => (
                                <td
                                  key={col}
                                  className="text-center p-1 text-foreground whitespace-nowrap border-r border-gray-200 last:border-r-0 text-[10px]"
                                  style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
                                >
                                  {getColumnValue(row, col)}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-full border border-gray-200 custom-scrollbar overflow-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}>
                    <table className="text-[10px] border-collapse" style={{ width: 'max-content', minWidth: '100%' }}>
                      <thead className="sticky top-0 z-10 text-[10px]">
                        <tr>
                          <th className="text-left p-1 font-semibold bg-cyan-500 text-white border-r border-white" style={{ width: '130px', minWidth: '130px' }}>Field</th>
                          {filteredData.map((_, index) => (
                            <th key={index} className="text-center p-1 font-semibold bg-cyan-500 text-white border-r border-white last:border-r-0" style={{ width: '70px', minWidth: '70px' }}>{index + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.length === 0 ? (
                          <tr>
                            <td colSpan={100} className="text-center p-4 text-gray-500 bg-white text-xs">
                              {isLoaded ? 'ไม่พบข้อมูลในช่วงเวลาที่เลือก' : 'กรุณากดปุ่ม Load เพื่อโหลดข้อมูล'}
                            </td>
                          </tr>
                        ) : (
                          <>
                            {/* Time row always on top */}
                            <tr className="border-t border-gray-200 hover:bg-cyan-50 transition-colors bg-white">
                              <td className="p-1 text-foreground font-medium bg-gray-100 border-r border-gray-200 text-[10px]" style={{ width: '130px', minWidth: '130px' }}>{language === 'TH' ? 'เวลา' : 'Time'}</td>
                              {paginatedData.map((row, index) => (
                                <td key={startIndex + index} className="text-center p-1 text-foreground border-r border-gray-200 last:border-r-0 text-[10px]" style={{ width: '70px', minWidth: '70px' }}>
                                  {formatDateTime(row.reading_timestamp || row.time)}
                                </td>
                              ))}
                            </tr>
                            {/* Render only selected columns as rows */}
                            {displayColumns.map((col, idx) => (
                              <tr key={col} className={`border-t border-gray-200 hover:bg-cyan-50 transition-colors ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                <td className="p-1 text-foreground font-medium bg-gray-100 border-r border-gray-200 text-[10px]" style={{ width: '130px', minWidth: '130px' }}>{col}</td>
                                {paginatedData.map((row, index) => (
                                  <td key={startIndex + index} className="text-center p-1 text-foreground border-r border-gray-200 last:border-r-0 text-[10px]" style={{ width: '70px', minWidth: '70px' }}>
                                    {getColumnValue(row, col)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                </>
              )}
              </div>
              {/* Pagination Controls */}
              {isLoaded && filteredData.length > 0 && viewMode === 'table' && (
                <div className="flex justify-center items-center py-2 gap-2">
                  <Button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-7 px-2 text-xs rounded-none"
                  >
                    First
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2 text-xs rounded-none"
                  >
                    Prev
                  </Button>
                  <span className="text-xs px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2 text-xs rounded-none"
                  >
                    Next
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2 text-xs rounded-none"
                  >
                    Last
                  </Button>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs">Items per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                      className="border rounded text-xs h-7"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="39">39</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}