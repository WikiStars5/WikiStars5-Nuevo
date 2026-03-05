'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
// Usamos doc y getDoc para leer un documento específico
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Bell, Hash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationStatsPage() {
  const firestore = useFirestore();
  const [totalSubscribers, setTotalSubscribers] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function getStats() {
      if (!firestore) return;

      try {
        setIsLoading(true);
        // Referencia directa al documento mostrado en tu captura
        const docRef = doc(firestore, 'stats', 'notifications');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Extraemos el valor del campo totalSubscribers
          setTotalSubscribers(docSnap.data().totalSubscribers || 0);
        } else {
          console.log("El documento no existe");
          setTotalSubscribers(0);
        }
      } catch (error) {
        console.error("Error al obtener estadísticas:", error);
      } finally {
        setIsLoading(false);
      }
    }

    getStats();
  }, [firestore]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Bell className="text-yellow-400" />
              Estadísticas de Notificaciones
            </CardTitle>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          </div>
          <CardDescription className="text-zinc-500">
            Total de dispositivos vinculados en el sistema.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center py-12">
          {isLoading ? (
            <Skeleton className="h-20 w-32 bg-zinc-800" />
          ) : (
            <div className="text-8xl font-black tracking-tighter flex items-center gap-3">
              <span className="text-zinc-700 text-5xl">#</span>
              {totalSubscribers?.toLocaleString() ?? 0}
            </div>
          )}
          <p className="text-xs text-zinc-500 mt-6 font-bold uppercase tracking-[0.2em]">
            Suscriptores Totales
          </p>
        </CardContent>

        <CardFooter className="border-t border-zinc-900 bg-zinc-900/50 p-4 flex justify-center">
          <p className="text-[10px] text-center text-zinc-600">
            Dato obtenido en tiempo real desde /stats/notifications
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
