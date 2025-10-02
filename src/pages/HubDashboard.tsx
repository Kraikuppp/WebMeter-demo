import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Zap, Activity, TrendingUp, TrendingDown, DollarSign, Wifi, Clock, Building2, Gauge, Power, Timer, Cpu, Monitor, Database, MapPin, Settings, LayoutGrid, LineChart, PieChart as PieChartIcon, Repeat, RefreshCw } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { PageLayout } from '@/components/layout/PageLayout';

import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  ReferenceArea
} from 'recharts';
import { TimeInput24 } from '@/components/ui/time-input-24';
import { apiClient, handleApiError } from '@/services/api';
import { meterTreeService } from '@/services/meterTreeService';


// Meter list - จะดึงจาก API
const defaultMeters = [
  { id: 'AMR-B1-I/C1.2', name: 'AMR-B1-I/C1.2', slaveId: 1, meterId: 1 },
  { id: 'AMR-B1-F4', name: 'AMR-B1-F4', slaveId: 2, meterId: 2 },
  { id: 'AMR-B1-F1', name: 'AMR-B1-F1', slaveId: 3, meterId: 3 },
  { id: 'AMR-Boiler', name: 'AMR-Boiler', slaveId: 4, meterId: 4 },
  { id: 'Plat1 Controller', name: 'Plat1 Controller', slaveId: 5, meterId: 5 },
];

// Initial empty data structures
const initialTouBarData = Array.from({ length: 25 }, (_, hour) => ({
  hour,
  demandW: 0,
  demandVar: 0,
  demandVA: 0,
  importKwh: 0,
  exportKwh: 0,
  importKvarh: 0,
  exportKvarh: 0
}));

// Dashboard template list
const dashboardTemplates = [
  { id: 'default', name: 'Default Template' }
];


// Donut Chart Component
function DonutChart({ data, size = 120 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;
  
  const colors = ['#3b82f6', '#1e40af', '#06b6d4', '#0ea5e9'];
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="20"
        />
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const strokeDasharray = `${percentage * 2.51} 251`;
          const strokeDashoffset = -cumulativePercentage * 2.51;
          cumulativePercentage += percentage;
          
          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 10}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth="20"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{total.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total kWh</div>
        </div>
      </div>
    </div>
  );
}

// Gauge Component
function GaugeChart({ value, max, label, color = '#3b82f6' }) {
  const percentage = (value / max) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" className="transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-bold text-blue-600">{percentage.toFixed(0)}%</div>
        <div className="text-xs text-gray-500 text-center">{label}</div>
      </div>
    </div>
  );
}

// Mini Chart Component
function MiniChart({ data, color = '#3b82f6' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  return (
    <div className="flex items-end gap-1 h-8">
      {data.map((value, index) => (
        <div
          key={index}
          className="w-1 bg-blue-500 rounded-t"
          style={{
            height: `${((value - min) / range) * 100}%`,
            backgroundColor: color,
            minHeight: '2px'
          }}
        />
      ))}
    </div>
  );
}

// Bar Chart Component
function BarChart({ data, height = 200 }) {
  const max = Math.max(...data);
  
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((value, index) => (
        <div key={index} className="flex flex-col items-center gap-1">
          <div
            className="w-8 rounded-t-lg transition-all duration-300"
            style={{
              height: `${(value / max) * (height - 30)}px`,
              backgroundColor: index % 2 === 0 ? '#3b82f6' : '#06b6d4'
            }}
          />
          <div className="text-xs text-gray-500 text-center">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index] || index}
          </div>
        </div>
      ))}
    </div>
  );
}

// Add SparklineChart component for simple line chart
function SparklineChart({ data, color = '#6366f1', width = 48, height = 20 }) {
  // Ensure data contains only numbers
  const numericData = data.map(d => Number(d) || 0);
  const max = Math.max(...numericData);
  const min = Math.min(...numericData);
  const points = numericData.map((d, i) => {
    const x = (i / (numericData.length - 1)) * (width - 2) + 1;
    const y = height - 1 - ((d - min) / (max - min || 1)) * (height - 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        opacity="0.6"
      />
    </svg>
  );
}

// Odometer style number component
function Odometer({ value, digits = 6, decimals = 2, small }) {
  const [intPart, decPart] = (Number(value) || 0).toFixed(decimals).split('.')
  const fontSize = small ? 20 : 32;
  const digitWidth = small ? 18 : 26;
  const digitHeight = small ? 28 : 38;
  const decWidth = small ? 14 : 20;
  const decHeight = small ? 22 : 34;
  const minWidth = small ? 120 : 220;
  const padding = small ? '4px 8px' : '8px 18px';
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize, letterSpacing: 1, background: '#fff', borderRadius: 8, padding, boxSizing: 'border-box', minWidth, justifyContent: 'center' }}>
      {intPart.padStart(digits, '0').split('').map((d, i) => (
        <span key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, width: digitWidth, height: digitHeight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>{d}</span>
      ))}
      <span style={{ margin: '0 2px', fontSize: small ? 14 : 24 }}>,</span>
      {decPart.split('').map((d, i) => (
        <span key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, width: decWidth, height: decHeight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', marginRight: 1 }}>{d}</span>
      ))}
    </div>
  );
}

// Initial demand data structure
const initialDemandData = Array.from({ length: 25 }, (_, h) => ({
  hour: h,
  watt: 0,
  var: 0,
  va: 0,
}));

