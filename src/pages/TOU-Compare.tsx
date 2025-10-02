import React, { useState, useRef, useEffect, useContext } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useReactToPrint } from 'react-to-print';
import type { UseReactToPrintOptions } from 'react-to-print';
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
import { Search, FileText, Printer, BarChart3, PieChart as PieChartIcon, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TableColumnContext } from '@/components/ui/sidebar-menu';
import { TimeInput24 } from '@/components/ui/time-input-24';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useMeterTree } from '@/context/MeterTreeContext';
import { apiClient, TableDataRow as ApiTableDataRow, handleApiError } from '@/services/api';
import { DateNavigation } from '@/components/ui/date-navigation';
import { PrintModal } from '@/components/ui/print-modal';
import { useDateNavigation } from '@/hooks/use-date-navigation';

interface TableDataRow {
  time: string;
  [key: string]: any;
}

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

export default function TOUCompare() {
  const { language } = useLanguage();
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const currentTime = pad(now.getHours()) + ':' + pad(now.getMinutes());
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState(currentTime);
  const [typeFilter, setTypeFilter] = useState<'24h' | '1month' | '1year'>('24h');
  const [graphType, setGraphType] = useState<'bar' | 'pie'>('pie');
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<ApiTableDataRow[]>([]);
  const [monthDays, setMonthDays] = useState<number[]>([]); // Add monthDays state
  const chartRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => chartRef.current
  } as any);
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
  
  // ใช้ context สำหรับ sidebar
  const context = useContext(TableColumnContext);
  const selectedColumns = context?.selectedColumns || ['WATT'];
  
  // ใช้ context สำหรับ selected meter tree
  const { selectedSlaveIds, selectedMeterNames, treeData } = useMeterTree();

  // Fetch email/line groups and users for print modal
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // Fetch email groups
        const emailGroupsResponse = await apiClient.getEmailGroups();
        setEmailGroups(emailGroupsResponse.data || []);

        // Fetch line groups
        const lineGroupsResponse = await apiClient.getLineGroups();
        setLineGroups(lineGroupsResponse.data || []);

        // Fetch all users for email list
        const allUsersResponse = await apiClient.getUsers();
        const emailUsers = allUsersResponse.data?.filter((user: any) => user.enabled && user.email) || [];
        setEmailList(emailUsers);

        // Fetch all users for line list
        const lineUsers = allUsersResponse.data?.filter((user: any) => user.enabled && user.lineId) || [];
        setLineList(lineUsers);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    fetchGroups();
  }, []);
  
  // Debug: แสดงข้อมูลการเลือกมิเตอร์
  console.log('🔍 CompareGraph Debug:', {
    selectedSlaveIds,
    selectedMeterNames,
    selectedColumns
  });
  
  // ตรวจสอบว่า selectedSlaveIds และ selectedMeterNames มีค่าหรือไม่
  if (selectedSlaveIds.length === 0) {
    console.warn('⚠️ selectedSlaveIds เป็น array ว่าง');
  }
  if (selectedMeterNames.length === 0) {
    console.warn('⚠️ selectedMeterNames เป็น array ว่าง');
  }
  if (selectedColumns.length === 0) {
    console.warn('⚠️ selectedColumns เป็น array ว่าง');
  }
  
  // เพิ่ม debug สำหรับตรวจสอบข้อมูลที่ได้รับจาก API
  console.log('🔍 tableData length:', tableData.length);
  if (tableData.length > 0) {
    console.log('🔍 tableData[0] keys:', Object.keys(tableData[0]));
    console.log('🔍 tableData[0] sample:', tableData[0]);
  }
  
  // หาข้อมูล meter ที่เลือก
  const meterName = selectedMeterNames.length > 0 ? selectedMeterNames[0] : 'AMR-BF-01';
  
  // แมป selectedColumns กับ dataKey ของ chart
  const getVisibleMetrics = () => {
    return selectedColumns; // ใช้ selectedColumns โดยตรง
  };
  
  const visibleMetrics = getVisibleMetrics();
  
  // ฟังก์ชันแปลงข้อมูลสำหรับกราฟ
  const prepareChartData = () => {
    console.log('🔍 prepareChartData - ข้อมูลที่ส่งเข้า:', tableData);
    console.log('🔍 prepareChartData - จำนวนข้อมูล:', tableData.length);
    console.log('🔍 prepareChartData - typeFilter:', typeFilter);
    console.log('🔍 prepareChartData - selectedSlaveIds:', selectedSlaveIds);
    console.log('🔍 prepareChartData - selectedMeterNames:', selectedMeterNames);
    console.log('🔍 prepareChartData - selectedColumns:', selectedColumns);
    
    if (!tableData || tableData.length === 0) {
      console.log('⚠️ ไม่มีข้อมูลสำหรับสร้างกราฟ');
      return [];
    }

    // ตรวจสอบและทำความสะอาดข้อมูลก่อนประมวลผล
    const cleanTableData = tableData.filter(row => {
      return row && typeof row === 'object' && row !== null;
    }).map(row => {
      const cleanRow: any = {};
      Object.keys(row).forEach(key => {
        let value = row[key];
        if (typeof value === 'string') {
          const numValue = parseFloat(value);
          cleanRow[key] = !isNaN(numValue) && isFinite(numValue) ? numValue : 0;
        } else if (typeof value === 'number') {
          cleanRow[key] = !isNaN(value) && isFinite(value) ? value : 0;
        } else {
          cleanRow[key] = 0;
        }
      });
      return cleanRow;
    });

    console.log('🔍 prepareChartData - ข้อมูลหลังจากทำความสะอาด:', cleanTableData);
    
    // สร้างข้อมูลแยกตามมิเตอร์อย่างถูกต้อง
    const processedData: any[] = [];
    
    // สร้างข้อมูลสำหรับแต่ละมิเตอร์
    selectedSlaveIds.forEach((slaveId, meterIndex) => {
      const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
      
      console.log(`🔍 กำลังประมวลผลข้อมูลสำหรับ ${meterName} (${slaveId})`);
      
      // กรองข้อมูลเฉพาะ slave_id นี้
      const meterData = cleanTableData.filter(row => {
        const rowSlaveId = row.slave_id || row.slaveId;
        return rowSlaveId === slaveId || rowSlaveId === slaveId.toString();
      });
      
      console.log(`🔍 ข้อมูลที่กรองแล้วสำหรับ ${meterName}: ${meterData.length} รายการ`);
      
      // ถ้าไม่มีข้อมูลสำหรับ slave_id นี้ ให้แบ่งข้อมูล
      if (meterData.length === 0) {
        console.log(`⚠️ ไม่มีข้อมูลสำหรับ slave_id: ${slaveId}`);
        // ตรวจสอบว่ามี slave_id field หรือไม่
        const hasSlaveIdField = cleanTableData.some(row => row.slave_id !== undefined || row.slaveId !== undefined);
        if (!hasSlaveIdField) {
          console.log('🔍 ไม่มี slave_id field - แบ่งข้อมูลตามจำนวนมิเตอร์');
          // แบ่งข้อมูลตามจำนวนมิเตอร์
          const dataPerMeter = Math.ceil(cleanTableData.length / selectedSlaveIds.length);
          const startIndex = meterIndex * dataPerMeter;
          const endIndex = Math.min(startIndex + dataPerMeter, cleanTableData.length);
          meterData.push(...cleanTableData.slice(startIndex, endIndex));
          console.log(`🔍 ใช้ข้อมูลจากดัชนี ${startIndex} ถึง ${endIndex-1} สำหรับ ${meterName}`);
        }
      }
      
      // ประมวลผลข้อมูลของมิเตอร์นี้
      meterData.forEach(row => {
        const newRow = { ...row };
        
        // เพิ่มข้อมูลแยกตามคอลัมน์สำหรับมิเตอร์นี้
        selectedColumns.forEach(column => {
          const dataKey = `${meterName} - ${column}`;
          const value = newRow[column];
          
          console.log(`🔍 สร้าง dataKey: "${dataKey}", column: "${column}", value: ${value}, type: ${typeof value}`);
          
          if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
            newRow[dataKey] = parseFloat(value);
            console.log(`✅ แปลง string เป็น number: ${value} -> ${parseFloat(value)}`);
          } else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            newRow[dataKey] = value;
            console.log(`✅ ใช้ค่า number: ${value}`);
          } else {
            newRow[dataKey] = 0;
            console.log(`❌ ใช้ค่า default: 0 (value: ${value})`);
          }
        });
        
        processedData.push(newRow);
      });
    });
    
    console.log('🔍 prepareChartData - ข้อมูลหลังจากประมวลผล:', processedData);
    console.log('🔍 prepareChartData - ตัวอย่างข้อมูลแถวแรก:', processedData[0]);
    console.log('🔍 prepareChartData - keys ในข้อมูลแถวแรก:', processedData[0] ? Object.keys(processedData[0]) : 'ไม่มีข้อมูล');

    // สำหรับ month view ให้จัดกลุ่มข้อมูลตามวันในเดือน
    if (typeFilter === '1month') {
      console.log('🗓️ กำลังประมวลผลข้อมูลสำหรับ Month View');
      // จัดกลุ่มข้อมูลตามวันและรวมค่าทุกแถวในแต่ละวัน
      const dailyData: { [key: number]: any } = {};
      
      // เรียงข้อมูลตามเวลา (reading_timestamp)
      const sortedTable = [...processedData].sort((a, b) => {
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
          
          // Initialize all columns
          Object.keys(row).forEach(key => {
            if (key !== 'time' && key !== 'reading_timestamp') {
              dailyData[day][key] = 0;
            }
          });
          
          // Initialize meter-specific columns
          selectedSlaveIds.forEach((slaveId, index) => {
            const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
            selectedColumns.forEach(column => {
              const dataKey = `${meterName} - ${column}`;
              dailyData[day][dataKey] = 0;
            });
          });
        }
        
        // Sum values for all numeric columns
        Object.keys(row).forEach(key => {
          if (key !== 'time' && key !== 'reading_timestamp') {
            const value = row[key];
            if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
              const currentValue = dailyData[day][key] || 0;
              const newValue = parseFloat(value);
              dailyData[day][key] = !isNaN(currentValue) && isFinite(currentValue) ? currentValue + newValue : newValue;
            } else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
              const currentValue = dailyData[day][key] || 0;
              dailyData[day][key] = !isNaN(currentValue) && isFinite(currentValue) ? currentValue + value : value;
            }
          }
        });
        
                    // เพิ่มข้อมูลแยกตามมิเตอร์ - เฉพาะข้อมูลที่ตรงกับ slave_id
            const rowSlaveId = row.slave_id || row.slaveId;
            selectedSlaveIds.forEach((slaveId, index) => {
              // ตรวจสอบว่าแถวนี้ตรงกับ slave_id ที่เลือกหรือไม่
              const isMatchingMeter = !rowSlaveId || rowSlaveId === slaveId || rowSlaveId === slaveId.toString();
              
              if (isMatchingMeter) {
                const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
                selectedColumns.forEach(column => {
                  const dataKey = `${meterName} - ${column}`;
                  const value = row[column];
                  if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
                    const currentValue = dailyData[day][dataKey] || 0;
                    const newValue = parseFloat(value);
                    dailyData[day][dataKey] = !isNaN(currentValue) && isFinite(currentValue) ? currentValue + newValue : newValue;
                  } else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                    const currentValue = dailyData[day][dataKey] || 0;
                    dailyData[day][dataKey] = !isNaN(currentValue) && isFinite(currentValue) ? currentValue + value : value;
                  }
                });
              }
            });
        
        console.log('🔍 Month view - ข้อมูลแยกตามมิเตอร์สำหรับวันที่', day, ':', 
          selectedSlaveIds.map((slaveId, index) => {
            const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
            return selectedColumns.map(column => {
              const dataKey = `${meterName} - ${column}`;
              const value = dailyData[day][dataKey] || 0;
              const cleanValue = !isNaN(value) && isFinite(value) ? value : 0;
              return `${dataKey}: ${cleanValue}`;
            });
          }).flat()
        );
        
        dailyData[day].count++;
        
        // ตรวจสอบและทำความสะอาดข้อมูลใน dailyData[day]
        Object.keys(dailyData[day]).forEach(key => {
          const value = dailyData[day][key];
          if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
            dailyData[day][key] = 0;
          }
        });
      });
      
      console.log('🗓️ ข้อมูลที่จัดกลุ่มตามวัน:', dailyData);
      console.log('🗓️ จำนวนวันที่มีข้อมูล:', Object.keys(dailyData).length);
      
      // แปลง object เป็น array และเรียงลำดับตามวัน
      const result = Object.values(dailyData).sort((a: any, b: any) => a.day - b.day);
      
      // ตรวจสอบและทำความสะอาดข้อมูลในผลลัพธ์
      const cleanResult = result.map(item => {
        const cleanItem: any = {};
        Object.keys(item).forEach(key => {
          const value = item[key];
          if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
            cleanItem[key] = 0;
          } else {
            cleanItem[key] = value;
          }
        });
        return cleanItem;
      });
      
      console.log('📊 Month view - ข้อมูลที่ประมวลผลแล้ว:', cleanResult);
      console.log('📊 จำนวนวันที่มีข้อมูล:', cleanResult.length);
      console.log('📊 วันที่มีข้อมูล:', cleanResult.map((item: any) => item.day));
      
      return cleanResult;
    }
    // สำหรับ year view ให้จัดกลุ่มข้อมูลตามเดือน
    else if (typeFilter === '1year') {
      // จัดกลุ่มข้อมูลตามเดือนและรวมค่าทุกแถวในแต่ละเดือน
      const monthlyData: { [key: number]: any } = {};
      
      processedData.forEach((row, index) => {
        // ใช้ reading_timestamp เป็นหลัก ถ้าไม่มีให้ใช้ time
        const timeField = row.reading_timestamp || row.time;
        
        if (timeField && typeof timeField === 'string') {
          let date: Date | null = null;
          
          // ลองแปลง timestamp หลายรูปแบบ
          if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeField)) {
            // ISO format: 2024-01-15T14:30:00
            date = new Date(timeField);
          } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(timeField)) {
            // MySQL format: 2024-01-15 14:30:00
            date = new Date(timeField.replace(' ', 'T'));
          } else if (/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(timeField)) {
            // DD/MM/YYYY HH:MM format
            const parts = timeField.split(' ');
            const datePart = parts[0].split('/');
            const timePart = parts[1];
            date = new Date(`${datePart[2]}-${datePart[1]}-${datePart[0]}T${timePart}:00`);
          }
          
          if (date && !isNaN(date.getTime())) {
            const month = date.getMonth() + 1; // 1-12
            
            if (!monthlyData[month]) {
              monthlyData[month] = {
                time: month,
                month: month,
                count: 0 // นับจำนวนข้อมูลในเดือนนั้น
              };
              
              // Initialize all columns
              Object.keys(row).forEach(key => {
                if (key !== 'time' && key !== 'reading_timestamp') {
                  monthlyData[month][key] = 0;
                }
              });
              
              // Initialize meter-specific columns
              selectedSlaveIds.forEach((slaveId, index) => {
                const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
                selectedColumns.forEach(column => {
                  const dataKey = `${meterName} - ${column}`;
                  monthlyData[month][dataKey] = 0;
                });
              });
            }
            
            // Sum values for all numeric columns
            Object.keys(row).forEach(key => {
              if (key !== 'time' && key !== 'reading_timestamp') {
                const value = row[key];
                if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
                  const currentValue = monthlyData[month][key] || 0;
                  const newValue = parseFloat(value);
                  monthlyData[month][key] = !isNaN(currentValue) && isFinite(currentValue) ? currentValue + newValue : newValue;
                } else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                  const currentValue = monthlyData[month][key] || 0;
                  monthlyData[month][key] = !isNaN(currentValue) && isFinite(currentValue) ? currentValue + value : value;
                }
              }
            });
            
            // เพิ่มข้อมูลแยกตามมิเตอร์ - เฉพาะข้อมูลที่ตรงกับ slave_id
            const rowSlaveId = row.slave_id || row.slaveId;
            selectedSlaveIds.forEach((slaveId, index) => {
              // ตรวจสอบว่าแถวนี้ตรงกับ slave_id ที่เลือกหรือไม่
              const isMatchingMeter = !rowSlaveId || rowSlaveId === slaveId || rowSlaveId === slaveId.toString();
              
              if (isMatchingMeter) {
                const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
                selectedColumns.forEach(column => {
                  const dataKey = `${meterName} - ${column}`;
                  const value = row[column];
                  if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
                    const currentValue = monthlyData[month][dataKey] || 0;
                    const newValue = parseFloat(value);
                    monthlyData[month][dataKey] = !isNaN(currentValue) && isFinite(currentValue) ? currentValue + newValue : newValue;
                  } else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                    const currentValue = monthlyData[month][dataKey] || 0;
                    monthlyData[month][dataKey] = !isNaN(currentValue) && isFinite(currentValue) ? currentValue + value : value;
                  }
                });
              }
            });
            
            console.log('🔍 Year view - ข้อมูลแยกตามมิเตอร์สำหรับเดือน', month, ':', 
              selectedSlaveIds.map((slaveId, index) => {
                const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
                return selectedColumns.map(column => {
                  const dataKey = `${meterName} - ${column}`;
                  const value = monthlyData[month][dataKey] || 0;
                  const cleanValue = !isNaN(value) && isFinite(value) ? value : 0;
                  return `${dataKey}: ${cleanValue}`;
                });
              }).flat()
            );
            
            monthlyData[month].count++;
            
            // ตรวจสอบและทำความสะอาดข้อมูลใน monthlyData[month]
            Object.keys(monthlyData[month]).forEach(key => {
              const value = monthlyData[month][key];
              if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
                monthlyData[month][key] = 0;
              }
            });
          }
        }
      });
      
      // แปลง object เป็น array และเรียงลำดับตามเดือน
      const result = Object.values(monthlyData).sort((a: any, b: any) => a.month - b.month);
      
      // ตรวจสอบและทำความสะอาดข้อมูลในผลลัพธ์
      const cleanResult = result.map(item => {
        const cleanItem: any = {};
        Object.keys(item).forEach(key => {
          const value = item[key];
          if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
            cleanItem[key] = 0;
          } else {
            cleanItem[key] = value;
          }
        });
        return cleanItem;
      });
      
      console.log('📊 Year view - ข้อมูลที่ประมวลผลแล้ว:', cleanResult);
      console.log('📊 จำนวนเดือนที่มีข้อมูล:', cleanResult.length);
      console.log('📊 เดือนที่มีข้อมูล:', cleanResult.map((item: any) => item.month));
      
      return cleanResult;
    }
    // สำหรับ day view ใช้ logic เดิม
    else {
      // ตรวจสอบและทำความสะอาดข้อมูลในผลลัพธ์
      const cleanResult = processedData.map(item => {
        const cleanItem: any = {};
        Object.keys(item).forEach(key => {
          const value = item[key];
          if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
            cleanItem[key] = 0;
          } else {
            cleanItem[key] = value;
          }
        });
        return cleanItem;
      });
      
      console.log('📊 Day view - ข้อมูลที่ประมวลผลแล้ว:', cleanResult);
      console.log('📊 จำนวนข้อมูล:', cleanResult.length);
      console.log('📊 Day view - ตัวอย่างข้อมูลแถวแรก:', cleanResult[0]);
      console.log('📊 Day view - keys ในข้อมูลแถวแรก:', cleanResult[0] ? Object.keys(cleanResult[0]) : 'ไม่มีข้อมูล');
      return cleanResult;
    }
  };

  // คำนวณช่วงแกน X ตามข้อมูลจริง
  const getXAxisConfig = () => {
    if (typeFilter === '1year') {
      // สำหรับ Year view ให้แสดงแกน X เป็น 1-12 เสมอ
      return {
        domain: [1, 12],
        ticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };
    } else if (typeFilter === '1month') {
      // สำหรับ Month view ให้แสดงตามวันที่มีข้อมูลจริงจาก reading_timestamp
      if (chartData.length > 0 && monthDays.length > 0) {
        // ใช้ข้อมูลวันที่ที่ดึงมาจาก reading_timestamp
        const validMonthDays = monthDays.filter(day => typeof day === 'number' && !isNaN(day) && isFinite(day));
        if (validMonthDays.length > 0) {
          const minDay = Math.min(...validMonthDays);
          const maxDay = Math.max(...validMonthDays);
          // ตรวจสอบว่า min และ max เป็นตัวเลขที่ถูกต้อง
          if (!isNaN(minDay) && !isNaN(maxDay) && isFinite(minDay) && isFinite(maxDay)) {
            return {
              domain: [minDay - 1, maxDay + 1], // เพิ่มขอบเล็กน้อย
              ticks: validMonthDays
            };
          }
        }
      }
      // ถ้าไม่มีข้อมูลให้ใช้ domain ตามปกติ
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

  // useEffect สำหรับอัปเดต handlersDays เมื่อ tableData หรือ typeFilter เปลี่ยนแปลง
  useEffect(() => {
    if (typeFilter === '1month' && tableData.length > 0) {
      const daysSet = new Set<number>();
      tableData.forEach(row => {
        if (row && row.reading_timestamp && typeof row.reading_timestamp === 'string') {
          if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(row.reading_timestamp)) {
            const date = new Date(row.reading_timestamp);
            const day = date.getDate();
            if (day >= 1 && day <= 31 && !isNaN(day) && isFinite(day)) {
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
  const rawChartData = prepareChartData();
  
  // ทำความสะอาดข้อมูลเพื่อป้องกัน NaN errors
  const chartData = rawChartData.map(row => {
    const cleanRow: any = {};
    
    // ตรวจสอบและทำความสะอาดทุก key ในข้อมูล
    Object.keys(row).forEach(key => {
      let value = row[key];
      
      // ถ้าเป็น time field ให้ตรวจสอบว่าเป็นตัวเลขที่ถูกต้อง
      if (key === 'time' || key === 'day' || key === 'month') {
        if (typeof value === 'string') {
          const numValue = parseFloat(value);
          cleanRow[key] = !isNaN(numValue) && isFinite(numValue) ? numValue : 0;
        } else if (typeof value === 'number') {
          cleanRow[key] = !isNaN(value) && isFinite(value) ? value : 0;
        } else {
          cleanRow[key] = 0;
        }
      } else {
        // สำหรับข้อมูลอื่นๆ ให้ตรวจสอบว่าเป็นตัวเลขที่ถูกต้อง
        if (typeof value === 'string') {
          const numValue = parseFloat(value);
          cleanRow[key] = !isNaN(numValue) && isFinite(numValue) ? numValue : 0;
        } else if (typeof value === 'number') {
          cleanRow[key] = !isNaN(value) && isFinite(value) ? value : 0;
        } else {
          cleanRow[key] = 0;
        }
      }
    });
    
    return cleanRow;
  }).filter(row => {
    // กรองข้อมูลที่มี time ที่ถูกต้อง
    return row.time !== undefined && row.time !== null && !isNaN(row.time) && isFinite(row.time);
  });
  
  console.log('🔍 chartData สุดท้าย (หลังจากทำความสะอาด):', chartData);
  console.log('🔍 chartData[0] keys:', chartData[0] ? Object.keys(chartData[0]) : 'ไม่มีข้อมูล');
  
  // Debug: แสดง data keys ที่มีในข้อมูล
  if (chartData.length > 0) {
    const availableKeys = Object.keys(chartData[0]);
    console.log('🔍 Available data keys:', availableKeys);
    
    // ตรวจสอบ data keys ที่คาดหวัง
    selectedSlaveIds.forEach((slaveId, index) => {
      const meterName = selectedMeterNames[index] || `Meter ${slaveId}`;
      selectedColumns.forEach(column => {
        const expectedKey = `${meterName} - ${column}`;
        const hasKey = availableKeys.includes(expectedKey);
        console.log(`🔍 Expected key "${expectedKey}": ${hasKey ? '✅ Found' : '❌ Not found'}`);
      });
    });
  }
  
  
  // โหลดข้อมูลจาก API
  const loadChartData = async () => {
    if (!dateFrom || !dateTo) {
      setError('กรุณาเลือกช่วงวันที่');
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
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        slaveIds: selectedSlaveIds.length > 0 ? selectedSlaveIds : undefined,
      };

      console.log('🔍 ส่งพารามิเตอร์ไปยัง API (CompareGraph):', params);
      console.log('🔍 selectedColumns ที่ส่งไปยัง API:', selectedColumns);
      console.log('🔍 selectedSlaveIds ที่ส่งไปยัง API:', selectedSlaveIds);
      
      const response = await apiClient.getTableData(params);
      
      console.log('📊 ผลลัพธ์จาก API (CompareGraph):', response);
      console.log('📊 ข้อมูลดิบที่ได้รับ:', response.data);
      console.log('📊 จำนวนข้อมูลดิบ:', Array.isArray(response.data) ? response.data.length : 'ไม่ใช่ array');
      
      let cleanData: any[] = [];
      if (response.success && response.data) {
        // ตรวจสอบว่า response.data เป็น array หรือ object
        if (Array.isArray(response.data)) {
          console.log('✅ ข้อมูลที่ได้รับ (array):', response.data);
          console.log('✅ ตัวอย่างข้อมูลแถวแรก (array):', response.data[0]);
          console.log('✅ keys ในข้อมูลแถวแรก (array):', response.data[0] ? Object.keys(response.data[0]) : 'ไม่มีข้อมูล');
          console.log('✅ ข้อมูล slave_id ในข้อมูลแถวแรก:', response.data[0] ? response.data[0].slave_id : 'ไม่มี slave_id');
          console.log('✅ ข้อมูล slave_id ในข้อมูลแถวที่ 10:', response.data[9] ? response.data[9].slave_id : 'ไม่มี slave_id');
          cleanData = response.data;
        } else {
          // ถ้าเป็น object ให้ดูว่าข้อมูลอยู่ที่ไหน
          const dataArray = Array.isArray(response.data.data) ? response.data.data :
                           Array.isArray(response.data) ? response.data : [];
          console.log('✅ ข้อมูลที่ได้รับ (object):', dataArray);
          console.log('✅ ตัวอย่างข้อมูลแถวแรก (object):', dataArray[0]);
          console.log('✅ keys ในข้อมูลแถวแรก (object):', dataArray[0] ? Object.keys(dataArray[0]) : 'ไม่มีข้อมูล');
          cleanData = dataArray;
        }

          // สร้าง keysToCheck สำหรับข้อมูลดิบ - ใช้ selectedColumns โดยตรง
          // ตรวจสอบและทำความสะอาดข้อมูลพื้นฐาน
          cleanData = cleanData.filter(row => {
            return row && typeof row === 'object' && row !== null;
          });

          console.log('📊 ข้อมูลหลังจาก clean:', cleanData);
          console.log('📊 จำนวนข้อมูลหลังจาก clean:', cleanData.length);
          console.log('📊 ตัวอย่างข้อมูลแถวแรก:', cleanData[0]);
          console.log('📊 keys ในข้อมูลแถวแรก:', cleanData[0] ? Object.keys(cleanData[0]) : 'ไม่มีข้อมูล');
          console.log('📊 selectedSlaveIds:', selectedSlaveIds);
          console.log('📊 selectedMeterNames:', selectedMeterNames);
          console.log('📊 selectedColumns:', selectedColumns);
          
          // ตรวจสอบว่า selectedColumns มีในข้อมูลหรือไม่
          selectedColumns.forEach(col => {
            const hasInData = cleanData[0] && col in cleanData[0];
            console.log(`📊 Column "${col}": มีในข้อมูล = ${hasInData}`);
          });
          
          setTableData(cleanData);
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

  // useEffect สำหรับ auto-loading เมื่อเลือกมิเตอร์
  useEffect(() => {
    console.log('🔍 CompareGraph useEffect - selectedSlaveIds changed:', selectedSlaveIds);
    console.log('🔍 CompareGraph useEffect - selectedMeterNames:', selectedMeterNames);
    
    // ถ้าเลือกมิเตอร์แล้วและมีข้อมูลวันที่ ให้โหลดข้อมูล
    if (selectedSlaveIds.length > 0 && dateFrom && dateTo) {
      console.log('🚀 Auto-loading data for selected meters:', selectedSlaveIds);
      loadChartData();
    }
  }, [selectedSlaveIds, selectedMeterNames]);

    // สร้างข้อมูลสำหรับ Pie Chart จากข้อมูลจริง
  const getRealPieChartData = () => {
    console.log('🔍 getRealPieChartData - เริ่มต้น');
    console.log('🔍 getRealPieChartData - tableData length:', tableData?.length);
    console.log('🔍 getRealPieChartData - selectedSlaveIds:', selectedSlaveIds);
    console.log('🔍 getRealPieChartData - selectedMeterNames:', selectedMeterNames);
    console.log('🔍 getRealPieChartData - selectedColumns:', selectedColumns);
    
    if (!tableData || tableData.length === 0 || selectedSlaveIds.length === 0 || selectedColumns.length === 0) {
      console.log('🔍 getRealPieChartData - ไม่มีข้อมูลที่จำเป็น');
      return { chart1Data: [], chart2Data: [] };
    }
    
    console.log('🔍 getRealPieChartData - ตัวอย่างข้อมูลแถวแรก:', tableData[0]);
    console.log('🔍 getRealPieChartData - keys ในข้อมูลแถวแรก:', Object.keys(tableData[0]));

    // ใช้ข้อมูลจริงจาก tableData
    const chart1Data: any[] = [];
    const chart2Data: any[] = [];
    const colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];

    // สร้างข้อมูลสำหรับกราฟที่ 1 (คอลัมน์แรก)
    if (selectedColumns.length > 0) {
      const firstColumn = selectedColumns[0];
      
      console.log(`🔍 === PIE CHART 1 - ใช้คอลัมน์: ${firstColumn} ===`);
      console.log(`🔍 ตรวจสอบว่าคอลัมน์ ${firstColumn} มีในข้อมูลหรือไม่:`, tableData[0] && firstColumn in tableData[0]);
      
      selectedSlaveIds.forEach((slaveId, meterIndex) => {
        const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
        
        console.log(`🔍 === ${meterName} (${slaveId}) ===`);
        
        // กรองข้อมูลเฉพาะ slave_id นี้
        const meterData = tableData.filter(row => {
          const rowSlaveId = row.slave_id || row.slaveId;
          return rowSlaveId === slaveId || rowSlaveId === slaveId.toString();
        });
        
        console.log(`🔍 ข้อมูลที่กรองแล้วสำหรับ ${meterName} (${slaveId}): ${meterData.length} รายการ`);
        
        if (meterData.length === 0) {
          console.log(`⚠️ ไม่มีข้อมูลสำหรับ slave_id: ${slaveId}`);
          // ลองใช้ข้อมูลทั้งหมดถ้าไม่มี slave_id field
          const hasSlaveIdField = tableData.some(row => row.slave_id !== undefined || row.slaveId !== undefined);
          if (!hasSlaveIdField) {
            console.log('🔍 ไม่มี slave_id field ในข้อมูล - ใช้ข้อมูลทั้งหมดแทน');
            // ถ้าไม่มี slave_id field ให้แบ่งข้อมูลตามจำนวนมิเตอร์
            const dataPerMeter = Math.ceil(tableData.length / selectedSlaveIds.length);
            const startIndex = meterIndex * dataPerMeter;
            const endIndex = Math.min(startIndex + dataPerMeter, tableData.length);
            meterData.push(...tableData.slice(startIndex, endIndex));
            console.log(`🔍 ใช้ข้อมูลจากดัชนี ${startIndex} ถึง ${endIndex-1} สำหรับ ${meterName}`);
          }
        }
        
        // หาผลรวมของคอลัมน์แรกสำหรับ slave_id นี้
        const valuesWithTime = meterData.map(row => {
          const val = row[firstColumn];
          const time = row['time'] || row['reading_timestamp'];
          const numericVal = typeof val === 'string' ? parseFloat(val) : val;
          return { value: numericVal, time: time };
        }).filter(item => {
          const isValid = typeof item.value === 'number' && !isNaN(item.value) && isFinite(item.value);
          if (!isValid) {
            console.log(`⚠️ กรองข้อมูลออก: เวลา ${item.time}, ค่า ${item.value} (type: ${typeof item.value})`);
          }
          return isValid;
        });

        console.log(`📊 ข้อมูลที่ใช้คำนวณผลรวม (${valuesWithTime.length} รายการ):`);
        valuesWithTime.forEach((item, index) => {
          console.log(`   ${index + 1}. เวลา: ${item.time}, ค่า: ${item.value}`);
        });

        const values = valuesWithTime.map(item => item.value);
        const sumValue = values.length > 0 ? values.reduce((sum, val) => {
          const cleanVal = !isNaN(val) && isFinite(val) ? val : 0;
          return sum + cleanVal;
        }, 0) : 0;
        
        const cleanSumValue = !isNaN(sumValue) && isFinite(sumValue) ? sumValue : 0;
        console.log(`📊 ผลลัพธ์: ผลรวม = ${cleanSumValue}, จำนวนข้อมูล = ${values.length}`);
        console.log(`📊 ค่าเฉลี่ย = ${values.length > 0 ? (cleanSumValue / values.length).toFixed(2) : 0}`);

        // สร้างข้อมูลสำหรับกราฟวงกลม - แสดงตาม slave_id
        const chartData = {
          name: meterName,
          value: cleanSumValue,
          color: colors[meterIndex % colors.length]
        };

        // ตรวจสอบและทำความสะอาดข้อมูลก่อนเพิ่มเข้า chart1Data
        if (chartData && typeof chartData === 'object' && !isNaN(chartData.value) && isFinite(chartData.value)) {
          chart1Data.push(chartData);
          console.log(`✅ เพิ่มข้อมูลเข้า chart1Data: ${chartData.name} = ${chartData.value}`);
        } else {
          console.log('⚠️ ข้อมูลไม่ถูกต้องสำหรับ chart1Data:', chartData);
        }
      });
    }

    // สร้างข้อมูลสำหรับกราฟที่ 2 (คอลัมน์ที่สอง - ถ้ามี)
    if (selectedColumns.length > 1) {
      const secondColumn = selectedColumns[1];
      
      console.log(`🔍 === PIE CHART 2 - ${secondColumn} ===`);
      
      selectedSlaveIds.forEach((slaveId, meterIndex) => {
        const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
        
        console.log(`🔍 === ${meterName} (${slaveId}) ===`);
        
        // กรองข้อมูลเฉพาะ slave_id นี้
        const meterData = tableData.filter(row => {
          const rowSlaveId = row.slave_id || row.slaveId;
          return rowSlaveId === slaveId || rowSlaveId === slaveId.toString();
        });
        
        console.log(`🔍 ข้อมูลที่กรองแล้วสำหรับ ${meterName} (${slaveId}): ${meterData.length} รายการ`);
        
        if (meterData.length === 0) {
          console.log(`⚠️ ไม่มีข้อมูลสำหรับ slave_id: ${slaveId}`);
          // ลองใช้ข้อมูลทั้งหมดถ้าไม่มี slave_id field
          const hasSlaveIdField = tableData.some(row => row.slave_id !== undefined || row.slaveId !== undefined);
          if (!hasSlaveIdField) {
            console.log('🔍 ไม่มี slave_id field ในข้อมูล - ใช้ข้อมูลทั้งหมดแทน');
            // ถ้าไม่มี slave_id field ให้แบ่งข้อมูลตามจำนวนมิเตอร์
            const dataPerMeter = Math.ceil(tableData.length / selectedSlaveIds.length);
            const startIndex = meterIndex * dataPerMeter;
            const endIndex = Math.min(startIndex + dataPerMeter, tableData.length);
            meterData.push(...tableData.slice(startIndex, endIndex));
            console.log(`🔍 ใช้ข้อมูลจากดัชนี ${startIndex} ถึง ${endIndex-1} สำหรับ ${meterName}`);
          }
        }
        
        // หาผลรวมของคอลัมน์ที่สองสำหรับ slave_id นี้
        const valuesWithTime = meterData.map(row => {
          const val = row[secondColumn];
          const time = row['time'] || row['reading_timestamp'];
          const numericVal = typeof val === 'string' ? parseFloat(val) : val;
          return { value: numericVal, time: time };
        }).filter(item => typeof item.value === 'number' && !isNaN(item.value) && isFinite(item.value));

        console.log(`📊 ข้อมูลที่ใช้คำนวณผลรวม (${valuesWithTime.length} รายการ):`);
        valuesWithTime.forEach((item, index) => {
          console.log(`   ${index + 1}. เวลา: ${item.time}, ค่า: ${item.value}`);
        });

        const values = valuesWithTime.map(item => item.value);
        const sumValue = values.length > 0 ? values.reduce((sum, val) => {
          const cleanVal = !isNaN(val) && isFinite(val) ? val : 0;
          return sum + cleanVal;
        }, 0) : 0;
        
        const cleanSumValue = !isNaN(sumValue) && isFinite(sumValue) ? sumValue : 0;
        console.log(`📊 ผลลัพธ์: ผลรวม = ${cleanSumValue}, จำนวนข้อมูล = ${values.length}`);
        console.log(`📊 ค่าเฉลี่ย = ${values.length > 0 ? (cleanSumValue / values.length).toFixed(2) : 0}`);

        // สร้างข้อมูลสำหรับกราฟวงกลม - แสดงตาม slave_id
        const chartData = {
          name: meterName,
          value: cleanSumValue,
          color: colors[meterIndex % colors.length]
        };

        // ตรวจสอบและทำความสะอาดข้อมูลก่อนเพิ่มเข้า chart2Data
        if (chartData && typeof chartData === 'object' && !isNaN(chartData.value) && isFinite(chartData.value)) {
          chart2Data.push(chartData);
          console.log(`✅ เพิ่มข้อมูลเข้า chart2Data: ${chartData.name} = ${chartData.value}`);
        } else {
          console.log('⚠️ ข้อมูลไม่ถูกต้องสำหรับ chart2Data:', chartData);
        }
      });
    }

    // ตรวจสอบและทำความสะอาดข้อมูลใน chart1Data และ chart2Data
    const cleanChart1Data = chart1Data.filter(item => item && typeof item === 'object').map(item => ({
      ...item,
      value: !isNaN(item.value) && isFinite(item.value) ? item.value : 0
    }));
    
    const cleanChart2Data = chart2Data.filter(item => item && typeof item === 'object').map(item => ({
      ...item,
      value: !isNaN(item.value) && isFinite(item.value) ? item.value : 0
    }));
    
    console.log('🔍 Pie Chart - chart1Data:', cleanChart1Data);
    console.log('🔍 Pie Chart - chart2Data:', cleanChart2Data);
    console.log('🔍 Pie Chart - จำนวนข้อมูล chart1Data:', cleanChart1Data.length);
    console.log('🔍 Pie Chart - จำนวนข้อมูล chart2Data:', cleanChart2Data.length);
    return { chart1Data: cleanChart1Data, chart2Data: cleanChart2Data };
  };

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

  const { chart1Data, chart2Data } = getRealPieChartData();
  
  // ตรวจสอบและทำความสะอาดข้อมูลใน chart1Data และ chart2Data
  const cleanChart1Data = chart1Data.filter(item => item && typeof item === 'object').map(item => ({
    ...item,
    value: !isNaN(item.value) && isFinite(item.value) ? item.value : 0
  }));
  
  const cleanChart2Data = chart2Data.filter(item => item && typeof item === 'object').map(item => ({
    ...item,
    value: !isNaN(item.value) && isFinite(item.value) ? item.value : 0
  }));
  
  console.log('🔍 Final cleanChart1Data:', cleanChart1Data);
  console.log('🔍 Final cleanChart2Data:', cleanChart2Data);
  
  // เพิ่ม fallback data ถ้าไม่มีข้อมูล
  const finalChart1Data = cleanChart1Data.length > 0 ? cleanChart1Data : [
    { name: 'No Data', value: 1, color: '#ccc' }
  ];
  const finalChart2Data = cleanChart2Data.length > 0 ? cleanChart2Data : [
    { name: 'No Data', value: 1, color: '#ccc' }
  ];
  
  console.log('🔍 Final chart1Data for rendering:', finalChart1Data);
  console.log('🔍 Final chart2Data for rendering:', finalChart2Data);
  
  // แบ่งคอลัมน์เป็น 2 กลุ่ม (กราฟละ 2 ค่า)


  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Automatically load chart data when component mounts
  useEffect(() => {
    // Auto-load data when component mounts
    if (!isLoaded && tableData.length === 0) {
      loadChartData();
    }
  }, []); // Run only once when component mounts

  // Reload data when selected columns change
  useEffect(() => {
    if (isLoaded) {
      loadChartData();
    }
  }, [selectedColumns]); // Re-run when selectedColumns change

  // Export handler (PDF, CSV, Image)
  async function handleExport(type: 'pdf' | 'csv' | 'image') {
    // Get current date in DDMMYYYY format
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fileDate = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`;
    const baseName = `CompareGraph-${fileDate}`;
    
    if (type === 'pdf') {
      // Export as PDF
      const chart = chartRef.current;
      if (!chart) return;
      const canvas = await html2canvas(chart as HTMLElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight > pageHeight-40 ? pageHeight-40 : imgHeight);
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

  // Send report handler
  async function handleSendReport(payload: {
    type: 'email' | 'line';
    exportType?: 'pdf' | 'csv' | 'image' | 'text';
    emailListId?: number;
    emailGroupId?: number;
    lineListId?: number;
    lineGroupId?: number;
  }) {
    setIsSending(true);
    try {
      // Create report data
      const reportData = {
        type: 'compare-graph',
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        timeFrom,
        timeTo,
        typeFilter,
        graphType,
        meterNames: selectedMeterNames,
        columns: selectedColumns,
        dataPoints: chartData.length,
        ...payload
      };

      // Send report logic here
      console.log('Sending report:', reportData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`ส่งรายงานเรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error sending report:', error);
      alert('เกิดข้อผิดพลาดในการส่งรายงาน');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <PageLayout>
      <div className="pt-0 pb-6 animate-fade-in ml-0 sm:ml-2 md:ml-4 lg:ml-8">
        {/* Header */}
        <div className="flex justify-center mt-0">
         <Card className="bg-transparent shadow-none border-none w-full max-w-5xl rounded-t-xl rounded-b-none">
                     <CardContent className="p-2 bg-transparent shadow-none">
                       <div className="flex flex-wrap items-center gap-1 bg-white rounded-t-xl rounded-b-none px-2 py-1 justify-center text-xs">
                         {/* Toggle Graph Type */}
                         <ToggleGroup type="single" value={graphType} onValueChange={v => v && setGraphType(v as 'bar' | 'pie')} className="mr-1">
                           <ToggleGroupItem value="pie" aria-label="Pie Chart" className="flex items-center gap-1 px-2 py-0 h-7 rounded-none text-xs data-[state=on]:bg-primary data-[state=on]:text-white">
                             <PieChartIcon className="w-4 h-4" />
                             <span className="hidden sm:inline">{language === 'TH' ? 'พาย' : 'Pie'}</span>
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
                                 {dateFrom ? format(dateFrom, language === 'TH' ? "dd MMMM yyyy" : "dd MMMM yyyy") : "--/--/----"}
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
                                           className="h-7 w-10 text-xs rounded-none border-gray-200 shadow-sm px-1 focus:ring-2 focus:ring-primary focus:border-primary"
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
                           {isLoading ? (language === 'TH' ? 'กำลังโหลด...' : 'Loading...') : (language === 'TH' ? 'โหลด' : 'Load')}
                         </Button>
                         
                         {/* Date Navigation */}
                         <DateNavigation
                           onNavigate={handleDateNavigation}
                           className="ml-1"
                           disabled={isLoading}
                         />
                         
                         {/* Print Button */}
                         <Button
                           className="h-7 px-2 text-xs rounded-none bg-muted hover:bg-primary shadow flex items-center ml-1"
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
            <div ref={chartRef} className="h-[550px] w-full ">
              {graphType === 'bar' ? (
                isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">{language === 'TH' ? 'กำลังโหลดข้อมูล...' : 'Loading data...'}</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ) : selectedSlaveIds.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">
                      กรุณาเลือกมิเตอร์ใน sidebar เพื่อแสดงข้อมูล (selectedSlaveIds: {selectedSlaveIds.length})
                    </p>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        {language === 'TH' ? 'ไม่มีข้อมูลในช่วงเวลาที่เลือก' : 'No data available for the selected time range'}
                      </p>
                      <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
                        <p><strong>Debug Info:</strong></p>
                        <p>selectedSlaveIds: {JSON.stringify(selectedSlaveIds)}</p>
                        <p>selectedMeterNames: {JSON.stringify(selectedMeterNames)}</p>
                        <p>selectedColumns: {JSON.stringify(selectedColumns)}</p>
                        <p>tableData length: {tableData.length}</p>
                        <p>chartData length: {chartData.length}</p>
                        {tableData[0] && (
                          <div>
                            <p>tableData[0] keys: {Object.keys(tableData[0]).join(', ')}</p>
                            <p>Sample tableData:</p>
                            <pre className="text-xs overflow-auto">{JSON.stringify(tableData[0], null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                      data={chartData.filter(row => {
                        // กรองข้อมูลที่มี time ที่ถูกต้องและไม่เป็น NaN
                        return row && 
                               row.time !== undefined && 
                               row.time !== null && 
                               !isNaN(row.time) && 
                               isFinite(row.time);
                      }).map((row, index) => ({
                        ...row,
                        // เพิ่ม unique key สำหรับแต่ละแถว
                        _id: index
                      }))}
                      margin={{ top: 5, right: 30, left: 10, bottom: -20 }}
                      onMouseMove={(data, index) => {
                        console.log('🔍 BarChart onMouseMove - data:', data, 'index:', index);
                      }}
                      onMouseEnter={(data, index) => {
                        console.log('🔍 BarChart onMouseEnter - data:', data, 'index:', index);
                      }}
                      onMouseLeave={(data, index) => {
                        console.log('🔍 BarChart onMouseLeave - data:', data, 'index:', index);
                      }}
                      onMouseDown={(data, index) => {
                        console.log('🔍 BarChart onMouseDown - data:', data, 'index:', index);
                      }}
                      onMouseUp={(data, index) => {
                        console.log('🔍 BarChart onMouseUp - data:', data, 'index:', index);
                      }}

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
                            // Format as "14:00" for day view
                            return `${value}:00`;
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
                              return `วันที่: ${value}`;
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
                            if (value >= 1000) {
                              return [`${(value / 1000).toFixed(1)}k`, name];
                            }
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
                      {/* แสดงแท่งกราฟสำหรับทุกมิเตอร์และคอลัมน์ */}
                      {(() => {
                        console.log('🔍 === BAR CHART DEBUG ===');
                        console.log('🔍 selectedSlaveIds:', selectedSlaveIds);
                        console.log('🔍 selectedMeterNames:', selectedMeterNames);
                        console.log('🔍 selectedColumns:', selectedColumns);
                        console.log('🔍 chartData length:', chartData.length);
                        console.log('🔍 chartData[0] keys:', chartData[0] ? Object.keys(chartData[0]) : 'ไม่มีข้อมูล');
                        console.log('🔍 chartData[0] sample:', chartData[0]);
                        
                        // ตรวจสอบว่ามีข้อมูลหรือไม่
                        if (chartData.length === 0) {
                          console.log('⚠️ ไม่มีข้อมูลใน chartData');
                          return null;
                        }
                        
                        // ตรวจสอบว่ามีมิเตอร์และคอลัมน์ที่เลือกหรือไม่
                        if (selectedSlaveIds.length === 0 || selectedColumns.length === 0) {
                          console.log('⚠️ ไม่มีมิเตอร์หรือคอลัมน์ที่เลือก');
                          return null;
                        }
                        
                        const bars: any[] = [];
                        const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'];
                        
                        // สร้าง Bar สำหรับทุกมิเตอร์และทุกคอลัมน์
                        selectedSlaveIds.forEach((slaveId, meterIndex) => {
                          const meterName = selectedMeterNames[meterIndex] || `Meter ${slaveId}`;
                          
                          selectedColumns.forEach((column, columnIndex) => {
                            const dataKey = `${meterName} - ${column}`;
                            const colorIndex = (meterIndex * selectedColumns.length + columnIndex) % colors.length;
                            
                            console.log(`🔍 ตรวจสอบ dataKey: ${dataKey}`);
                            
                            // ตรวจสอบว่าข้อมูลมีอยู่จริง
                            const hasData = chartData.some(row => {
                              const value = row[dataKey];
                              return value !== undefined && 
                                     value !== null && 
                                     !isNaN(value) && 
                                     isFinite(value) &&
                                     value !== 0; // เพิ่มเงื่อนไขนี้เพื่อแสดงเฉพาะข้อมูลที่มีค่า
                            });
                            
                            console.log(`🔍 Has data for ${dataKey}:`, hasData);
                            
                            if (hasData) {
                              bars.push(
                                <Bar
                                  key={`${meterIndex}-${columnIndex}-${dataKey}`}
                                  dataKey={dataKey}
                                  name={`${meterName} - ${column}`}
                                  fill={colors[colorIndex]}
                                  stroke={colors[colorIndex]}
                                  strokeWidth={1}
                                />
                              );
                              console.log(`✅ เพิ่ม Bar: ${dataKey} ด้วยสี ${colors[colorIndex]}`);
                            } else {
                              console.log(`⚠️ ไม่มีข้อมูลสำหรับ: ${dataKey}`);
                            }
                          });
                        });
                        
                        console.log(`🔍 จำนวน Bars ที่สร้าง: ${bars.length}`);
                        
                        return bars.length > 0 ? bars : (
                          <Bar
                            key="no-data"
                            dataKey="time"
                            name="No Data"
                            fill="#cccccc"
                          />
                        );
                      })()}
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )
              ) : (
                <div className="h-full">
                  {(() => {
                    console.log('🔍 Rendering Pie Chart - cleanChart1Data length:', cleanChart1Data.length, 'cleanChart2Data length:', cleanChart2Data.length);
                    return null;
                  })()}
                  {finalChart1Data.length === 0 && finalChart2Data.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <p className="text-muted-foreground mb-4">
                          {language === 'TH' ? 'กรุณาเลือกมิเตอร์และค่าเพื่อแสดงกราฟ' : 'Please select meters and values to display chart'}
                        </p>
                        <div className="p-4 bg-gray-100 rounded text-xs">
                          <p><strong>Debug Info:</strong></p>
                          <p>selectedSlaveIds: {JSON.stringify(selectedSlaveIds)}</p>
                          <p>selectedMeterNames: {JSON.stringify(selectedMeterNames)}</p>
                          <p>selectedColumns: {JSON.stringify(selectedColumns)}</p>
                          <p>tableData length: {tableData.length}</p>
                          <p>chart1Data length: {chart1Data.length}</p>
                          <p>chart2Data length: {chart2Data.length}</p>
                          <p>cleanChart1Data length: {cleanChart1Data.length}</p>
                          <p>cleanChart2Data length: {cleanChart2Data.length}</p>
                          {tableData[0] && (
                            <div>
                              <p>tableData[0] keys: {Object.keys(tableData[0]).join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`grid gap-4 sm:gap-6 h-full p-4 ${finalChart2Data.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                      {/* First Chart Card */}
                      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col items-center justify-center">
                        {/* Chart Title */}
                        <div className="w-full text-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {selectedColumns.length > 0 ? selectedColumns[0] : 'Chart 1'}
                          </h3>
                        </div>
                        <div className="flex justify-center w-full">
                          <ResponsiveContainer width="100%" height={300} style={{ fontSize: '12px' }}>
                            <PieChart>
                              {/* แสดงผลรวมตรงกลาง */}
                              <text
                                x="50%"
                                y="50%"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ fontSize: '14px', fontWeight: 'bold', fill: '#333' }}
                              >
                                {(() => {
                                  let total = 0;
                                  
                                  if (typeFilter === '24h') {
                                    // Day view: ผลรวมของทุกช่วงเวลาในวันนั้น
                                    total = finalChart1Data.reduce((sum, item) => sum + (item.value || 0), 0);
                                  } else if (typeFilter === '1month') {
                                    // Month view: ผลรวมของทุกวันในเดือนนั้น
                                    total = finalChart1Data.reduce((sum, item) => sum + (item.value || 0), 0);
                                  } else if (typeFilter === '1year') {
                                    // Year view: ผลรวมของทุกเดือนในช่วงที่เลือก
                                    total = finalChart1Data.reduce((sum, item) => sum + (item.value || 0), 0);
                                  }
                                  
                                  const formattedTotal = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(2);
                                  const typeLabel = typeFilter === '24h' ? (language === 'TH' ? 'รวมรายวัน' : 'Day Total') : 
                                                  typeFilter === '1month' ? (language === 'TH' ? 'รวมรายเดือน' : 'Month Total') : (language === 'TH' ? 'รวมรายปี' : 'Year Total');
                                  return `${typeLabel}: ${formattedTotal}`;
                                })()}
                              </text>
                                                              <Pie
                                  data={finalChart1Data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value, percent }) => {
                                  const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(2);
                                  return `${name}\n${formattedValue}\n${(percent * 100).toFixed(1)}%`;
                                }}
                                outerRadius="65%"
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {finalChart1Data.map((entry, index) => (
                                  <Cell key={`cell-1-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value, name, props) => {
                                  if (typeof value === 'number') {
                                    if (value >= 1000) {
                                      return [`${(value / 1000).toFixed(1)}k`, name];
                                    }
                                    return [value.toFixed(2), name];
                                  }
                                  return [value, name];
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      {/* Second Chart Card - แสดงเฉพาะเมื่อมีข้อมูล */}
                      {finalChart2Data.length > 0 && (
                        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col items-center justify-center">
                          {/* Chart Title */}
                          <div className="w-full text-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                              {selectedColumns.length > 1 ? selectedColumns[1] : 'Chart 2'}
                            </h3>
                          </div>
                          <div className="flex justify-center w-full">
                            <ResponsiveContainer width="100%" height={300} style={{ fontSize: '12px' }}>
                              <PieChart>
                                {/* แสดงผลรวมตรงกลาง */}
                                <text
                                  x="50%"
                                  y="50%"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  style={{ fontSize: '14px', fontWeight: 'bold', fill: '#333' }}
                                >
                                  {(() => {
                                    let total = 0;
                                    
                                    if (typeFilter === '24h') {
                                      // Day view: ผลรวมของทุกช่วงเวลาในวันนั้น
                                      total = finalChart2Data.reduce((sum, item) => sum + (item.value || 0), 0);
                                    } else if (typeFilter === '1month') {
                                      // Month view: ผลรวมของทุกวันในเดือนนั้น
                                      total = finalChart2Data.reduce((sum, item) => sum + (item.value || 0), 0);
                                    } else if (typeFilter === '1year') {
                                      // Year view: ผลรวมของทุกเดือนในช่วงที่เลือก
                                      total = finalChart2Data.reduce((sum, item) => sum + (item.value || 0), 0);
                                    }
                                    
                                    const formattedTotal = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(2);
                                    const typeLabel = typeFilter === '24h' ? (language === 'TH' ? 'รวมรายวัน' : 'Day Total') : 
                                                    typeFilter === '1month' ? (language === 'TH' ? 'รวมรายเดือน' : 'Month Total') : (language === 'TH' ? 'รวมรายปี' : 'Year Total');
                                    return `${typeLabel}: ${formattedTotal}`;
                                  })()}
                                </text>
                                <Pie
                                  data={finalChart2Data}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value, percent }) => {
                                    const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(2);
                                    return `${name}\n${formattedValue}\n${(percent * 100).toFixed(1)}%`;
                                  }}
                                  outerRadius="65%"
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {finalChart2Data.map((entry, index) => (
                                    <Cell key={`cell-2-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value, name, props) => {
                                    if (typeof value === 'number') {
                                      if (value >= 1000) {
                                        return [`${(value / 1000).toFixed(1)}k`, name];
                                      }
                                      return [value.toFixed(2), name];
                                    }
                                    return [value, name];
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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