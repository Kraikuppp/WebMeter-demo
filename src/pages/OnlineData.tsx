import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
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
import { CalendarIcon, Download, FileText, Search, Table, Rows, Columns, Printer, ArrowLeft, ArrowRight, BarChart3, AlarmClock, Image as ImageIcon } from 'lucide-react';
import { PrintModal } from '@/components/ui';


import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useMeterTree } from '@/context/MeterTreeContext';
import { TableColumnContext } from '@/components/ui/sidebar-menu';
import { useContext } from 'react';
import { apiClient } from '@/services/api';
import { handleSendReport as utilHandleSendReport, fetchReportGroups, type SendReportPayload, type ReportData } from '@/utils/reportUtils';
import useCustomSwal from '@/utils/swal';
import { useEmailData } from '@/context/EmailDataContext';

interface TableDataRow {
  time: string;
  wattTotal: number;
  varTotal: number;
  powerFactor: number;
  vaTotal: number;
  frequency: number;
  voltAN: number;
  currentA: number;
}

function getCurrentDateTimeString() {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  return `${date} ${time}`;
}


export default function OnlineData() {
  const { language } = useLanguage();
  const { permissions, isAdmin } = usePermissions();
  const { selectedSlaveIds, selectedMeterNames } = useMeterTree();
  const { selectedColumns } = useContext(TableColumnContext);
  const { showSuccessToast, showErrorToast } = useCustomSwal();
  const [tableOrientation, setTableOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [isAlarmPanelOpen, setIsAlarmPanelOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTimeString());
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  // Modal export state (must be inside component)
  const [showExportModal, setShowExportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [emailGroups, setEmailGroups] = useState<{ id: number; name: string }[]>([]);
  const [lineGroups, setLineGroups] = useState<{ id: number; name: string }[]>([]);
  const [emailList, setEmailList] = useState<any[]>([]);
  const [lineList, setLineList] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      const pad = (n: number) => n.toString().padStart(2, '0');
      const hh = pad(now.getHours());
      const mm = pad(now.getMinutes());
      setTimeTo(`${hh}:${mm}`);
    }
  }, []);

  // ใช้ EmailDataContext สำหรับ LINE data
  const emailDataCtx = useEmailData();

  // Fetch email and line groups using EmailDataContext
  useEffect(() => {
    const loadGroups = async () => {
      try {
        // ใช้ EmailDataContext แทน fetchReportGroups เพื่อให้ได้ข้อมูลที่ถูกต้อง
        if (emailDataCtx) {
          setEmailGroups(emailDataCtx.emailGroups);
          setLineGroups(emailDataCtx.lineGroups);
          setEmailList(emailDataCtx.emailList);
          setLineList(emailDataCtx.lineList);
          
          console.log('📧 OnlineData using EmailDataContext:', {
            emailGroups: emailDataCtx.emailGroups.length,
            lineGroups: emailDataCtx.lineGroups.length,
            emailList: emailDataCtx.emailList.length,
            lineList: emailDataCtx.lineList.length
          });
        } else {
          // Fallback to fetchReportGroups if EmailDataContext is not available
          const groups = await fetchReportGroups();
          setEmailGroups(groups.emailGroups);
          setLineGroups(groups.lineGroups);
          setEmailList(groups.emailList);
          setLineList(groups.lineList);
          
          console.log('📧 OnlineData fallback to fetchReportGroups:', {
            emailGroups: groups.emailGroups.length,
            lineGroups: groups.lineGroups.length,
            emailList: groups.emailList.length,
            lineList: groups.lineList.length
          });
        }
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    };
    
    loadGroups();
  }, [emailDataCtx]);


  // Modal export handler
  async function handleExport(type: 'pdf' | 'csv' | 'image' | 'text') {
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const defaultFileName = `OnlineData_${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${thaiYear}`;
    // Language-aware labels
    const labels = {
      th: {
        reportTitle: 'WebMeter - รายงานข้อมูลออนไลน์',
        generated: 'สร้างเมื่อ',
        captured: 'ข้อมูล ณ เวลา',
        device: 'ชื่ออุปกรณ์',
        f1: 'ชั้น 1',
        f2: 'ชั้น 2',
        f3: 'ชั้น 3',
      },
      en: {
        reportTitle: 'WebMeter - Online Data Report',
        generated: 'Generated',
        captured: 'Data captured at',
        device: 'Device Name',
        f1: 'Floor 1',
        f2: 'Floor 2',
        f3: 'Floor 3',
      }
    };
    const t = language === 'TH' ? labels.th : labels.en;
    if (type === 'pdf') {
      try {
        const doc = new jsPDF('landscape', 'mm', 'a4');
        doc.setFontSize(16);
        doc.text(t.reportTitle, 14, 20);
        doc.setFontSize(10);
        doc.text(`${t.generated}: ${now.toLocaleDateString(language === 'TH' ? 'th-TH' : 'en-GB')} ${now.toLocaleTimeString(language === 'TH' ? 'th-TH' : 'en-GB')}`, 14, 30);
        doc.text(`${t.captured}: ${currentDateTime}`, 14, 35);
        const headers = [t.device, ...selectedSlaveIds.map((slaveId, index) => selectedMeterNames[index] || `Meter ${slaveId}`)];
        const tableData = realtimeRows.map(row => [
          row.name, 
          ...selectedSlaveIds.map(slaveId => row[`meter_${slaveId}`] || '-')
        ]);
        autoTable(doc, {
          head: [headers],
          body: tableData,
          startY: 45,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [6, 182, 212], textColor: 255, fontSize: 9, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 } },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { top: 45, right: 14, bottom: 20, left: 14 },
          theme: 'grid',
        });
        doc.save(`${defaultFileName}.pdf`);
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการสร้าง PDF');
      }
    } else if (type === 'csv') {
      let csv = `${t.device},${selectedSlaveIds.map((slaveId, index) => selectedMeterNames[index] || `Meter ${slaveId}`).join(',')}\n`;
      realtimeRows.forEach(row => {
        csv += `"${row.name}",${selectedSlaveIds.map(slaveId => `"${row[`meter_${slaveId}`] || '-'}"`).join(',')}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${defaultFileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (type === 'image') {
      try {
        const table = document.querySelector('table');
        if (!table) return;
        const canvas = await html2canvas(table as HTMLElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `${defaultFileName}.png`;
        a.click();
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการสร้างรูปภาพ');
      }
    } else if (type === 'text') {
      try {
        // Build text table
        const header = [t.device, ...selectedSlaveIds.map((slaveId, index) => selectedMeterNames[index] || `Meter ${slaveId}`)];
        const rows = realtimeRows.map(row => [
          row.name, 
          ...selectedSlaveIds.map(slaveId => row[`meter_${slaveId}`] || '-')
        ]);
        
        // Fixed-width simple formatting
        const colWidths = header.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] ?? '').toString().length)));
        const fmt = (val: string, i: number) => (val ?? '').toString().padEnd(colWidths[i], ' ');
        const headerLine = header.map(fmt).join(' | ');
        const sepLine = colWidths.map(w => '-'.repeat(w)).join('-+-');
        const bodyLines = rows.map(r => r.map(fmt).join(' | '));
        const textContent = [
          t.reportTitle,
          `${t.generated}: ${now.toLocaleDateString(language === 'TH' ? 'th-TH' : 'en-GB')} ${now.toLocaleTimeString(language === 'TH' ? 'th-TH' : 'en-GB')}`,
          `${t.captured}: ${currentDateTime}`,
          '',
          headerLine,
          sepLine,
          ...bodyLines
        ].join('\n');
        
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${defaultFileName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการสร้างไฟล์ข้อความ');
      }
    }
  }

  // Helper functions for report data formatting
  const formatDateTime = (dateTime: string): string => {
    const date = new Date(dateTime);
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

  const getColumnValue = (row: any, columnName: string): string => {
    const value = row[columnName];
    if (value === undefined || value === null) return '-';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value.toString();
  };

  // Send report handler using utility
  async function handleSendReport(payload: SendReportPayload) {
    if (realtimeRows.length === 0) {
      showErrorToast('Please load data before sending');
      return;
    }

    setIsSending(true);
    try {
      const meterNameForExport = selectedMeterNames.length > 0 
        ? selectedMeterNames.join(', ') 
        : 'Online Data';

      // Create custom formatters that match download format
      const customFormatDateTime = (dateTime: string): string => {
        return currentDateTime; // Use current datetime for online data
      };

      const customGetColumnValue = (row: any, columnName: string): string => {
        // Now we store data using meter names as keys, so we can access directly
        const value = row[columnName];
        if (value === undefined || value === null || value === '-') return '-';
        return value.toString();
      };

      // For OnlineData, we need to create data in the same format as TableData
      // But instead of time-based rows, we have parameter-based rows
      
      // Create one row per parameter, with meter values as columns
      const convertedData = realtimeRows.map(row => {
        const dataRow: any = {
          time: currentDateTime,
          reading_timestamp: currentDateTime,
          parameterName: row.name // Store parameter name for identification
        };
        
        // Add each meter's value as a separate column using meter names
        selectedSlaveIds.forEach((slaveId, index) => {
          const meterKey = `meter_${slaveId}`;
          const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
          const originalValue = row[meterKey];
          
          // Store the value using meter name as key (like TableData format)
          dataRow[meterName] = originalValue || '-';
        });
        
        return dataRow;
      });

      // Create display columns that represent meter names (like TableData format)
      const meterColumns = selectedSlaveIds.map((slaveId, index) => 
        selectedMeterNames[index] || `Meter ${slaveId}`
      );

      const reportData: ReportData = {
        filteredData: convertedData,
        displayColumns: meterColumns, // Use meter names as columns
        meterName: meterNameForExport,
        dateRange: currentDateTime,
        timeRange: currentDateTime,
        reportTitle: 'WebMeter Online Data Report', // Add report title for LINE
        formatDateTime: customFormatDateTime,
        getColumnValue: customGetColumnValue
      };

      const groups = {
        emailGroups,
        lineGroups,
        emailList,
        lineList
      };

      // Pass emailDataCtx to handleSendReport for LINE functionality
      await utilHandleSendReport(
        payload,
        reportData,
        groups,
        showSuccessToast,
        showErrorToast,
        emailDataCtx // Pass EmailDataContext for LINE functionality
      );
      
    } catch (error) {
      console.error('Error sending report:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showErrorToast(`Failed to send report: ${errorMessage}`);
    } finally {
      setIsSending(false);
    }
  }

  // สร้างโครงสร้างข้อมูล realtime ตามค่าที่เลือกใน sidebar
  const generateRealtimeData = () => {
    // แปลงชื่อคอลัมน์เป็นภาษาไทย
    const columnNameMap: { [key: string]: string } = {
      'Frequency': language === 'TH' ? 'ความถี่' : 'Frequency',
      'Volt AN': language === 'TH' ? 'โวลต์ AN' : 'Volt AN',
      'Volt BN': language === 'TH' ? 'โวลต์ BN' : 'Volt BN',
      'Volt CN': language === 'TH' ? 'โวลต์ CN' : 'Volt CN',
      'Volt LN Avg': language === 'TH' ? 'โวลต์เฉลี่ยสาย-นิวทรัล' : 'Volt LN Avg',
      'Volt AB': language === 'TH' ? 'โวลต์ AB' : 'Volt AB',
      'Volt BC': language === 'TH' ? 'โวลต์ BC' : 'Volt BC',
      'Volt CA': language === 'TH' ? 'โวลต์ CA' : 'Volt CA',
      'Volt LL Avg': language === 'TH' ? 'โวลต์เฉลี่ยสาย-สาย' : 'Volt LL Avg',
      'Current A': language === 'TH' ? 'กระแส A' : 'Current A',
      'Current B': language === 'TH' ? 'กระแส B' : 'Current B',
      'Current C': language === 'TH' ? 'กระแส C' : 'Current C',
      'Current Avg': language === 'TH' ? 'กระแสเฉลี่ย' : 'Current Avg',
      'Current IN': language === 'TH' ? 'กระแส N' : 'Current IN',
      'Watt A': language === 'TH' ? 'วัตต์ A' : 'Watt A',
      'Watt B': language === 'TH' ? 'วัตต์ B' : 'Watt B',
      'Watt C': language === 'TH' ? 'วัตต์ C' : 'Watt C',
      'Watt Total': language === 'TH' ? 'วัตต์รวม' : 'Watt Total',
      'Var A': language === 'TH' ? 'VAR A' : 'Var A',
      'Var B': language === 'TH' ? 'VAR B' : 'Var B',
      'Var C': language === 'TH' ? 'VAR C' : 'Var C',
      'Var total': language === 'TH' ? 'VAR รวม' : 'Var total',
      'VA A': language === 'TH' ? 'VA A' : 'VA A',
      'VA B': language === 'TH' ? 'VA B' : 'VA B',
      'VA C': language === 'TH' ? 'VA C' : 'VA C',
      'VA Total': language === 'TH' ? 'VA รวม' : 'VA Total',
      'PF A': language === 'TH' ? 'PF A' : 'PF A',
      'PF B': language === 'TH' ? 'PF B' : 'PF B',
      'PF C': language === 'TH' ? 'PF C' : 'PF C',
      'PF Total': language === 'TH' ? 'PF รวม' : 'PF Total',
      'Demand W': language === 'TH' ? 'Demand W' : 'Demand W',
      'Demand Var': language === 'TH' ? 'Demand Var' : 'Demand Var',
      'Demand VA': language === 'TH' ? 'Demand VA' : 'Demand VA',
      'Import kWh': language === 'TH' ? 'Import kWh' : 'Import kWh',
      'Export kWh': language === 'TH' ? 'Export kWh' : 'Export kWh',
      'Import kVarh': language === 'TH' ? 'Import kVarh' : 'Import kVarh',
      'Export kVarh': language === 'TH' ? 'Export kVarh' : 'Export kVarh',
      'THDV': language === 'TH' ? 'THDV' : 'THDV',
      'THDI': language === 'TH' ? 'THDI' : 'THDI',
    };

    // สร้างแถวตามค่าที่เลือกใน sidebar
    return selectedColumns.map(columnName => {
      const row: any = { 
        name: columnNameMap[columnName] || columnName,
        originalName: columnName // เก็บชื่อเดิมไว้สำหรับ API
      };
      
      // เพิ่มข้อมูลสำหรับแต่ละมิเตอร์ที่เลือก
      selectedSlaveIds.forEach((slaveId) => {
        const meterKey = `meter_${slaveId}`;
        
        // ใช้ข้อมูลจริงจาก API หากมี
        if (realtimeData && realtimeData[slaveId]) {
          const meterData = realtimeData[slaveId];
          const value = meterData[columnName];
          
          // Debug: แสดงข้อมูลที่ได้จาก API
          console.log(`🔍 Debug - Slave ${slaveId}, Column ${columnName}:`, {
            value,
            type: typeof value,
            meterData: meterData
          });
          
          if (value !== null && value !== undefined) {
            // แปลงค่าเป็นหน่วยที่เหมาะสม
            row[meterKey] = formatValue(columnName, value);
          } else {
            row[meterKey] = '-';
          }
        } else {
          // หากไม่มีข้อมูลจริง ให้แสดง '-'
          row[meterKey] = '-';
        }
      });
      
      return row;
    });
  };
  
  // ฟังก์ชันช่วยจัดรูปแบบค่าและหน่วย
  const formatValue = (columnName: string, value: any): string => {
    // ตรวจสอบว่า value เป็นตัวเลขหรือไม่
    if (value === null || value === undefined) return '-';
    
    // แปลงเป็นตัวเลข
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    
    // ตรวจสอบว่าแปลงเป็นตัวเลขได้หรือไม่
    if (isNaN(numValue)) {
      console.warn(`⚠️ Invalid numeric value for ${columnName}:`, value);
      return '-';
    }
    
    // จัดรูปแบบตามประเภทของค่า
    if (columnName.includes('Volt')) {
      return `${numValue.toFixed(1)} V`;
    } else if (columnName.includes('Current')) {
      return `${numValue.toFixed(2)} A`;
    } else if (columnName.includes('Watt')) {
      return `${numValue.toFixed(2)} kW`;
    } else if (columnName.includes('Var')) {
      return `${numValue.toFixed(2)} kVAR`;
    } else if (columnName.includes('VA')) {
      return `${numValue.toFixed(2)} kVA`;
    } else if (columnName.includes('PF')) {
      return numValue.toFixed(2);
    } else if (columnName.includes('Demand')) {
      if (columnName.includes('W')) return `${numValue.toFixed(2)} kW`;
      if (columnName.includes('Var')) return `${numValue.toFixed(2)} kVAR`;
      return `${numValue.toFixed(2)} kVA`;
    } else if (columnName.includes('kWh') || columnName.includes('kVarh')) {
      return `${numValue.toFixed(2)} ${columnName.split(' ')[1]}`;
    } else if (columnName.includes('THD')) {
      return `${numValue.toFixed(1)}%`;
    } else if (columnName === 'Frequency') {
      return `${numValue.toFixed(1)} Hz`;
    } else {
      return numValue.toFixed(2);
    }
  };

  // ฟังก์ชันโหลดข้อมูล real-time จาก API
  const loadRealtimeData = async () => {
    if (selectedSlaveIds.length === 0 || selectedColumns.length === 0) return;
    
    setIsLoading(true);
    try {
      // สร้าง query parameters
      const params = new URLSearchParams({
        slaveIds: selectedSlaveIds.join(','),
        columns: selectedColumns.join(',')
      });
      
      console.log('🔄 Loading real-time data:', {
        meters: selectedSlaveIds,
        columns: selectedColumns,
        url: `/api/realtime-data?${params.toString()}`
      });
      
      const response = await fetch(`/api/realtime-data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Real-time data loaded successfully:', result);
        console.log('📊 Data structure:', {
          dataKeys: Object.keys(result.data || {}),
          sampleData: result.data ? Object.values(result.data)[0] : null
        });
        setRealtimeData(result.data);
        
        // อัปเดตเวลาปัจจุบัน
        if (result.timestamp) {
          const timestamp = new Date(result.timestamp);
          setCurrentDateTime(timestamp.toLocaleString('th-TH'));
          setLastUpdateTime(timestamp.toLocaleTimeString('th-TH'));
        }
      } else {
        console.error('❌ API returned error:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Error loading real-time data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันโหลดข้อมูลแบบ manual (เมื่อกดปุ่ม Load)
  const manualLoadRealtimeData = async () => {
    console.log('🔄 === MANUAL LOAD REAL-TIME DATA ===');
    console.log('📊 Selected Meters:', selectedSlaveIds);
    console.log('📊 Selected Columns:', selectedColumns);
    console.log('================================');
    
    // เรียกฟังก์ชันโหลดข้อมูลทันที
    await loadRealtimeData();
  };

  // โหลดข้อมูลเมื่อเลือกมิเตอร์หรือคอลัมน์ใหม่ (ไม่ auto-load)
  // useEffect(() => {
  //   if (selectedSlaveIds.length > 0 && selectedColumns.length > 0) {
  //     loadRealtimeData();
  //   }
  // }, [selectedSlaveIds, selectedColumns]);
  
  // อัปเดตข้อมูลอัตโนมัติทุก 1 นาที (เฉพาะเมื่อมีข้อมูลแล้ว)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (selectedSlaveIds.length > 0 && selectedColumns.length > 0 && realtimeData && Object.keys(realtimeData).length > 0) {
      console.log('🔄 Setting up auto-refresh interval for real-time data...');
      
      // ตั้งเวลาอัปเดตทุก 1 นาที (60000 ms) เฉพาะเมื่อมีข้อมูลแล้ว
      interval = setInterval(() => {
        console.log('🔄 Auto-refreshing real-time data...');
        loadRealtimeData();
      }, 60000);
    }
    
    // Cleanup interval เมื่อ component unmount หรือ dependencies เปลี่ยน
    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('🛑 Cleared auto-refresh interval');
      }
    };
  }, [selectedSlaveIds, selectedColumns, realtimeData]);

  const realtimeRows = generateRealtimeData();
  
  // แสดงข้อมูลใน console เพื่อ debug
  console.log('📊 OnlineData Debug:', {
    selectedSlaveIds,
    selectedMeterNames,
    selectedColumns,
    realtimeRowsCount: realtimeRows.length,
    sampleRow: realtimeRows[0],
    hasMeters: selectedSlaveIds.length > 0,
    hasColumns: selectedColumns.length > 0
  });

  // สร้างข้อมูลมิเตอร์ที่เลือกสำหรับ Alarm Panel
  const selectedMeters = selectedSlaveIds.map((slaveId, index) => ({
    id: `meter_${slaveId}`,
    name: selectedMeterNames[index] || (language === 'TH' ? `มิเตอร์ ${slaveId}` : `Meter ${slaveId}`)
  }));

  return (
    <PageLayout>
      <div className="pt-0 pb-6 animate-fade-in ml-0 sm:ml-2 md:ml-4 lg:ml-8">
        {/* Header */}
        <div className="flex justify-center mt-1">
          {/* Filters */}
          <Card className="bg-transparent shadow-none border-none w-full max-w-5xl rounded-t-xl rounded-b-none">
            <CardContent className="p-0 bg-transparent shadow-none">
              <div className="flex flex-wrap items-center gap-2 bg-white rounded-t-xl rounded-b-none px-2 py-1 justify-center text-xs">
                {/* Table Orientation Toggle */}
                <div className="flex items-center gap-0.5 mr-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={(tableOrientation === 'horizontal' ? 'bg-primary text-white ' : 'bg-secondary text-black ') + 'h-7 px-2 text-xs rounded-none'}
                    onClick={() => setTableOrientation(tableOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                    aria-label={language === 'TH' ? 'สลับแนวตาราง' : 'Toggle Table Orientation'}
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
                
                
                
                {/* Buttons */}
                <Button
                  className={
                    cn(
                      "h-7 px-2 text-xs rounded-none shadow flex items-center",
                      isLoading
                        ? "bg-gray-300 text-gray-400 cursor-default"
                        : "bg-primary hover:bg-primary/90 focus:bg-primary active:bg-primary text-white"
                    )
                  }
                  disabled={isLoading || selectedSlaveIds.length === 0 || selectedColumns.length === 0}
                  onClick={manualLoadRealtimeData}
                >
                  <Search className="w-4 h-4 mr-0" />
                  {isLoading ? (language === 'TH' ? 'กำลังโหลด...' : 'Loading...') : (language === 'TH' ? 'โหลด' : 'Load')}
                </Button>
                {/* Print Button - Only show for Admin users */}
                {isAdmin && (
                  <Button
                    className="h-7 px-2 text-xs rounded-none bg-muted hover:bg-primary shadow flex items-center ml-1"
                    variant="outline"
                    onClick={() => setShowExportModal(true)}
                    disabled={selectedSlaveIds.length === 0 || selectedColumns.length === 0}
                    aria-label={language === 'TH' ? 'ส่งออก/พิมพ์' : 'Export/Print'}
                  >
                    <Printer className="w-4 h-4 mr-0" />
                  </Button>
                )}
                <PrintModal
                  isOpen={showExportModal}
                  onClose={() => setShowExportModal(false)}
                  onExport={handleExport}
                  onSendReport={handleSendReport}
                  isLoaded={true}
                  hasData={selectedSlaveIds.length > 0 && selectedColumns.length > 0}
                  isLoading={isLoading}
                  isSending={isSending}
                  emailGroups={emailGroups}
                  lineGroups={lineGroups}
                  emailList={emailList}
                  lineList={lineList}
                />
               
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table - ปรับให้ชิดกับส่วน filter */}
        <Card className="shadow-card rounded-t-none rounded-b-xl mt-2">
          <CardHeader className="flex flex-row items-center justify-between bg-muted/30 py-1 px-3 min-h-0 h-8">
                      <CardTitle className="flex items-center space-x-2 text-xs font-semibold min-h-0 h-6">
              <FileText className="w-4 h-4" />
              <span className="truncate text-xs font-medium">
                Real-time Data {currentDateTime}

              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Debug Info */}
            
            <div className="w-full overflow-x-auto">
              {selectedSlaveIds.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      {language === 'TH' ? 'กรุณาเลือกมิเตอร์ใน sidebar' : 'Please select meters in sidebar'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {language === 'TH' ? 'เลือกมิเตอร์เพื่อดูข้อมูล real-time' : 'Select meters to view real-time data'}
                    </p>
                  </div>
                </div>
              ) : selectedColumns.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      {language === 'TH' ? 'กรุณาเลือกค่าที่ต้องการแสดง' : 'Please select values to display'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {language === 'TH' ? 'เลือกค่าต่างๆ ใน sidebar เพื่อแสดงเป็นแถว' : 'Select values in sidebar to display as rows'}
                    </p>
                  </div>
                </div>
              ) : (
              <div className="h-full border border-gray-200 relative">
                {tableOrientation === 'horizontal' ? (
                  <div 
                    className="h-full overflow-x-auto overflow-y-auto custom-scrollbar table-scroll-wrapper" 
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
                  >
                    <table className="text-xs border-collapse" style={{ width: 'max-content', minWidth: '100%' }}>
                      <thead className="sticky top-0 z-40 text-xs">
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
                            {language === 'TH' ? 'ชื่ออุปกรณ์' : 'Device Name'}
                          </th>
                          {selectedSlaveIds.map((slaveId, index) => (
                            <th 
                              key={slaveId} 
                              className="text-center p-1 font-semibold whitespace-nowrap bg-cyan-500 text-white border-r border-white last:border-r-0"
                              style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
                            >
                              {selectedMeterNames[index] || (language === 'TH' ? `มิเตอร์ ${slaveId}` : `Meter ${slaveId}`)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {realtimeRows.map((row, idx) => (
                          <tr
                            key={row.name}
                            className={`border-t border-gray-200 hover:bg-cyan-50 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <td
                              className="p-1 text-foreground font-medium border-r border-gray-200 text-xs"
                              style={{
                                position: 'sticky',
                                left: 0,
                                zIndex: 30,
                                backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb',
                                boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
                                width: '130px',
                                minWidth: '130px',
                                maxWidth: '130px'
                              }}
                            >
                              {row.name}
                            </td>
                            {selectedSlaveIds.map((slaveId) => (
                              <td
                                key={slaveId}
                                className="text-center p-1 text-foreground whitespace-nowrap border-r border-gray-200 last:border-r-0 text-xs"
                                style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
                              >
                                {row[`meter_${slaveId}`] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-full border border-gray-200 relative">
                    {/* Table container with fixed height and horizontal scroll */}
                    <div 
                      className="h-full overflow-x-auto overflow-y-auto custom-scrollbar table-scroll-wrapper" 
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
                    >
                      <table className="text-xs border-collapse" style={{ width: 'max-content', minWidth: '100%' }}>
                        <thead className="sticky top-0 z-40 text-xs">
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
                              {language === 'TH' ? 'มิเตอร์' : 'Meter'}
                            </th>
                            {selectedColumns.map((column) => (
                              <th 
                                key={column} 
                                className="text-center p-1 font-semibold whitespace-nowrap bg-cyan-500 text-white border-r border-white last:border-r-0"
                                style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSlaveIds.length === 0 ? (
                            <tr>
                              <td colSpan={selectedColumns.length + 1} className="text-center p-4 text-gray-500 bg-white text-xs">
                                {language === 'TH' ? 'กรุณาเลือกมิเตอร์ใน sidebar' : 'Please select meters in sidebar'}
                              </td>
                            </tr>
                          ) : (
                            <>
                              {/* Render meters as rows */}
                              {selectedSlaveIds.map((slaveId, idx) => (
                                <tr
                                  key={slaveId}
                                  className={`border-t border-gray-200 hover:bg-cyan-50 transition-colors ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                  }`}
                                >
                                  <td
                                    className="p-1 text-foreground font-medium border-r border-gray-200 text-xs"
                                    style={{
                                      position: 'sticky',
                                      left: 0,
                                      zIndex: 30,
                                      backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb',
                                      boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
                                      width: '130px',
                                      minWidth: '130px',
                                      maxWidth: '130px'
                                    }}
                                  >
                                    {selectedMeterNames[idx] || (language === 'TH' ? `มิเตอร์ ${slaveId}` : `Meter ${slaveId}`)}
                                  </td>
                                  {selectedColumns.map((column) => {
                                    const row = realtimeRows.find(r => r.name === column);
                                    return (
                                      <td
                                        key={column}
                                        className="text-center p-1 text-foreground whitespace-nowrap border-r border-gray-200 last:border-r-0 text-xs"
                                        style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
                                      >
                                        {row ? row[`meter_${slaveId}`] || '-' : '-'}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </CardContent>
        </Card>


        {/* {!isAlarmPanelOpen && (
          <button
            className="fixed bottom-4 right-0 z-50 bg-primary hover:bg-sky-500 text-black px-1 py-2 rounded-l-xl shadow-lg flex flex-col items-center transform"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: '0.75rem' }}
            onClick={() => setIsAlarmPanelOpen(true)}
          >
            <AlarmClock className="w-4 h-4 mb-1" />
            <span className="font-semibold">Alarm</span>
          </button>
        )}

  
        {isAlarmPanelOpen && (
          <div className="fixed bottom-0 right-0 h-2/3 w-100 bg-primary z-50 shadow-2xl transition-transform duration-300 flex flex-col rounded-tl-xl">
            <div className="flex justify-end p-2">
              <button
                className="flex items-center text-black hover:text-gray-700 text-xs"
                onClick={() => setIsAlarmPanelOpen(false)}
              >
                <span className="mr-2">Hide</span>
                <AlarmClock className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 flex-1 overflow-y-auto">
              <div className="font-semibold text-center mb-2 text-xs">
                Alarm At 14:10:49 24 Mar 2015
              </div>
              <table className="w-full text-xs bg-white rounded shadow border mt-4">
                <thead>
                  <tr className="bg-sky-200">
                    <th className="p-2 border text-left">Device Name</th>
                    {selectedMeters.map(meter => (
                      <th key={meter.id} className="p-2 border text-right">{meter.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {realtimeRows.map((row, idx) => (
                    <tr key={row.name} className={idx % 2 === 0 ? 'bg-sky-50' : 'bg-white'}>
                      <td className="p-2 border font-medium text-left">{row.name}</td>
                      {selectedMeters.map(meter => (
                        <td key={meter.id} className="p-2 border text-right">{row[meter.id] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )} */}
      </div>
    </PageLayout>
  );
}