import React, { useState, useRef, useEffect, useContext } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Search, Printer, FileText, Image as ImageIcon, LineChart, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import useCustomSwal from '@/utils/swal';
import { TableColumnContext } from '../components/ui/sidebar-menu';
import { useMeterTree } from '@/context/MeterTreeContext';
import { apiClient, TableDataRow as ApiTableDataRow, handleApiError } from '@/services/api';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  Cell,
  ReferenceArea
} from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TimeInput24 } from '@/components/ui/time-input-24';
import { DateNavigation } from '@/components/ui/date-navigation';
import { PrintModal } from '@/components/ui/print-modal';
import { useDateNavigation } from '@/hooks/use-date-navigation';
import { holidayService, Holiday } from '@/services/holidayService';
import { fetchReportGroups, handleSendReport as sendReport, ReportGroups, SendReportPayload, ReportData } from '@/utils/reportUtils';

// Custom Tooltip สำหรับแสดงค่าทั้งหมดของทุกเส้นที่เวลาเดียวกัน (ทุก 1 ชั่วโมง)
const CustomLineTooltip = ({ active, payload, label, typeFilter }: {
  active?: boolean;
  payload?: any[];
  label?: any;
  typeFilter?: string;
}) => {
  const { language } = useLanguage();
  
  if (active && payload && payload.length) {
    let timeLabel = '';
    if (typeFilter === '1year') {
      timeLabel = `เดือน ${label}`;
    } else if (typeFilter === '1month') {
      timeLabel = `วันที่ ${label}`;
    } else {
      // 24h view - แสดงเวลาทุก 1 ชั่วโมง
      if (payload[0] && payload[0].payload && payload[0].payload.displayLabel) {
        // ใช้ displayLabel ที่มีรูปแบบ HH:MM แล้ว
        timeLabel = payload[0].payload.displayLabel;
      } else {
        // Fallback: คำนวณจาก label value
        const totalMinutes = Math.round(label * 60);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        timeLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }

    // กรองเฉพาะ entries ที่มีค่า
    let entries = Array.isArray(payload) ? payload : [];
    if (entries.length === 1 && entries[0] && entries[0].payload) {
      const bar = entries[0];
      const row = bar.payload;
      // เฉพาะ bar ที่ชี้อยู่ (name, value, color)
      entries = [{ name: bar.name, value: bar.value, color: bar.color }];
    }

    return (
      <div style={{ background: 'white', border: '1px solid #ccc', padding: 8, borderRadius: 4 }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{language === 'TH' ? 'ค่าทั้งหมดที่เวลาเดียวกัน' : 'All values'}</div>
        <div style={{ fontSize: '12px' }}>{timeLabel}</div>
        {entries.map((entry, index) => {
          const value = entry.value;
          return (
            <div key={`tooltip-item-${index}`} style={{ fontWeight: 'normal', fontSize: '12px' }}>
              <span style={{ color: entry.color }}>{entry.name}</span>: <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

function formatDateTime(date: Date | undefined, time: string) {
  if (!date) return '--/--/---- --:--';
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  // แปลง time ("14:03") เป็น 24 ชม. format
  let timeStr = time;
  if (/^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":");
    const d = new Date();
    d.setHours(Number(h));
    d.setMinutes(Number(m));
    timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return `${dateStr} ${timeStr}`;
}
function getCurrentDateTimeString() {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

function getCurrentTimeString() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ฟังก์ชันหาข้อมูล node ที่เลือก
function findNodeById(nodes: any[], id: string): any {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export default function TOU_Energy() {
  // Chart colors for different meters/columns (copied from LineGraph)
  const chartColors = [
    '#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6',
    '#dd4477', '#66aa00', '#b82e2e', '#316395', '#994499', '#22aa99',
    '#aaaa11', '#6633cc', '#e67300', '#8b0707', '#651067', '#329262',
    '#5574a6', '#3b3eac', '#b77322', '#16d620', '#b91383', '#f4359e',
    '#9c5935', '#a9c413', '#2a778d', '#668d1c', '#bea413', '#0c5922'
  ];

  // ฟังก์ชันแปลงเวลาเป็นนาที - ย้ายมาด้านบนสุด
  const parseTimeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const { language } = useLanguage();
  const { showSuccessToast, showErrorToast } = useCustomSwal();
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState(getCurrentTimeString());
  const [typeFilter, setTypeFilter] = useState<'24h' | '1month' | '1year'>('24h');
  const [graphType, setGraphType] = useState<'line' | 'bar'>('line');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<ApiTableDataRow[]>([]);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTimeString());
  const [showExportModal, setShowExportModal] = useState(false);

  // Date navigation hook
  const { dateRange, navigateDate, setDateRangeManually } = useDateNavigation();
  
  // Print modal states
  const [emailGroups, setEmailGroups] = useState<{ id: number; name: string }[]>([]);
  const [lineGroups, setLineGroups] = useState<{ id: number; name: string }[]>([]);
  const [emailList, setEmailList] = useState<any[]>([]);
  const [lineList, setLineList] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showTOUSummary, setShowTOUSummary] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [energyDisplayMode, setEnergyDisplayMode] = useState<'consumption' | 'cumulative'>('cumulative');

  // ใช้ context สำหรับ selected columns และ meter tree
  const context = useContext(TableColumnContext);
  const contextSelectedColumns = context?.selectedColumns || [];
  // รองรับการเลือกหลายมิเตอร์
  const { selectedNodeIds = [], setSelectedNodeIds, treeData, selectedSlaveIds, selectedMeterNames } = useMeterTree();

  // Fetch email/line groups and users for print modal using reportUtils
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        console.log('🔍 TOU-Demand: Fetching report groups using reportUtils...');
        const groups = await fetchReportGroups();
        
        console.log('📧 Email groups loaded:', groups.emailGroups.length);
        console.log('📱 LINE groups loaded:', groups.lineGroups.length);
        console.log('📧 Email users loaded:', groups.emailList.length);
        console.log('📱 LINE users loaded:', groups.lineList.length);
        
        setEmailGroups(groups.emailGroups);
        setLineGroups(groups.lineGroups);
        setEmailList(groups.emailList);
        setLineList(groups.lineList);
      } catch (error) {
        console.error('❌ TOU-Demand: Error fetching groups:', error);
      }
    };

    fetchGroups();
  }, []);

  // Fetch holidays for the current year
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const response = await holidayService.getHolidaysByYear(currentYear);
        if (response.success) {
          setHolidays(response.data);
          console.log('📅 Holidays loaded for year', currentYear, ':', response.data.length, 'holidays');
          response.data.forEach(holiday => {
            console.log(`   - ${holiday.date}: ${holiday.name_holiday} (${holiday.category})`);
          });
        }
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };

    fetchHolidays();
  }, []);
  
  // Auto-reload when selected meters change
  useEffect(() => {
    console.log('🔄 TOU-Demand: selectedSlaveIds changed:', selectedSlaveIds);
    console.log('🔄 TOU-Demand: selectedMeterNames changed:', selectedMeterNames);
    
    // ถ้าเลือกมิเตอร์แล้วและมีข้อมูลวันที่ ให้โหลดข้อมูล
    if (selectedSlaveIds && selectedSlaveIds.length > 0 && dateFrom && dateTo) {
      console.log('🚀 Auto-loading data for selected meters:', selectedSlaveIds);
      loadChartData();
    }
  }, [selectedSlaveIds, selectedMeterNames]);

  // หาข้อมูล meter ที่เลือก
  // ใช้ selectedMeterNames จาก MeterTreeContext แทน
  const meterName = selectedMeterNames && selectedMeterNames.length > 0 
    ? selectedMeterNames.join(', ') 
    : 'No meter selected';
    
  console.log('🎯 TOU-Demand Debug:');
  console.log('   - selectedSlaveIds:', selectedSlaveIds);
  console.log('   - selectedMeterNames:', selectedMeterNames);
  console.log('   - meterName:', meterName);
  
  // ฟังก์ชันแปลง slave_id เป็นชื่อมิเตอร์
  const getMeterNameBySlaveId = (slaveId: number | string): string => {
    if (!selectedSlaveIds || !selectedMeterNames) return `Meter ${slaveId}`;
    
    const slaveIdNum = typeof slaveId === 'string' ? parseInt(slaveId) : slaveId;
    const index = selectedSlaveIds.findIndex(id => id === slaveIdNum);
    
    if (index !== -1 && selectedMeterNames[index]) {
      return selectedMeterNames[index];
    }
    
    return `Meter ${slaveId}`;
  };

  // คอลัมน์ที่บังคับให้แสดงเสมอ
  const mandatoryColumns = ['Demand W', 'Demand Var', 'Demand VA'];
  
  // ใช้เฉพาะ 3 ค่าแรกจากคอลัมน์ที่เลือก หรือคอลัมน์บังคับหากไม่มีการเลือก
  // เปลี่ยนเป็นรองรับหลายคอลัมน์
  const displayColumns = contextSelectedColumns.length > 0
    ? contextSelectedColumns
    : mandatoryColumns;
    
  // ตรวจสอบว่ามีการเลือกคอลัมน์ใน sidebar หรือไม่
  const hasSelectedColumns = contextSelectedColumns.length > 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);


  // Export handler (PDF, CSV, Image)
  async function handleExport(type: 'pdf' | 'csv' | 'image') {
    // Get current date in DDMMYYYY format
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fileDate = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`;
    const baseName = `TOU-Demand-${fileDate}`;
    
    if (type === 'pdf') {
      // Export as PDF with enhanced layout
      const chart = chartRef.current;
      if (!chart) return;
      
      console.log('📄 Creating enhanced PDF for TOU-Demand...');
      
      // Capture chart with high quality
      const canvas = await html2canvas(chart as HTMLElement, { 
        backgroundColor: '#ffffff',
        scale: 1.5,
        logging: false,
        useCORS: true
      });
      
      // Create PDF in portrait mode with metadata
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOU-Demand Report', 20, 25);
      
      // Metadata section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const dateRange = `Date: ${format(dateFrom, 'dd MMMM yyyy')} - ${format(dateTo || dateFrom, 'dd MMMM yyyy')}`;
      const timeRange = `Time: ${timeFrom} - ${timeTo}`;
      const viewType = `View: ${typeFilter} | Chart: ${graphType}`;
      const meterNames = `Meters: ${selectedMeterNames.join(', ') || 'No meters selected'}`;
      const generatedAt = `Generated: ${new Date().toLocaleString('th-TH')}`;
      
      pdf.text(dateRange, 20, 35);
      pdf.text(timeRange, 20, 42);
      pdf.text(viewType, 20, 49);
      pdf.text(meterNames, 20, 56);
      pdf.text(generatedAt, 20, 63);
      
      // Chart section
      const chartStartY = 75;
      const availableWidth = pageWidth - 40; // 20mm margin on each side
      const availableHeight = pageHeight - chartStartY - 20; // Leave space for footer
      
      // Calculate image dimensions maintaining aspect ratio
      const aspectRatio = canvas.width / canvas.height;
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / aspectRatio;
      
      // If image is too tall, scale down
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * aspectRatio;
      }
      
      // Center the image horizontally
      const imgX = (pageWidth - imgWidth) / 2;
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', imgX, chartStartY, imgWidth, imgHeight);
      
      console.log('📄 Enhanced PDF created successfully');
      pdf.save(`${baseName}.pdf`);
    } else if (type === 'csv') {
      // Export as CSV
      let csv = '';
      const table = document.querySelector('table');
      if (!table) return;
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cols = row.querySelectorAll('th,td');
        const rowData = Array.from(cols).map(col => '"' + col.textContent?.replace(/"/g, '""') + '"').join(',');
        csv += rowData + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (type === 'image') {
      // Export as Image
      const chart = chartRef.current;
      if (!chart) return;
      const canvas = await html2canvas(chart as HTMLElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `${baseName}.png`;
      a.click();
    }
  }

  // Date navigation handler
  const handleDateNavigation = (direction: 'left' | 'right' | 'up' | 'down') => {
    const newDateFrom = new Date(dateFrom);
    const newDateTo = new Date(dateTo);
    
    switch (direction) {
      case 'left': // Previous day
        newDateFrom.setDate(newDateFrom.getDate() - 1);
        newDateTo.setDate(newDateTo.getDate() - 1);
        break;
      case 'right': // Next day
        newDateFrom.setDate(newDateFrom.getDate() + 1);
        newDateTo.setDate(newDateTo.getDate() + 1);
        break;
      case 'up': // Next month
        newDateFrom.setMonth(newDateFrom.getMonth() + 1);
        newDateTo.setMonth(newDateTo.getMonth() + 1);
        break;
      case 'down': // Previous month
        newDateFrom.setMonth(newDateFrom.getMonth() - 1);
        newDateTo.setMonth(newDateTo.getMonth() - 1);
        break;
    }
    
    setDateFrom(newDateFrom);
    setDateTo(newDateTo);
    setIsLoaded(false);
  };

  // Send report handler using reportUtils (copied from LineGraph)
  async function handleSendReport(payload: SendReportPayload) {
    if (!chartData || chartData.length === 0) {
      showErrorToast('No data to send');
      return;
    }

    setIsSending(true);
    try {
      console.log('🔍 TOU-Demand: Sending report using reportUtils...', payload);
      
      // สำหรับ image และ PDF export ให้ใช้ custom capture logic เหมือน LineGraph
      // PDF จะสร้างจากกราฟเหมือน download (ไม่ใช่ตาราง)
      let customImageCapture = null;
      if (payload.exportType === 'image' || payload.exportType === 'pdf') {
        console.log(`📧 Creating custom capture for TOU-Demand ${payload.exportType} email`);
        
        customImageCapture = async () => {
          if (!chartRef.current) {
            throw new Error('Chart reference not found');
          }
          
          console.log(`📧 Creating custom ${payload.exportType} for email export`);
          
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 1.5,
            logging: false,
            useCORS: true
          });
          
          if (payload.exportType === 'pdf') {
            // สำหรับ PDF email ให้สร้าง PDF เหมือน download (ไม่ใช่ตาราง)
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Header
            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'bold');
            pdf.text('TOU-Demand Report', 20, 25);
            
            // Metadata section
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            const dateRange = `Date: ${format(dateFrom, 'dd MMMM yyyy')} - ${format(dateTo || dateFrom, 'dd MMMM yyyy')}`;
            const timeRange = `Time: ${timeFrom} - ${timeTo}`;
            const viewType = `View: ${typeFilter} | Chart: ${graphType}`;
            const meterNames = `Meters: ${selectedMeterNames.join(', ') || 'No meters selected'}`;
            const generatedAt = `Generated: ${new Date().toLocaleString('th-TH')}`;
            
            pdf.text(dateRange, 20, 35);
            pdf.text(timeRange, 20, 42);
            pdf.text(viewType, 20, 49);
            pdf.text(meterNames, 20, 56);
            pdf.text(generatedAt, 20, 63);
            
            // Chart section
            const chartStartY = 75;
            const availableWidth = pageWidth - 40;
            const availableHeight = pageHeight - chartStartY - 20;
            
            // Calculate image dimensions maintaining aspect ratio
            const aspectRatio = canvas.width / canvas.height;
            let imgWidth = availableWidth;
            let imgHeight = imgWidth / aspectRatio;
            
            // If image is too tall, scale down
            if (imgHeight > availableHeight) {
              imgHeight = availableHeight;
              imgWidth = imgHeight * aspectRatio;
            }
            
            // Center the image horizontally
            const imgX = (pageWidth - imgWidth) / 2;
            
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', imgX, chartStartY, imgWidth, imgHeight);
            
            console.log('📧 Enhanced PDF created for email with same layout as download');
            
            // ใช้วิธีเดียวกับ download แต่แปลงเป็น data URI
            const pdfBlob = pdf.output('blob');
            console.log('📧 PDF blob size:', pdfBlob.size, 'bytes');
            
            // แปลง blob เป็น base64 data URI
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                console.log('📧 PDF data URI length:', result.length);
                console.log('📧 PDF data URI preview:', result.substring(0, 100));
                resolve(result);
              };
              reader.readAsDataURL(pdfBlob);
            });
          } else {
            // สำหรับ image export ใช้ canvas with metadata
            const finalCanvas = document.createElement('canvas');
            const ctx = finalCanvas.getContext('2d');
            
            if (ctx) {
            // Calculate dimensions - เพิ่มพื้นที่สำหรับ Legend
            const legendEntries = selectedSlaveIds.length * displayColumns.length;
            const metadataHeight = 120 + (legendEntries * 16) + 30;
            const chartWidth = Math.floor(canvas.width * 0.8);
            const chartHeight = Math.floor(canvas.height * 0.8);
            
            finalCanvas.width = Math.max(canvas.width, 800);
            finalCanvas.height = metadataHeight + chartHeight + 40;
            
            // Fill white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            
            // Draw metadata
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('TOU-Demand Report', 20, 30);
            
            ctx.font = '12px Arial';
            ctx.fillText(`Date Range: ${format(dateFrom, 'dd MMMM yyyy')} - ${format(dateTo || dateFrom, 'dd MMMM yyyy')}`, 20, 50);
            ctx.fillText(`Time Range: ${timeFrom} - ${timeTo}`, 20, 70);
            ctx.fillText(`View: ${typeFilter} | Chart: ${graphType}`, 20, 90);
            ctx.fillText(`Generated: ${new Date().toLocaleString('th-TH')}`, 20, 110);
            
            // Draw Legend
            let legendY = 130;
            ctx.font = 'bold 12px Arial';
            ctx.fillText('Legend:', 20, legendY);
            legendY += 20;
            
            // สร้าง legend entries สำหรับแต่ละมิเตอร์และคอลัมน์
            selectedSlaveIds.forEach((slaveId, meterIndex) => {
              const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
              displayColumns.forEach((column, colIndex) => {
                const colorIndex = (meterIndex * displayColumns.length + colIndex) % chartColors.length;
                const color = chartColors[colorIndex];
                
                // Draw color box
                ctx.fillStyle = color;
                ctx.fillRect(30, legendY - 10, 12, 12);
                
                // Draw text
                ctx.fillStyle = '#000000';
                ctx.font = '11px Arial';
                ctx.fillText(`${column} (${meterName})`, 50, legendY);
                legendY += 16;
              });
            });
            
            // Draw the chart (scaled down) after Legend
            const chartX = (finalCanvas.width - chartWidth) / 2;
            const chartY = legendY + 10;
            ctx.drawImage(canvas, chartX, chartY, chartWidth, chartHeight);
            
            console.log('📧 Custom TOU-Demand image created with metadata and legend');
            return finalCanvas.toDataURL('image/png');
          }
          
            // Fallback ถ้า context ไม่ได้
            console.log('📧 Fallback to simple canvas');
            return canvas.toDataURL('image/png');
          }
        };
      }

      // Transform chartData to match reportUtils format (เหมือน LineGraph)
      const transformedData = chartData.map((item, index) => {
        const transformedItem: any = {
          Time: item.time || item.displayLabel || index.toString(),
          reading_timestamp: item.reading_timestamp || new Date().toISOString(),
          originalTime: item.time
        };
        
        // เพิ่มข้อมูลของแต่ละมิเตอร์และคอลัมน์
        selectedSlaveIds.forEach((slaveId, meterIndex) => {
          const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
          displayColumns.forEach(column => {
            const key = `${column}_${slaveId}`;
            const flatKey = `${meterName} - ${column}`;
            transformedItem[flatKey] = item[key] || 0;
          });
        });
        
        return transformedItem;
      });

      // Prepare report data for reportUtils with correct filename
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fileDate = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`;
      const filename = `TOU-Demand-${fileDate}`;
      
      const reportData: ReportData = {
        filteredData: transformedData,
        displayColumns: ['Time', ...selectedSlaveIds.flatMap((slaveId, meterIndex) => {
          const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
          return displayColumns.map(column => `${meterName} - ${column}`);
        })],
        meterName: selectedMeterNames.join(', ') || 'TOU Demand',
        dateRange: `${format(dateFrom, 'dd MMMM yyyy')} - ${format(dateTo || dateFrom, 'dd MMMM yyyy')}`,
        timeRange: `${timeFrom} - ${timeTo}`,
        filename: filename, // เพิ่มชื่อไฟล์ที่ต้องการ
        reportTitle: 'TOU-Demand Report', // เพิ่ม reportTitle สำหรับ backend
        formatDateTime: (dateTime: string) => {
          try {
            if (!dateTime) return '';
            
            // Handle different date formats that might come from chartData
            let date: Date;
            
            // If it's already a formatted time string (like "14:30"), return as is
            if (/^\d{1,2}:\d{2}$/.test(dateTime)) {
              return dateTime;
            }
            
            // If it's a number (hour value from chart), convert to time format
            if (/^\d+$/.test(dateTime)) {
              const hour = parseInt(dateTime);
              return `${hour.toString().padStart(2, '0')}:00`;
            }
            
            date = new Date(dateTime);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
              console.warn('Invalid date format:', dateTime);
              return dateTime || '';
            }
            
            return date.toLocaleString('th-TH', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch (error) {
            console.warn('Error formatting dateTime:', dateTime, error);
            return dateTime || '';
          }
        },
        getColumnValue: (row: any, col: string) => {
          // Handle time column
          if (col === 'Time' || col === 'time') {
            return row.reading_timestamp || row.time || row.originalTime || row.displayLabel || '';
          }
          
          // Handle flat column names (e.g., "Main Incoming - Demand W")
          if (row[col] !== undefined) {
            const value = row[col];
            return typeof value === 'number' ? value.toFixed(2) : (value || '0.00');
          }
          
          // Fallback
          return '0.00';
        },
        customImageCapture // เพิ่ม customImageCapture สำหรับ image export (null สำหรับ PDF)
      };

      // Prepare groups data
      const groups: ReportGroups = {
        emailGroups,
        lineGroups,
        emailList,
        lineList
      };

      // Use reportUtils to send the report
      await sendReport(
        payload,
        reportData,
        groups,
        (message: string) => {
          console.log('✅ TOU-Demand: Success -', message);
          showSuccessToast(message);
        },
        (message: string) => {
          console.error('❌ TOU-Demand: Error -', message);
          showErrorToast(message);
        }
      );
      
    } catch (error) {
      console.error('❌ TOU-Demand: Error sending report:', error);
      showErrorToast('เกิดข้อผิดพลาดในการส่งรายงาน');
    } finally {
      setIsSending(false);
    }
  }
  const { selectedColumns } = React.useContext(TableColumnContext) || { selectedColumns: ['WATT', 'VAR', 'VA'] };
  const getVisibleMetrics = () => {
    const metricsMap: { [key: string]: string } = {
      'WATT': 'wattTotal',
      'VAR': 'varTotal',
      'VA': 'vaTotal'
    };
    return contextSelectedColumns.filter(col => metricsMap[col]).map(col => metricsMap[col]);
  };
  const visibleMetrics = getVisibleMetrics();

  // โหลดข้อมูลจาก API
  // ฟังก์ชันโหลดข้อมูลจาก API
  const loadChartData = async () => {
    if (!dateFrom || !dateTo) {
      setError('กรุณาเลือกช่วงวันที่');
      return;
    }

    // ตรวจสอบว่ามีการเลือกคอลัมน์ใน sidebar หรือไม่
    if (!hasSelectedColumns) {
      console.log('⚠️ ไม่ได้เลือกคอลัมน์ใน sidebar ใช้คอลัมน์เริ่มต้น:', displayColumns);
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = {
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        timeFrom,
        timeTo,
        columns: hasSelectedColumns ? contextSelectedColumns : displayColumns,
        slaveIds: selectedSlaveIds && selectedSlaveIds.length > 0 ? selectedSlaveIds : undefined,
        // interval: '15min', // Do not filter by interval in backend, fetch all data in range
      };

      console.log('🔍 ส่งพารามิเตอร์ไปยัง API (DemandGraph):', params);
      console.log('📅 วันที่ From:', dateFrom, '-> formatted:', format(dateFrom, 'yyyy-MM-dd'));
      console.log('📅 วันที่ To:', dateTo, '-> formatted:', format(dateTo || dateFrom, 'yyyy-MM-dd'));
      console.log('⏰ เวลา From-To:', timeFrom, '-', timeTo);
  console.log('🏢 Slave IDs:', selectedSlaveIds);
      console.log('🏢 Meter Names:', selectedMeterNames);
      console.log('📊 Selected Columns:', contextSelectedColumns);
      console.log('⚠️ ปิดการใช้ interval parameter ชั่วคราวเพื่อทดสอบ');
      
      const response = await apiClient.getTableData(params);
      
      console.log('📊 ผลลัพธ์จาก API (DemandGraph):', response);
      console.log('✅ API Response Success:', response.success);
      console.log('📋 API Response Message:', response.message);
      console.log('🎯 API Response Data Type:', typeof response.data, 'Is Array:', Array.isArray(response.data));
      
      if (response.success && response.data) {
        // ตรวจสอบว่า response.data เป็น array หรือ object
        if (Array.isArray(response.data)) {
          console.log('✅ ข้อมูลที่ได้รับ (array):', response.data);
          console.log('📊 จำนวนข้อมูลทั้งหมด:', response.data.length);
          
          // แสดง timestamp ของข้อมูลแต่ละรายการ
          response.data.forEach((item, index) => {
            console.log(`📅 ข้อมูลแถวที่ ${index + 1}:`, {
              time: item.time,
              reading_timestamp: item.reading_timestamp,
              all_keys: Object.keys(item),
              sample_values: Object.entries(item).slice(0, 5)
            });
          });
          
          // ตรวจสอบช่วงเวลาของข้อมูลที่ได้รับ
          const timeValues = response.data.map(item => item.time || item.reading_timestamp).filter(Boolean);
          if (timeValues.length > 0) {
            console.log('🕐 ช่วงเวลาในข้อมูลที่ได้รับ:');
            console.log('  - เวลาแรก:', timeValues[0]);
            console.log('  - เวลาสุดท้าย:', timeValues[timeValues.length - 1]);
            console.log('  - เวลาที่เลือก:', timeFrom, '-', timeTo);
            console.log('  - จำนวนข้อมูลทั้งหมด:', timeValues.length);
            
            // หาข้อมูลที่อยู่ในช่วงเวลาที่เลือก
            const filteredByTime = timeValues.filter(timeStr => {
              if (!timeStr) return false;
              const timeOnly = timeStr.includes(' ') ? timeStr.split(' ').find(part => part.includes(':')) : timeStr;
              if (!timeOnly) return false;
              
              const [hours, minutes] = timeOnly.split(':').map(Number);
              const totalMinutes = hours * 60 + minutes;
              const startMinutes = parseInt(timeFrom.split(':')[0]) * 60 + parseInt(timeFrom.split(':')[1]);
              const endMinutes = parseInt(timeTo.split(':')[0]) * 60 + parseInt(timeTo.split(':')[1]);
              
              return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
            });
            
            console.log('🎯 จำนวนข้อมูลที่อยู่ในช่วงเวลาที่เลือก:', filteredByTime.length);
            console.log('🎯 ตัวอย่างข้อมูลในช่วงเวลา:', filteredByTime.slice(0, 5));
          }
          
          // เพิ่ม log ตรวจสอบช่วงเวลา
          if (response.data.length > 1) {
            const timeDifferences = [];
            for (let i = 1; i < response.data.length; i++) {
              const prevTime = response.data[i-1].time || response.data[i-1].reading_timestamp;
              const currTime = response.data[i].time || response.data[i].reading_timestamp;
              console.log(`⏰ เปรียบเทียบเวลา [${i-1}] -> [${i}]:`, {
                prev: prevTime,
                curr: currTime
              });
              
              if (prevTime && currTime) {
                try {
                  const diff = (new Date(`1970-01-01T${currTime}`).getTime() -
                              new Date(`1970-01-01T${prevTime}`).getTime()) / (1000 * 60);
                  timeDifferences.push(diff);
                } catch (e) {
                  console.log('❌ ไม่สามารถคำนวณความแตกต่างของเวลาได้:', e);
                }
              }
            }
            console.log('⏱️ ช่วงห่างระหว่างข้อมูล (นาที):', timeDifferences);
          }
          setTableData(response.data);
        } else {
          // ถ้าเป็น object ให้ดูว่าข้อมูลอยู่ที่ไหน
          const dataArray = Array.isArray(response.data.data) ? response.data.data :
                           Array.isArray(response.data) ? response.data : [];
          console.log('✅ ข้อมูลที่ได้รับ (object):', dataArray);
          console.log('📊 จำนวนข้อมูลทั้งหมด:', dataArray.length);
          
          // แสดง timestamp ของข้อมูลแต่ละรายการ
          dataArray.forEach((item, index) => {
            console.log(`📅 ข้อมูลแถวที่ ${index + 1}:`, {
              time: item.time,
              reading_timestamp: item.reading_timestamp,
              all_keys: Object.keys(item),
              sample_values: Object.entries(item).slice(0, 5)
            });
          });
          
          // ตรวจสอบช่วงเวลาของข้อมูลที่ได้รับ
          const timeValues = dataArray.map(item => item.time || item.reading_timestamp).filter(Boolean);
          if (timeValues.length > 0) {
            console.log('🕐 ช่วงเวลาในข้อมูลที่ได้รับ:');
            console.log('  - เวลาแรก:', timeValues[0]);
            console.log('  - เวลาสุดท้าย:', timeValues[timeValues.length - 1]);
            console.log('  - เวลาที่เลือก:', timeFrom, '-', timeTo);
            console.log('  - จำนวนข้อมูลทั้งหมด:', timeValues.length);
            
            // หาข้อมูลที่อยู่ในช่วงเวลาที่เลือก
            const filteredByTime = timeValues.filter(timeStr => {
              if (!timeStr) return false;
              const timeOnly = timeStr.includes(' ') ? timeStr.split(' ').find(part => part.includes(':')) : timeStr;
              if (!timeOnly) return false;
              
              const [hours, minutes] = timeOnly.split(':').map(Number);
              const totalMinutes = hours * 60 + minutes;
              const startMinutes = parseInt(timeFrom.split(':')[0]) * 60 + parseInt(timeFrom.split(':')[1]);
              const endMinutes = parseInt(timeTo.split(':')[0]) * 60 + parseInt(timeTo.split(':')[1]);
              
              return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
            });
            
            console.log('🎯 จำนวนข้อมูลที่อยู่ในช่วงเวลาที่เลือก:', filteredByTime.length);
            console.log('🎯 ตัวอย่างข้อมูลในช่วงเวลา:', filteredByTime.slice(0, 5));
          }
          
          // เพิ่ม log ตรวจสอบช่วงเวลา
          if (dataArray.length > 1) {
            const timeDifferences = [];
            for (let i = 1; i < dataArray.length; i++) {
              const prevTime = dataArray[i-1].time || dataArray[i-1].reading_timestamp;
              const currTime = dataArray[i].time || dataArray[i].reading_timestamp;
              console.log(`⏰ เปรียบเทียบเวลา [${i-1}] -> [${i}]:`, {
                prev: prevTime,
                curr: currTime
              });
              
              if (prevTime && currTime) {
                try {
                  const diff = (new Date(`1970-01-01T${currTime}`).getTime() -
                              new Date(`1970-01-01T${prevTime}`).getTime()) / (1000 * 60);
                  timeDifferences.push(diff);
                } catch (e) {
                  console.log('❌ ไม่สามารถคำนวณความแตกต่างของเวลาได้:', e);
                }
              }
            }
            console.log('⏱️ ช่วงห่างระหว่างข้อมูล (นาที):', timeDifferences);
          }
          setTableData(dataArray);
        }
        
        setIsLoaded(true);
      } else {
        console.error('❌ เกิดข้อผิดพลาด:', response.message);
        setError(response.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันแปลงข้อมูลสำหรับ Month view
  const prepareMonthChartData = (meterIds: string[]) => {
    console.log('📅 === PREPARE MONTH CHART DATA START ===');
    
    const processedRows = [];
    
    // สร้างข้อมูลสำหรับวันที่ 1-30
    for (let day = 1; day <= 30; day++) {
      const chartRow = {
        time: day,
        displayLabel: `${day}`,
      };
      
      // สำหรับแต่ละมิเตอร์และคอลัมน์
      meterIds.forEach(meterId => {
        displayColumns.forEach(column => {
          // สำหรับ Import kWh ใช้การคำนวณแบบ difference (ค่าสุดท้าย - ค่าแรก)
          if (column.toLowerCase().includes('import') && column.toLowerCase().includes('kwh')) {
            let firstValue = null;
            let lastValue = null;
            let firstTime = Infinity;
            let lastTime = -Infinity;
            let count = 0;
            
            // หาข้อมูลที่ตรงกับวันที่นี้
            for (const row of tableData) {
              if (String(row.slave_id) !== meterId) continue;
              
              const timeField = row.reading_timestamp || row.time;
              if (!timeField || typeof timeField !== 'string') continue;
              
              // ตรวจสอบว่าข้อมูลนี้เป็นของวันที่ที่ต้องการหรือไม่
              if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
                const date = new Date(timeField);
                const rowDay = date.getDate();
                
                if (rowDay === day) {
                  if (row.hasOwnProperty(column)) {
                    const value = row[column];
                    let numValue = 0;
                    
                    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                      numValue = parseFloat(value);
                    } else if (typeof value === 'number' && !isNaN(value)) {
                      numValue = value;
                    }
                    
                    const totalMinutes = date.getHours() * 60 + date.getMinutes();
                    
                    // หาค่าแรกสุดและสุดท้ายของวันนั้น
                    if (totalMinutes <= firstTime) {
                      firstTime = totalMinutes;
                      firstValue = numValue;
                    }
                    if (totalMinutes >= lastTime) {
                      lastTime = totalMinutes;
                      lastValue = numValue;
                    }
                    count++;
                  }
                }
              }
            }
            
            // คำนวณ difference (ค่าสุดท้าย - ค่าแรก)
            const diffValue = (lastValue !== null && firstValue !== null) ? (lastValue - firstValue) : 0;
            const finalValue = Math.max(0, diffValue); // ป้องกันค่าติดลบ
            chartRow[`${column}_${meterId}`] = finalValue;
            
            if (day <= 5) { // Log เฉพาะ 5 วันแรก
              console.log(`📅 Day ${day}, ${column}_${meterId}: First=${firstValue?.toFixed(2)} Last=${lastValue?.toFixed(2)} Diff=${diffValue.toFixed(2)} kWh (from ${count} records)`);
            }
          } else {
            // สำหรับคอลัมน์อื่นๆ ใช้ maxValue เหมือนเดิม
            let maxValue = -Infinity;
            let count = 0;
            
            // หาข้อมูลที่ตรงกับวันที่นี้
            for (const row of tableData) {
              if (String(row.slave_id) !== meterId) continue;
              
              const timeField = row.reading_timestamp || row.time;
              if (!timeField || typeof timeField !== 'string') continue;
              
              // ตรวจสอบว่าข้อมูลนี้เป็นของวันที่ที่ต้องการหรือไม่
              if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
                const date = new Date(timeField);
                const rowDay = date.getDate();
                
                if (rowDay === day) {
                  if (row.hasOwnProperty(column)) {
                    const value = row[column];
                    let numValue = 0;
                    
                    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                      numValue = parseFloat(value);
                    } else if (typeof value === 'number' && !isNaN(value)) {
                      numValue = value;
                    }
                    
                    // หาค่าสูงสุดของวันนั้น
                    if (numValue > maxValue) {
                      maxValue = numValue;
                    }
                    count++;
                  }
                }
              }
            }
            
            // ใช้ค่าสูงสุดของวันนั้น
            const finalValue = maxValue !== -Infinity ? maxValue : 0;
            chartRow[`${column}_${meterId}`] = finalValue;
            
            if (day <= 5) { // Log เฉพาะ 5 วันแรก
              console.log(`📅 Day ${day}, ${column}_${meterId}: ${finalValue.toFixed(2)} kW (max from ${count} records)`);
            }
          }
        });
      });
      
      processedRows.push(chartRow);
    }
    
    console.log('📅 === PREPARE MONTH CHART DATA END ===');
    console.log('📅 Generated', processedRows.length, 'data points');
    
    return processedRows;
  };

  // ฟังก์ชันแปลงข้อมูลสำหรับ Year view
  const prepareYearChartData = (meterIds: string[]) => {
    console.log('📅 === PREPARE YEAR CHART DATA START ===');
    
    const processedRows = [];
    
    // สร้างข้อมูลสำหรับเดือนที่ 1-12
    for (let month = 1; month <= 12; month++) {
      const chartRow = {
        time: month,
        displayLabel: `${month}`,
      };
      
      // สำหรับแต่ละมิเตอร์และคอลัมน์
      meterIds.forEach(meterId => {
        displayColumns.forEach(column => {
          // สำหรับ Import kWh ใช้การคำนวณแบบ difference (ค่าสุดท้าย - ค่าแรก)
          if (column.toLowerCase().includes('import') && column.toLowerCase().includes('kwh')) {
            let firstValue = null;
            let lastValue = null;
            let firstTime = Infinity;
            let lastTime = -Infinity;
            let count = 0;
            
            // หาข้อมูลที่ตรงกับเดือนนี้
            for (const row of tableData) {
              if (String(row.slave_id) !== meterId) continue;
              
              const timeField = row.reading_timestamp || row.time;
              if (!timeField || typeof timeField !== 'string') continue;
              
              // ตรวจสอบว่าข้อมูลนี้เป็นของเดือนที่ต้องการหรือไม่
              if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
                const date = new Date(timeField);
                const rowMonth = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
                
                if (rowMonth === month) {
                  if (row.hasOwnProperty(column)) {
                    const value = row[column];
                    let numValue = 0;
                    
                    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                      numValue = parseFloat(value);
                    } else if (typeof value === 'number' && !isNaN(value)) {
                      numValue = value;
                    }
                    
                    const totalMinutes = date.getDate() * 24 * 60 + date.getHours() * 60 + date.getMinutes();
                    
                    // หาค่าแรกสุดและสุดท้ายของเดือนนั้น
                    if (totalMinutes <= firstTime) {
                      firstTime = totalMinutes;
                      firstValue = numValue;
                    }
                    if (totalMinutes >= lastTime) {
                      lastTime = totalMinutes;
                      lastValue = numValue;
                    }
                    count++;
                  }
                }
              }
            }
            
            // คำนวณ difference (ค่าสุดท้าย - ค่าแรก)
            const diffValue = (lastValue !== null && firstValue !== null) ? (lastValue - firstValue) : 0;
            const finalValue = Math.max(0, diffValue); // ป้องกันค่าติดลบ
            chartRow[`${column}_${meterId}`] = finalValue;
            
            if (month <= 3) { // Log เฉพาะ 3 เดือนแรก
              console.log(`📅 Month ${month}, ${column}_${meterId}: First=${firstValue?.toFixed(2)} Last=${lastValue?.toFixed(2)} Diff=${diffValue.toFixed(2)} kWh (from ${count} records)`);
            }
          } else {
            // สำหรับคอลัมน์อื่นๆ ใช้ totalValue เหมือนเดิม
            let totalValue = 0;
            let count = 0;
            
            // หาข้อมูลที่ตรงกับเดือนนี้
            for (const row of tableData) {
              if (String(row.slave_id) !== meterId) continue;
              
              const timeField = row.reading_timestamp || row.time;
              if (!timeField || typeof timeField !== 'string') continue;
              
              // ตรวจสอบว่าข้อมูลนี้เป็นของเดือนที่ต้องการหรือไม่
              if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
                const date = new Date(timeField);
                const rowMonth = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
                
                if (rowMonth === month) {
                  if (row.hasOwnProperty(column)) {
                    const value = row[column];
                    let numValue = 0;
                    
                    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                      numValue = parseFloat(value);
                    } else if (typeof value === 'number' && !isNaN(value)) {
                      numValue = value;
                    }
                    
                    totalValue += numValue;
                    count++;
                  }
                }
              }
            }
            
            // คำนวณผลรวมของเดือน (ไม่ใช่ค่าเฉลี่ย)
            const finalValue = totalValue;
            chartRow[`${column}_${meterId}`] = finalValue;
            
            if (month <= 3) { // Log เฉพาะ 3 เดือนแรก
              console.log(`📅 Month ${month}, ${column}_${meterId}: ${finalValue.toFixed(2)} kW (${count} records, total=${totalValue.toFixed(2)})`);
            }
          }
        });
      });
      
      processedRows.push(chartRow);
    }
    
    console.log('📅 === PREPARE YEAR CHART DATA END ===');
    console.log('📅 Generated', processedRows.length, 'data points (months)');
    
    return processedRows;
  };

  // ฟังก์ชันแปลงข้อมูลสำหรับกราฟ (รองรับหลายมิเตอร์)
  const prepareChartData = () => {
    if (!tableData || tableData.length === 0) {
      return [];
    }
    
    console.log('📊 === PREPARE CHART DATA START ===');
    console.log('📊 typeFilter:', typeFilter);
    console.log('📊 tableData.length:', tableData.length);
    
    // หา meter ทั้งหมดจาก slave_id
    // รองรับ slave_id ที่เป็น string หรือ number
    const meterIds = Array.from(new Set(tableData.map(row => String(row.slave_id))));
    if (meterIds.length === 0) {
      return [];
    }
    
    console.log('📊 meterIds:', meterIds);
    
    // สำหรับ Month view ให้ประมวลผลแยกต่างหาก
    if (typeFilter === '1month') {
      return prepareMonthChartData(meterIds);
    }
    
    // สำหรับ Year view ให้ประมวลผลแยกต่างหาก
    if (typeFilter === '1year') {
      return prepareYearChartData(meterIds);
    }
    
    // สำหรับ Day view - สร้าง time bucket ทุก 1 ชั่วโมง เริ่มจาก 9:00
    let timeBuckets = [];
    let t = 9 * 60; // เริ่มจาก 9:00 (540 นาที)
    while (t < 24 * 60) {
      timeBuckets.push(t);
      t += 60; // เปลี่ยนเป็น 60 นาที (1 ชั่วโมง)
    }
    // เพิ่มช่วงเวลาหลังเที่ยงคืน (1:00-8:00)
    t = 1 * 60; // เริ่มจาก 1:00 (60 นาที)
    while (t < 9 * 60) {
      timeBuckets.push(t);
      t += 60; // เปลี่ยนเป็น 60 นาที (1 ชั่วโมง)
    }
    const startMinutes = parseTimeToMinutes(timeFrom);
    const endMinutes = parseTimeToMinutes(timeTo);
    const processedRows = [];
    for (const targetMinute of timeBuckets) {
      const timeWindowStart = targetMinute;
      const timeWindowEnd = targetMinute + 60; // เปลี่ยนเป็น 60 นาที (1 ชั่วโมง)
      const inSelectedRange = targetMinute >= startMinutes && targetMinute <= endMinutes;
      // คำนวณค่า time สำหรับแกน X โดยให้ 9:00 เป็นจุดเริ่มต้น
      let timeValue = targetMinute / 60;
      if (targetMinute < 9 * 60) {
        // ช่วงหลังเที่ยงคืน (1:00-8:00) ให้เป็น 25-32
        timeValue = (targetMinute / 60) + 24;
      }
      
      const chartRow = {
        time: timeValue,
        displayLabel: `${Math.floor(targetMinute / 60).toString().padStart(2, '0')}:${((targetMinute % 60)).toString().padStart(2, '0')}`,
        windowStart: timeWindowStart,
        windowEnd: timeWindowEnd
      };
      meterIds.forEach(meterId => {
        displayColumns.forEach(column => {
          // สำหรับ Import kWh ใช้การคำนวณแบบ difference (ค่าสุดท้าย - ค่าแรก)
          if (column.toLowerCase().includes('import') && column.toLowerCase().includes('kwh')) {
            let firstValue = null;
            let lastValue = null;
            let firstTime = Infinity;
            let lastTime = -Infinity;
            
            for (const row of tableData) {
              // เปรียบเทียบ slave_id แบบ string
              if (String(row.slave_id) !== meterId) continue;
              const timeField = row.reading_timestamp || row.time;
              if (!timeField || typeof timeField !== 'string') continue;
              let totalMinutes = null;
              if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
                const localDate = new Date(timeField);
                totalMinutes = localDate.getHours() * 60 + localDate.getMinutes();
              } else if (timeField.includes(':')) {
                const parts = timeField.split(' ');
                const timePart = parts.find(part => part.includes(':')) || parts[parts.length - 1];
                const [hours, minutes] = timePart.split(':').map(Number);
                totalMinutes = hours * 60 + minutes;
              }
              if (totalMinutes === null || totalMinutes < timeWindowStart || totalMinutes >= timeWindowEnd) continue;
              if (row.hasOwnProperty(column)) {
                const value = row[column];
                let numValue = 0;
                if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                  numValue = parseFloat(value);
                } else if (typeof value === 'number' && !isNaN(value)) {
                  numValue = value;
                }
                
                // หาค่าแรกสุดและสุดท้าย
                if (totalMinutes <= firstTime) {
                  firstTime = totalMinutes;
                  firstValue = numValue;
                }
                if (totalMinutes >= lastTime) {
                  lastTime = totalMinutes;
                  lastValue = numValue;
                }
              }
            }
            
            // คำนวณตาม energyDisplayMode
            let finalValue = 0;
            if (energyDisplayMode === 'consumption') {
              // แสดงพลังงานที่ใช้ (difference)
              const diffValue = (lastValue !== null && firstValue !== null) ? (lastValue - firstValue) : 0;
              finalValue = Math.max(0, diffValue);
              console.log(`⚡ ${column}_${meterId} [${Math.floor(timeWindowStart/60)}:${(timeWindowStart%60).toString().padStart(2,'0')}-${Math.floor(timeWindowEnd/60)}:${(timeWindowEnd%60).toString().padStart(2,'0')}]: Consumption=${finalValue.toFixed(2)} (${lastValue?.toFixed(2)} - ${firstValue?.toFixed(2)})`);
            } else {
              // แสดงค่าสะสม (cumulative) - ใช้ค่าสุดท้ายในช่วงเวลา
              finalValue = lastValue !== null ? lastValue : 0;
              console.log(`⚡ ${column}_${meterId} [${Math.floor(timeWindowStart/60)}:${(timeWindowStart%60).toString().padStart(2,'0')}-${Math.floor(timeWindowEnd/60)}:${(timeWindowEnd%60).toString().padStart(2,'0')}]: Cumulative=${finalValue.toFixed(2)}`);
            }
            chartRow[`${column}_${meterId}`] = finalValue;
          } else {
            // สำหรับคอลัมน์อื่นๆ ใช้ maxValue เหมือนเดิม
            let maxValue = -Infinity;
            for (const row of tableData) {
              // เปรียบเทียบ slave_id แบบ string
              if (String(row.slave_id) !== meterId) continue;
              const timeField = row.reading_timestamp || row.time;
              if (!timeField || typeof timeField !== 'string') continue;
              let totalMinutes = null;
              if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
                const localDate = new Date(timeField);
                totalMinutes = localDate.getHours() * 60 + localDate.getMinutes();
              } else if (timeField.includes(':')) {
                const parts = timeField.split(' ');
                const timePart = parts.find(part => part.includes(':')) || parts[parts.length - 1];
                const [hours, minutes] = timePart.split(':').map(Number);
                totalMinutes = hours * 60 + minutes;
              }
              if (totalMinutes === null || totalMinutes < timeWindowStart || totalMinutes >= timeWindowEnd) continue;
              if (row.hasOwnProperty(column)) {
                const value = row[column];
                let numValue = 0;
                if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                  numValue = parseFloat(value);
                } else if (typeof value === 'number' && !isNaN(value)) {
                  numValue = value;
                }
                if (numValue > maxValue) {
                  maxValue = numValue;
                }
              }
            }
            chartRow[`${column}_${meterId}`] = maxValue !== -Infinity ? maxValue : 0;
          }
        });
      });
      processedRows.push(chartRow);
    }
    return processedRows;
  };

  // useEffect สำหรับอัปเดต monthDays เมื่อ tableData หรือ typeFilter เปลี่ยนแปลง
  useEffect(() => {
    if (typeFilter === '1month' && tableData.length > 0) {
      const daysSet = new Set<number>();
      tableData.forEach(row => {
        if (row.reading_timestamp && typeof row.reading_timestamp === 'string') {
          if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(row.reading_timestamp)) {
            const date = new Date(row.reading_timestamp);
            const day = date.getDate();
            if (day >= 1 && day <= 31) {
              daysSet.add(day);
            }
          }
        }
      });
      const sortedDays = Array.from(daysSet).sort((a, b) => a - b);
      setMonthDays(sortedDays);
    }
  }, [tableData, typeFilter]);

  // ข้อมูลสำหรับกราฟที่ได้จาก API
  const chartData = prepareChartData();
  
  // แบ่งข้อมูลเป็น 2 กราฟ
  const firstChartData = chartData.filter(row => row.time >= 9 && row.time <= 21.75); // 9:00-21:45
  const secondChartData = chartData.filter(row => (row.time >= 22 && row.time <= 24) || (row.time >= 25 && row.time <= 8.75)); // 22:00-24:00 และ 1:00-8:45
  
  // แสดงข้อมูลการเลือกคอลัมน์
  console.log('📊 Display Columns:', displayColumns);
  console.log('📊 Has Selected Columns:', hasSelectedColumns);
  console.log('📊 Context Selected Columns:', contextSelectedColumns);

  // คำนวณช่วงแกน X ตามข้อมูลจริง
  const getXAxisConfig = () => {
    if (typeFilter === '1year') {
      // สำหรับ Year view ให้แสดงแกน X เป็น 1-12 เสมอ
      return {
        domain: [1, 12],
        ticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };
    } else if (typeFilter === '1month') {
      // สำหรับ Month view ให้แสดงแกน X ตั้งแต่ 1-30 เสมอ
      return {
        domain: [1, 30],
        ticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
      };
    } else {
      // สำหรับ Day view ให้แสดงแกน X: 9 ถึง 32.75 โดยให้เลข 9 อยู่ซ้ายสุดและเป็นจุดเริ่มต้น
      return {
        domain: [9, 32.75],
        ticks: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
      };
    }
  };

  // คำนวณช่วงแกน Y ให้เต็มพื้นที่
  const getYAxisConfig = () => {
    if (chartData.length === 0) {
      return { domain: [0, 100] };
    }

    // หาค่าต่ำสุดและสูงสุดของข้อมูลทั้งหมด
    let minValue = Infinity;
    let maxValue = -Infinity;

    chartData.forEach(row => {
      displayColumns.forEach(column => {
        if (row[column] !== undefined && row[column] !== null) {
          const value = parseFloat(row[column]);
          if (!isNaN(value)) {
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
          }
        }
      });
    });

    // ถ้าไม่มีข้อมูลที่ถูกต้อง
    if (minValue === Infinity || maxValue === -Infinity) {
      return { domain: [0, 20] }; // ลดค่า default จาก 50 เป็น 20
    }

    // คำนวณขอบเขตให้เต็มพื้นที่และดูสวยงาม
    const range = maxValue - minValue;
    
    // ถ้าข้อมูลมีค่าเดียว ให้สร้างช่วงที่เหมาะสม
    if (range === 0) {
      const singleValue = minValue;
      const baseRange = Math.max(singleValue * 0.2, 5); // ใช้ 20% ของค่า หรือขั้นต่ำ 5
      return { domain: [Math.max(0, singleValue - baseRange), singleValue + baseRange] };
    }

    // ปรับ padding ให้ยืดหยุ่นตามขนาดของข้อมูล
    let padding;
    if (range < 10) {
      padding = range * 0.3; // ข้อมูลเล็ก ใช้ padding 30%
    } else if (range < 50) {
      padding = range * 0.2; // ข้อมูลปานกลาง ใช้ padding 20%
    } else {
      padding = range * 0.1; // ข้อมูลใหญ่ ใช้ padding 10%
    }

    // คำนวณค่าต่ำสุดและสูงสุด
    const minDomain = Math.max(0, minValue - padding);
    const maxDomain = maxValue + padding;

    // ปรับให้เป็นตัวเลขที่สวยงาม (round up)
    const niceMax = Math.ceil(maxDomain / 5) * 5; // ปัดขึ้นเป็นหลัก 5
    const niceMin = Math.floor(minDomain / 5) * 5; // ปัดลงเป็นหลัก 5

    return {
      domain: [Math.max(0, niceMin), niceMax]
    };
  };

  // ฟังก์ชันตรวจสอบว่าเป็นวันหยุดหรือไม่ (รวมวันหยุดจากฐานข้อมูล)
  const isHolidayDate = (date: Date): boolean => {
    // ตรวจสอบวันเสาร์/อาทิตย์
    const day = date.getDay();
    if (day === 0 || day === 6) {
      console.log(`🔍 Holiday Check: ${date.toDateString()} is weekend (day ${day})`);
      return true; // 0 = อาทิตย์, 6 = เสาร์
    }
    
    // ตรวจสอบวันหยุดจากฐานข้อมูล
    const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const foundHoliday = holidays.find(holiday => holiday.date === dateString);
    
    if (foundHoliday) {
      console.log(`🔍 Holiday Check: ${date.toDateString()} is holiday from database: ${foundHoliday.name_holiday}`);
      return true;
    }
    
    console.log(`🔍 Holiday Check: ${date.toDateString()} is working day`);
    return false;
  };

  // ฟังก์ชันตรวจสอบว่าวันที่ในเดือนเป็นวันหยุดหรือไม่ (สำหรับ Month view)
  const isHolidayDay = (dayOfMonth: number): boolean => {
    if (!dateFrom) {
      console.log(`❌ isHolidayDay(${dayOfMonth}): dateFrom is null`);
      return false;
    }
    
    // สร้าง Date object สำหรับวันที่ในเดือนนั้น
    const targetDate = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dayOfMonth);
    const result = isHolidayDate(targetDate);
    
    console.log(`🔍 isHolidayDay(${dayOfMonth}): ${targetDate.toDateString()} = ${result}`);
    return result;
  };

  // ฟังก์ชันสำหรับกำหนดสีแท่งกราฟตามช่วงเวลา TOU และมิเตอร์
  const getTOUBarColor = (timeValue: number, baseColor: string, meterIdx: number, totalMeters: number) => {
    console.log(`🎨 getTOUBarColor called: timeValue=${timeValue}, typeFilter=${typeFilter}, meterIdx=${meterIdx}`);

    if (typeFilter === '24h') {
      let touColor;
      // สำหรับ Day view - ตรวจสอบวันหยุด (รวมวันหยุดจากฐานข้อมูล)
      if (isHolidayDate(dateFrom)) {
        // วันหยุด (เสาร์/อาทิตย์ หรือวันหยุดจากฐานข้อมูล) - ทุกช่วงเป็น Off Peak (สีเขียว)
        touColor = '#4ade80';
      } else {
        // วันธรรมดา - ตรวจสอบช่วงเวลา
        // On Peak: 9:00-22:00 (timeValue 9-22)
        // Off Peak: 22:00-8:45 (timeValue 22-32.75)
        if (timeValue >= 9 && timeValue < 22) {
          touColor = '#fb923c'; // สีส้ม - On Peak
        } else {
          touColor = '#4ade80'; // สีเขียว - Off Peak
        }
      }
      
      console.log(`🎨 Day view TOU color: timeValue=${timeValue}, touColor=${touColor}`);
      
      // ถ้ามีหลายมิเตอร์ ให้ปรับ opacity เพื่อแयกแยะ
      if (totalMeters > 1) {
        const opacity = 1 - (meterIdx * 0.3);
        const finalColor = `${touColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
        console.log(`🎨 Multiple meters: opacity=${opacity}, finalColor=${finalColor}`);
        return finalColor;
      }
      
      return touColor;
    } else if (typeFilter === '1month') {
      let touColor;
      // สำหรับ Month view - ตรวจสอบวันหยุดตามวันที่ในเดือน
      if (isHolidayDay(timeValue)) {
        // วันหยุด - Off Peak (สีเขียว)
        touColor = '#4ade80';
      } else {
        // วันทำงาน - On Peak (สีส้ม)
        touColor = '#fb923c';
      }
      
      // ถ้ามีหลายมิเตอร์ ให้ปรับ opacity เพื่อแยกแยะ
      if (totalMeters > 1) {
        // มิเตอร์แรกใช้ opacity เต็ม, มิเตอร์ถัดไปใช้ opacity ลดลง
        const opacity = 1 - (meterIdx * 0.3);
        return `${touColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
      }
      
      return touColor;
    } else if (typeFilter === '1year') {
      // สำหรับ Year view - ทุกเดือนเป็น On Peak (สีส้ม) เพราะรวมทั้งปี
      const touColor = '#fb923c'; // สีส้ม - On Peak
      console.log(`🎨 Year view TOU color: month=${timeValue}, touColor=${touColor}`);
      
      // ถ้ามีหลายมิเตอร์ ให้ปรับ opacity เพื่อแยกแยะ
      if (totalMeters > 1) {
        const opacity = 1 - (meterIdx * 0.3);
        const finalColor = `${touColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
        console.log(`🎨 Multiple meters: opacity=${opacity}, finalColor=${finalColor}`);
        return finalColor;
      }
      
      return touColor;
    } else {
      // สำหรับ view อื่นๆ ใช้สีเดิม
      return baseColor;
    }
  };

  // ฟังก์ชันสำหรับกำหนดสีแท่งกราฟ Stacked ตามช่วงเวลา TOU
  const getStackedTOUBarColor = (timeValue: number, meterIdx: number, colIdx: number, totalColumns: number) => {
    console.log(`🎨 getStackedTOUBarColor called: timeValue=${timeValue}, meterIdx=${meterIdx}, colIdx=${colIdx}`);

    // สีที่ตัดโทนกันชัดเจนสำหรับ TOU
    const touColors = {
      onPeak: [
        '#e53e3e',  // แดง (Demand W)
        '#3182ce',  // น้ำเงิน (Demand Var)
        '#38a169',  // เขียว (Demand VA)
        '#d69e2e',  // เหลือง (Import kWh)
        '#805ad5',  // ม่วง (Export kWh)
        '#dd6b20',  // ส้ม (THDV)
        '#319795',  // เขียวน้ำทะเล (THDI)
        '#e53e3e'   // แดงเข้ม (อื่นๆ)
      ],
      offPeak: [
        '#c53030',  // แดงเข้ม (Demand W)
        '#2c5282',  // น้ำเงินเข้ม (Demand Var)
        '#2f855a',  // เขียวเข้ม (Demand VA)
        '#b7791f',  // เหลืองเข้ม (Import kWh)
        '#6b46c1',  // ม่วงเข้ม (Export kWh)
        '#c05621',  // ส้มเข้ม (THDV)
        '#2d3748',  // เทาเข้ม (THDI)
        '#c53030'   // แดงเข้มมาก (อื่นๆ)
      ]
    };

    let isOnPeak = false;

    if (typeFilter === '24h') {
      // Day view - ตรวจสอบวันหยุดและช่วงเวลา
      if (!isHolidayDate(dateFrom)) {
        // วันธรรมดา - ตรวจสอบช่วงเวลา
        if (timeValue >= 9 && timeValue < 22) {
          isOnPeak = true;
        }
      }
    } else if (typeFilter === '1month') {
      // Month view - ตรวจสอบวันหยุดตามวันที่
      if (!isHolidayDay(timeValue)) {
        isOnPeak = true; // วันทำงาน = On Peak
      }
    } else if (typeFilter === '1year') {
      // Year view - ทุกเดือนเป็น On Peak
      isOnPeak = true;
    }

    // เลือกสีตามช่วงเวลาและลำดับ
    const colorArray = isOnPeak ? touColors.onPeak : touColors.offPeak;
    const colorIndex = colIdx % colorArray.length; // ใช้ colIdx เพื่อให้สีตัดโทนกัน
    let finalColor = colorArray[colorIndex];

    // เพิ่มความโปร่งใสให้ดูอ่อนขึ้น (opacity 85%)
    const opacity = Math.round(0.85 * 255).toString(16).padStart(2, '0');
    finalColor = `${finalColor}${opacity}`;

    console.log(`🎨 Stacked TOU color: timeValue=${timeValue}, isOnPeak=${isOnPeak}, colorIndex=${colorIndex}, finalColor=${finalColor}`);

    return finalColor;
  };

  // ฟังก์ชันสำหรับคำนวณผลรวมตามช่วงเวลา TOU แยกตามมิเตอร์
  const getTOUSummaryData = () => {
    console.log('🔍 === TOU SUMMARY CALCULATION START ===');
    
    if ((typeFilter !== '24h' && typeFilter !== '1month' && typeFilter !== '1year') || chartData.length === 0) {
      console.log('❌ TOU Summary: Not supported view or no chart data');
      console.log('   - typeFilter:', typeFilter);
      console.log('   - chartData.length:', chartData.length);
      return [];
    }

    const isCurrentDayHoliday = isHolidayDate(dateFrom);
    console.log('📅 Date Info:');
    console.log('   - dateFrom:', dateFrom);
    console.log('   - isHoliday:', isCurrentDayHoliday);
    console.log('   - day of week:', dateFrom.getDay(), '(0=Sun, 6=Sat)');
    console.log('   - holidays in database:', holidays.length);

    const meterIds = Array.from(new Set(tableData.map(r => r.slave_id)));
    console.log('🏭 Meters Info:');
    console.log('   - meterIds:', meterIds);
    console.log('   - displayColumns:', displayColumns);

    const summaryData: any[] = [];

    // คำนวณแยกตามมิเตอร์
    meterIds.forEach((meterId, meterIndex) => {
      let onPeakSum = 0;
      let offPeakSum = 0;
      const meterName = getMeterNameBySlaveId(meterId);
      
      console.log(`\n🔄 Processing Meter ${meterIndex + 1}/${meterIds.length}:`);
      console.log('   - meterId:', meterId);
      console.log('   - meterName:', meterName);

      let onPeakCount = 0;
      let offPeakCount = 0;

      chartData.forEach((row, rowIndex) => {
        const timeValue = row.time;
        let isOnPeak = false;

        if (typeFilter === '24h') {
          // Day view - ตรวจสอบวันหยุดและช่วงเวลา
          if (!isCurrentDayHoliday) {
            // วันธรรมดา (ไม่ใช่วันหยุด) - ตรวจสอบช่วงเวลา
            if (timeValue >= 9 && timeValue < 22) {
              isOnPeak = true;
            }
          }
          // วันหยุด (เสาร์/อาทิตย์ หรือวันหยุดจากฐานข้อมูล) ทุกช่วงเป็น Off Peak
        } else if (typeFilter === '1month') {
          // Month view - ตรวจสอบวันหยุดตามวันที่
          if (!isHolidayDay(timeValue)) {
            // วันทำงาน - On Peak
            isOnPeak = true;
          }
          // วันหยุด - Off Peak
        } else if (typeFilter === '1year') {
          // Year view - ทุกเดือนเป็น On Peak เพราะรวมข้อมูลทั้งปี
          isOnPeak = true;
        }

        // รวมค่าจากคอลัมน์ที่เลือกของมิเตอร์นี้
        displayColumns.forEach(column => {
          const key = `${column}_${meterId}`;
          let value = parseFloat(row[key]) || 0;
          
          // TOU Summary ใช้ค่าสะสมรวมจากกราฟโดยตรง
          if (rowIndex < 3) { // แสดง log เฉพาะ 3 แถวแรก
            console.log(`     Row ${rowIndex}: time=${timeValue}, ${key}=${value} (TOU cumulative total), isOnPeak=${isOnPeak}`);
          }
          
          if (isOnPeak) {
            onPeakSum += value;
            onPeakCount++;
          } else {
            offPeakSum += value;
            offPeakCount++;
          }
        });
      });

      console.log('   📊 Results:');
      console.log('     - On Peak Sum:', onPeakSum.toFixed(2), `(${onPeakCount} data points)`);
      console.log('     - Off Peak Sum:', offPeakSum.toFixed(2), `(${offPeakCount} data points)`);
      console.log('     - Total Sum:', (onPeakSum + offPeakSum).toFixed(2));

      // เพิ่มข้อมูล On Peak และ Off Peak ของมิเตอร์นี้
      summaryData.push({
        meter: meterName,
        period: 'On Peak',
        value: onPeakSum,
        color: '#fb923c'
      });
      
      summaryData.push({
        meter: meterName,
        period: 'Off Peak',
        value: offPeakSum,
        color: '#4ade80'
      });
    });

    console.log('\n📈 Final Summary Data:');
    summaryData.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.meter} - ${item.period}: ${item.value.toFixed(2)} kW`);
    });
    
    console.log('✅ === TOU SUMMARY CALCULATION END ===\n');

    return summaryData;
  };

  // ฟังก์ชันสำหรับสร้าง TOU background areas
  const getTOUAreas = () => {
    if (typeFilter === '24h') {
      // สำหรับ Day view แสดง TOU areas - ตรวจสอบวันหยุด (รวมวันหยุดจากฐานข้อมูล)
      if (isHolidayDate(dateFrom)) {
        // วันหยุด (เสาร์/อาทิตย์ หรือวันหยุดจากฐานข้อมูล) - แสดงเฉพาะ Off Peak (สีเขียว) ตลอดช่วงที่แสดง รวม 9-8:45
        return [
          <ReferenceArea
            key="off-peak-weekend"
            x1={9}
            x2={32.75}
            fill="#4ade80"
            fillOpacity={0.3}
          />
        ];
      } else {
        // วันธรรมดา - แสดง TOU areas ตามช่วงเวลาที่กำหนด
        return [
          // On Peak: 09:00 - 22:00 (สีส้มเข้ม)
          <ReferenceArea
            key="on-peak"
            x1={9}
            x2={22}
            fill="#fb923c"
            fillOpacity={0.3}
          />,
          // Off Peak: 22:00 - 08:45 (สีเขียวเข้ม) - รวมช่วงกลางคืนและเช้าต่อเนื่องกัน
          <ReferenceArea
            key="off-peak"
            x1={22}
            x2={32.75}
            fill="#4ade80"
            fillOpacity={0.3}
          />
        ];
      }
    } else if (typeFilter === '1month') {
      // สำหรับ Month view แสดง TOU areas ตามวัน (1-30) เต็มพื้นที่
      const areas = [];
      
      console.log('🎨 === MONTH TOU AREAS GENERATION START ===');
      console.log('📅 Month/Year:', dateFrom?.getMonth() + 1, '/', dateFrom?.getFullYear());
      
      // สร้างพื้นหลังเต็มแกน X (0.5 ถึง 30.5) โดยไม่มีช่องว่าง
      for (let day = 1; day <= 30; day++) {
        const isHoliday = isHolidayDay(day);
        // ขยายพื้นที่ให้เต็มแกน X โดยไม่มีช่องว่าง (0.5 ถึง 30.5)
        const startX = day - 0;
        const endX = day + 1;
        
        console.log(`📅 Day ${day}: isHoliday=${isHoliday}, x1=${startX}, x2=${endX}`);
        
        if (isHoliday) {
          // วันหยุด (เสาร์/อาทิตย์ หรือวันหยุดจากฐานข้อมูล) - Off Peak (สีเขียว)
          areas.push(
            <ReferenceArea
              key={`off-peak-day-${day}`}
              x1={startX}
              x2={endX}
              fill="#4ade80"
              fillOpacity={0.3}
            />
          );
        } else {
          // วันทำงาน - On Peak (สีส้ม)
          areas.push(
            <ReferenceArea
              key={`on-peak-day-${day}`}
              x1={startX}
              x2={endX}
              fill="#fb923c"
              fillOpacity={0.3}
            />
          );
        }
      }
      
      // เพิ่มพื้นหลังเพื่อปิดช่องว่างที่เหลือ (0-0.5 และ 30.5-31)
      areas.push(
        <ReferenceArea
          key="fill-start"
          x1={0}
          x2={1}
          fill="#4ade80"
          fillOpacity={0.3}
        />
      );
      areas.push(
        <ReferenceArea
          key="fill-end"
          x1={30.5}
          x2={31}
          fill="#4ade80"
          fillOpacity={0.3}
        />
      );
      
      console.log('✅ === MONTH TOU AREAS GENERATION END ===');
      return areas;
    } else if (typeFilter === '1year') {
      // สำหรับ Year view แสดง TOU areas ตามเดือน
      const areas = [];
      
      for (let month = 1; month <= 12; month++) {
        // ขยายพื้นที่ให้เต็มแกน X (0.5 ถึง 12.5) โดยไม่มีช่องว่าง
        const startX = month === 1 ? 0.5 : month - 0.5;
        const endX = month === 12 ? 12.5 : month + 0.5;
        
        // แบ่งแต่ละเดือนเป็น 8 ส่วน (4 เขียว + 4 ส้ม)
        const sectionWidth = 1.0 / 8; // แต่ละส่วน = 0.125
        
        // สร้าง 4 แท่งเขียวเล็กๆ และ 4 แท่งส้มสลับกัน
        for (let section = 0; section < 8; section++) {
          const sectionStart = (month - 0.5) + (section * sectionWidth);
          const sectionEnd = sectionStart + sectionWidth;
          
          // ปรับให้เดือนแรกเริ่มจาก 0.5 และเดือนสุดท้ายจบที่ 12.5
          const adjustedStart = month === 1 && section === 0 ? 0.5 : sectionStart;
          const adjustedEnd = month === 12 && section === 7 ? 12.5 : sectionEnd;
          
          if (section % 2 === 0) {
            // ส่วนคู่ (0,2,4,6) = สีเขียว (Off Peak)
            areas.push(
              <ReferenceArea
                key={`off-peak-month-${month}-section-${section}`}
                x1={adjustedStart}
                x2={adjustedEnd}
                fill="#4ade80"
                fillOpacity={0.3}
              />
            );
          } else {
            // ส่วนคี่ (1,3,5,7) = สีส้ม (On Peak)
            areas.push(
              <ReferenceArea
                key={`on-peak-month-${month}-section-${section}`}
                x1={adjustedStart}
                x2={adjustedEnd}
                fill="#fb923c"
                fillOpacity={0.3}
              />
            );
          }
        }
      }
      
      return areas;
    }
    return [];
  };

  return (
    <PageLayout>
      <div className="pt-0 pb-6 animate-fade-in ml-0 sm:ml-2 md:ml-4 lg:ml-8">
        {/* Header */}
        <div className="flex justify-center mt-0">
          {/* Filters */}
          <Card className="bg-transparent shadow-none border-none w-full max-w-5xl rounded-t-xl rounded-b-none">
            <CardContent className="p-2 bg-transparent shadow-none">
              <div className="flex flex-wrap items-center gap-1 bg-white rounded-t-xl rounded-b-none px-2 py-1 justify-center text-xs">
                {/* Toggle Graph Type */}
                <ToggleGroup type="single" value={graphType} onValueChange={v => v && setGraphType(v as 'line' | 'bar')} className="mr-1">
                  <ToggleGroupItem value="line" aria-label="Line Graph" className="flex items-center gap-1 px-2 py-0 h-7 rounded-none text-xs data-[state=on]:bg-primary data-[state=on]:text-white">
                    <LineChart className="w-4 h-4" />
                    <span className="hidden sm:inline">{language === 'TH' ? 'เส้น' : 'Line'}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="bar" aria-label="Bar Graph" className="flex items-center gap-1 px-2 py-0 h-7 rounded-none text-xs data-[state=on]:bg-primary data-[state=on]:text-white">
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">{language === 'TH' ? 'แท่ง' : 'Bar'}</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                
                {/* Type Filter */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{language === 'TH' ? 'ประเภท' : 'Type'}</span>
                  <Select value={typeFilter} onValueChange={v => { 
                    const newTypeFilter = v as '24h' | '1month' | '1year';
                    setTypeFilter(newTypeFilter); 
                    
                    // เมื่อเปลี่ยนเป็น Day view ให้ set dateTo เป็นวันเดียวกับ dateFrom
                    if (newTypeFilter === '24h' && dateFrom) {
                      setDateTo(dateFrom);
                    }
                    
                    setIsLoaded(false); 
                  }}>
                    <SelectTrigger id="typeFilter" className="w-auto min-w-[70px] h-7 text-xs rounded-none border border-gray-300 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">{language === 'TH' ? 'วัน' : 'Day'}</SelectItem>
                      <SelectItem value="1month">{language === 'TH' ? 'เดือน' : 'Month'}</SelectItem>
                      <SelectItem value="1year">{language === 'TH' ? 'ปี' : 'Year'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                
                {/* Date From */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{language === 'TH' ? 'วันที่' : 'Date'}</span>
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
                      onSelect={date => {
                        if (typeFilter === '1month' && date) {
                          // ...existing code for 1month...
                          if (dateTo.getMonth() !== date.getMonth() || dateTo.getFullYear() !== date.getFullYear()) {
                            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                            setDateTo(new Date(date.getFullYear(), date.getMonth(), lastDay));
                          }
                          setDateFrom(date);
                          setIsLoaded(false);
                          return;
                        }
                        if (typeFilter === '1year' && date) {
                          // จำกัดช่วงให้เป็นปีเดียวกัน
                          setDateFrom(new Date(date.getFullYear(), 0, 1));
                          setDateTo(new Date(date.getFullYear(), 11, 31));
                          setIsLoaded(false);
                          return;
                        }
                        setDateFrom(date);
                        if (typeFilter === '24h' && date) {
                          setDateTo(date);
                        }
                        setIsLoaded(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                </div>
                
                {/* Time From */}
                <TimeInput24
                  value={timeFrom}
                  onChange={setTimeFrom}
                  className="h-7 w-10 text-xs rounded-none border-gray-200 shadow-sm px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                />

                {/* Date To */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{language === 'TH' ? 'ถึง' : 'To'}</span>
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
                        onSelect={date => {
                          if (typeFilter === '1month' && date) {
                            // ...existing code for 1month...
                            if (dateFrom.getMonth() !== date.getMonth() || dateFrom.getFullYear() !== date.getFullYear()) {
                              setDateFrom(new Date(date.getFullYear(), date.getMonth(), 1));
                            }
                            setDateTo(date);
                            setIsLoaded(false);
                            return;
                          }
                          if (typeFilter === '1year' && date) {
                            // จำกัดช่วงให้เป็นปีเดียวกัน
                            setDateFrom(new Date(date.getFullYear(), 0, 1));
                            setDateTo(new Date(date.getFullYear(), 11, 31));
                            setIsLoaded(false);
                            return;
                          }
                          setDateTo(date);
                          if (typeFilter === '24h' && date) {
                            setDateFrom(date);
                          }
                          setIsLoaded(false);
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Time To */}
                <TimeInput24
                  value={timeTo}
                  onChange={setTimeTo}
                  className="h-7 w-10 text-xs rounded-none border-gray-200 px-1 focus:ring-2 focus:ring-primary focus:border-primary"
                />
                
                
                {/* Load Button */}
                <Button
                  disabled={isLoading}
                  className={cn(
                    "h-7 px-2 text-xs rounded-none shadow flex items-center",
                    isLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-primary hover:bg-primary/90 focus:bg-primary active:bg-primary text-white"
                  )}
                  onClick={loadChartData}
                >
                  <Search className="w-4 h-4 mr-0" />
                  {isLoading ? (language === 'TH' ? 'กำลังโหลด...' : 'Loading...') : (language === 'TH' ? 'โหลดข้อมูล' : 'Load')}
                </Button>
                
                {/* Date Navigation */}
                <DateNavigation
                  onNavigate={handleDateNavigation}
                  className="ml-1"
                  disabled={isLoading}
                />
                
                {/* Print Button */}
                <Button
                  className="h-7 px-2 text-xs rounded-none bg-muted hover:bg-gray-200 shadow flex items-center ml-1"
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  disabled={!isLoaded || chartData.length === 0 || isLoading}
                >
                  <Printer className="w-4 h-4 mr-0" />
                </Button>

              </div>
            </CardContent>
          </Card>
        </div>

       
        {/* Data Table - ปรับให้ชิดกับส่วน filter */}
        <Card className="shadow-card">
          <CardHeader className="text-black py-1">
            <CardTitle className="text-center text-sm font-semibold w-full flex flex-wrap items-center justify-center gap-2">
              <span>{meterName} /</span>
              <span className="text-blue-600 font-bold">{formatDateTime(dateFrom, timeFrom)}</span>
              <span>–</span>
              <span className="text-green-600 font-bold">{formatDateTime(dateTo, timeTo)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <div ref={chartRef} className="h-[550px] w-full relative">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">{language === 'TH' ? 'กำลังโหลดข้อมูล...' : 'Loading...'}</p>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    {isLoaded 
                      ? (language === 'TH' ? 'ไม่มีข้อมูลในช่วงเวลาที่เลือก' : 'No data available for selected time range')
                      : (language === 'TH' ? 'กรุณากดปุ่ม Load เพื่อโหลดข้อมูล' : 'Please click Load button to load data')
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* TOU Summary Chart - แสดงในมุมขวาบนสำหรับ Day view, Month view และ Year view */}
                  {(typeFilter === '24h' || typeFilter === '1month' || typeFilter === '1year') && getTOUSummaryData().length > 0 && (
                    <div className={`absolute top-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border transition-all duration-300 ${
                      showTOUSummary ? 'right-2 w-64' : 'right-2 w-8'
                    }`}>
                      <div className="flex items-center justify-end p-2">
                        <button
                          onClick={() => setShowTOUSummary(!showTOUSummary)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-1 py-1 rounded hover:bg-gray-100"
                          title={showTOUSummary ? (language === 'TH' ? 'พับ' : 'Collapse') : (language === 'TH' ? 'ขยาย' : 'Expand')}
                        >
                          {showTOUSummary ? '−' : '+'}
                        </button>
                      </div>
                      {showTOUSummary && (
                        <div className="px-3 pb-3 space-y-2">
                          {getTOUSummaryData().map((item, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <div className="text-xs font-medium w-20 text-right">
                                {item.meter}
                              </div>
                              <div className="text-xs text-gray-600 w-12">
                                {item.period}
                              </div>
                              <div className="flex-1 bg-gray-200 h-5 relative overflow-hidden">
                                <div 
                                  className="h-full transition-all duration-300"
                                  style={{ 
                                    backgroundColor: item.color,
                                    width: `${Math.max((item.value / Math.max(...getTOUSummaryData().map(d => d.value))) * 100, 8)}%`
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-white drop-shadow-sm">
                                    {item.value >= 1000 
                                      ? `${(item.value / 1000).toFixed(1)}k` 
                                      : Math.round(item.value).toLocaleString()
                                    } kWh
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <ResponsiveContainer width="100%" height="100%">
                  {graphType === 'line' ? (
                    <RechartsLineChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 0, bottom: -20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        allowDuplicatedCategory={false}
                        domain={getXAxisConfig().domain}
                        type="number"
                        ticks={getXAxisConfig().ticks}
                        tickFormatter={(value) => {
                          if (typeFilter === '1year') {
                            return `${value}`;
                          } else if (typeFilter === '1month') {
                            return `${value}`;
                          } else {
                            if (value === 24) {
                              return '24';
                            } else if (value >= 25 && value <= 32) {
                              return `${value - 24}`;
                            } else if (value > 32) {
                              const minutes = Math.round((value - 32) * 60);
                              return `8:${minutes.toString().padStart(2, '0')}`;
                            }
                            return `${Math.round(value)}`;
                          }
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        domain={getYAxisConfig().domain}
                        tickFormatter={(value) => {
                          if (value >= 1000) {
                            return `${(value / 1000).toFixed(1)}k`;
                          }
                          return value.toString();
                        }}
                      />
                      <Tooltip content={<CustomLineTooltip typeFilter={typeFilter} />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{
                          marginTop: 80,
                          fontSize: 12
                        }}
                      />
                      {/* TOU Background Areas - แสดงเฉพาะเมื่อเป็น Line Chart */}
                      {getTOUAreas()}
                      {/* แสดงเส้นกราฟตามคอลัมน์ที่เลือก */}
                      {Array.from(new Set(tableData.map(row => row.slave_id))).map((meterId, meterIdx) => (
                        displayColumns.map((column, colIdx) => {
                          const colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];
                          return (
                            <Line
                              key={`${column}_${meterId}`}
                              type="monotone"
                              dataKey={`${column}_${meterId}`}
                              name={`${column} (${getMeterNameBySlaveId(meterId)})`}
                              stroke={colors[(meterIdx * displayColumns.length + colIdx) % colors.length]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={false}
                              connectNulls={true}
                            />
                          );
                        })
                      ))}
                    </RechartsLineChart>
                  ) : (
                    <RechartsBarChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 0, bottom: -20 }}
                      barSize={typeFilter === '24h' ? 12 : 25}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        allowDuplicatedCategory={false}
                        domain={getXAxisConfig().domain}
                        type="number"
                        ticks={getXAxisConfig().ticks}
                        tickFormatter={(value) => {
                          if (typeFilter === '1year') {
                            return `${value}`;
                          } else if (typeFilter === '1month') {
                            return `${value}`;
                          } else {
                            if (value === 24) {
                              return '24';
                            } else if (value >= 25 && value <= 32) {
                              return `${value - 24}`;
                            } else if (value > 32) {
                              const minutes = Math.round((value - 32) * 60);
                              return `8:${minutes.toString().padStart(2, '0')}`;
                            }
                            return `${Math.round(value)}`;
                          }
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        domain={getYAxisConfig().domain}
                        tickFormatter={(value) => {
                          if (value >= 1000) {
                            return `${(value / 1000).toFixed(1)}k`;
                          }
                          return value.toString();
                        }}
                      />
                      {/* ลบ Tooltip สำหรับ Bar Chart เพื่อให้สี TOU ทำงานได้ */}
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{
                          marginTop: 80,
                          fontSize: 12
                        }}
                      />
                      {/* TOU Background Areas - ไม่แสดงสำหรับ Bar Chart */}
                      {/* {getTOUAreas()} */}
                      {/* แสดงแท่งกราฟตามคอลัมน์ที่เลือก - สีตามช่วงเวลา TOU */}
                      {(() => {
                        const meterIds = Array.from(new Set(tableData.map(row => row.slave_id)));
                        const hasMultipleColumns = displayColumns.length > 1; // มีหลาย parameter
                        const hasMultipleMeters = meterIds.length > 1; // มีหลายมิเตอร์
                        
                        return meterIds.map((meterId, meterIdx) => (
                          displayColumns.map((column, colIdx) => {
                            // สีที่ตัดโทนกันชัดเจนสำหรับแต่ละ parameter
                            const parameterColors = [
                              '#e53e3e',  // แดง (Demand W)
                              '#3182ce',  // น้ำเงิน (Demand Var)
                              '#38a169',  // เขียว (Demand VA)
                              '#d69e2e',  // เหลือง (Import kWh)
                              '#805ad5',  // ม่วง (Export kWh)
                              '#dd6b20',  // ส้ม (THDV)
                              '#319795',  // เขียวน้ำทะเล (THDI)
                              '#e53e3e'   // แดงเข้ม (อื่นๆ)
                            ];
                            
                            // ใช้สีตาม parameter index (ไม่ขึ้นกับมิเตอร์)
                            const baseColor = parameterColors[colIdx % parameterColors.length];
                            
                            // สร้าง pattern สำหรับแยกแยะมิเตอร์
                            const patternId = `pattern-meter-${meterIdx}-${colIdx}`;
                            
                            return (
                              <>
                                {/* สร้าง SVG Pattern สำหรับแต่ละมิเตอร์ */}
                                {hasMultipleMeters && (
                                  <defs key={`defs-${patternId}`}>
                                    <pattern
                                      id={patternId}
                                      patternUnits="userSpaceOnUse"
                                      width="8"
                                      height="8"
                                    >
                                      <rect width="8" height="8" fill={baseColor} />
                                      {/* ลวดลายต่างกันสำหรับแต่ละมิเตอร์ */}
                                      {meterIdx === 0 && (
                                        // มิเตอร์ที่ 1: ไม่มีลวดลาย (สีเต็ม)
                                        <rect width="8" height="8" fill={baseColor} />
                                      )}
                                      {meterIdx === 1 && (
                                        // มิเตอร์ที่ 2: เส้นทแยง
                                        <path d="M0,8 L8,0" stroke="white" strokeWidth="1" />
                                      )}
                                      {meterIdx === 2 && (
                                        // มิเตอร์ที่ 3: จุด
                                        <circle cx="4" cy="4" r="1" fill="white" />
                                      )}
                                      {meterIdx === 3 && (
                                        // มิเตอร์ที่ 4: เส้นแนวนอน
                                        <path d="M0,4 L8,4" stroke="white" strokeWidth="1" />
                                      )}
                                      {meterIdx >= 4 && (
                                        // มิเตอร์ที่ 5+: เส้นแนวตั้ง
                                        <path d="M4,0 L4,8" stroke="white" strokeWidth="1" />
                                      )}
                                    </pattern>
                                  </defs>
                                )}
                                
                                <Bar
                                  key={`${column}_${meterId}`}
                                  dataKey={`${column}_${meterId}`}
                                  name={`${column} (${getMeterNameBySlaveId(meterId)})`}
                                  fill={hasMultipleMeters ? `url(#${patternId})` : baseColor}
                                  stackId={hasMultipleColumns ? `meter-${meterId}` : undefined} // แต่ละมิเตอร์มี stack แยกกัน
                                >
                                  {chartData.map((entry, index) => {
                                    // กำหนดสีตามช่วงเวลา TOU สำหรับ Day view, Month view และ Year view
                                    let fillColor = hasMultipleMeters ? `url(#${patternId})` : baseColor;
                                    if ((typeFilter === '24h' || typeFilter === '1month' || typeFilter === '1year') && entry.time !== undefined) {
                                      const totalMeters = Array.from(new Set(tableData.map(row => row.slave_id))).length;
                                      
                                      if (hasMultipleColumns) {
                                        // สำหรับ Stacked Bar ใช้สีตาม TOU
                                        const touColor = getStackedTOUBarColor(entry.time, meterIdx, colIdx, displayColumns.length);
                                        fillColor = hasMultipleMeters ? `url(#${patternId})` : touColor;
                                      } else {
                                        // สำหรับ Bar Chart เดี่ยวใช้สีปกติ
                                        fillColor = getTOUBarColor(entry.time, baseColor, meterIdx, totalMeters);
                                      }
                                      console.log(`🎨 Bar ${index}: time=${entry.time}, fillColor=${fillColor}, typeFilter=${typeFilter}, hasMultipleColumns=${hasMultipleColumns}, hasMultipleMeters=${hasMultipleMeters}`);
                                    }
                                    
                                    return (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={fillColor}
                                      />
                                    );
                                  })}
                                </Bar>
                              </>
                            );
                          })
                        ));
                      })()}
                    </RechartsBarChart>
                  )}
                </ResponsiveContainer>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Print Modal */}
        <PrintModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          onSendReport={handleSendReport}
          isLoaded={isLoaded}
          hasData={chartData.length > 0}
          isLoading={isLoading}
          isSending={isSending}
          emailGroups={emailGroups}
          lineGroups={lineGroups}
          emailList={emailList}
          lineList={lineList}
        />
      </div>
    </PageLayout>
  );
}