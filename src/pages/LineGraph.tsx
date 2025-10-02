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
import { usePermissions } from '@/hooks/usePermissions';
import useCustomSwal from '@/utils/swal';
import { TableColumnContext } from '../components/ui/sidebar-menu';
import { useMeterTree } from '@/context/MeterTreeContext';
import { apiClient, TableDataRow as ApiTableDataRow, handleApiError } from '@/services/api';
import { DateNavigation } from '@/components/ui/date-navigation';
import { PrintModal } from '@/components/ui/print-modal';
import { useDateNavigation } from '@/hooks/use-date-navigation';
import { handleSendReport, fetchReportGroups } from '@/utils/reportUtils';
import { useEmailData } from '@/context/EmailDataContext';
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
  Bar
} from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TimeInput24 } from '@/components/ui/time-input-24';

// Custom Tooltip สำหรับแสดงค่าทั้งหมดของทุกเส้นที่เวลาเดียวกัน
const CustomLineTooltip = ({ active, payload, label, typeFilter }: {
  active?: boolean;
  payload?: Array<{
    value: number | string;
    name: string;
    color: string;
  }>;
  label?: number | string;
  typeFilter: '24h' | '1month' | '1year';
}) => {
  // Get language from context
  const { language } = useLanguage();
  if (active && payload && payload.length > 0) {
    let timeLabel = '';
    if (typeof label === 'number') {
      if (typeFilter === '1year') {
        timeLabel = language === 'TH' ? `เดือน: ${label}` : `Month: ${label}`;
      } else if (typeFilter === '1month') {
        timeLabel = language === 'TH' ? `วันที่: ${label}` : `Day: ${label}`;
      } else {
        const hours = Math.floor(label);
        const minutes = Math.round((label % 1) * 60);
        timeLabel = language === 'TH'
          ? `เวลา: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
          : `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    } else {
      timeLabel = language === 'TH' ? `เวลา: ${label}` : `Time: ${label}`;
    }

    return (
      <div style={{ background: 'white', border: '1px solid #ccc', padding: 8, borderRadius: 4 }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{language === 'TH' ? 'ค่าทั้งหมดที่เวลาเดียวกัน' : 'All values'}</div>
        <div style={{ fontSize: '12px' }}>{timeLabel}</div>
        {payload.map((entry, index) => {
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

export default function LineGraph() {
  const { toast } = useToast();
  const { permissions, isAdmin, hasPermission } = usePermissions();
  const { showSuccessToast, showErrorToast } = useCustomSwal();
  
  const { language } = useLanguage();
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
  
  // Date navigation hook
  const { dateRange, navigateDate, setDateRangeManually } = useDateNavigation();
  
  // Print modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailGroups, setEmailGroups] = useState<{ id: number; name: string }[]>([]);
  const [lineGroups, setLineGroups] = useState<{ id: number; name: string }[]>([]);
  const [emailList, setEmailList] = useState<any[]>([]);
  const [lineList, setLineList] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  // ใช้ context สำหรับ selected columns และ meter tree
  const context = useContext(TableColumnContext);
  const contextSelectedColumns = context?.selectedColumns || [];
  const { selectedSlaveIds, selectedMeterNames, treeData } = useMeterTree();
  
  // ใช้ EmailDataContext สำหรับ LINE data
  const emailDataCtx = useEmailData();

  // Fetch email/line groups and users for print modal using EmailDataContext
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // ใช้ EmailDataContext แทน fetchReportGroups เพื่อให้ได้ข้อมูลที่ถูกต้อง
        if (emailDataCtx) {
          setEmailGroups(emailDataCtx.emailGroups);
          setLineGroups(emailDataCtx.lineGroups);
          setEmailList(emailDataCtx.emailList);
          setLineList(emailDataCtx.lineList);
          
          console.log('📧 Using EmailDataContext:', {
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
          
          console.log('📧 Fallback to fetchReportGroups:', {
            emailGroups: groups.emailGroups.length,
            lineGroups: groups.lineGroups.length,
            emailList: groups.emailList.length,
            lineList: groups.lineList.length
          });
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    fetchGroups();
  }, [emailDataCtx]);

  // Debug: แสดงข้อมูลการเลือกมิเตอร์
  console.log('🔍 LineGraph Debug:', {
    selectedSlaveIds,
    selectedMeterNames,
    contextSelectedColumns
  });

  // Export และ Send Report Functions
  const handleExport = async (exportType: 'pdf' | 'csv' | 'image' | 'text') => {
    if (!chartData || chartData.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      if (exportType === 'image') {
        // Export as image with metadata
        if (chartRef.current) {
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 1.5, // ลดจาก 2 เป็น 1.5 เพื่อให้ภาพเล็กลง
            logging: false,
            useCORS: true
          });
          
          // Create a new canvas with metadata
          const finalCanvas = document.createElement('canvas');
          const ctx = finalCanvas.getContext('2d');
          
          if (ctx) {
            // Calculate dimensions - เพิ่มพื้นที่สำหรับ Legend
            const legendEntries = selectedSlaveIds.length * displayColumns.length;
            const metadataHeight = 100 + (legendEntries * 16) + 30; // เพิ่มพื้นที่สำหรับ Legend
            const chartWidth = Math.floor(canvas.width * 0.8); // ลดขนาดกราฟเพื่อให้พื้นที่ Legend
            const chartHeight = Math.floor(canvas.height * 0.8);
            
            finalCanvas.width = Math.max(chartWidth, 700); // เพิ่มความกว้างขั้นต่ำ
            finalCanvas.height = chartHeight + metadataHeight + 20; // รวมพื้นที่ทั้งหมด
            
            // Set background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            
            // Add metadata text
            ctx.fillStyle = '#333333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            
            const metadata = [
              `WebMeter Line Graph Report`,
              `Generated: ${getCurrentDateTimeString()}`,
              `Date: ${format(dateFrom, 'dd MMMM yyyy')} ${timeFrom} - ${format(dateTo, 'dd MMMM yyyy')} ${timeTo}`,
              `Meters: ${selectedMeterNames.join(', ')}`
            ];
            
            // Add basic metadata
            metadata.forEach((text, index) => {
              ctx.fillText(text, 20, 25 + (index * 20));
            });
            
            // Add Legend information
            let legendY = 25 + (metadata.length * 20) + 10; // Start after metadata
            ctx.font = '12px Arial';
            ctx.fillText('Legend:', 20, legendY);
            legendY += 15;
            
            // Generate legend entries based on selected meters and columns
            const colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];
            let colorIndex = 0;
            
            selectedSlaveIds.forEach((slaveId, meterIndex) => {
              const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
              displayColumns.forEach((column, columnIndex) => {
                const color = colors[colorIndex % colors.length];
                const legendText = `${meterName} - ${column}`;
                
                // Draw color box
                ctx.fillStyle = color;
                ctx.fillRect(25, legendY - 10, 12, 12);
                
                // Draw legend text
                ctx.fillStyle = '#333333';
                ctx.fillText(legendText, 45, legendY);
                
                legendY += 16;
                colorIndex++;
              });
            });
            
            // Draw the chart (scaled down) after Legend
            const chartX = (finalCanvas.width - chartWidth) / 2; // จัดกึ่งกลาง
            const chartY = legendY + 10; // วางกราฟหลัง Legend
            ctx.drawImage(canvas, chartX, chartY, chartWidth, chartHeight);
            
            // Download the final image
            const link = document.createElement('a');
            link.download = `LineGraph_${format(new Date(), 'ddMMyyyy')}.png`;
            link.href = finalCanvas.toDataURL();
            link.click();
          }
        }
      } else if (exportType === 'pdf') {
        // Export as PDF with data table only (no chart)
        const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
        
        // Add title
        pdf.setFontSize(16);
        pdf.text('WebMeter Line Graph Report', 20, 20);
        
        // Add date range
        pdf.setFontSize(12);
        const dateRangeText = `Date: ${format(dateFrom, 'dd MMMM yyyy')} ${timeFrom} - ${format(dateTo, 'dd MMMM yyyy')} ${timeTo}`;
        pdf.text(dateRangeText, 20, 30);
        
        // Add selected meters
        const metersText = `Meters: ${selectedMeterNames.join(', ')}`;
        pdf.text(metersText, 20, 40);
        
        // Add data table (start higher up since no chart and no total records)
        let yPosition = 60;
        pdf.setFontSize(14);
        pdf.text('Data Table:', 20, yPosition);
        yPosition += 10;
        
        // Table headers
        pdf.setFontSize(8); // Smaller font to fit more data
        const headers = ['Time', ...displayColumns.flatMap(col => 
          selectedMeterNames.map(meter => `${meter} - ${col}`)
        )];
        
        let xPosition = 20;
        const colWidth = Math.min(35, (270 - 20) / headers.length); // Dynamic column width
        headers.forEach(header => {
          pdf.text(header, xPosition, yPosition);
          xPosition += colWidth;
        });
        yPosition += 8;
        
        // Table data - show ALL data, not just first 20
        chartData.forEach((row, index) => {
          xPosition = 20;
          pdf.text(row.originalTime || row.displayLabel || '', xPosition, yPosition);
          xPosition += colWidth;
          
          displayColumns.forEach(col => {
            selectedMeterNames.forEach(meter => {
              const dataKey = `${meter} - ${col}`;
              const value = row[dataKey];
              pdf.text(typeof value === 'number' ? value.toFixed(2) : (value || '0'), xPosition, yPosition);
              xPosition += colWidth;
            });
          });
          yPosition += 5;
          
          if (yPosition > 190) { // New page if needed
            pdf.addPage();
            yPosition = 20;
            
            // Add headers on new page
            pdf.setFontSize(8);
            xPosition = 20;
            headers.forEach(header => {
              pdf.text(header, xPosition, yPosition);
              xPosition += colWidth;
            });
            yPosition += 8;
          }
        });
        
        pdf.save(`LineGraph_${format(new Date(), 'ddMMyyyy')}.pdf`);
        
      } else if (exportType === 'csv') {
        // Export as CSV with ALL data
        const headers = ['Time', ...displayColumns.flatMap(col => 
          selectedMeterNames.map(meter => `${meter} - ${col}`)
        )];
        
        // Add metadata as comments
        const metadata = [
          `# WebMeter Line Graph Report`,
          `# Generated: ${getCurrentDateTimeString()}`,
          `# Date: ${format(dateFrom, 'dd MMMM yyyy')} ${timeFrom} - ${format(dateTo, 'dd MMMM yyyy')} ${timeTo}`,
          `# Meters: ${selectedMeterNames.join(', ')}`,
          ``
        ];
        
        const csvContent = [
          ...metadata,
          headers.join(','),
          ...chartData.map(row => {
            const values = [
              `"${row.originalTime || row.displayLabel || ''}"`, // Quote time values
              ...displayColumns.flatMap(col => 
                selectedMeterNames.map(meter => {
                  const dataKey = `${meter} - ${col}`;
                  const value = row[dataKey];
                  return typeof value === 'number' ? value.toFixed(2) : (value || '0');
                })
              )
            ];
            return values.join(',');
          })
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `LineGraph_${format(new Date(), 'ddMMyyyy')}.csv`;
        link.click();
        
      } else if (exportType === 'text') {
        // Export as Text with ALL data
        let textContent = `WEBMETER LINE GRAPH REPORT\n`;
        textContent += `${'='.repeat(50)}\n\n`;
        textContent += `Generated: ${getCurrentDateTimeString()}\n`;
        textContent += `Date: ${format(dateFrom, 'dd MMMM yyyy')} ${timeFrom} - ${format(dateTo, 'dd MMMM yyyy')} ${timeTo}\n`;
        textContent += `Meters: ${selectedMeterNames.join(', ')}\n\n`;
        
        // Add data table with better formatting
        const headers = ['Time', ...displayColumns.flatMap(col => 
          selectedMeterNames.map(meter => `${meter} - ${col}`)
        )];
        
        // Calculate column widths for better alignment
        const colWidths = headers.map((header, index) => {
          const maxDataWidth = Math.max(
            header.length,
            ...chartData.map(row => {
              if (index === 0) {
                return (row.originalTime || row.displayLabel || '').length;
              } else {
                const colIndex = index - 1;
                const colName = displayColumns[Math.floor(colIndex / selectedMeterNames.length)];
                const meterIndex = colIndex % selectedMeterNames.length;
                const meterName = selectedMeterNames[meterIndex];
                const dataKey = `${meterName} - ${colName}`;
                const value = row[dataKey];
                return (typeof value === 'number' ? value.toFixed(2) : (value || '0')).length;
              }
            })
          );
          return Math.min(maxDataWidth + 2, 20); // Max width 20 chars
        });
        
        // Add headers with proper spacing
        const headerLine = headers.map((header, index) => 
          header.padEnd(colWidths[index])
        ).join('');
        textContent += headerLine + '\n';
        textContent += colWidths.map(width => '-'.repeat(width)).join('') + '\n';
        
        // Add all data rows
        chartData.forEach(row => {
          const values = [
            row.originalTime || row.displayLabel || '',
            ...displayColumns.flatMap(col => 
              selectedMeterNames.map(meter => {
                const dataKey = `${meter} - ${col}`;
                const value = row[dataKey];
                return typeof value === 'number' ? value.toFixed(2) : (value || '0');
              })
            )
          ];
          
          const dataLine = values.map((value, index) => 
            value.toString().padEnd(colWidths[index])
          ).join('');
          textContent += dataLine + '\n';
        });
        
        textContent += `\n${'='.repeat(50)}\n`;
        textContent += `End of Report - Total ${chartData.length} records\n`;
        
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `LineGraph_${format(new Date(), 'ddMMyyyy')}.txt`;
        link.click();
      }
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleSendReportWrapper = async (payload: any) => {
    if (!chartData || chartData.length === 0) {
      alert('No data to send');
      return;
    }

    setIsSending(true);
    
    try {
      // สำหรับ image export ให้ใช้ custom capture logic เหมือน handleExport
      let customImageCapture = null;
      if (payload.exportType === 'image') {
        console.log('📧 Creating custom image capture for LineGraph email');
        
        customImageCapture = async () => {
          if (!chartRef.current) {
            throw new Error('Chart reference not found');
          }
          
          console.log('📧 Using same logic as handleExport for email image');
          
          // ใช้ logic เดียวกันกับ handleExport สำหรับ image
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 1.5, // ใช้ scale เดียวกับ download
            logging: false,
            useCORS: true
          });
          
          // Create a new canvas with metadata (เหมือน handleExport)
          const finalCanvas = document.createElement('canvas');
          const ctx = finalCanvas.getContext('2d');
          
          if (ctx) {
            // Calculate dimensions - เพิ่มพื้นที่สำหรับ Legend (เหมือน handleExport)
            const legendEntries = selectedSlaveIds.length * displayColumns.length;
            const metadataHeight = 100 + (legendEntries * 16) + 30; // เพิ่มพื้นที่สำหรับ Legend
            const chartWidth = Math.floor(canvas.width * 0.8); // ลดขนาดกราฟเพื่อให้พื้นที่ Legend
            const chartHeight = Math.floor(canvas.height * 0.8);
            
            finalCanvas.width = Math.max(chartWidth, 700); // เพิ่มความกว้างขั้นต่ำ
            finalCanvas.height = chartHeight + metadataHeight + 20; // รวมพื้นที่ทั้งหมด
            
            // Set background (เหมือน handleExport)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            
            // Add metadata text (เหมือน handleExport)
            ctx.fillStyle = '#333333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            
            const metadata = [
              `WebMeter Line Graph Report`,
              `Generated: ${getCurrentDateTimeString()}`,
              `Date: ${format(dateFrom, 'dd MMMM yyyy')} ${timeFrom} - ${format(dateTo, 'dd MMMM yyyy')} ${timeTo}`,
              `Meters: ${selectedMeterNames.join(', ')}`
            ];
            
            // Add basic metadata (เหมือน handleExport)
            metadata.forEach((text, index) => {
              ctx.fillText(text, 20, 25 + (index * 20));
            });
            
            // Add Legend information (เหมือน handleExport)
            let legendY = 25 + (metadata.length * 20) + 10; // Start after metadata
            ctx.font = '12px Arial';
            ctx.fillText('Legend:', 20, legendY);
            legendY += 15;
            
            // Generate legend entries based on selected meters and columns (เหมือน handleExport)
            const colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];
            let colorIndex = 0;
            
            selectedSlaveIds.forEach((slaveId, meterIndex) => {
              const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
              displayColumns.forEach((column, columnIndex) => {
                const color = colors[colorIndex % colors.length];
                const legendText = `${meterName} - ${column}`;
                
                // Draw color box (เหมือน handleExport)
                ctx.fillStyle = color;
                ctx.fillRect(25, legendY - 10, 12, 12);
                
                // Draw legend text (เหมือน handleExport)
                ctx.fillStyle = '#333333';
                ctx.fillText(legendText, 45, legendY);
                
                legendY += 16;
                colorIndex++;
              });
            });
            
            // Draw the chart (scaled down) after Legend (เหมือน handleExport)
            const chartX = (finalCanvas.width - chartWidth) / 2; // จัดกึ่งกลาง
            const chartY = legendY + 10; // วางกราฟหลัง Legend
            ctx.drawImage(canvas, chartX, chartY, chartWidth, chartHeight);
            
            console.log('📧 Custom image created with same logic as download');
            return finalCanvas.toDataURL('image/png');
          }
          
          // Fallback ถ้า context ไม่ได้
          console.log('📧 Fallback to simple canvas');
          return canvas.toDataURL('image/png');
        };
      }

      // Transform chartData to match reportUtils expected format
      const transformedData = chartData.map(row => ({
        ...row,
        reading_timestamp: row.originalTime || row.displayLabel || row.time,
        time: row.originalTime || row.displayLabel || row.time
      }));

      // Create flat column headers for reportUtils (like TableData format)
      const flatColumns = displayColumns.flatMap(col => 
        selectedMeterNames.map(meter => `${meter} - ${col}`)
      );

      // Prepare report data in the format expected by reportUtils
      const reportData = {
        filteredData: transformedData,
        displayColumns: flatColumns, // Use flat columns instead of nested
        meterName: selectedMeterNames.join(', '),
        dateRange: `${format(dateFrom, 'dd MMMM yyyy')} - ${format(dateTo, 'dd MMMM yyyy')}`,
        timeRange: `${timeFrom} - ${timeTo}`,
          reportTitle: 'WebMeter Line Graph Report', // Custom title for email
        customImageCapture, // เพิ่ม customImageCapture สำหรับ image export
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
            if (typeof dateTime === 'number' || /^\d+\.?\d*$/.test(dateTime)) {
              const hourValue = parseFloat(dateTime);
              const hours = Math.floor(hourValue);
              const minutes = Math.round((hourValue % 1) * 60);
              return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
            
            // Try to parse as Date
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
        }
      };

      const groups = {
        emailGroups,
        lineGroups,
        emailList,
        lineList
      };

      // Debug logging
      console.log('📧 Sending report with data:', {
        payload,
        reportDataSample: {
          filteredDataCount: reportData.filteredData.length,
          displayColumns: reportData.displayColumns,
          meterName: reportData.meterName,
          dateRange: reportData.dateRange,
          timeRange: reportData.timeRange,
          reportTitle: reportData.reportTitle, // Debug report title
          sampleRow: reportData.filteredData[0],
          sampleColumnValues: reportData.displayColumns.map(col => ({
            column: col,
            value: reportData.getColumnValue(reportData.filteredData[0], col)
          }))
        },
        groupsInfo: {
          emailGroups: groups.emailGroups.length,
          lineGroups: groups.lineGroups.length,
          emailList: groups.emailList.length,
          lineList: groups.lineList.length
        }
      });

      // Pass emailDataCtx to handleSendReport for LINE functionality
      await handleSendReport(
        payload,
        reportData,
        groups,
        showSuccessToast,
        showErrorToast,
        emailDataCtx // Pass EmailDataContext for LINE functionality
      );
      
    } catch (error) {
      console.error('Send report error:', error);
      showErrorToast('Failed to send report. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // หาข้อมูล meter ที่เลือก
  const meterName = selectedMeterNames.length > 0 ? selectedMeterNames[0] : 'AMR-BF-01';

  // คอลัมน์ที่บังคับให้แสดงเสมอ
  const mandatoryColumns = ['WATT', 'VAR', 'VA'];
  
  // ใช้คอลัมน์ที่เลือกทั้งหมด หรือคอลัมน์บังคับหากไม่มีการเลือก
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

  // useEffect สำหรับโหลดข้อมูลเมื่อเลือกมิเตอร์ (ใช้ debounce เพื่อรอการเลือกเสร็จสิ้น)
  useEffect(() => {
    console.log('🔍 LineGraph useEffect - selectedSlaveIds changed:', selectedSlaveIds);
    console.log('🔍 LineGraph useEffect - selectedMeterNames:', selectedMeterNames);
    console.log('🔍 LineGraph useEffect - dateFrom:', dateFrom);
    console.log('🔍 LineGraph useEffect - dateTo:', dateTo);
    
    // ใช้ debounce เพื่อรอให้การเลือกมิเตอร์เสร็จสิ้น
    const timeoutId = setTimeout(() => {
      // ถ้าเลือกมิเตอร์แล้วและมีข้อมูลวันที่ ให้โหลดข้อมูล
      if (selectedSlaveIds.length > 0 && dateFrom && dateTo) {
        console.log('🚀 Auto-loading data for selected meters (after debounce):', selectedSlaveIds);
        loadChartData();
      } else if (selectedSlaveIds.length > 0) {
        console.log('⚠️ มีการเลือกมิเตอร์แล้ว แต่ยังไม่มีข้อมูลวันที่');
        // ถ้าเลือกมิเตอร์แล้วแต่ยังไม่มีวันที่ ให้ตั้งค่าวันที่เป็นวันปัจจุบัน
        const today = new Date();
        setDateFrom(today);
        setDateTo(today);
        // รอให้ state อัปเดตแล้วค่อยโหลดข้อมูล
        setTimeout(() => {
          if (selectedSlaveIds.length > 0) {
            console.log('🚀 Loading data after setting dates:', selectedSlaveIds);
            loadChartData();
          }
        }, 100);
      }
    }, 500); // รอ 500ms เพื่อให้การเลือกมิเตอร์เสร็จสิ้น
    
    // Cleanup timeout
    return () => clearTimeout(timeoutId);
  }, [selectedSlaveIds, selectedMeterNames, dateFrom, dateTo]);

  // โหลดข้อมูลจาก API
  // ฟังก์ชันโหลดข้อมูลจาก API
  const loadChartData = async () => {
    if (!dateFrom || !dateTo) {
      setError('กรุณาเลือกช่วงวันที่');
      return;
    }

    if (selectedSlaveIds.length === 0) {
      setError('กรุณาเลือกมิเตอร์');
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
        slaveIds: selectedSlaveIds,
        // interval: '15min', // Do not filter by interval in backend, fetch all data in range
      };

      console.log('🚀 === FRONTEND API CALL DEBUG ===');
      console.log('🔍 ส่งพารามิเตอร์ไปยัง API (LineGraph):', params);
      console.log('📅 วันที่ From:', dateFrom, '-> formatted:', format(dateFrom, 'yyyy-MM-dd'));
      console.log('📅 วันที่ To:', dateTo, '-> formatted:', format(dateTo || dateFrom, 'yyyy-MM-dd'));
      console.log('⏰ เวลา From-To:', timeFrom, '-', timeTo);
      console.log('🏢 Selected Slave IDs (type):', typeof selectedSlaveIds, 'isArray:', Array.isArray(selectedSlaveIds));
      console.log('🏢 Selected Slave IDs (value):', selectedSlaveIds);
      console.log('🏢 Selected Slave IDs (length):', selectedSlaveIds.length);
      console.log('📊 Selected Columns:', contextSelectedColumns);
      console.log('📊 Display Columns:', displayColumns);
      console.log('⚠️ ปิดการใช้ interval parameter ชั่วคราวเพื่อทดสอบ');
      console.log('================================');
      
      const response = await apiClient.getTableData(params);
      
          console.log('📊 ผลลัพธ์จาก API (LineGraph):', response);
      console.log('✅ API Response Success:', response.success);
      console.log('📋 API Response Message:', response.message);
      console.log('🎯 API Response Data Type:', typeof response.data, 'Is Array:', Array.isArray(response.data));
      
      if (response.success && response.data) {
        // ตรวจสอบว่า response.data เป็น array หรือ object
        let dataArray: any[] = [];
        
        if (Array.isArray(response.data)) {
          dataArray = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // ถ้าเป็น object ให้ดูว่าข้อมูลอยู่ที่ไหน
          dataArray = Array.isArray(response.data.data) ? response.data.data : [];
        }
        
        console.log('✅ ข้อมูลที่ได้รับ:', dataArray);
        console.log('📊 จำนวนข้อมูลทั้งหมด:', dataArray.length);
        
        if (dataArray.length > 0) {
          // แสดง timestamp ของข้อมูลแต่ละรายการ
          dataArray.forEach((item, index) => {
            console.log(`📅 ข้อมูลแถวที่ ${index + 1}:`, {
              time: item.time,
              reading_timestamp: item.reading_timestamp,
              all_keys: Object.keys(item),
              sample_values: Object.entries(item).slice(0, 5)
            });
          });
          
          setTableData(dataArray);
          setIsLoaded(true);
        } else {
          console.log('⚠️ ไม่มีข้อมูลใน response');
          setTableData([]);
          setIsLoaded(true);
        }
      } else {
        console.error('❌ เกิดข้อผิดพลาด:', response.message);
        setError(response.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setTableData([]);
        setIsLoaded(false);
      }
    } catch (err) {
      console.error('❌ Error in loadChartData:', err);
      setError(handleApiError(err));
      setTableData([]);
      setIsLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันแปลงข้อมูลสำหรับกราฟ
  const prepareChartData = () => {
    console.log('🔍 === PREPARE CHART DATA DEBUG ===');
    console.log('🔍 tableData length:', tableData?.length || 0);
    console.log('🔍 selectedSlaveIds:', selectedSlaveIds);
    console.log('🔍 selectedMeterNames:', selectedMeterNames);
    console.log('🔍 displayColumns:', displayColumns);
    console.log('🔍 typeFilter:', typeFilter);
    
    if (!tableData || tableData.length === 0) {
      console.log('⚠️ ไม่มีข้อมูลสำหรับสร้างกราฟ');
      return [];
    }

    console.log('🔍 ข้อมูลดิบจาก API:', tableData);
    console.log('📊 กำลังแปลงข้อมูล จำนวน:', tableData.length, 'รายการ');
    console.log('⏰ ช่วงเวลาที่เลือก:', timeFrom, '-', timeTo);
    console.log('🏢 Selected Slave IDs:', selectedSlaveIds);
    console.log('📊 Display Columns:', displayColumns);

    // ตรวจสอบโครงสร้างข้อมูลจาก API
    const firstRow = tableData[0];
    if (firstRow) {
      console.log('🔍 โครงสร้างข้อมูลแถวแรก:', {
        keys: Object.keys(firstRow),
        hasSlaveId: 'slave_id' in firstRow,
        hasMeterId: 'meter_id' in firstRow,
        sampleData: Object.entries(firstRow).slice(0, 10)
      });
    }

    // ประกาศตัวแปร result สำหรับเก็บผลลัพธ์
    let result: any[] = [];
    
    // สำหรับ month view ให้จัดกลุ่มข้อมูลตามวันในเดือน
    if (typeFilter === '1month') {
      console.log('🗓️ กำลังประมวลผลข้อมูลสำหรับ Month View');
      
      // จัดกลุ่มข้อมูลตามวันและรวมค่าทุกแถวในแต่ละวัน
      const dailyData: { [key: number]: any } = {};
      
      // เรียงข้อมูลตามเวลา (reading_timestamp)
      const sortedTable = [...tableData].sort((a, b) => {
        const tA = a.reading_timestamp || a.time;
        const tB = b.reading_timestamp || b.time;
        return new Date(tA).getTime() - new Date(tB).getTime();
      });
      
      console.log('🗓️ ข้อมูลที่ส่งเข้า month view:', sortedTable);
      console.log('🗓️ จำนวนข้อมูลที่ส่งเข้า month view:', sortedTable.length);
      
      sortedTable.forEach(row => {
        // ใช้ reading_timestamp เป็นหลักในการ plot เสมอ
        const timeField = row.reading_timestamp || row.time;
        if (!timeField || typeof timeField !== 'string') return;
        
        // แปลง ISO string (UTC) เป็นวันที่
        let localDate: Date | null = null;
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
          localDate = new Date(timeField);
        } else {
          return; // ถ้าไม่ใช่ format ที่ถูกต้อง ข้ามไป
        }
        
        const day = localDate.getDate(); // วันที่ (1-31)
        
        if (!dailyData[day]) {
          dailyData[day] = {
            time: day,
            day: day,
            count: 0 // นับจำนวนข้อมูลในวันนั้น
          };
          
          // Initialize meter-specific columns
          selectedSlaveIds.forEach((slaveId, index) => {
            const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
            displayColumns.forEach(column => {
              const dataKey = `${meterName} - ${column}`;
              dailyData[day][dataKey] = 0;
            });
          });
        }
        
        // เพิ่มข้อมูลแยกตามมิเตอร์ - ใช้ slave_id หรือ meter_id จากข้อมูล
        let meterDataFound = false;
        selectedSlaveIds.forEach((slaveId, meterIndex) => {
          const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
          
          // ตรวจสอบว่าข้อมูลนี้เป็นของมิเตอร์นี้หรือไม่
          let isThisMeter = false;
          
          // วิธีที่ 1: ตรวจสอบจาก slave_id
          if (row.slave_id && row.slave_id.toString() === slaveId.toString()) {
            isThisMeter = true;
            console.log(`✅ พบข้อมูลของมิเตอร์ ${meterName} (slave_id: ${row.slave_id})`);
          }
          // วิธีที่ 2: ตรวจสอบจาก meter_id
          else if (row.meter_id && row.meter_id.toString() === slaveId.toString()) {
            isThisMeter = true;
            console.log(`✅ พบข้อมูลของมิเตอร์ ${meterName} (meter_id: ${row.meter_id})`);
          }
          // วิธีที่ 3: ตรวจสอบจากชื่อคอลัมน์ที่มี slave_id
          else if (row[`slave_id_${slaveId}`] || row[`meter_${slaveId}`]) {
            isThisMeter = true;
            console.log(`✅ พบข้อมูลของมิเตอร์ ${meterName} (จากคอลัมน์พิเศษ)`);
          }
          // วิธีที่ 4: ถ้าไม่มี slave_id ให้ใช้ข้อมูลแถวแรกสำหรับมิเตอร์แรก
          else if (meterIndex === 0 && !meterDataFound) {
            isThisMeter = true;
            console.log(`⚠️ ใช้ข้อมูลแถวแรกสำหรับมิเตอร์ ${meterName} (ไม่มี slave_id)`);
          }
          
          if (isThisMeter) {
            meterDataFound = true;
            displayColumns.forEach(column => {
              const dataKey = `${meterName} - ${column}`;
              const value = row[column];
              if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                dailyData[day][dataKey] += parseFloat(value);
                console.log(`➕ เพิ่มค่า ${dataKey}: ${value} -> รวม: ${dailyData[day][dataKey]}`);
              } else if (typeof value === 'number' && !isNaN(value)) {
                dailyData[day][dataKey] += value;
                console.log(`➕ เพิ่มค่า ${dataKey}: ${value} -> รวม: ${dailyData[day][dataKey]}`);
              }
            });
          }
        });
        
        dailyData[day].count++;
      });
      
      console.log('🗓️ ข้อมูลที่จัดกลุ่มตามวัน:', dailyData);
      console.log('🗓️ จำนวนวันที่มีข้อมูล:', Object.keys(dailyData).length);
      
      // ตรวจสอบว่ามิเตอร์ไหนมีข้อมูลจริง
      const metersWithData = new Set();
      tableData.forEach(row => {
        if (row.slave_id) {
          metersWithData.add(row.slave_id.toString());
        }
      });
      
      console.log('🔍 มิเตอร์ที่มีข้อมูลจริง:', Array.from(metersWithData));
      console.log('🔍 มิเตอร์ที่เลือก:', selectedSlaveIds);
      
      // แสดงข้อมูลของแต่ละมิเตอร์
      selectedSlaveIds.forEach((slaveId, index) => {
        const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
        const hasData = metersWithData.has(slaveId.toString());
        console.log(`📊 ${meterName} (ID: ${slaveId}): ${hasData ? '✅ มีข้อมูล' : '❌ ไม่มีข้อมูล'}`);
      });
      
      // แปลง object เป็น array และเรียงลำดับตามวัน
      result = Object.values(dailyData).sort((a: any, b: any) => a.day - b.day);
      
      console.log('📊 Month view - ข้อมูลที่ประมวลผลแล้ว:', result);
      console.log('📊 จำนวนวันที่มีข้อมูล:', result.length);
      console.log('📊 วันที่มีข้อมูล:', result.map((item: any) => item.day));
      
      // แสดงตัวอย่างข้อมูลของแต่ละมิเตอร์ในผลลัพธ์
      if (result.length > 0) {
        const sampleDay = result[0];
        console.log('📊 ตัวอย่างข้อมูลวันแรก:', sampleDay);
        selectedSlaveIds.forEach((slaveId, index) => {
          const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
          displayColumns.forEach(column => {
            const dataKey = `${meterName} - ${column}`;
            const value = sampleDay[dataKey];
            console.log(`   - ${dataKey}: ${value}`);
          });
        });
      }
    }
    // สำหรับ year view ให้จัดกลุ่มข้อมูลตามเดือน
    else if (typeFilter === '1year') {
      console.log('🗓️ กำลังประมวลผลข้อมูลสำหรับ Year View');
      
      // จัดกลุ่มข้อมูลตามเดือนและรวมค่าทุกแถวในแต่ละเดือน
      const monthlyData: { [key: number]: any } = {};
      
      tableData.forEach((row, index) => {
        console.log(`📄 ประมวลผลแถวที่ ${index + 1}:`, {
          reading_timestamp: row.reading_timestamp,
          time: row.time,
          slave_id: row.slave_id,
          meter_id: row.meter_id,
          keys: Object.keys(row)
        });
        
        // ใช้ reading_timestamp เป็นหลัก ถ้าไม่มีให้ใช้ time
        const timeField = row.reading_timestamp || row.time;
        
        if (timeField && typeof timeField === 'string') {
          let date: Date | null = null;
          
          // ลองแปลง timestamp หลายรูปแบบ
          if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
            // ISO format: 2024-01-15T14:30:00
            date = new Date(timeField);
            console.log(`📅 แปลง ISO format: ${timeField} -> ${date}`);
          } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(timeField)) {
            // MySQL format: 2024-01-15 14:30:00
            date = new Date(timeField.replace(' ', 'T'));
            console.log(`📅 แปลง MySQL format: ${timeField} -> ${date}`);
          } else if (/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(timeField)) {
            // DD/MM/YYYY HH:MM format
            const parts = timeField.split(' ');
            const datePart = parts[0].split('/');
            const timePart = parts[1];
            date = new Date(`${datePart[2]}-${datePart[1]}-${datePart[0]}T${timePart}:00`);
            console.log(`📅 แปลง DD/MM/YYYY format: ${timeField} -> ${date}`);
          }
          
          if (date && !isNaN(date.getTime())) {
            const month = date.getMonth() + 1; // 1-12
            console.log(`📊 เดือน: ${month} จากวันที่: ${date.toISOString()}`);
            
            if (!monthlyData[month]) {
              monthlyData[month] = {
                time: month,
                month: month,
                count: 0 // นับจำนวนข้อมูลในเดือนนั้น
              };
              
              // Initialize meter-specific columns
              selectedSlaveIds.forEach((slaveId, index) => {
                const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
                displayColumns.forEach(column => {
                  const dataKey = `${meterName} - ${column}`;
                  monthlyData[month][dataKey] = 0;
                });
              });
              
              console.log(`🆕 สร้างเดือนใหม่: ${month}`, monthlyData[month]);
            }
            
            // เพิ่มข้อมูลแยกตามมิเตอร์ - ใช้ slave_id หรือ meter_id จากข้อมูล
            let meterDataFound = false;
            selectedSlaveIds.forEach((slaveId, meterIndex) => {
              const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
              
              // ตรวจสอบว่าข้อมูลนี้เป็นของมิเตอร์นี้หรือไม่
              let isThisMeter = false;
              
              // วิธีที่ 1: ตรวจสอบจาก slave_id
              if (row.slave_id && row.slave_id.toString() === slaveId.toString()) {
                isThisMeter = true;
                console.log(`✅ พบข้อมูลของมิเตอร์ ${meterName} (slave_id: ${row.slave_id})`);
              }
              // วิธีที่ 2: ตรวจสอบจาก meter_id
              else if (row.meter_id && row.meter_id.toString() === slaveId.toString()) {
                isThisMeter = true;
                console.log(`✅ พบข้อมูลของมิเตอร์ ${meterName} (meter_id: ${row.meter_id})`);
              }
              // วิธีที่ 3: ตรวจสอบจากชื่อคอลัมน์ที่มี slave_id
              else if (row[`slave_id_${slaveId}`] || row[`meter_${slaveId}`]) {
                isThisMeter = true;
                console.log(`✅ พบข้อมูลของมิเตอร์ ${meterName} (จากคอลัมน์พิเศษ)`);
              }
              // วิธีที่ 4: ถ้าไม่มี slave_id ให้ใช้ข้อมูลแถวแรกสำหรับมิเตอร์แรก
              else if (meterIndex === 0 && !meterDataFound) {
                isThisMeter = true;
                console.log(`⚠️ ใช้ข้อมูลแถวแรกสำหรับมิเตอร์ ${meterName} (ไม่มี slave_id)`);
              }
              
              if (isThisMeter) {
                meterDataFound = true;
                displayColumns.forEach(column => {
                  const dataKey = `${meterName} - ${column}`;
                  if (row.hasOwnProperty(column)) {
                    const value = row[column];
                    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                      monthlyData[month][dataKey] += parseFloat(value);
                      console.log(`➕ เพิ่มค่า ${dataKey}: ${value} -> รวม: ${monthlyData[month][dataKey]}`);
                    } else if (typeof value === 'number' && !isNaN(value)) {
                      monthlyData[month][dataKey] += value;
                      console.log(`➕ เพิ่มค่า ${dataKey}: ${value} -> รวม: ${monthlyData[month][dataKey]}`);
                    }
                  }
                });
              }
            });
            
            monthlyData[month].count++;
          } else {
            console.warn(`❌ ไม่สามารถแปลงวันที่: ${timeField}`);
          }
        } else {
          console.warn(`❌ ไม่พบข้อมูล timestamp ในแถวที่ ${index + 1}:`, row);
        }
      });
      
      // แปลง object เป็น array และเรียงลำดับตามเดือน
      result = Object.values(monthlyData).sort((a: any, b: any) => a.month - b.month);
      
      console.log('📊 ผลลัพธ์ Year view:', result);
      console.log('📊 จำนวนเดือนที่มีข้อมูล:', result.length);
      
      // แสดงข้อมูลแต่ละเดือน
      result.forEach((item: any) => {
        console.log(`📅 เดือน ${item.month}:`, {
          count: item.count,
          sampleData: Object.entries(item).slice(0, 5)
        });
      });
    }
    // สำหรับ day view ใช้ logic เดิม
    else {
      console.log('🌅 กำลังประมวลผลข้อมูลสำหรับ Day View');
      
      // ฟังก์ชันแปลงเวลาเป็นนาที
      const parseTimeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      // เรียงข้อมูลตามเวลา
      const sortedTable = [...tableData].sort((a, b) => {
        const tA = a.reading_timestamp || a.time;
        const tB = b.reading_timestamp || b.time;
        return new Date(tA).getTime() - new Date(tB).getTime();
      });

      console.log('🌅 ข้อมูลที่เรียงลำดับแล้ว:', sortedTable);

      // หาค่าแรกที่มีข้อมูลในช่วงที่เลือก
      let firstRow = null;
      let firstMinutes = null;
      for (const row of sortedTable) {
        const timeField = row.reading_timestamp || row.time;
        if (!timeField || typeof timeField !== 'string') continue;
        let timeString = timeField;
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
          const localDate = new Date(timeField);
          const h = localDate.getHours().toString().padStart(2, '0');
          const m = localDate.getMinutes().toString().padStart(2, '0');
          timeString = `${h}:${m}`;
        } else if (timeField.includes(' ')) {
          const parts = timeField.split(' ');
          timeString = parts.find(part => part.includes(':')) || parts[parts.length - 1];
        }
        const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) continue;
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const totalMinutes = hours * 60 + minutes;
        const startMinutes = parseTimeToMinutes(timeFrom);
        const endMinutes = parseTimeToMinutes(timeTo);
        if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
          firstRow = row;
          firstMinutes = totalMinutes;
          break;
        }
      }

      if (!firstRow || firstMinutes === null) {
        console.log('⚠️ ไม่พบข้อมูลในช่วงเวลาที่เลือก');
        return [];
      }

      // สร้าง array ของ targetTimes โดยบวกทีละ 15 นาที
      const startMinutes = parseTimeToMinutes(timeFrom);
      const endMinutes = parseTimeToMinutes(timeTo);
      let targetTimes: number[] = [];
      let t = firstMinutes;
      while (t <= endMinutes) {
        targetTimes.push(t);
        t += 15;
      }

      console.log('🎯 Target times:', targetTimes);

      // สำหรับแต่ละ targetTime หาข้อมูลของทุกมิเตอร์
      const processedRows: any[] = [];
      for (const targetMinute of targetTimes) {
        const targetHour = Math.floor(targetMinute / 60);
        const targetMin = targetMinute % 60;
        
        console.log(`🎯 กำลังหาข้อมูลสำหรับเวลา ${targetHour.toString().padStart(2, '0')}:${targetMin.toString().padStart(2, '0')}`);
        
        // หาข้อมูลของแต่ละมิเตอร์แยกกัน
        const meterData: { [key: string]: any } = {};
        
        selectedSlaveIds.forEach((slaveId, meterIndex) => {
          const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
          let closestRow: any = null;
          let minDiff = Number.MAX_VALUE;
          
          // หาข้อมูลที่ใกล้เคียงที่สุดสำหรับมิเตอร์นี้
          for (const row of sortedTable) {
            // ตรวจสอบว่าข้อมูลนี้เป็นของมิเตอร์นี้หรือไม่
            if (row.slave_id && row.slave_id.toString() !== slaveId.toString()) {
              continue; // ข้ามถ้าไม่ใช่มิเตอร์นี้
            }
            
            const timeField = row.reading_timestamp || row.time;
            if (!timeField || typeof timeField !== 'string') continue;
            
            let timeString = timeField;
            if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
              const localDate = new Date(timeField);
              const h = localDate.getHours().toString().padStart(2, '0');
              const m = localDate.getMinutes().toString().padStart(2, '0');
              timeString = `${h}:${m}`;
            } else if (timeField.includes(' ')) {
              const parts = timeField.split(' ');
              timeString = parts.find(part => part.includes(':')) || parts[parts.length - 1];
            }
            
            const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
            if (!timeMatch) continue;
            
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const totalMinutes = hours * 60 + minutes;
            
            if (totalMinutes < startMinutes || totalMinutes > endMinutes) continue;
            
            const diff = Math.abs(totalMinutes - targetMinute);
            if (diff < minDiff) {
              minDiff = diff;
              closestRow = {
                row,
                timeField,
                timeString,
                hours,
                minutes,
                totalMinutes
              };
            }
          }
          
          // เก็บข้อมูลของมิเตอร์นี้
          if (closestRow && minDiff <= 15) { // เพิ่มความยืดหยุ่นเป็น 15 นาที
            meterData[meterName] = closestRow;
            console.log(`✅ พบข้อมูลของมิเตอร์ ${meterName} (slave_id: ${closestRow.row.slave_id}) ที่เวลา ${closestRow.timeString}`);
          } else {
            console.log(`❌ ไม่พบข้อมูลของมิเตอร์ ${meterName} ที่เวลาใกล้เคียง ${targetHour.toString().padStart(2, '0')}:${targetMin.toString().padStart(2, '0')}`);
          }
        });
        
        // สร้าง chartRow จากข้อมูลที่พบ
        if (Object.keys(meterData).length > 0) {
          // ใช้เวลาจากมิเตอร์แรกที่พบ
          const firstMeterData = Object.values(meterData)[0] as any;
          const hourValue = firstMeterData.hours + (firstMeterData.minutes / 60);
          
          const chartRow: any = {
            time: hourValue,
            displayLabel: firstMeterData.timeField,
            originalTime: firstMeterData.timeString,
          };
          
          // เพิ่มข้อมูลของแต่ละมิเตอร์
          Object.entries(meterData).forEach(([meterName, data]: [string, any]) => {
            displayColumns.forEach(column => {
              const dataKey = `${meterName} - ${column}`;
              if (data.row.hasOwnProperty(column)) {
                const value = data.row[column];
                if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                  chartRow[dataKey] = parseFloat(value);
                } else if (typeof value === 'number') {
                  chartRow[dataKey] = value;
                } else {
                  chartRow[dataKey] = 0; // ใส่ 0 แทน null
                }
              } else {
                chartRow[dataKey] = 0; // ใส่ 0 ถ้าไม่มีข้อมูล
              }
            });
          });
          
          // เพิ่มข้อมูลเป็น 0 สำหรับมิเตอร์ที่ไม่มีข้อมูล
          selectedSlaveIds.forEach((slaveId, meterIndex) => {
            const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
            if (!meterData[meterName]) {
              displayColumns.forEach(column => {
                const dataKey = `${meterName} - ${column}`;
                chartRow[dataKey] = 0;
              });
            }
          });
          
          processedRows.push(chartRow);
        }
      }
      
      console.log('🌅 Day view - ข้อมูลที่ประมวลผลแล้ว:', processedRows);
      console.log('🌅 จำนวนข้อมูลที่ประมวลผล:', processedRows.length);
      
      // Debug: ตรวจสอบข้อมูลสุดท้าย
      if (processedRows.length > 0) {
        console.log('📊 ตัวอย่างข้อมูลสุดท้าย:', processedRows[0]);
        console.log('📊 Keys ในข้อมูลสุดท้าย:', Object.keys(processedRows[0]));
      }
      
      result = processedRows;
    }
    
    // Debug: ตรวจสอบผลลัพธ์สุดท้าย
    console.log('🔍 === FINAL CHART DATA RESULT ===');
    console.log('🔍 Result length:', result?.length || 0);
    if (result && result.length > 0) {
      console.log('🔍 Sample result:', result[0]);
      console.log('🔍 Result keys:', Object.keys(result[0]));
    }
    console.log('=====================================');
    
    return result;
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

  // ข้อมูลสำหรับกราฟที่ได้จาก API
  const chartData = prepareChartData();
  
  // Debug: ตรวจสอบข้อมูลกราฟ
  console.log('🔍 === CHART DATA DEBUG ===');
  console.log('🔍 chartData length:', chartData?.length || 0);
  console.log('🔍 chartData type:', typeof chartData);
  console.log('🔍 chartData is array:', Array.isArray(chartData));
  if (chartData && chartData.length > 0) {
    console.log('🔍 First chart data item:', chartData[0]);
    console.log('🔍 Chart data keys:', Object.keys(chartData[0]));
  }
  console.log('==========================');
  
  // สร้างคอลัมน์สำหรับแต่ละมิเตอร์
  const generateMeterColumns = () => {
    if (selectedSlaveIds.length === 0) return [];
    
    const meterColumns = [];
    selectedSlaveIds.forEach((slaveId, index) => {
      const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
      displayColumns.forEach(column => {
        meterColumns.push(`${meterName} - ${column}`);
      });
    });
    return meterColumns;
  };
  
  const meterColumns = generateMeterColumns();
  
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
      // สำหรับ Month view ให้แสดงแกน X เป็น 1-30 เสมอ (ไม่ขึ้นกับข้อมูลจริง)
      return {
        domain: [1, 30],
        ticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
      };
    } else {
      // สำหรับ Day view ให้แสดงแกน X เป็น 0-24 เสมอ
      return {
        domain: [0, 24],
        ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
      };
    }
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
                  <Select value={typeFilter} onValueChange={v => { setTypeFilter(v as '24h' | '1month' | '1year'); setIsLoaded(false); }}>
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
                        onSelect={date => { setDateFrom(date); setIsLoaded(false); }}
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
                                        onSelect={date => { setDateTo(date); setIsLoaded(false); }}
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
                
                {/* Print Button - Only show for users with report permission */}
                {hasPermission('Line Graph', 'report') && (
                  <Button
                    className="h-7 px-2 text-xs rounded-none bg-muted hover:bg-primary shadow flex items-center ml-1"
                    variant="outline"
                    onClick={() => setShowExportModal(true)}
                    disabled={!isLoaded || chartData.length === 0 || isLoading}
                  >
                    <Printer className="w-4 h-4 mr-0" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

       
        {/* Data Table - ปรับให้ชิดกับส่วน filter */}
        <Card className="shadow-card">
          <CardHeader className="text-black py-1">
            <CardTitle className="text-center text-sm font-semibold w-full flex flex-wrap items-center justify-center gap-2">
              <span>{selectedMeterNames.length > 0 ? selectedMeterNames.join(', ') : 'Select Meter'} /</span>
              <span className="text-blue-600 font-bold">{formatDateTime(dateFrom, timeFrom)}</span>
              <span>–</span>
              <span className="text-green-600 font-bold">{formatDateTime(dateTo, timeTo)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <div ref={chartRef} data-testid="chart-container" className="h-[550px] w-full ">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">{language === 'TH' ? 'กำลังโหลดข้อมูล...' : 'Loading...'}</p>

                  </div>
                </div>
              ) : selectedSlaveIds.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      กรุณาเลือกมิเตอร์ใน sidebar เพื่อแสดงข้อมูล
                    </p>
                    <p className="text-xs text-blue-600">
                      💡 คลิกที่มิเตอร์ในเมนูด้านซ้ายเพื่อเลือกมิเตอร์ที่ต้องการดูข้อมูล
                    </p>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {isLoaded 
                        ? (language === 'TH' ? 'ไม่มีข้อมูลในช่วงเวลาที่เลือก' : 'No data available for selected time range')
                        : (language === 'TH' ? 'กรุณากดปุ่ม Load เพื่อโหลดข้อมูล' : 'Please click Load button to load data')
                      }
                    </p>
                    {isLoaded && selectedSlaveIds.length > 1 && (
                      <p className="text-xs text-orange-600">
                        💡 หากเลือกหลายมิเตอร์ ให้ตรวจสอบว่ามิเตอร์ทั้งหมดมีข้อมูลในช่วงเวลาที่เลือก
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {graphType === 'line' ? (
                    <RechartsLineChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 10, bottom: -20 }}
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
                            // แสดงเป็นเลขเดือน 1-12
                            return `${value}`;
                          } else {
                            // แสดงเป็นตัวเลขเฉยๆ สำหรับ day view (0, 1, 2, 3...)
                            return `${value}`;
                          }
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
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
                      {/* แสดงเส้นกราฟตามมิเตอร์และคอลัมน์ที่เลือก */}
                      {selectedSlaveIds.map((slaveId, meterIndex) => {
                        const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
                        return displayColumns.map((column, columnIndex) => {
                          // สีสำหรับแต่ละมิเตอร์และคอลัมน์
                          const colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];
                          const colorIndex = (meterIndex * displayColumns.length + columnIndex) % colors.length;
                          const dataKey = `${meterName} - ${column}`;
                          
                          return (
                            <Line
                              key={dataKey}
                              type="monotone"
                              dataKey={dataKey}
                              name={dataKey}
                              stroke={colors[colorIndex]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={false}
                              connectNulls={true}
                            />
                          );
                        });
                      })}
                    </RechartsLineChart>
                  ) : (
                    <RechartsBarChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 10, bottom: -20 }}
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
                            // แสดงเป็นเลขเดือน 1-12
                            return `${value}`;
                          } else {
                            // แสดงเป็นตัวเลขเฉยๆ สำหรับ day view (0, 1, 2, 3...)
                            return `${value}`;
                          }
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          if (value >= 1000) {
                            return `${(value / 1000).toFixed(1)}k`;
                          }
                          return value.toString();
                        }}
                      />
                      <Tooltip
                        labelFormatter={(value) => {
                          if (typeof value === 'number') {
                            if (typeFilter === '1year') {
                              return `เดือน: ${value}`;
                            } else if (typeFilter === '1month') {
                              return `เดือน: ${value}`;
                            } else {
                              const hours = Math.floor(value);
                              const minutes = Math.round((value % 1) * 60);
                              return `เวลา: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            }
                          }
                          return `เวลา: ${value}`;
                        }}
                        formatter={(value, name) => {
                          if (typeof value === 'number') {
                            return [value.toFixed(2), name];
                          }
                          return [value, name];
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{
                          marginTop: 80,
                          fontSize: 12
                        }}
                      />
                      {/* แสดงแท่งกราฟตามมิเตอร์และคอลัมน์ที่เลือก */}
                      {selectedSlaveIds.map((slaveId, meterIndex) => {
                        const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
                        return displayColumns.map((column, columnIndex) => {
                          // สีสำหรับแต่ละมิเตอร์และคอลัมน์
                          const colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];
                          const colorIndex = (meterIndex * displayColumns.length + columnIndex) % colors.length;
                          const dataKey = `${meterName} - ${column}`;
                          
                          return (
                            <Bar 
                              key={dataKey}
                              dataKey={dataKey} 
                              name={dataKey} 
                              fill={colors[colorIndex]} 
                            />
                          );
                        });
                      })}
                    </RechartsBarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Print Modal */}
        <PrintModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          onSendReport={handleSendReportWrapper}
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