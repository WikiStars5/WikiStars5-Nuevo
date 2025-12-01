'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp, Query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarChart3, Globe, Users, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { countries } from '@/lib/countries';
import { Skeleton } from '../ui/skeleton';
import CountryCombobox from '../shared/country-combobox';
import { cn } from '@/lib/utils';

interface UserData {
  id: string;
  country?: string;
  gender?: 'Masculino' | 'Femenino' | 'Otro';
  createdAt: Timestamp;
}

interface ChartDataPoint {
  date: string;
  count: number;
}

const timeRanges = [
  { value: '1', label: 'Última Hora' },
  { value: '24', label: 'Últimas 24 Horas' },
  { value: '168', label: 'Últimos 7 Días' },
  { value: '720', label: 'Últimos 30 Días' },
  { value: '1440', label: 'Últimos 60 Días' },
  { value: '2160', label: 'Últimos 90 Días' },
];

export default function UserTrendsChart({ className }: { className?: string }) {
  const firestore = useFirestore();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [countryFilter, setCountryFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState('720'); // Default to 30 days

  useEffect(() => {
    const fetchData = async () => {
      if (!firestore) return;
      setIsLoading(true);

      try {
        const now = new Date();
        const hoursAgo = parseInt(timeRangeFilter, 10);
        const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

        let conditions = [
            where('createdAt', '>=', startTime)
        ];

        if (countryFilter !== 'all') {
            conditions.push(where('country', '==', countryFilter));
        }
        if (genderFilter !== 'all') {
            conditions.push(where('gender', '==', genderFilter));
        }

        const usersQuery = query(
          collection(firestore, 'users'),
          ...conditions,
          orderBy('createdAt', 'asc')
        );

        const snapshot = await getDocs(usersQuery);
        const filteredUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
        
        const data = processUserData(filteredUsers, hoursAgo);
        setChartData(data);

      } catch (error) {
        console.error("Error fetching user trends data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, countryFilter, genderFilter, timeRangeFilter]);

  const processUserData = (users: UserData[], timeRangeHours: number): ChartDataPoint[] => {
    const now = new Date();
    const data: { [key: string]: number } = {};

    let formatOptions: Intl.DateTimeFormatOptions;
    let getDateKey: (d: Date) => string;

    if (timeRangeHours <= 24) { // Group by hour
        formatOptions = { hour: 'numeric', day: '2-digit', month: 'short' };
        getDateKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).toISOString();
    } else { // Group by day
        formatOptions = { day: '2-digit', month: 'short' };
        getDateKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    }
    
    users.forEach(user => {
      const dateKey = getDateKey(user.createdAt.toDate());
      data[dateKey] = (data[dateKey] || 0) + 1;
    });

    const chartPoints: ChartDataPoint[] = [];
    const interval = timeRangeHours <= 24 ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    let currentTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);

    while (currentTime <= now) {
      const dateKey = getDateKey(currentTime);
      chartPoints.push({
        date: new Intl.DateTimeFormat('es-ES', formatOptions).format(new Date(dateKey)),
        count: data[dateKey] || 0,
      });
      currentTime = new Date(currentTime.getTime() + interval);
    }
    
    return chartPoints;
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                 <CardTitle className="flex items-center gap-2"><BarChart3/>Usuarios registrados a lo largo del tiempo</CardTitle>
                 <CardDescription>Usuarios registrados a lo largo del tiempo con filtros demográficos.</CardDescription>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <CountryCombobox
                    value={countryFilter}
                    onChange={setCountryFilter}
                />
                 <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Sexo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los sexos</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                        {timeRanges.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full h-[300px] flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-[300px] flex flex-col items-center justify-center text-center">
            <p className="font-semibold">Sin datos para mostrar</p>
            <p className="text-sm text-muted-foreground">Prueba a ajustar los filtros o espera a que se registren nuevos usuarios.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
