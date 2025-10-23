
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
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { countries } from '@/lib/countries';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import { Users, TrendingUp, MapPin } from 'lucide-react';

interface UserData {
    country?: string;
    gender?: 'Masculino' | 'Femenino' | 'Otro';
}

interface CountryStat {
    name: string;
    code: string;
    count: number;
}

const ChartLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
        <text x={x + width / 2} y={y} dy={-4} fill="hsl(var(--foreground))" textAnchor="middle" className="text-sm font-bold">
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
      };
    }

    const genderCounts = { Masculino: 0, Femenino: 0, Otro: 0, 'No especificado': 0 };
    const countryCounts: { [key: string]: number } = {};

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
    });

    const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));

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
    };
  }, [users]);
  
  return (
    <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> Resumen de Usuarios</CardTitle>
                <CardDescription>Estadísticas demográficas de la comunidad.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-24 w-1/3" />
                ) : (
                    <div className="text-5xl font-bold tracking-tighter">{stats.total}</div>
                )}
                <p className="text-xs text-muted-foreground">usuarios registrados en la plataforma.</p>
            </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp /> Distribución por Sexo</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                         <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.genderData} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    stroke="hsl(var(--muted-foreground))"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))">
                                    <LabelList dataKey="value" content={<ChartLabel />} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin /> Top Países</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] overflow-y-auto">
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
        </div>
    </div>
  );
}

