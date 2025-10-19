'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmotionVote } from '@/lib/data';
import { ChartTooltipContent } from '../ui/chart';

type EmotionChartProps = {
  data: EmotionVote[];
};

export default function EmotionChart({ data }: EmotionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Emotional Response</CardTitle>
        <CardDescription>What emotions does this figure evoke in people?</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: -10, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="emotion"
                type="category"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 14 }}
              />
               <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <text
                    key={`label-${index}`}
                    x={entry.percentage + 5}
                    y={index * 35 + 20}
                    fill="hsl(var(--foreground))"
                    textAnchor="start"
                  >
                    {`${entry.percentage}%`}
                  </text>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
