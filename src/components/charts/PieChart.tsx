import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  colors?: string[];
}

const defaultColors = [
  'hsl(var(--primary))',
  'hsl(var(--accent))', 
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--secondary))'
];

export function PieChart({ data, height = 250, colors = defaultColors }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
        <Legend 
          wrapperStyle={{ 
            fontSize: '12px',
            color: 'hsl(var(--card-foreground))'
          }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}