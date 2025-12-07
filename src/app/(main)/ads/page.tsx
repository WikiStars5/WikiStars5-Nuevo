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
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface AdCampaign {
    id: string;
    campaignName: string;
    status: 'draft' | 'pending_review' | 'active' | 'rejected' | 'paused';
    type: 'cpc' | 'cpm';
    budget: number;
    spent: number;
    results: number;
}


export default function AdsDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const campaignsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'adCampaigns'));
  }, [user, firestore]);

  const { data: campaigns, isLoading } = useCollection<AdCampaign>(campaignsQuery);

  const handleDeleteCampaign = (campaignId: string) => {
    if (!user || !firestore) return;
    const campaignRef = doc(firestore, 'users', user.uid, 'adCampaigns', campaignId);
    deleteDocumentNonBlocking(campaignRef);
    toast({
      title: 'Campaña eliminada',
      description: 'La campaña ha sido eliminada con éxito.',
    });
  };
  
  const getStatusVariant = (status: AdCampaign['status']) => {
    switch (status) {
        case 'active': return 'default';
        case 'pending_review': return 'secondary';
        case 'draft': return 'outline';
        default: return 'destructive';
    }
  }
  
  const getCostPerResult = (campaign: AdCampaign) => {
    if (campaign.type === 'cpm') {
        return `S/ ${(campaign.spent / (campaign.results || 1) * 1000).toFixed(2)} (CPM)`;
    }
    return `S/ ${(campaign.spent / (campaign.results || 1)).toFixed(2)} (CPC)`;
  }

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
              <Input placeholder="Buscar por nombre..." className="pl-8" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Campaña</TableHead>
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
              {isLoading && Array.from({length: 3}).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && campaigns?.map((campaign) => (
                <TableRow key={campaign.id}>
                   <TableCell>
                    <Badge variant={getStatusVariant(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                  <TableCell>{campaign.results.toLocaleString()}</TableCell>
                  <TableCell>{getCostPerResult(campaign)}</TableCell>
                  <TableCell>S/ {campaign.budget.toFixed(2)}</TableCell>
                  <TableCell>S/ {campaign.spent.toFixed(2)}</TableCell>
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
               {!isLoading && (!campaigns || campaigns.length === 0) && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No has creado ninguna campaña. <Link href="/ads/create-clics" className="text-primary underline">¡Crea una ahora!</Link>
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}