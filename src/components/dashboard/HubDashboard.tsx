import React, { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { 
  Globe, 
  Building2, 
  Factory, 
  Home as HomeIcon, 
  MonitorSpeaker, 
  Zap, 
  Chrome,
  Settings,
  LogIn,
  LogOut,
  Languages,
  Menu,
  X,
  Radio,
  Signal
} from 'lucide-react';

export function Home() {
  const { language } = useLanguage();
  const t = translations[language];
  
  // Mock meter data for world map detection
  const mockMeters = [
    // Asia
    { id: 'TH001', name: 'Bangkok Central', type: 'Industrial', signal: 95, continent: 'Asia', x: 75, y: 45, country: 'Thailand' },
    { id: 'JP002', name: 'Tokyo Tower', type: 'Commercial', signal: 88, continent: 'Asia', x: 85, y: 35, country: 'Japan' },
    { id: 'CN003', name: 'Shanghai Grid', type: 'Industrial', signal: 92, continent: 'Asia', x: 80, y: 40, country: 'China' },
    { id: 'IN004', name: 'Mumbai Power', type: 'Residential', signal: 78, continent: 'Asia', x: 70, y: 50, country: 'India' },
    
    // Europe
    { id: 'UK005', name: 'London Bridge', type: 'Commercial', signal: 85, continent: 'Europe', x: 48, y: 25, country: 'United Kingdom' },
    { id: 'DE006', name: 'Berlin Central', type: 'Industrial', signal: 90, continent: 'Europe', x: 52, y: 22, country: 'Germany' },
    { id: 'FR007', name: 'Paris Metro', type: 'Commercial', signal: 82, continent: 'Europe', x: 50, y: 26, country: 'France' },
    { id: 'IT008', name: 'Rome Station', type: 'Residential', signal: 76, continent: 'Europe', x: 53, y: 30, country: 'Italy' },
    
    // North America
    { id: 'US009', name: 'New York Grid', type: 'Industrial', signal: 94, continent: 'North America', x: 25, y: 30, country: 'USA' },
    { id: 'US010', name: 'Los Angeles', type: 'Commercial', signal: 87, continent: 'North America', x: 15, y: 35, country: 'USA' },
    { id: 'CA011', name: 'Toronto Power', type: 'Residential', signal: 83, continent: 'North America', x: 22, y: 25, country: 'Canada' },
    { id: 'MX012', name: 'Mexico City', type: 'Industrial', signal: 79, continent: 'North America', x: 18, y: 50, country: 'Mexico' },
    
    // South America
    { id: 'BR013', name: 'São Paulo', type: 'Industrial', signal: 86, continent: 'South America', x: 32, y: 70, country: 'Brazil' },
    { id: 'AR014', name: 'Buenos Aires', type: 'Commercial', signal: 81, continent: 'South America', x: 30, y: 80, country: 'Argentina' },
    { id: 'CL015', name: 'Santiago Grid', type: 'Residential', signal: 77, continent: 'South America', x: 28, y: 78, country: 'Chile' },
    
    // Africa
    { id: 'ZA016', name: 'Cape Town', type: 'Commercial', signal: 84, continent: 'Africa', x: 55, y: 82, country: 'South Africa' },
    { id: 'EG017', name: 'Cairo Central', type: 'Industrial', signal: 80, continent: 'Africa', x: 58, y: 45, country: 'Egypt' },
    { id: 'NG018', name: 'Lagos Power', type: 'Residential', signal: 75, continent: 'Africa', x: 50, y: 55, country: 'Nigeria' },
    
    // Australia/Oceania
    { id: 'AU019', name: 'Sydney Harbor', type: 'Commercial', signal: 89, continent: 'Australia', x: 88, y: 82, country: 'Australia' },
    { id: 'AU020', name: 'Melbourne Grid', type: 'Industrial', signal: 91, continent: 'Australia', x: 85, y: 85, country: 'Australia' },
    { id: 'NZ021', name: 'Auckland Power', type: 'Residential', signal: 73, continent: 'Oceania', x: 95, y: 88, country: 'New Zealand' }
  ];

  const [scanAngle, setScanAngle] = useState(0);
  const [detectedMeters, setDetectedMeters] = useState<typeof mockMeters>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(true);

  // Radar scanning effect - rotates in a circle
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const scanSpeed = 1; // degrees per frame
    
    function animateScan(now: number) {
      const elapsed = now - last;
      last = now;
      
      setScanAngle(prev => {
        const newAngle = (prev + scanSpeed) % 360;
        return newAngle;
      });
      
      setScanProgress(prev => {
        const newProgress = (prev + (scanSpeed / 3.6)) % 100;
        return newProgress;
      });
      
      raf = requestAnimationFrame(animateScan);
    }
    
    if (isScanning) {
      raf = requestAnimationFrame(animateScan);
    }
    
    return () => cancelAnimationFrame(raf);
  }, [isScanning]);

  // Detect meters based on multiple radar sweep angles
  useEffect(() => {
    const detectionAngle = 30; // degrees of detection cone
    const radarRange = 120; // maximum detection range for each radar
    
    const detected = mockMeters.filter(meter => {
      const meterX = (meter.x / 100) * 1000;
      const meterY = (meter.y / 100) * 500;
      
      // Check if meter is detected by any of the 3 radars
      return radarPositions.some((radar, radarIndex) => {
        // Calculate distance from radar to meter
        const deltaX = meterX - radar.x;
        const deltaY = meterY - radar.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Skip if meter is too far from this radar
        if (distance > radarRange) return false;
        
        // Calculate angle from radar center to meter
        let meterAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        
        // Normalize angle to 0-360
        if (meterAngle < 0) meterAngle += 360;
        
        // Each radar has different rotation offset
        const radarScanAngle = (scanAngle + (radarIndex * 120)) % 360;
        
        // Check if meter is within detection cone
        const angleDiff = Math.abs(meterAngle - radarScanAngle);
        const angleDiffNormalized = Math.min(angleDiff, 360 - angleDiff);
        
        return angleDiffNormalized <= detectionAngle / 2;
      });
    });
    
    setDetectedMeters(detected);
  }, [scanAngle]);

  // Radar grid lines - smaller size
  const radarGrid = Array.from({ length: 3 }, (_, i) => {
    const radius = (i + 1) * 30;
    return { radius, opacity: 0.15 + (i * 0.1) };
  });

  // Multiple radar positions
  const radarPositions = [
    { x: 200, y: 150 },
    { x: 500, y: 250 },
    { x: 800, y: 200 }
  ];

  return (
    <PageLayout>
      <div className="w-full h-[calc(100vh-50px)] flex flex-col justify-center items-center bg-gradient-to-b from-white via-primary/10 to-primary/20 relative">
        {/* World Map Background Image */}
        <div className="absolute inset-0 flex justify-center items-center">
          <img 
            src="/colored-vector-world-map-illustration-isolated-white-background_568886-1895.jpg"
            alt="World Map"
            className="w-full h-full object-cover opacity-40"
          />
          
          {/* Radar Overlay SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Radar Sweep Gradient */}
              <radialGradient id="radarSweepGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="var(--color-primary, #06b6d4)" stopOpacity="0" />
                <stop offset="70%" stopColor="var(--color-primary, #06b6d4)" stopOpacity="0.3" />
                <stop offset="85%" stopColor="var(--color-primary, #06b6d4)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--color-primary, #06b6d4)" stopOpacity="0" />
              </radialGradient>
              
              {/* Radar Line Gradient */}
              <linearGradient id="radarLineGradient">
                <stop offset="0%" stopColor="var(--color-primary, #06b6d4)" stopOpacity="0" />
                <stop offset="70%" stopColor="var(--color-primary, #06b6d4)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--color-primary, #06b6d4)" stopOpacity="0.2" />
              </linearGradient>
            </defs>
                
                {/* Multiple Radar Systems */}
                {radarPositions.map((radar, radarIndex) => (
                  <g key={`radar-${radarIndex}`}>
                    {/* Radar Grid - Concentric circles */}
                    {radarGrid.map((grid, i) => (
                      <circle
                        key={`radar-${radarIndex}-circle-${i}`}
                        cx={radar.x}
                        cy={radar.y}
                        r={grid.radius}
                        fill="none"
                        stroke="var(--color-primary, #06b6d4)"
                        strokeWidth="1"
                        strokeOpacity={grid.opacity}
                        strokeDasharray="2,2"
                      />
                    ))}
                    
                    {/* Radar Cross Lines */}
                    <line
                      x1={radar.x - 90}
                      y1={radar.y}
                      x2={radar.x + 90}
                      y2={radar.y}
                      stroke="var(--color-primary, #06b6d4)"
                      strokeWidth="1"
                      strokeOpacity="0.15"
                      strokeDasharray="2,2"
                    />
                    <line
                      x1={radar.x}
                      y1={radar.y - 90}
                      x2={radar.x}
                      y2={radar.y + 90}
                      stroke="var(--color-primary, #06b6d4)"
                      strokeWidth="1"
                      strokeOpacity="0.15"
                      strokeDasharray="2,2"
                    />
                    
                    {/* Radar Sweep Line - each radar has different rotation offset */}
                    <g transform={`rotate(${scanAngle + (radarIndex * 120)} ${radar.x} ${radar.y})`}>
                      <line
                        x1={radar.x}
                        y1={radar.y}
                        x2={radar.x + 90}
                        y2={radar.y}
                        stroke="url(#radarLineGradient)"
                        strokeWidth="2"
                        opacity="0.7"
                      />
                      
                      {/* Radar Sweep Cone */}
                      <path
                        d={`M ${radar.x} ${radar.y} L ${radar.x + 90} ${radar.y - 8} A 90 90 0 0 1 ${radar.x + 90} ${radar.y + 8} Z`}
                        fill="url(#radarSweepGradient)"
                        opacity="0.3"
                      />
                    </g>
                    
                    {/* Radar Label */}
                    <text
                      x={radar.x}
                      y={radar.y + 110}
                      textAnchor="middle"
                      fill="var(--color-primary, #06b6d4)"
                      fontSize="10"
                      opacity="0.6"
                      fontFamily="Arial, sans-serif"
                    >
                      {radar.label}
                    </text>
                  </g>
                ))}
                
                {/* Detected Meters - Simple Icons Only */}
                {detectedMeters.map((meter) => {
                  const x = (meter.x / 100) * 1000;
                  const y = (meter.y / 100) * 500;
                  
                  // Color based on meter type
                  const getTypeColor = (type: string) => {
                    switch (type) {
                      case 'Industrial': return '#ef4444'; // red
                      case 'Commercial': return '#f59e0b'; // amber
                      case 'Residential': return '#10b981'; // emerald
                      default: return '#06b6d4'; // cyan
                    }
                  };
                  
                  return (
                    <g key={meter.id}>
                      {/* Simple Meter Icon */}
                      <circle
                        cx={x}
                        cy={y}
                        r={6}
                        fill={getTypeColor(meter.type)}
                        className="animate-pulse"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={3}
                        fill="#ffffff"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

        {/* Foreground Content - Welcome at Bottom */}
        <div className="relative z-10 flex flex-col justify-end items-center h-full pb-8">
          {/* Welcome Section - Small and Bottom */}
          <div className="text-center px-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-md mx-auto">
              <h1 className="text-lg font-bold text-primary mb-2">
                {t.welcome.title}
              </h1>
              <div className="space-y-2 text-xs text-gray-600 mb-3">
                <p>
                  {t.welcome.description1}
                </p>
                <p>
                  {t.welcome.description2}
                </p>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 italic mb-0">
                  {t.welcome.demoNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}