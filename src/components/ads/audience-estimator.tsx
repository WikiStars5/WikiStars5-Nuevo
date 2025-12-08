'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { countries } from '@/lib/countries';


interface AudienceEstimatorProps {
  criteria?: {
    figureId: string;
    type: 'attitude' | 'emotion' | 'rating' | 'streak';
    value?: string;
    minValue?: number;
    maxValue?: number;
  }[];
  locations?: string[];
  genders?: string[];
}

export default function AudienceEstimator({ criteria, locations, genders }: AudienceEstimatorProps) {
  const firestore = useFirestore();
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const calculateAudience = async () => {
      if (!firestore || !criteria || criteria.length === 0) {
        setEstimatedSize(0);
        return;
      }
      
      setIsLoading(true);
      let totalAudience = 0;

      for (const criterion of criteria) {
          let audienceForCriterion = 0;

          if (criterion.type === 'streak') {
              if (!criterion.minValue) continue;
              
              const statsCollectionName = 'streakStats';
              
              const min = criterion.minValue;
              // If no max is set, or it's less than min, we only target the min value.
              const max = criterion.maxValue && criterion.maxValue >= min ? criterion.maxValue : min;

              // Create an array of promises to fetch all required day stats in parallel
              const statPromises = [];
              for (let day = min; day <= max; day++) {
                  const statsDocRef = doc(firestore, `figures/${criterion.figureId}/${statsCollectionName}`, String(day));
                  statPromises.push(getDoc(statsDocRef));
              }
              const statSnapshots = await Promise.all(statPromises);

              for (const docSnap of statSnapshots) {
                  if (docSnap.exists()) {
                      const statsData = docSnap.data();
                      const targetCountries = (locations && locations.length > 0)
                          ? locations.map(loc => countries.find(c => c.name === loc)?.key).filter(Boolean) as string[]
                          : Object.keys(statsData);
                      
                       for (const countryKey of targetCountries) {
                           if (statsData[countryKey]) {
                               const countryData = statsData[countryKey];
                               if (!genders || genders.length === 0 || genders.length === 2) { // "All genders" case
                                   audienceForCriterion += countryData.total || 0;
                               } else {
                                   genders.forEach(gender => {
                                       audienceForCriterion += countryData[gender] || 0;
                                   });
                               }
                           }
                       }
                  }
              }

          } else {
              if(!criterion.value) continue;
              const statsCollectionName = `${criterion.type}Stats`;
              const statsDocRef = doc(firestore, `figures/${criterion.figureId}/${statsCollectionName}`, criterion.value);
              const docSnap = await getDoc(statsDocRef);

              if (docSnap.exists()) {
                  const statsData = docSnap.data();
                  const targetCountries = (locations && locations.length > 0)
                      ? locations.map(loc => countries.find(c => c.name === loc)?.key).filter(Boolean) as string[]
                      : Object.keys(statsData);
                  
                  for (const countryKey of targetCountries) {
                       if (statsData[countryKey]) {
                           const countryData = statsData[countryKey];
                           if (!genders || genders.length === 0 || genders.length === 2) {
                               audienceForCriterion += countryData.total || 0;
                           } else {
                               genders.forEach(gender => {
                                   audienceForCriterion += countryData[gender] || 0;
                               });
                           }
                       }
                  }
              }
          }
          totalAudience += audienceForCriterion;
      }
      
      setEstimatedSize(totalAudience);
      setIsLoading(false);
    };

    const timeoutId = setTimeout(calculateAudience, 700); // Debounce calculation
    return () => clearTimeout(timeoutId);

  }, [criteria, locations, genders, firestore, t]);

  const getAudienceLevel = (size: number): { level: string; progress: number; color: string } => {
    if (size < 1000) return { level: 'Acotado', progress: 33, color: 'bg-destructive' };
    if (size < 100000) return { level: 'Medio', progress: 66, color: 'bg-yellow-500' };
    return { level: 'Amplio', progress: 100, color: 'bg-green-500' };
  };

  const { level, progress, color } = getAudienceLevel(estimatedSize);

  return (
    <Card className="bg-muted/50">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Definición del público
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Tu público es {level.toLowerCase()}.</span>
                </div>
                <Progress value={progress} indicatorClassName={color} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Acotado</span>
                    <span>Amplio</span>
                </div>
             </div>
             <div className="border-t pt-4">
                <div className="flex items-center justify-between font-semibold">
                    <span>Alcance Potencial Estimado:</span>
                    <div className="flex items-center gap-2">
                       {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                       <span>~{estimatedSize.toLocaleString()} impresiones</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    *Esta es una estimación del número total de veces que tu anuncio podría mostrarse, no necesariamente el número de personas únicas.
                </p>
             </div>
        </CardContent>
    </Card>
  );
}