// Add a GaugeMeter component for analog display (with danger zones)
function GaugeMeter({ value, min, max, label, unit, color = '#3b82f6', size = 180 }) {
  const percent = (value - min) / (max - min);
  const angle = -120 + percent * 240; // -120deg to +120deg
  const mainArcRadius = size * 0.33; // main arc radius for both arc and danger zone
  const tickRadius = size * 0.4; // for ticks only
  const center = size / 2;
  const pointerLength = size * 0.33;
  const pointerAngle = (angle - 90) * (Math.PI / 180);
  const pointerX = center + pointerLength * Math.cos(pointerAngle);
  const pointerY = center + pointerLength * Math.sin(pointerAngle);
  
  // Define danger zones based on meter type
  let dangerZones = [];
  if (label.includes('Volt LN')) {
    // Danger zones for Volt LN: below 210V and above 240V
    dangerZones = [
      { start: -120, end: -120 + ((210 - min) / (max - min)) * 240 }, // Low voltage danger
      { start: -120 + ((240 - min) / (max - min)) * 240, end: 120 } // High voltage danger
    ];
  } else if (label.includes('Volt LL')) {
    // Danger zones for Volt LL: below 360V and above 420V
    dangerZones = [
      { start: -120, end: -120 + ((360 - min) / (max - min)) * 240 }, // Low voltage danger
      { start: -120 + ((420 - min) / (max - min)) * 240, end: 120 } // High voltage danger
    ];
  } else if (label.includes('Current')) {
    // Danger zone for Current: above 70A
    dangerZones = [
      { start: -120 + ((70 - min) / (max - min)) * 240, end: 120 } // High current danger
    ];
  }
  
  // Generate ticks
  const ticks = [];
  for (let i = 0; i <= 8; i++) {
    const tickAngle = -120 + (i / 8) * 240;
    const rad = (tickAngle - 90) * (Math.PI / 180);
    const x1 = center + (tickRadius - 8) * Math.cos(rad);
    const y1 = center + (tickRadius - 8) * Math.sin(rad);
    const x2 = center + tickRadius * Math.cos(rad);
    const y2 = center + tickRadius * Math.sin(rad);
    const tickValue = min + ((max - min) * i) / 8;
    ticks.push({ x1, y1, x2, y2, value: Math.round(tickValue), angle: tickAngle });
  }

  // Helper function to create arc path (use mainArcRadius for danger zone)
  const createArcPath = (startAngle, endAngle, radius, center) => {
    const start = (startAngle - 90) * (Math.PI / 180);
    const end = (endAngle - 90) * (Math.PI / 180);
    const x1 = center + radius * Math.cos(start);
    const y1 = center + radius * Math.sin(start);
    const x2 = center + radius * Math.cos(end);
    const y2 = center + radius * Math.sin(end);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Main arc path (full arc, always behind)
  const mainArcPath = createArcPath(-120, 120, mainArcRadius, center);

  return (
    <div className="flex flex-col items-center" style={{ width: 140, minWidth: 0 }}>
      <svg width={size} height={size * 0.66} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        {/* Main Arc (gray, full arc) */}
        <path d={mainArcPath} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.30} />
        {/* Danger zones */}
        {dangerZones.map((zone, index) => (
          <path
            key={index}
            d={createArcPath(zone.start, zone.end, mainArcRadius, center)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={size * 0.30}
            opacity="0.8"
          />
        ))}
        {/* Ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#888" strokeWidth={i % 2 === 0 ? 2 : 1} />
            {i % 2 === 0 && (
              <text
                x={center + (tickRadius + 40) * Math.cos((t.angle - 90) * Math.PI / 180)}
                y={center + (tickRadius + 10) * Math.sin((t.angle - 90) * Math.PI / 180)}
                fontSize={size * 0.10}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="#888"
              >
                {t.value}
              </text>
            )}
          </g>
        ))}
        {/* Pointer */}
        <line x1={center} y1={center} x2={pointerX} y2={pointerY} stroke={color} strokeWidth={size * 0.030} strokeLinecap="round" />
        {/* Center dot */}
        <circle cx={center} cy={center} r={size * 0.04} fill={color} />
      </svg>
      <div className="text-center mt-1">
        <div className="text-lg font-bold text-gray-900">
          {value} <span className="text-xs text-gray-500">{unit}</span>
        </div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// 1. Helper for trend icon
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'none' }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 15V5M10 5L5 10M10 5l5 5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    );
  } else if (trend === 'down') {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 5v10M10 15l5-5M10 15l-5-5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 10h10" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/></svg>
      </span>
    );
  }
}

