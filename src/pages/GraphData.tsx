import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  BarChart3, 
  LineChart, 
  TrendingUp, 
  Settings,
  Calendar,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';

const barChartData = [
  { time: '10', air1: 4.8, air2: 1.5, air3: 5.2 },
  { time: '11', air1: 4.9, air2: 1.6, air3: 5.3 },
  { time: '12', air1: 5.0, air2: 1.7, air3: 5.5 },
  { time: '13', air1: 4.7, air2: 1.4, air3: 5.1 },
  { time: '14', air1: 4.8, air2: 1.5, air3: 5.2 },
  { time: '15', air1: 4.9, air2: 1.6, air3: 5.4 },
  { time: '16', air1: 5.1, air2: 1.8, air3: 5.6 },
  { time: '17', air1: 4.6, air2: 1.3, air3: 5.0 },
];

const lineChartData = [
  { time: '10', watt: 5.2, var: 0.8, va: 5.3 },
  { time: '11', watt: 6.1, var: 1.0, va: 6.2 },
  { time: '12', watt: 7.5, var: 1.2, va: 7.6 },
  { time: '13', watt: 8.2, var: 1.1, va: 8.3 },
  { time: '14', watt: 7.8, var: 0.9, va: 7.9 },
  { time: '15', watt: 6.9, var: 0.8, va: 7.0 },
  { time: '16', watt: 5.5, var: 0.7, va: 5.6 },
  { time: '17', watt: 4.2, var: 0.5, va: 4.3 },
];

export default function GraphData() {
  const [chartType, setChartType] = useState('bar');
  const [selectedMeter, setSelectedMeter] = useState('air_conditioning');
  const [timeRange, setTimeRange] = useState('day');
  const [graphFormat, setGraphFormat] = useState('bar');

  const timeLabels = Array.from({ length: 25 }, (__, h) => {
    if (h === 0 || h === 24) return "00:00";
    return `${h.toString().padStart(2, '0')}:00`;
  });

  return (
    <PageLayout>
      <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Graph Data</h1>
          <p className="text-muted-foreground">Energy consumption visualization</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            20 March 2015
          </Button>
          <Button size="sm" variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            00:00 - 21:00
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Meter Selection */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Meter Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="air1" className="rounded border-border" defaultChecked />
                <label htmlFor="air1" className="text-sm font-medium">AIR1_2.04kW</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="air2" className="rounded border-border" defaultChecked />
                <label htmlFor="air2" className="text-sm font-medium">AIR2_2.04kW</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="air3" className="rounded border-border" defaultChecked />
                <label htmlFor="air3" className="text-sm font-medium">AIR3_1.47kW</label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graph Settings */}
        <Card className="shadow-card lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Graph Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Date Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Date Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Type */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Data Type</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="watt" className="rounded border-border" defaultChecked />
                    <label htmlFor="watt" className="text-sm">Watt</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="var" className="rounded border-border" />
                    <label htmlFor="var" className="text-sm">VAR</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="va" className="rounded border-border" />
                    <label htmlFor="va" className="text-sm">VA</label>
                  </div>
                </div>
              </div>

              {/* Graph Format */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Display Graph Format</Label>
                <RadioGroup value={graphFormat} onValueChange={setGraphFormat}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bar" id="bar" />
                    <label htmlFor="bar" className="text-sm flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Bar Graph</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="line" id="line" />
                    <label htmlFor="line" className="text-sm flex items-center space-x-2">
                      <LineChart className="w-4 h-4" />
                      <span>Line Graph</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Display */}
      <Card className="shadow-card">
        <CardHeader className="bg-gradient-primary text-primary-foreground">
          <CardTitle className="flex items-center justify-between">
            <span>
              {graphFormat === 'bar' ? 'Compare Meter Graph' : 'Demand Graph of Floor 3'} 
              - Dmd Watt Total 00:00 20 March 2015 - 00:00 21 March 2015
            </span>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Live Data</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {graphFormat === 'bar' ? (
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    label={{ value: 'Watt (kW)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="air1" fill="hsl(var(--primary))" name="AIR1_2.04kW" />
                  <Bar dataKey="air2" fill="hsl(var(--accent))" name="AIR2_2.04kW" />
                  <Bar dataKey="air3" fill="hsl(var(--success))" name="AIR3_1.47kW" />
                </BarChart>
              ) : (
                <RechartsLineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    label={{ value: 'kW', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="watt" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="MAX Dmd Watt (kW)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="var" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    name="MAX Dmd VAR (kVAR)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="va" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="MAX Dmd VA (kVA)"
                  />
                </RechartsLineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Peak Demand</p>
              <p className="text-2xl font-bold text-primary">8.2 kW</p>
              <p className="text-xs text-muted-foreground mt-1">at 13:00</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Average Load</p>
              <p className="text-2xl font-bold text-primary">6.4 kW</p>
              <p className="text-xs text-muted-foreground mt-1">daily average</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Load Factor</p>
              <p className="text-2xl font-bold text-primary">78%</p>
              <p className="text-xs text-muted-foreground mt-1">efficiency</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Energy</p>
              <p className="text-2xl font-bold text-primary">153.6 kWh</p>
              <p className="text-xs text-muted-foreground mt-1">daily consumption</p>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </PageLayout>
  );
}