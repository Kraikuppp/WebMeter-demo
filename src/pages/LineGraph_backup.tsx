import React, { useState, useRef, useEffect, useContext } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { apiClient } from '../services/api';
import type { ApiTableDataRow } from '../services/api';
import { TableColumnContext } from '../context/TableColumnContext';
import { useMeterTree } from '../hooks/useMeterTree';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { TimeInput24 } from '@/components/ui/time-input-24';

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

export default function LineGraph() {
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  const [typeFilter, setTypeFilter] = useState<'24h' | '1month' | '1year'>('24h');
  const [graphType, setGraphType] = useState<'line' | 'bar'>('line');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<ApiTableDataRow[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ 
    contentRef: chartRef,
    documentTitle: 'LineGraph Report'
  });
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTimeString());
  
  // ใช้ context สำหรับ selected columns และ meter tree
  const context = useContext(TableColumnContext);
  const contextSelectedColumns = context?.selectedColumns || [];
  const { selectedNodeId, treeData } = useMeterTree();

  // คอลัมน์ที่บังคับให้แสดงเสมอ
  const mandatoryColumns = ['Import kWh', 'Export kWh', 'Import kVarh', 'Export kVarh'];
  
  // รวมคอลัมน์ที่เลือกกับคอลัมน์บังคับ
  const displayColumns = [...new Set([...contextSelectedColumns, ...mandatoryColumns])];

  // ฟังก์ชันโหลดข้อมูลจาก API
  const loadChartData = async () => {
    if (!dateFrom) {
      setError('กรุณาเลือกวันที่');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = {
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo || dateFrom, 'yyyy-MM-dd'),
        timeFrom,
        timeTo,
        columns: contextSelectedColumns.length > 0 ? contextSelectedColumns : undefined,
        meterId: selectedNodeId || undefined,
        interval: '15min', // ดึงข้อมูลทุก 15 นาที
      };

      console.log('🔄 กำลังโหลดข้อมูลด้วยพารามิเตอร์:', params);
      
      const response = await apiClient.getTableData(params);
      
      console.log('✅ โหลดข้อมูลสำเร็จ:', response.data?.length || 0, 'แถว');
      
      setTableData(response.data || []);
      setIsLoaded(true);
    } catch (err: any) {
      console.error('❌ ข้อผิดพลาดในการโหลดข้อมูล:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  // โหลดข้อมูลเมื่อคอมโพเนนต์เริ่มต้น
  useEffect(() => {
    loadChartData();
  }, [dateFrom, dateTo, timeFrom, timeTo, selectedNodeId, contextSelectedColumns]);

  // อัปเดตเวลาปัจจุบันทุก 30 วินาที
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTimeString());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ฟังก์ชันเตรียมข้อมูลสำหรับกราฟ
  const prepareChartData = () => {
    console.log('🔄 เริ่มเตรียมข้อมูลกราฟ...');
    console.log('📊 ข้อมูลที่ได้รับ:', tableData?.length || 0, 'แถว');
    console.log('🎯 Type Filter:', typeFilter);
    console.log('📋 คอลัมน์ที่แสดง:', displayColumns);

    if (!tableData || tableData.length === 0) {
      console.log('⚠️ ไม่มีข้อมูลสำหรับสร้างกราฟ');
      return [];
    }

    const filteredData = tableData.map((row, index) => {
      console.log(`🔍 ประมวลผลแถวที่ ${index + 1}:`, row);
      
      // หาข้อมูลเวลา - ลองหลายฟิลด์
      const timeFields = ['time', 'datetime', 'timestamp', 'date'];
      let timeValue = '';
      
      for (const field of timeFields) {
        if (row[field]) {
          timeValue = String(row[field]);
          break;
        }
      }

      if (!timeValue) {
        console.log(`⚠️ ไม่พบข้อมูลเวลาในแถวที่ ${index + 1}`);
        return null;
      }

      console.log(`⏰ ข้อมูลเวลาดิบ [${index}]:`, timeValue);

      // แปลงข้อมูลเวลาให้เหมาะสมกับแกน X
      let axisValue = 0;
      const timeString = timeValue.toString();

      if (typeFilter === '1month') {
        // สำหรับ Month: ดึงวันที่จาก date string
        // รูปแบบที่รองรับ: "YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DD HH:MM:SS"
        let dateMatch = null;
        
        // ลองหารูปแบบ YYYY-MM-DD
        dateMatch = timeString.match(/\d{4}-\d{2}-(\d{2})/);
        if (dateMatch) {
          axisValue = parseInt(dateMatch[1]); // วันที่
        } else {
          // ลองหารูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY
          dateMatch = timeString.match(/(\d{1,2})[\/\-]\d{1,2}[\/\-]\d{4}/);
          if (dateMatch) {
            axisValue = parseInt(dateMatch[1]); // วันที่
          }
        }
        
        console.log(`📅 แปลงวันที่สำเร็จ [${index}]: ${timeString} -> วันที่ ${axisValue}`);
      } else if (typeFilter === '1year') {
        // สำหรับ Year: ดึงเดือนจาก date string
        // รูปแบบที่รองรับ: "YYYY-MM-DD", "MM/DD/YYYY", "YYYY-MM-DD HH:MM:SS"
        let monthMatch = null;
        
        // ลองหารูปแบบ YYYY-MM-DD
        monthMatch = timeString.match(/\d{4}-(\d{2})-\d{2}/);
        if (monthMatch) {
          axisValue = parseInt(monthMatch[1]); // เดือน
        } else {
          // ลองหารูปแบบ MM/DD/YYYY หรือ DD/MM/YYYY
          monthMatch = timeString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]\d{4}/);
          if (monthMatch) {
            // ต้องตรวจสอบว่าเป็น MM/DD หรือ DD/MM
            const first = parseInt(monthMatch[1]);
            const second = parseInt(monthMatch[2]);
            // ถ้าตัวแรก > 12 แสดงว่าเป็น DD/MM
            axisValue = first > 12 ? second : first; // เดือน
          }
        }
        
        console.log(`📅 แปลงเดือนสำเร็จ [${index}]: ${timeString} -> เดือน ${axisValue}`);
      } else {
        // สำหรับ Day (24h): ดึงชั่วโมงจาก time string
        // รูปแบบที่รองรับ: "HH:MM", "HH:MM:SS", "YYYY-MM-DD HH:MM:SS"
        let hourMatch = null;
        
        // ลองหารูปแบบ HH:MM หรือ HH:MM:SS
        hourMatch = timeString.match(/(\d{1,2}):\d{2}/);
        if (hourMatch) {
          axisValue = parseInt(hourMatch[1]); // ชั่วโมง
        } else {
          // ลองหารูปแบบ YYYY-MM-DD HH:MM:SS
          hourMatch = timeString.match(/\d{4}-\d{2}-\d{2}\s+(\d{1,2}):\d{2}/);
          if (hourMatch) {
            axisValue = parseInt(hourMatch[1]); // ชั่วโมง
          }
        }
        
        console.log(`⏰ แปลงชั่วโมงสำเร็จ [${index}]: ${timeString} -> ชั่วโมง ${axisValue}`);
      }

      if (axisValue === 0 && !timeString.includes('00:00') && !timeString.includes('0000-01-01')) {
        console.log(`⚠️ ไม่สามารถแปลงเวลาได้ [${index}]:`, timeString);
      }

      // สร้างข้อมูลสำหรับกราฟ
      const chartRow: any = {
        time: axisValue,
        originalTime: timeValue,
      };

      // เพิ่มข้อมูลตามคอลัมน์ที่เลือก
      displayColumns.forEach(column => {
        const value = row[column];
        if (value !== undefined && value !== null) {
          chartRow[column] = parseFloat(String(value)) || 0;
        } else {
          chartRow[column] = 0;
        }
      });

      console.log(`✅ สร้างข้อมูลกราฟ [${index}]:`, chartRow);
      return chartRow;
    }).filter(Boolean); // กรองข้อมูลที่ null ออก

    // เรียงลำดับตามเวลา
    const sortedData = filteredData.sort((a, b) => a.time - b.time);
    
    console.log('📈 ข้อมูลกราฟสุดท้าย:', sortedData);
    return sortedData;
  };

  // ฟังก์ชันสำหรับการดาวน์โหลดข้อมูล
  const handleDownload = () => {
    console.log('📥 เริ่มการดาวน์โหลด...');
    const csvContent = prepareCsvData();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `line_graph_data_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ฟังก์ชันเตรียมข้อมูล CSV
  const prepareCsvData = () => {
    if (!tableData || tableData.length === 0) return '';
    
    const headers = ['Time', ...displayColumns];
    const csvRows = [headers.join(',')];
    
    const chartData = prepareChartData();
    chartData.forEach(row => {
      const csvRow = [
        row.originalTime,
        ...displayColumns.map(col => row[col] || 0)
      ];
      csvRows.push(csvRow.join(','));
    });
    
    return csvRows.join('\n');
  };

  const chartData = prepareChartData();

  // สีสำหรับเส้นกราฟ
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', 
    '#ff00ff', '#00ffff', '#ff0000', '#0000ff', '#ffff00'
  ];

  // กำหนด domain และ ticks สำหรับแกน X ตาม type
  const getXAxisConfig = () => {
    switch (typeFilter) {
      case '24h':
        return {
          domain: [0, 24],
          ticks: [0, 4, 8, 12, 16, 20, 24],
          tickFormatter: (value: number) => `${value}:00`
        };
      case '1month':
        return {
          domain: [1, 31],
          ticks: [1, 5, 10, 15, 20, 25, 31],
          tickFormatter: (value: number) => `${value}`
        };
      case '1year':
        return {
          domain: [1, 12],
          ticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          tickFormatter: (value: number) => `${value}`
        };
      default:
        return {
          domain: [0, 24],
          ticks: [0, 4, 8, 12, 16, 20, 24],
          tickFormatter: (value: number) => `${value}:00`
        };
    }
  };

  const xAxisConfig = getXAxisConfig();

  // ฟังก์ชันกำหนดชื่อ label สำหรับ tooltip
  const getTooltipLabel = (label: string) => {
    switch (typeFilter) {
      case '24h':
        return `เวลา: ${label}:00`;
      case '1month':
        return `วันที่: ${label}`;
      case '1year':
        return `เดือน: ${label}`;
      default:
        return `เวลา: ${label}:00`;
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Line Graph</h1>
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Date From */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy') : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time From */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Time From</label>
            <TimeInput24 
              value={timeFrom} 
              onChange={setTimeFrom} 
              className="w-full"
            />
          </div>

          {/* Time To */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Time To</label>
            <TimeInput24 
              value={timeTo} 
              onChange={setTimeTo} 
              className="w-full"
            />
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={typeFilter} onValueChange={(value: '24h' | '1month' | '1year') => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="1month">1 Month</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Graph Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Graph Type</label>
            <Select value={graphType} onValueChange={(value: 'line' | 'bar') => setGraphType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart */}
        <Card>
          <CardContent className="p-6">
            <div ref={chartRef} className="w-full">
              {/* Print Header */}
              <div className="print-only mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Line Graph Report</h2>
                <p className="text-gray-600">
                  วันที่พิมพ์: {currentDateTime}
                </p>
                <p className="text-gray-600">
                  ช่วงเวลา: {formatDateTime(dateFrom, timeFrom)} - {formatDateTime(dateTo, timeTo)}
                </p>
              </div>

              {isLoading && (
                <div className="flex justify-center items-center h-96">
                  <div className="text-lg">กำลังโหลดข้อมูล...</div>
                </div>
              )}

              {error && (
                <div className="flex justify-center items-center h-96">
                  <div className="text-red-500 text-lg">{error}</div>
                </div>
              )}

              {!isLoading && !error && chartData.length === 0 && (
                <div className="flex justify-center items-center h-96">
                  <div className="text-gray-500 text-lg">ไม่มีข้อมูลสำหรับแสดงผล</div>
                </div>
              )}

              {!isLoading && !error && chartData.length > 0 && (
                <div className="w-full h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {graphType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time"
                          domain={xAxisConfig.domain}
                          ticks={xAxisConfig.ticks}
                          tickFormatter={xAxisConfig.tickFormatter}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(label) => getTooltipLabel(label)}
                        />
                        {displayColumns.map((column, index) => (
                          <Line
                            key={column}
                            type="monotone"
                            dataKey={column}
                            stroke={colors[index % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ))}
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time"
                          domain={xAxisConfig.domain}
                          ticks={xAxisConfig.ticks}
                          tickFormatter={xAxisConfig.tickFormatter}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(label) => getTooltipLabel(label)}
                        />
                        {displayColumns.map((column, index) => (
                          <Bar
                            key={column}
                            dataKey={column}
                            fill={colors[index % colors.length]}
                          />
                        ))}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Summary */}
        {!isLoading && !error && isLoaded && (
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลสรุป</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">ช่วงเวลา</div>
                  <div className="font-medium">
                    {formatDateTime(dateFrom, timeFrom)} - {formatDateTime(dateTo, timeTo)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">จำนวนข้อมูล</div>
                  <div className="font-medium">{tableData.length} แถว</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">คอลัมน์ที่แสดง</div>
                  <div className="font-medium">{displayColumns.length} คอลัมน์</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">ประเภทกราฟ</div>
                  <div className="font-medium">{graphType === 'line' ? 'เส้นกราฟ' : 'กราฟแท่ง'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
