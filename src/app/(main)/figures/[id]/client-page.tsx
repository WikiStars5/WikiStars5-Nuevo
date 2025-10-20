'use client';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Figure } from '@/lib/types';
import ProfileHeader from '@/components/figure/ProfileHeader';
import AttitudeVoting from '@/components/figure/attitude-voting';
import EmotionVoting from '@/components/figure/emotion-voting';
import EditInformationForm from '@/components/figure/edit-information-form';
import { Button } from '@/components/ui/button';
import { Pencil, User, Users, Briefcase, Globe, Heart } from 'lucide-react';

function FigureDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8 pt-0 md:pb-16 md:pt-0">
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
            <Skeleton className="h-28 w-28 flex-shrink-0 rounded-full md:h-36 md:w-36" />
            <div className="flex-1 space-y-3 text-center md:text-left">
              <Skeleton className="h-8 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6">
        <Skeleton className="h-10 w-full" />
        <Card className="mt-4">
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FigureDetailClient({ figureId }: { figureId: string }) {
  const firestore = useFirestore();
  const [isEditing, setIsEditing] = useState(false);

  const figureDocRef = useMemoFirebase(() => {
    if (!firestore || !figureId) return null;
    return doc(firestore, 'figures', figureId);
  }, [firestore, figureId]);

  const { data: figure, isLoading, error } = useDoc<Figure>(figureDocRef);

  if (isLoading || !figure) {
    return <FigureDetailSkeleton />;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error.message}</div>
  }

  const infoItems = [
    {
      label: 'Nombre Completo',
      value: figure.name,
      icon: User,
    },
    {
      label: 'Sexo',
      value: figure.gender,
      icon: Users,
    },
    {
      label: 'Ocupación',
      value: figure.occupation,
      icon: Briefcase,
    },
    {
      label: 'País de origen',
      value: figure.nationality,
      icon: Globe,
    },
    {
      label: 'Estado civil',
      value: figure.maritalStatus,
      icon: Heart,
    },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8 pt-0 md:pb-16 md:pt-0">
      <ProfileHeader figure={figure} />

      <div className="mt-6">
        <Tabs defaultValue="actitud" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="informacion">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></svg>
              Información
            </TabsTrigger>
            <TabsTrigger value="actitud">
               <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2" />
              </svg>
              Actitud
            </TabsTrigger>
            <TabsTrigger value="emocion">
             <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 21a9 9 0 1 1 0 -18a9 9 0 0 1 0 18z" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M9.5 15a3.5 3.5 0 0 0 5 0" /></svg>
              Emoción
            </TabsTrigger>
            <TabsTrigger value="rachas">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="I 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3.5 17.5c4.667 -6.667 6.333 -6.667 11 -2.5" /><path d="M3.5 12.5c4.667 -6.667 6.333 -6.667 11 -2.5" /><path d="M3.5 7.5c4.667 -6.667 6.333 -6.667 11 -2.5" /></svg>
              Top Rachas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="informacion" className="mt-4">
              {isEditing ? (
                  <EditInformationForm figure={figure} onFormClose={() => setIsEditing(false)} />
              ) : (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Información Detallada</CardTitle>
                                <CardDescription>Datos biográficos y descriptivos de {figure.name}.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {infoItems.map((item) => (
                                item.value ? (
                                    <div key={item.label} className="flex items-start gap-3">
                                        <item.icon className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm">{item.label}</p>
                                            <p className="text-muted-foreground">{item.value}</p>
                                        </div>
                                    </div>
                                ) : null
                            ))}
                        </div>
                         {infoItems.every(item => !item.value) && (
                            <p className="text-muted-foreground text-center py-4">
                                No hay información detallada disponible. ¡Haz clic en "Editar" para añadirla!
                            </p>
                        )}
                    </CardContent>
                </Card>
              )}
          </TabsContent>
          <TabsContent value="actitud" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <AttitudeVoting figure={figure} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="emocion" className="mt-4">
            <Card>
              <CardContent className="p-6">
                 <EmotionVoting figure={figure} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rachas" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Las mejores rachas para {figure.name} aparecerán aquí.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
