'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface AudienceEstimatorProps {
  criteria?: {
    figureId: string;
    type: 'attitude' | 'emotion';
    value: string;
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
          const statsDocRef = doc(firestore, `figures/${criterion.figureId}/${criterion.type}Stats`, criterion.value);
          const docSnap = await getDoc(statsDocRef);

          if (docSnap.exists()) {
              const statsData = docSnap.data();
              let audienceForCriterion = 0;

              const targetCountries = (locations && locations.length > 0) ? locations : Object.keys(statsData);
              const targetGenders = (genders && genders.length > 0) ? genders : ['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'];

              for (const countryName of targetCountries) {
                  const countryKey = countryName.toLowerCase().replace(/ /g, '_'); // Normalize if needed, though keys should be consistent
                  const countryData = Object.entries(statsData).find(([key]) => key.toLowerCase() === countryKey.toLowerCase())?.[1] as any;
                  
                  if (countryData) {
                       // If no gender filter is applied, we take the country's total.
                       if (!genders || genders.length === 0) {
                           audienceForCriterion += countryData.total || 0;
                       } else {
                           // If there is a gender filter, sum up only the selected genders.
                           genders.forEach(gender => {
                               audienceForCriterion += countryData[gender] || 0;
                           });
                       }
                  }
              }
              totalAudience += audienceForCriterion;
          }
      }
      
      setEstimatedSize(totalAudience);
      setIsLoading(false);
    };

    const timeoutId = setTimeout(calculateAudience, 700); // Debounce calculation
    return () => clearTimeout(timeoutId);

  }, [criteria, locations, genders, firestore]);

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
                    <span>Tamaño de público estimado:</span>
                    <div className="flex items-center gap-2">
                       {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                       <span>{estimatedSize.toLocaleString()}</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Los tamaños de público son una estimación.
                </p>
             </div>
        </CardContent>
    </Card>
  );
}
