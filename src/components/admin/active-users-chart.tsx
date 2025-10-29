
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp, Query, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarChart3, Users, PieChart, TrendingUp, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Pie, Cell } from 'recharts';
import { countries } from '@/lib/countries';
import { Skeleton } from '../ui/skeleton';
import CountryCombobox from '../shared/country-combobox';

interface UserProfile {
  id: string;
  country?: string;
  gender?: 'Masculino' | 'Femenino' | 'Otro' | 'No especificado';
  email?: string;
}

interface ActiveUserData {
  id: string; // This is the user ID
  profile: UserProfile;
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
  const [timeRangeFilter, setTimeRangeFilter] = useState('24'); // Default to 24 hours

  useEffect(() => {
    const fetchData = async () => {
      if (!firestore) return;
      setIsLoading(true);

      try {
        const now = new Date();
        const hoursAgo = parseInt(timeRangeFilter, 10);
        const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

        // This query gets all status changes in the time range
        const statusQuery = query(
            collection(firestore, 'status'),
            where('lastChanged', '>=', startTime),
            orderBy('lastChanged', 'asc')
        );

        const statusSnapshot = await getDocs(statusQuery);
        const allStatusChanges = statusSnapshot.docs.map(doc => ({
            userId: doc.id,
            isOnline: doc.data().isOnline,
            lastChanged: doc.data().lastChanged.toDate(),
        }));
        
        // Get unique user IDs to fetch their profiles
        const userIds = [...new Set(allStatusChanges.map(s => s.userId))];

        let filteredUserIds = userIds;
        
        if (countryFilter !== 'all' || genderFilter !== 'all') {
            const profiles: { [key: string]: UserProfile } = {};
            for (let i = 0; i < userIds.length; i += 30) {
                const batchIds = userIds.slice(i, i + 30);
                const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', batchIds));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(doc => {
                    profiles[doc.id] = { id: doc.id, ...doc.data() } as UserProfile
                });
            }
            
            if (countryFilter !== 'all') {
                filteredUserIds = filteredUserIds.filter(id => profiles[id]?.country === countryFilter);
            }
            if (genderFilter !== 'all') {
                filteredUserIds = filteredUserIds.filter(id => (profiles[id]?.gender || 'No especificado') === genderFilter);
            }
        }

        const data = processStatusData(allStatusChanges, filteredUserIds, hoursAgo);
        setChartData(data);

        // For the pie charts, we need the *currently* active users
        const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
        const currentStatusQuery = query(
            collection(firestore, 'status'),
            where('isOnline', '==', true),
            where('lastChanged', '>=', oneMinuteAgo)
        );
        const currentStatusSnapshot = await getDocs(currentStatusQuery);
        const onlineUserIds = currentStatusSnapshot.docs.map(doc => doc.id).filter(id => filteredUserIds.includes(id));
        
        setTotalActive(onlineUserIds.length);

        if (onlineUserIds.length > 0) {
            const profilesToProcess: UserProfile[] = [];
             for (let i = 0; i < onlineUserIds.length; i += 30) {
                const batchIds = onlineUserIds.slice(i, i + 30);
                const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', batchIds));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(doc => profilesToProcess.push({ id: doc.id, ...doc.data() } as UserProfile));
            }
            processDemographics(profilesToProcess);
        } else {
            processDemographics([]);
        }

      } catch (error) {
        console.error("Error fetching active user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, countryFilter, genderFilter, timeRangeFilter]);
  
   const processStatusData = (
    statusChanges: { userId: string, isOnline: boolean, lastChanged: Date }[],
    filteredUserIds: string[],
    timeRangeHours: number
  ): ChartDataPoint[] => {
    const now = new Date();
    const data: { [key: string]: Set<string> } = {};

    let formatOptions: Intl.DateTimeFormatOptions;
    let getDateKey: (d: Date) => string;
    
    if (timeRangeHours <= 24) { // Group by hour
        formatOptions = { hour: 'numeric', day: '2-digit', month: 'short' };
        getDateKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).toISOString();
    } else { // Group by day
        formatOptions = { day: '2-digit', month: 'short' };
        getDateKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    }

    statusChanges.forEach(change => {
      if (change.isOnline && filteredUserIds.includes(change.userId)) {
          const dateKey = getDateKey(change.lastChanged);
          if (!data[dateKey]) {
              data[dateKey] = new Set();
          }
          data[dateKey].add(change.userId);
      }
    });

    const chartPoints: ChartDataPoint[] = [];
    const interval = timeRangeHours <= 24 ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    let currentTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);

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


  const processDemographics = (users: UserProfile[]) => {
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
     
     setGenderData(Object.entries(genderCounts).map(([name, value]) => ({ name, value })).filter(item => item.value > 0));
     setAccountTypeData(Object.entries(accountTypeCounts).map(([name, value]) => ({ name, value })).filter(item => item.value > 0));
  };

  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                 <CardTitle className="flex items-center gap-2"><TrendingUp/> Usuarios Activos</CardTitle>
                 <CardDescription>Usuarios en línea en tiempo real y tendencias de actividad, con filtros demográficos.</CardDescription>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <CountryCombobox
                    value={countryFilter}
                    onChange={setCountryFilter}
                />
                 <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger><SelectValue placeholder="Sexo" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los sexos</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                        <SelectItem value="No especificado">No especificado</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Periodo de tiempo" />
                    </SelectTrigger>
                    <SelectContent>
                        {timeRanges.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="flex flex-col items-center justify-center p-6 bg-muted/50">
                <Users className="h-8 w-8 text-muted-foreground" />
                {isLoading ? <Skeleton className="h-9 w-12 mt-2" /> : <p className="text-3xl font-bold mt-2">{totalActive}</p>}
                <p className="text-sm text-muted-foreground">Usuarios en Tiempo Real</p>
            </Card>
             <Card>
                <CardHeader className="p-4"><CardTitle className="text-base flex items-center gap-2"><PieChart/>Por Género</CardTitle></CardHeader>
                <CardContent className="p-0">
                   {isLoading ? <Skeleton className="h-[150px] w-full" /> : genderData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                             <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={GENDER_COLORS[entry.name as keyof typeof GENDER_COLORS]} />)}
                             </Pie>
                             <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    ) : <p className="text-center text-sm text-muted-foreground py-10">Sin datos</p>}
                </CardContent>
            </Card>
            <Card>
                 <CardHeader className="p-4"><CardTitle className="text-base flex items-center gap-2"><PieChart/>Por Tipo de Cuenta</CardTitle></CardHeader>
                 <CardContent className="p-0">
                     {isLoading ? <Skeleton className="h-[150px] w-full" /> : accountTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                                <Pie data={accountTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                    {accountTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={ACCOUNT_COLORS[entry.name as keyof typeof ACCOUNT_COLORS]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-sm text-muted-foreground py-10">Sin datos</p>}
                </CardContent>
            </Card>
        </div>
         <div className="pt-4">
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
                    <Line type="monotone" dataKey="count" name="Usuarios Activos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="w-full h-[300px] flex flex-col items-center justify-center text-center">
                    <p className="font-semibold">Sin datos de tendencia para mostrar</p>
                    <p className="text-sm text-muted-foreground">Prueba a ajustar los filtros o espera a que haya más actividad.</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