const Index = () => {
  // State for meters from database
  const [meters, setMeters] = useState(defaultMeters);
  const [metersLoading, setMetersLoading] = useState(true);
  const [metersLoadedFromDb, setMetersLoadedFromDb] = useState(false);
  const [headerMeter, setHeaderMeter] = useState(defaultMeters[0].id);
  const [selectedMeterInfo, setSelectedMeterInfo] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(dashboardTemplates[0].id);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Real-time values from API
  const [currentValues, setCurrentValues] = useState({
    watt: 0,
    var: 0,
    va: 0,
    powerFactor: 0,
    voltLN: 0,
    voltLL: 0,
    currentAvg: 0,
    frequency: 0
  });
  
  // Energy data from API
  const [energyData, setEnergyData] = useState({
    importKwh: 0,
    exportKwh: 0,
    importKvarh: 0,
    exportKvarh: 0
  });
  
  // Dashboard data
  const [touBarData, setTouBarData] = useState(initialTouBarData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Yesterday's data for comparison
  const [yesterdayData, setYesterdayData] = useState({
    watt: 0,
    var: 0,
    va: 0,
    powerFactor: 0
  });
  
  // Chart data for sparklines
  const [chartData, setChartData] = useState({
    watt: [0, 0, 0, 0, 0, 0],
    var: [0, 0, 0, 0, 0, 0],
    va: [0, 0, 0, 0, 0, 0],
    powerFactor: [0, 0, 0, 0, 0, 0]
  });
  
  const prevTemplate = useRef(selectedTemplate);

  // Load meters from database
  const loadMetersFromDatabase = async () => {
    try {
      setMetersLoading(true);
      const metersFromDb = await meterTreeService.getMeters();
      
      if (metersFromDb && metersFromDb.length > 0) {
        // Transform database meters to the format expected by the component
        const transformedMeters = metersFromDb.map(meter => ({
          id: meter.name, // Use meter name as ID
          name: meter.name,
          slaveId: meter.slave_id, // Store slave_id for API calls
          meterId: meter.id // Store original meter ID
        }));
        setMeters(transformedMeters);
        setMetersLoadedFromDb(true);
        
        // Set the first meter as default if headerMeter is not in the new list
        if (!transformedMeters.find(m => m.id === headerMeter)) {
          setHeaderMeter(transformedMeters[0].id);
        }
      } else {
        // Fallback to default meters if database is empty
        setMeters(defaultMeters);
        setHeaderMeter(defaultMeters[0].id);
        setMetersLoadedFromDb(false);
      }
    } catch (error) {
      console.error('Error loading meters from database:', error);
      // Fallback to default meters on error
      setMeters(defaultMeters);
      setHeaderMeter(defaultMeters[0].id);
      setMetersLoadedFromDb(false);
    } finally {
      setMetersLoading(false);
    }
  };

  // Load meters on component mount
  useEffect(() => {
    loadMetersFromDatabase();
  }, []);

  // Update selected meter info when headerMeter changes
  useEffect(() => {
    const selectedMeter = meters.find(m => m.id === headerMeter);
    setSelectedMeterInfo(selectedMeter);
  }, [headerMeter, meters]);

  // Demand card state
  const [demandChartType, setDemandChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [demandData, setDemandData] = useState(initialDemandData);
  
  // TOU card state
  const [touChartType, setTouChartType] = useState<'line' | 'bar'>('bar');
  
  // Demand time range state
  const [demandTimeRange, setDemandTimeRange] = useState({
    from: '00:00',
    to: new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0')
  });
  
  // TOU time range state (แยกจาก Demand)
  const [touTimeRange, setTouTimeRange] = useState({
    from: '00:00',
    to: new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0')
  });

  // Odometer card state
  const [odometerTypeKwh, setOdometerTypeKwh] = useState<'import' | 'export'>('import');
  const [odometerTypeKvarh, setOdometerTypeKvarh] = useState<'import' | 'export'>('import');

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

      // Rate limiting state
  const [retryCount, setRetryCount] = useState(0);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [requestQueue, setRequestQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Load dashboard data from API with rate limiting
  const loadDashboardData = async (isRetry = false) => {
    // Check if we're rate limited
    if (isRateLimited && !isRetry) {
      console.log('🚫 Rate limited, adding to queue');
      // Add to queue instead of skipping
      setRequestQueue(prev => [...prev, { type: 'dashboard', timestamp: Date.now() }]);
      return;
    }

    // Check minimum interval between requests (1 second for retries, 0 for normal interval)
    const now = Date.now();
    if (now - lastRequestTime < (isRetry ? 1000 : 0)) {
      console.log('⏱️ Request too soon, skipping');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      setLastRequestTime(now);
      
      // เรียก API พร้อมส่ง time range และ slave ID สำหรับ Demand
      const slaveId = selectedMeterInfo?.slaveId || null;
      const response = await apiClient.getDashboardData(demandTimeRange.from, demandTimeRange.to, slaveId);
      
      if (response.success && response.data) {
        // อัพเดทข้อมูลทั้งหมดจาก API
        setCurrentValues(response.data.currentValues);
        setEnergyData(response.data.energyData);
        setDemandData(response.data.demandData);
        setChartData(response.data.chartData);
        setYesterdayData(response.data.yesterdayData);
        
        // Reset rate limiting on success
        setIsRateLimited(false);
        setRetryCount(0);
        
        // Debug log for demand data
        console.log('📊 Demand data loaded:', response.data.demandData.length, 'points');
        if (response.data.demandData.length > 0) {
          console.log('📊 Last demand data:', response.data.demandData[response.data.demandData.length - 1]);
        }
      } else {
        // Fallback to empty data if API fails
        console.log('Dashboard API not ready, using empty data');
        setCurrentValues({
          watt: 0,
          var: 0,
          va: 0,
          powerFactor: 0,
          voltLN: 0,
          voltLL: 0,
          currentAvg: 0,
          frequency: 0
        });
        setEnergyData({
          importKwh: 0,
          exportKwh: 0,
          importKvarh: 0,
          exportKvarh: 0
        });
        setDemandData([]);
        setChartData({
          watt: [0, 0, 0, 0, 0, 0],
          var: [0, 0, 0, 0, 0, 0],
          va: [0, 0, 0, 0, 0, 0],
          powerFactor: [0, 0, 0, 0, 0, 0]
        });
        setYesterdayData({
          watt: 0,
          var: 0,
          va: 0,
          powerFactor: 0
        });
      }
    } catch (err) {
      console.log('Dashboard API error:', err);
      
      // Handle rate limiting specifically
      if (err.status === 429 || err.message?.includes('Too many requests')) {
        setIsRateLimited(true);
        setRetryCount(prev => prev + 1);
        
        // Shorter backoff for 1-minute interval: 30s, 60s, 120s max
        const backoffTime = Math.min(30000 * Math.pow(2, Math.min(retryCount, 2)), 120000);
        console.log(`🚫 Rate limited, waiting ${backoffTime/1000}s before retry`);
        
        setTimeout(() => {
          setIsRateLimited(false);
          // Process queued requests
          if (requestQueue.length > 0) {
            processRequestQueue();
          }
        }, backoffTime);
        
        setError(`Rate limited - จะลองใหม่ใน ${Math.ceil(backoffTime/1000)} วินาที`);
        return;
      }
      
      // Fallback to empty data for other errors
      setCurrentValues({
        watt: 0,
        var: 0,
        va: 0,
        powerFactor: 0,
        voltLN: 0,
        voltLL: 0,
        currentAvg: 0,
        frequency: 0
      });
      setEnergyData({
        importKwh: 0,
        exportKwh: 0,
        importKvarh: 0,
        exportKvarh: 0
      });
      setDemandData([]);
      setChartData({
        watt: [0, 0, 0, 0, 0, 0],
        var: [0, 0, 0, 0, 0, 0],
        va: [0, 0, 0, 0, 0, 0],
        powerFactor: [0, 0, 0, 0, 0, 0]
      });
      setYesterdayData({
        watt: 0,
        var: 0,
        va: 0,
        powerFactor: 0
      });
      
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  // Process queued requests
  const processRequestQueue = async () => {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    setIsProcessingQueue(true);
    const queue = [...requestQueue];
    setRequestQueue([]);
    
    for (const request of queue) {
      if (request.type === 'dashboard') {
        await loadDashboardData(true);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsProcessingQueue(false);
  };


  // Load TOU data from API with rate limiting
  const loadTouData = async () => {
    // Check if we're rate limited
    if (isRateLimited) {
      console.log('🚫 Rate limited, skipping TOU request');
      return;
    }

    // Check minimum interval between requests (2 seconds)
    const now = Date.now();
    if (now - lastRequestTime < 2000) {
      console.log('⏱️ TOU request too soon, skipping');
      return;
    }

    try {
      // เรียก API พร้อมส่ง time range และ slave ID สำหรับ TOU
      const slaveId = selectedMeterInfo?.slaveId || null;
      const response = await apiClient.getDashboardData(touTimeRange.from, touTimeRange.to, slaveId);
      
      if (response.success && response.data) {
        // อัพเดทเฉพาะ TOU data
        setTouBarData(response.data.touData);
        
        // Debug log for TOU data
        console.log('📊 TOU data loaded:', response.data.touData.length, 'hours');
        if (response.data.touData.length > 0) {
          console.log('📊 Sample TOU data (hour 0):', response.data.touData[0]);
          console.log('📊 Sample TOU data (hour 12):', response.data.touData[12]);
        }
      } else {
        // Fallback to empty TOU data
        setTouBarData([]);
      }
    } catch (err) {
      console.log('TOU API error:', err);
      
      // Handle rate limiting specifically
      if (err.status === 429 || err.message?.includes('Too many requests')) {
        console.log('🚫 TOU request rate limited');
        // Don't set global rate limit for TOU, just skip
        return;
      }
      
      // Fallback to empty TOU data for other errors
      setTouBarData([]);
    }
  };

  // Load dashboard data from API







  // Load dashboard data on mount and when meter changes
  useEffect(() => {
    loadDashboardData();
    loadTouData();
  }, [headerMeter]);

  // Load dashboard data when demand time range changes
  useEffect(() => {
    loadDashboardData();
  }, [demandTimeRange, selectedMeterInfo]);

  // Load TOU data when TOU time range changes
  useEffect(() => {
    loadTouData();
  }, [touTimeRange, selectedMeterInfo]);

  // Load dashboard data every minute for real-time updates
  useEffect(() => {
    const interval = setInterval(loadDashboardData, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [headerMeter, demandTimeRange, selectedMeterInfo]);



  const monthlyData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const weeklyData = [0, 0, 0, 0, 0, 0, 0];

  let demandChartElement = null;
  if (demandChartType === 'line') {
    demandChartElement = (
      <RechartsLineChart data={demandData} margin={{ top: 0, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="hour" 
          type="number"
          domain={[0, 24]}
          ticks={Array.from({ length: 25 }, (_, h) => h)}
          tick={{ fontSize: 10 }}
          interval={0}
          padding={{ left: 0, right: 0 }}
          tickFormatter={(value) => {
            if (value % 1 === 0) {
              if (value === 0) return '24';
              return value.toString();
            } else {
              const hour = Math.floor(value);
              if (hour === 0) return '24';
              return hour.toString();
            }
          }}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? (v / 1000) + 'k' : v} />
        <Tooltip 
          labelFormatter={(value) => {
            if (value % 1 === 0) {
              if (value === 0) return '24:00';
              return `${value}:00`;
            } else {
              const hour = Math.floor(value);
              const minute = Math.round((value - hour) * 60);
              if (hour === 0) return `24:${minute.toString().padStart(2, '0')}`;
              return `${hour}:${minute.toString().padStart(2, '0')}`;
            }
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, padding: 0, margin: 0 }} iconSize={10} />
        <Line type="monotone" dataKey="watt" name="Demand Watt" stroke="#3b82f6" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="var" name="Demand Var" stroke="#f59e42" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="va" name="Demand VA" stroke="#06b6d4" strokeWidth={3} dot={false} />
      </RechartsLineChart>
    );
  } else if (demandChartType === 'bar') {
    demandChartElement = (
      <RechartsBarChart data={demandData} margin={{ top: 0, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="hour" 
          type="number"
          domain={[0, 24]}
          ticks={Array.from({ length: 25 }, (_, h) => h)}
          tick={{ fontSize: 10 }}
          interval={0}
          padding={{ left: 0, right: 0 }}
          tickFormatter={(value) => {
            if (value % 1 === 0) {
              if (value === 0) return '24';
              return value.toString();
            } else {
              const hour = Math.floor(value);
              if (hour === 0) return '24';
              return hour.toString();
            }
          }}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? (v / 1000) + 'k' : v} />
        <Tooltip 
          labelFormatter={(value) => {
            if (value % 1 === 0) {
              if (value === 0) return '24:00';
              return `${value}:00`;
            } else {
              const hour = Math.floor(value);
              const minute = Math.round((value - hour) * 60);
              if (hour === 0) return `24:${minute.toString().padStart(2, '0')}`;
              return `${hour}:${minute.toString().padStart(2, '0')}`;
            }
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, padding: 0, margin: 0 }} iconSize={10} />
        <Bar dataKey="watt" name="Demand Watt" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={12} />
        <Bar dataKey="var" name="Demand Var" fill="#f59e42" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={12} />
        <Bar dataKey="va" name="Demand VA" fill="#06b6d4" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={12} />
      </RechartsBarChart>
    );
  }



  let touChartElement = null;
  if (touChartType === 'line') {
    touChartElement = (
      <RechartsLineChart data={touBarData} margin={{ top: 0, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="hour" 
          type="number"
          domain={[9, 24]}
          ticks={[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4,5,6,7,8]}
          tick={{ fontSize: 10 }}
          interval={0}
          padding={{ left: 0, right: 0 }}
          tickFormatter={(value) => {
            if (value === 0) return '24';
            return value.toString();
          }}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? (v / 1000) + 'k' : v} />
        <Tooltip 
          labelFormatter={(value) => {
            if (value % 1 === 0) {
              if (value === 0) return '24:00';
              return `${value}:00`;
            } else {
              const hour = Math.floor(value);
              const minute = Math.round((value - hour) * 60);
              if (hour === 0) return `24:${minute.toString().padStart(2, '0')}`;
              return `${hour}:${minute.toString().padStart(2, '0')}`;
            }
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, padding: 0, margin: 0 }} iconSize={10} />
        {/* TOU Background areas */}
        <ReferenceArea x1={0} x2={9} fill="#dcfce7" fillOpacity={0.5} />
        <ReferenceArea x1={9} x2={22} fill="#fed7aa" fillOpacity={0.5} />
        <ReferenceArea x1={22} x2={24} fill="#dcfce7" fillOpacity={0.5} />
        <Line type="monotone" dataKey="demandW" name="Demand W" stroke="#3b82f6" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="demandVar" name="Demand Var" stroke="#f59e42" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="demandVA" name="Demand VA" stroke="#06b6d4" strokeWidth={3} dot={false} />
      </RechartsLineChart>
    );
  } else if (touChartType === 'bar') {
    touChartElement = (
      <RechartsBarChart data={touBarData} margin={{ top: 0, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="hour" 
          type="number"
          domain={[0, 24]}
          ticks={[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4,5,6,7,8]}
          tick={{ fontSize: 12 }}
          interval={0}
          padding={{ left: 0, right: 0 }}
          allowDuplicatedCategory={false}
          tickFormatter={(value) => {
            if (value === 0) return '24';
            return value.toString();
          }}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? (v / 1000) + 'k' : v} />
        <Tooltip 
          labelFormatter={(value) => {
            if (value % 1 === 0) {
              if (value === 0) return '24:00';
              return `${value}:00`;
            } else {
              const hour = Math.floor(value);
              const minute = Math.round((value - hour) * 60);
              if (hour === 0) return `24:${minute.toString().padStart(2, '0')}`;
              return `${hour}:${minute.toString().padStart(2, '0')}`;
            }
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, padding: 0, margin: 0 }} iconSize={10} />
        {/* TOU Background areas */}
        <ReferenceArea x1={0} x2={9} fill="#dcfce7" fillOpacity={0.5} />
        <ReferenceArea x1={9} x2={22} fill="#fed7aa" fillOpacity={0.5} />
        <ReferenceArea x1={22} x2={24} fill="#dcfce7" fillOpacity={0.5} />
        <Bar dataKey="demandW" name="Demand W" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={12} />
        <Bar dataKey="demandVar" name="Demand Var" fill="#f59e42" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={12} />
        <Bar dataKey="demandVA" name="Demand VA" fill="#06b6d4" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={12} />
      </RechartsBarChart>
    );
  }

  // Use real-time values from API for gauges

  // Calculate differences from yesterday
  const calculateDifference = (current: number, yesterday: number) => {
    return current - yesterday;
  };

  const getTrendIcon = (diff: number) => {
    if (diff > 0) return 'up';
    if (diff < 0) return 'down';
    return 'none';
  };

  const formatDifference = (diff: number, unit: string) => {
    const sign = diff > 0 ? '+' : '';
    return `${sign}${Math.round(diff)} ${unit} from yesterday`;
  };

  return (
    <PageLayout>
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-9xl mx-auto">
        {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-2 ml-auto">
              {/* Meter select button */}
              <Select value={headerMeter} onValueChange={setHeaderMeter} disabled={metersLoading}>
                <SelectTrigger className="w-26 h-7 text-xs border-gray-300 rounded bg-white">
                  <SelectValue placeholder={metersLoading ? "Loading..." : "Meter"}>
                    {metersLoading ? "Loading..." : meters.find(m => m.id === headerMeter)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {metersLoading ? (
                    <SelectItem value="loading" disabled>Loading meters...</SelectItem>
                  ) : (
                    meters.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {/* Refresh meters button */}
              <button
                onClick={() => {
                  if (!isRateLimited) {
                    loadDashboardData();
                    loadTouData();
                  }
                }}
                disabled={isRateLimited || isLoading}
                className={`p-1 rounded-full border border-gray-200 bg-white hover:bg-blue-50 transition-colors ${
                  isRateLimited ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={isRateLimited ? 'Rate limited - รอสักครู่' : 'Refresh data'}
              >
                <RefreshCw className={`w-4 h-4 text-primary ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Database indicator */}
              
              <div className="flex items-center gap-1 text-xs text-gray-600 px-2 py-1 rounded bg-gray-100" style={{ border: 'none' }}>
                    <Clock className="w-3 h-3" />
                {format(currentTime, 'd MMMM yyyy')}
              </div>
              {/* Dashboard Template Icon Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className={`p-1 rounded-full border border-gray-200 bg-white hover:bg-blue-50 transition-colors`} title="เลือก Dashboard Template">
                    <LayoutGrid className="w-4 h-4 text-primary" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1 rounded-none">
                  <div className="flex flex-col ">
                    {dashboardTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(tpl.id);
                          if (document.activeElement && document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        }}
                        className={`text-left px-3 py-2 text-xs rounded-none transition-colors
                          ${selectedTemplate === tpl.id ? 'bg-primary text-white' : 'hover:bg-primary hover:text-white text-gray-800'}`}
                      >
                        {tpl.name}
                      </button>
                    ))}
            </div>
                </PopoverContent>
              </Popover>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 border rounded-lg ${
            error.includes('Rate limited') 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {error.includes('Rate limited') ? (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${
                    error.includes('Rate limited') ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {error}
                    {!error.includes('Rate limited') && ' - แสดงข้อมูลจำลอง'}
                  </p>
                </div>
              </div>
              {error.includes('Rate limited') && (
                <div className="text-xs text-red-600">
                  รอ {Math.ceil((30000 * Math.pow(2, retryCount)) / 1000)} วินาที
                </div>
              )}
            </div>
          </div>
        )}

       

        {/* Top Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {/* Watt Total Card */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Watt Total</p>
                  <p className="text-base font-bold text-gray-900">{(Number(currentValues.watt) || 0).toLocaleString()} W</p>
                  {(() => {
                    const diff = calculateDifference(Number(currentValues.watt) || 0, Number(yesterdayData.watt) || 0);
                    const trend = getTrendIcon(diff);
                    return (
                      <span className={
                        `text-[11px] mt-0.5 flex items-center gap-1 ` +
                        (trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500')
                      }>
                        <TrendIcon trend={trend} />
                        {trend === 'none' ? '-' : formatDifference(diff, 'W')}
                      </span>
                    );
                  })()}
                </div>
                <div className="w-14 h-4 flex items-center">
                  <ResponsiveContainer width="100%" height={20}>
                    <RechartsLineChart data={chartData.watt.map((value, index) => ({ value, index }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        dot={false}
                        connectNulls={true}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Var Total Card */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Var Total</p>
                  <p className="text-base font-bold text-gray-900">{(Number(currentValues.var) || 0).toLocaleString()} Var</p>
                  {(() => {
                    const diff = calculateDifference(Number(currentValues.var) || 0, Number(yesterdayData.var) || 0);
                    const trend = getTrendIcon(diff);
                    return (
                      <span className={
                        `text-[11px] mt-0.5 flex items-center gap-1 ` +
                        (trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500')
                      }>
                        <TrendIcon trend={trend} />
                        {trend === 'none' ? '-' : formatDifference(diff, 'Var')}
                      </span>
                    );
                  })()}
                </div>
                <div className="w-14 h-4 flex items-center">
                  <ResponsiveContainer width="100%" height={20}>
                    <RechartsLineChart data={chartData.var.map((value, index) => ({ value, index }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#9333ea" 
                        strokeWidth={2} 
                        dot={false}
                        connectNulls={true}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VA Total Card */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">VA Total</p>
                  <p className="text-base font-bold text-gray-900">{(Number(currentValues.va) || 0).toLocaleString()} VA</p>
                  {(() => {
                    const diff = calculateDifference(Number(currentValues.va) || 0, Number(yesterdayData.va) || 0);
                    const trend = getTrendIcon(diff);
                    return (
                      <span className={
                        `text-[11px] mt-0.5 flex items-center gap-1 ` +
                        (trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500')
                      }>
                        <TrendIcon trend={trend} />
                        {trend === 'none' ? '-' : formatDifference(diff, 'VA')}
                      </span>
                    );
                  })()}
                </div>
                <div className="w-14 h-4 flex items-center">
                  <ResponsiveContainer width="100%" height={20}>
                    <RechartsLineChart data={chartData.va.map((value, index) => ({ value, index }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0891b2" 
                        strokeWidth={2} 
                        dot={false}
                        connectNulls={true}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PF Total Card */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">PF Total</p>
                  <p className="text-base font-bold text-gray-900">{(Number(currentValues.powerFactor) || 0).toFixed(2)}</p>
                  {(() => {
                    const diff = calculateDifference(Number(currentValues.powerFactor) || 0, Number(yesterdayData.powerFactor) || 0);
                    const trend = getTrendIcon(diff);
                    return (
                      <span className={
                        `text-[11px] mt-0.5 flex items-center gap-1 ` +
                        (trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500')
                      }>
                        <TrendIcon trend={trend} />
                        {trend === 'none' ? '-' : (diff > 0 ? '+' : '') + diff.toFixed(2) + ' from yesterday'}
                      </span>
                    );
                  })()}
                </div>
                <div className="w-14 h-4 flex items-center">
                  <ResponsiveContainer width="100%" height={20}>
                    <RechartsLineChart data={chartData.powerFactor.map((value, index) => ({ value, index }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#059669" 
                        strokeWidth={2} 
                        dot={false}
                        connectNulls={true}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-4 items-start">
          {/* Left Column */}
          <div className="col-span-8 flex flex-col gap-4">
              {/* Demand Card */}
            <Card className="bg-white rounded-xl shadow-md min-h-[370px] flex flex-col">
                <CardContent className="p-4 flex flex-col gap-2 flex-1">
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-row items-center gap-3">
                                              <div className="flex items-center gap-1">
                          <h3 className="text-sm font-semibold text-gray-900">Demand</h3>
                          <span className="text-xs font-bold text-black ml-2 mr-2">From</span>
                        <TimeInput24
                            value={demandTimeRange.from}
                            onChange={(value) => {
                              setDemandTimeRange(prev => ({ ...prev, from: value }));
                            }}
                            style={{ width: '35px', fontSize: '12px' }}
                          />
                          <span className="text-xs font-bold text-black mr-2">To</span>
                        <TimeInput24
                            value={demandTimeRange.to}
                            onChange={(value) => {
                              setDemandTimeRange(prev => ({ ...prev, to: value }));
                            }}
                            style={{ width: '35px', fontSize: '12px'}}
                          />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-0.5 rounded-full border border-gray-200 bg-transparent hover:bg-gray-100 transition-colors"
                        title={demandChartType === 'line' ? 'Switch to Bar Chart' : demandChartType === 'bar' ? 'Switch to Pie Chart' : 'Switch to Line Chart'}
                        onClick={() => setDemandChartType(demandChartType === 'line' ? 'bar' : demandChartType === 'bar' ? 'pie' : 'line')}
                      >
                        {demandChartType === 'line' && <LineChart className="w-3 h-3 text-primary" />}
                        {demandChartType === 'bar' && <BarChart3 className="w-3 h-3 text-primary" />}
                        {demandChartType === 'pie' && <PieChartIcon className="w-3 h-3 text-primary" />}
                      </button>
                    </div>
                  </div>
                  {/* Date & Time Range (removed date picker, only time range remains) */}


                  {/* Chart */}
                  {demandChartType === 'pie' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 220, gap: 32 }}>
                      {demandData.length > 0 ? (
                        <>
                      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
                        <RechartsPieChart width={300} height={220}>
                          <Pie data={[
                                { name: 'Demand Watt', value: demandData[demandData.length - 1].watt },
                                { name: 'Demand Var', value: demandData[demandData.length - 1].var },
                                { name: 'Demand VA', value: demandData[demandData.length - 1].va },
                              ].filter(item => item.value > 0)} dataKey="value" nameKey="name" cx={110} cy={110} outerRadius={80} label>
                            <Cell fill="#3b82f6" />
                            <Cell fill="#f59e42" />
                            <Cell fill="#06b6d4" />
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </div>
                      <div style={{ width: 150, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          <li style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ width: 16, height: 16, background: '#3b82f6', display: 'inline-block', borderRadius: 3, marginRight: 8 }}></span>
                            <span style={{ color: '#3b82f6', fontWeight: 400 }}>DmWatt</span>
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ width: 16, height: 16, background: '#f59e42', display: 'inline-block', borderRadius: 3, marginRight: 8 }}></span>
                            <span style={{ color: '#f59e42', fontWeight: 400 }}>DmVar</span>
                          </li>
                          <li style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ width: 16, height: 16, background: '#06b6d4', display: 'inline-block', borderRadius: 3, marginRight: 8 }}></span>
                            <span style={{ color: '#06b6d4', fontWeight: 400 }}>DmVA</span>
                          </li>
                        </ul>
                  </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 220 }}>
                          <div style={{ textAlign: 'center', color: '#6b7280' }}>
                            <div style={{ fontSize: '16px', marginBottom: '8px' }}>ไม่มีข้อมูล Demand</div>
                            <div style={{ fontSize: '14px' }}>กรุณารอสักครู่...</div>
                          </div>
                        </div>
                      )}
                </div>
                  ) : (
                    <div style={{ width: '100%', height: 270, marginTop: 0 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        {demandChartElement}
                      </ResponsiveContainer>
                    </div>
                  )}
              </CardContent>
            </Card>

              {/*Average(Gauges) */}
              <div className="bg-white rounded-xl shadow-md flex flex-col px-4 py-5 min-h-[220px] justify-between">
                <div className="text-base font-semibold text-gray-900 mb-1 px-1">Average</div>
                <div className="flex items-stretch justify-center gap-20 flex-1 items-center">
                  <GaugeMeter value={Number(currentValues.voltLN) || 0} min={200} max={250} label="Volt LN" unit="V" color="#3b82f6" size={180} />
                  <GaugeMeter value={Number(currentValues.voltLL) || 0} min={340} max={440} label="Volt LL" unit="V" color="#06b6d4" size={180} />
                  <GaugeMeter value={Number(currentValues.currentAvg) || 0} min={0} max={80} label="Current" unit="A" color="#f59e42" size={180} />
                </div>
              </div>
          </div>

          {/* Right Column */}
          <div className="col-span-4 flex flex-col gap-4">
              {/* TOU Card */}
            <Card className="bg-white rounded-xl shadow-md min-h-[370px] flex flex-col">
              <CardContent className="px-4 pt-3 pb-0 flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex flex-row items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">TOU</h3>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-black ml-2 mr-2">From</span>
                        <TimeInput24
                          value={touTimeRange.from}
                          onChange={(value) => {
                            setTouTimeRange(prev => ({ ...prev, from: value }));
                          }}
                          style={{ width: '35px', fontSize: '12px' }}
                        />
                        <span className="text-xs font-bold text-black mr-2">To</span>
                        <TimeInput24
                          value={touTimeRange.to}
                          onChange={(value) => {
                            setTouTimeRange(prev => ({ ...prev, to: value }));
                          }}
                          style={{ width: '35px', fontSize: '12px'}}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-0.5 rounded-full border border-gray-200 bg-transparent hover:bg-gray-100 transition-colors"
                        title={touChartType === 'line' ? 'Switch to Bar Chart' : 'Switch to Line Chart'}
                        onClick={() => setTouChartType(touChartType === 'line' ? 'bar' : 'line')}
                      >
                        {touChartType === 'line' && <BarChart3 className="w-3 h-3 text-primary" />}
                        {touChartType === 'bar' && <LineChart className="w-3 h-3 text-primary" />}
                      </button>
                    </div>
                  </div>

                  {/* Controls removed (date picker and old time controls) */}
                  {/* Bar/Line Graph */}
                  <div style={{ width: '115%', height: 270, marginTop: 0, paddingTop: 0, marginLeft: '-12%' }}>
                    <ResponsiveContainer width="100%" height={313} style={{ overflow: 'visible' }}>
                      {touChartElement}
                    </ResponsiveContainer>
                  </div>
              </CardContent>
            </Card>

              {/* Odometer Card */}
              <Card className="bg-white rounded-xl shadow-md min-h-[235px] flex flex-col">
                <CardContent className="p-4 flex flex-col items-center gap-0 flex-1 justify-center">
                  <div className="flex items-center justify-center w-full mb-1">
                    <h3 className="text-base font-semibold text-gray-900 pl-0 ml-0 text-left w-full">Energy</h3>
                  </div>
                  <div className="flex flex-col gap-4 items-center w-full max-w-xs mt-1 justify-center">
                    <div className="flex flex-col items-center w-full rounded-xl shadow p-2 bg-transparent gap-1 h-20 justify-center" style={{ minHeight: 56 }}>
                      <div className="flex flex-row items-center justify-center w-full gap-2">
                        <span className="text-[10px] text-gray-500 tracking-wide uppercase whitespace-nowrap">{odometerTypeKwh === 'import' ? 'Imp kWh' : 'Exp kWh'}</span>
                        <Odometer value={odometerTypeKwh === 'import' ? energyData.importKwh : energyData.exportKwh} digits={5} decimals={2} small />
                        <button
                          className="p-0.5 rounded-full border border-gray-200 bg-transparent hover:bg-gray-100 transition-colors flex items-center justify-center ml-2"
                          onClick={() => setOdometerTypeKwh(odometerTypeKwh === 'import' ? 'export' : 'import')}
                          title={odometerTypeKwh === 'import' ? 'Show Export' : 'Show Import'}
                          style={{ minWidth: 18 }}
                        >
                          <Repeat className="w-2.5 h-2.5 text-primary" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-center w-full rounded-xl shadow p-2 bg-transparent gap-1 h-20 justify-center" style={{ minHeight: 56 }}>
                      <div className="flex flex-row items-center justify-center w-full gap-2">
                        <span className="text-[10px] text-gray-500 tracking-wide uppercase whitespace-nowrap">{odometerTypeKvarh === 'import' ? 'Imp kVarh' : 'Exp kVarh'}</span>
                        <Odometer value={odometerTypeKvarh === 'import' ? energyData.importKvarh : energyData.exportKvarh} digits={5} decimals={2} small />
                        <button
                          className="p-0.5 rounded-full border border-gray-200 bg-transparent hover:bg-gray-100 transition-colors flex items-center justify-center ml-2"
                          onClick={() => setOdometerTypeKvarh(odometerTypeKvarh === 'import' ? 'export' : 'import')}
                          title={odometerTypeKvarh === 'import' ? 'Show Export' : 'Show Import'}
                          style={{ minWidth: 18 }}
                        >
                          <Repeat className="w-2.5 h-2.5 text-primary" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
    </div>
    
    {/* Toast Notification */}
    {isLoading && (
      <div className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-none shadow-lg z-50 flex items-center">
        <div className="animate-spin rounded-none h-4 w-4 border-b-2 border-white mr-2"></div>
        <span className="text-sm">Loading data...</span>
      </div>
    )}
    
    </PageLayout>
  );
};

export default Index;