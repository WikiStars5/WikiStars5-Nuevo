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
import { MoreHorizontal, PlusCircle, Search, Trash2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// Placeholder data - replace with real data from Firestore later
const initialCampaigns = [
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

const CAMPAIGNS_STORAGE_KEY = 'wikistars5-ad-campaigns';

export default function AdsDashboardPage() {
  const [campaigns, setCampaigns] = React.useState(initialCampaigns);
  const { toast } = useToast();
  
  React.useEffect(() => {
    try {
      const savedCampaigns = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      if (savedCampaigns) {
        setCampaigns(JSON.parse(savedCampaigns));
      }
    } catch (error) {
      console.error("Failed to load campaigns from localStorage", error);
      // Fallback to initial data if localStorage is corrupt or unavailable
      setCampaigns(initialCampaigns);
    }
  }, []);


  const handleDeleteCampaign = (campaignId: string) => {
    const updatedCampaigns = campaigns.filter((c) => c.id !== campaignId);
    setCampaigns(updatedCampaigns);
    
    try {
        localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(updatedCampaigns));
        toast({
          title: 'Campaña eliminada',
          description: 'La campaña ha sido eliminada con éxito.',
        });
    } catch (error) {
        console.error("Failed to save campaigns to localStorage after deletion", error);
        toast({
            title: 'Error de almacenamiento',
            description: 'No se pudo guardar el cambio en el almacenamiento local.',
            variant: 'destructive'
        });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campañas</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear campaña
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Elige un objetivo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/ads/create-clics">
                    Clics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ads/create-impression">
                    Impresiones
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <TableHead>
                    <span className="sr-only">Acciones</span>
                </TableHead>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/ads/${campaign.id}/edit`}>Editar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCampaign(campaign.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
