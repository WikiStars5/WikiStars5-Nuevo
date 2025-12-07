'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

// Placeholder data - replace with real data from Firestore later
const campaigns = [
  {
    id: '1',
    name: 'wiki5',
    status: 'active',
    delivery: 'Activa',
    results: '23 Visitas a la página',
    costPerResult: 'S/0,71',
    budget: 'Con el presupuesto...',
    spent: 'S/16,3',
  },
];

export default function AdsDashboardPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campañas</CardTitle>
            <Button asChild>
              <Link href="/ads/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear campaña
              </Link>
            </Button>
          </div>
          <CardDescription>
            Gestiona y analiza el rendimiento de tus campañas publicitarias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, ID o métricas" className="pl-8" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Campaña</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Resultados</TableHead>
                <TableHead>Costo por resultado</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead>Importe gastado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Switch checked={campaign.status === 'active'} />
                  </TableCell>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant={campaign.delivery === 'Activa' ? 'default' : 'secondary'}>
                      {campaign.delivery}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.results}</TableCell>
                  <TableCell>{campaign.costPerResult}</TableCell>
                  <TableCell>{campaign.budget}</TableCell>
                  <TableCell>{campaign.spent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
