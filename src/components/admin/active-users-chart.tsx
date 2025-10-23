
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp, Query, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarChart3, Users, PieChart, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Pie, Cell } from 'recharts';
import { countries } from '@/lib/countries';
import { Skeleton } from '../ui/skeleton';

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
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const statusQuery = query(
            collection(firestore, 'status'),
            where('isOnline', '==', true),
            where('lastChanged', '>=', fiveMinutesAgo)
        );

        const statusSnapshot = await getDocs(statusQuery);
        const onlineUserIds = statusSnapshot.docs.map(doc => doc.id);

        if (onlineUserIds.length === 0) {
            setTotalActive(0);
            setChartData([]);
            processDemographics([]);
            setIsLoading(false);
            return;
        }

        const userProfiles: UserProfile[] = [];
        for (let i = 0; i < onlineUserIds.length; i += 30) {
            const batchIds = onlineUserIds.slice(i, i + 30);
            const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', batchIds));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => userProfiles.push({ id: doc.id, ...doc.data() } as UserProfile));
        }
        
        let filteredProfiles = userProfiles;
        if (countryFilter !== 'all') {
            filteredProfiles = filteredProfiles.filter(p => p.country === countryFilter);
        }
        if (genderFilter !== 'all') {
             filteredProfiles = filteredProfiles.filter(p => (p.gender || 'No especificado') === genderFilter);
        }

        setTotalActive(filteredProfiles.length);
        processDemographics(filteredProfiles);
        
        // Trend data is harder with this model, so we'll show a simplified view for now.
        // A full implementation would require logging active users periodically.
        setChartData([{ date: 'Ahora', count: filteredProfiles.length }]);

      } catch (error) {
        console.error("Error fetching active user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);

  }, [firestore, countryFilter, genderFilter, timeRangeFilter]);

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
                 <CardTitle className="flex items-center gap-2"><TrendingUp/> Usuarios Activos (Tiempo Real)</CardTitle>
                 <CardDescription>Usuarios actualmente en línea, con filtros demográficos.</CardDescription>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        <SelectItem value="all">Todos los sexos</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                        <SelectItem value="No especificado">No especificado</SelectItem>
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
                <p className="text-sm text-muted-foreground">Usuarios Activos Totales</p>
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
      </CardContent>
    </Card>
  );
}
