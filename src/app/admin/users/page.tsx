
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { countries } from '@/lib/countries';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import { Users, TrendingUp, MapPin, UserCheck } from 'lucide-react';
import UserTrendsChart from '@/components/admin/user-trends-chart';
import ActiveUsersChart from '@/components/admin/active-users-chart';

interface UserData {
    country?: string;
    gender?: 'Masculino' | 'Femenino' | 'Otro';
    email?: string;
    createdAt?: Timestamp;
}

interface CountryStat {
    name: string;
    code: string;
    count: number;
}

const ChartLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null; // Don't render label for 0 value
    return (
        <text x={x + width + 10} y={y + 12} fill="hsl(var(--foreground))" textAnchor="start" className="text-sm font-bold">
            {value}
        </text>
    );
};

export default function AdminUsersDashboardPage() {
  const firestore = useFirestore();
  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<UserData>(usersCollection);

  const stats = useMemo(() => {
    if (!users) {
      return {
        total: 0,
        genderData: [],
        countryData: [],
        accountTypeData: [],
      };
    }

    const genderCounts: { [key: string]: number } = { Masculino: 0, Femenino: 0, Otro: 0, 'No especificado': 0 };
    const countryCounts: { [key: string]: number } = {};
    const accountTypeCounts = { Registrados: 0, Invitados: 0 };

    users.forEach(user => {
      // Tally genders
      if (user.gender && (user.gender === 'Masculino' || user.gender === 'Femenino' || user.gender === 'Otro')) {
        genderCounts[user.gender]++;
      } else {
        genderCounts['No especificado']++;
      }

      // Tally countries
      if (user.country) {
        countryCounts[user.country] = (countryCounts[user.country] || 0) + 1;
      }

      // Tally account types
      if (user.email) {
        accountTypeCounts.Registrados++;
      } else {
        accountTypeCounts.Invitados++;
      }
    });

    const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));
    const accountTypeData = Object.entries(accountTypeCounts).map(([name, value]) => ({ name, value }));

    const countryData: CountryStat[] = Object.entries(countryCounts)
      .map(([name, count]) => {
        const countryInfo = countries.find(c => c.name === name);
        return {
          name,
          code: countryInfo?.code || '',
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      total: users.length,
      genderData,
      countryData,
      accountTypeData,
    };
  }, [users]);
  
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <Card className="sm:col-span-2">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2"><Users /> Resumen de Usuarios</CardTitle>
                    <CardDescription className="max-w-lg text-balance leading-relaxed">Estadísticas demográficas de la comunidad.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-10 w-1/3" />
                    ) : (
                        <div className="text-5xl font-bold tracking-tighter">{stats.total}</div>
                    )}
                    <p className="text-xs text-muted-foreground">usuarios registrados en la plataforma.</p>
                </CardContent>
            </Card>

             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><TrendingUp /> Distribución por Sexo</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[100px] w-full" /> : (
                         <ResponsiveContainer width="100%" height={100}>
                            <BarChart data={stats.genderData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    stroke="hsl(var(--muted-foreground))"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    fontSize={12}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" barSize={16}>
                                    <LabelList dataKey="value" content={<ChartLabel />} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><UserCheck /> Tipo de Cuenta</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[100px] w-full" /> : (
                         <ResponsiveContainer width="100%" height={100}>
                            <BarChart data={stats.accountTypeData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    stroke="hsl(var(--muted-foreground))"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    fontSize={12}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" barSize={16}>
                                    <LabelList dataKey="value" content={<ChartLabel />} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin /> Top Países</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[250px] overflow-y-auto">
                     {isLoading ? (
                        <div className="space-y-4">
                           <Skeleton className="h-8 w-full" />
                           <Skeleton className="h-8 w-full" />
                           <Skeleton className="h-8 w-full" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>País</TableHead>
                                <TableHead className="text-right">Usuarios</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.countryData.map(country => (
                                    <TableRow key={country.code}>
                                        <TableCell className="flex items-center gap-2 font-medium">
                                            {country.code && (
                                                <Image 
                                                    src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                                    width={20}
                                                    height={15}
                                                    alt={country.name}
                                                    className="object-contain"
                                                />
                                            )}
                                            <span>{country.name}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{country.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                     {!isLoading && stats.countryData.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-10">
                            Aún no hay datos de países.
                        </p>
                    )}
                </CardContent>
            </Card>
            
            <UserTrendsChart />
            <ActiveUsersChart />
        </div>
    </div>
  );
}
