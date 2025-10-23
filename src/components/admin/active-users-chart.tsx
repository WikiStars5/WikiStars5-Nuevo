
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarChart3, Users, PieChart, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Pie, Cell } from 'recharts';
import { countries } from '@/lib/countries';
import { Skeleton } from '../ui/skeleton';

interface ActiveUserData {
  id: string;
  country?: string;
  gender?: 'Masculino' | 'Femenino' | 'Otro' | 'No especificado';
  email?: string;
  lastLogin: Timestamp;
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

const GENDER_COLORS = {
    'Masculino': 'hsl(var(--primary))',
    'Femenino': 'hsl(var(--secondary))',
    'Otro': 'hsl(var(--muted-foreground))',
    'No especificado': 'hsl(var(--muted))',
};

const ACCOUNT_COLORS = {
    'Registrados': 'hsl(var(--primary))',
    'Invitados': 'hsl(var(--muted))',
};


export default function ActiveUsersChart() {
  const firestore = useFirestore();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalActive, setTotalActive] = useState(0);
  const [genderData, setGenderData] = useState<{name: string, value: number}[]>([]);
  const [accountTypeData, setAccountTypeData] = useState<{name: string, value: number}[]>([]);


  const [countryFilter, setCountryFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState('168'); // Default to 7 days

  useEffect(() => {
    const fetchData = async () => {
      if (!firestore) return;
      setIsLoading(true);

      try {
        const now = new Date();
        const hoursAgo = parseInt(timeRangeFilter, 10);
        const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

        let usersQuery = query(
          collection(firestore, 'users'),
          where('lastLogin', '>=', startTime),
          orderBy('lastLogin', 'asc')
        );

        const snapshot = await getDocs(usersQuery);
        const allActiveUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActiveUserData));
        
        const filteredUsers = allActiveUsers.filter(user => {
          const countryMatch = countryFilter === 'all' || user.country === countryFilter;
          const genderMatch = genderFilter === 'all' || user.gender === genderFilter;
          return countryMatch && genderMatch;
        });

        setTotalActive(filteredUsers.length);
        
        const trendData = processTrendData(filteredUsers, hoursAgo);
        setChartData(trendData);

        processDemographics(filteredUsers);

      } catch (error) {
        console.error("Error fetching active user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, countryFilter, genderFilter, timeRangeFilter]);

  const processDemographics = (users: ActiveUserData[]) => {
     const genderCounts: { [key: string]: number } = { 'Masculino': 0, 'Femenino': 0, 'Otro': 0, 'No especificado': 0 };
     const accountTypeCounts = { 'Registrados': 0, 'Invitados': 0 };

     users.forEach(user => {
        const gender = user.gender || 'No especificado';
        genderCounts[gender]++;

        if (user.email) {
            accountTypeCounts.Registrados++;
        } else {
            accountTypeCounts.Invitados++;
        }
     });
     
     setGenderData(Object.entries(genderCounts).map(([name, value]) => ({ name, value })));
     setAccountTypeData(Object.entries(accountTypeCounts).map(([name, value]) => ({ name, value })));
  };

  const processTrendData = (users: ActiveUserData[], timeRangeHours: number): ChartDataPoint[] => {
    const now = new Date();
    const data: { [key: string]: Set<string> } = {}; // Use Set to store unique user IDs

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
      const dateKey = getDateKey(user.lastLogin.toDate());
      if (!data[dateKey]) {
        data[dateKey] = new Set();
      }
      data[dateKey].add(user.id);
    });

    const chartPoints: ChartDataPoint[] = [];
    const interval = timeRangeHours <= 48 ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    let currentTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);
    // Align to the start of the hour or day
    if (timeRangeHours <= 48) {
      currentTime.setMinutes(0, 0, 0);
    } else {
      currentTime.setHours(0, 0, 0, 0);
    }


    while (currentTime <= now) {
      const dateKey = getDateKey(currentTime);
      chartPoints.push({
        date: new Intl.DateTimeFormat('es-ES', formatOptions).format(new Date(dateKey)),
        count: data[dateKey]?.size || 0,
      });
      currentTime = new Date(currentTime.getTime() + interval);
    }
    
    return chartPoints;
  };

  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                 <CardTitle className="flex items-center gap-2"><TrendingUp/> Usuarios Activos</CardTitle>
                 <CardDescription>Usuarios únicos activos por período, con filtros demográficos.</CardDescription>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los países</SelectItem>
                        {countries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger><SelectValue placeholder="Sexo" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Ambos sexos</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                        <SelectItem value="No especificado">No especificado</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                    <SelectTrigger><SelectValue placeholder="Periodo" /></SelectTrigger>
                    <SelectContent>
                        {timeRanges.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="flex flex-col items-center justify-center p-6">
                <Users className="h-8 w-8 text-muted-foreground" />
                <p className="text-3xl font-bold mt-2">{totalActive}</p>
                <p className="text-sm text-muted-foreground">Usuarios Activos Totales</p>
            </Card>
             <Card>
                <CardHeader className="p-4"><CardTitle className="text-base flex items-center gap-2"><PieChart/>Por Género</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                             <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={GENDER_COLORS[entry.name as keyof typeof GENDER_COLORS]} />)}
                             </Pie>
                             <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader className="p-4"><CardTitle className="text-base flex items-center gap-2"><PieChart/>Por Tipo de Cuenta</CardTitle></CardHeader>
                 <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                             <Pie data={accountTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                {accountTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={ACCOUNT_COLORS[entry.name as keyof typeof ACCOUNT_COLORS]} />)}
                             </Pie>
                             <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

        <div>
            {isLoading ? (
            <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
            </div>
            ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="count" name="Usuarios Activos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
            ) : (
            <div className="w-full h-[300px] flex flex-col items-center justify-center text-center">
                <p className="font-semibold">Sin datos para mostrar</p>
                <p className="text-sm text-muted-foreground">Prueba a ajustar los filtros o espera a que haya actividad.</p>
            </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

    