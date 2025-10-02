import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: Array<{ name: string; value: number; value2?: number }>;
  height?: number;
  color?: string;
  color2?: string;
  showSecondLine?: boolean;
}

export function TrendChart({ data, height = 300, color = "hsl(var(--primary))", color2 = "hsl(var(--accent))", showSecondLine = false }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color}
          strokeWidth={3}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: color }}
        />
        {showSecondLine && (
          <Line 
            type="monotone" 
            dataKey="value2" 
            stroke={color2}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: color2, strokeWidth: 2, r: 3 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}