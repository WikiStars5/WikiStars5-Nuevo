'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Figure, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info, Users, Loader2 } from 'lucide-react';

interface AudienceEstimatorProps {
  criteria?: {
    figureId: string;
    type: 'attitude' | 'emotion';
    value: string;
  }[];
  locations?: string[];
  genders?: string[];
}

const fetchFigureData = async (firestore: any, figureId: string): Promise<Figure | null> => {
  try {
    const figureRef = doc(firestore, 'figures', figureId);
    const docSnap = await getDoc(figureRef);
    if (docSnap.exists()) {
      return docSnap.data() as Figure;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching figure ${figureId}:`, error);
    return null;
  }
};

const fetchVoterIds = async (firestore: any, criterion: AudienceEstimatorProps['criteria'][0]): Promise<string[]> => {
    const votesQuery = query(
        collection(firestore, `figures/${criterion.figureId}/${criterion.type}Votes`),
        where('vote', '==', criterion.value)
    );
    const snapshot = await getDocs(votesQuery);
    return snapshot.docs.map(doc => doc.id);
};

export default function AudienceEstimator({ criteria, locations, genders }: AudienceEstimatorProps) {
  const firestore = useFirestore();
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const calculateAudience = async () => {
      if (!firestore || !criteria || criteria.length === 0) {
        setEstimatedSize(0);
        return;
      }
      
      setIsLoading(true);
      
      // 1. Get all unique user IDs based on attitude/emotion criteria
      const voterIdPromises = criteria.map(c => fetchVoterIds(firestore, c));
      const userIdsByCriterion = await Promise.all(voterIdPromises);
      const uniqueUserIds = [...new Set(userIdsByCriterion.flat())];
      
      if (uniqueUserIds.length === 0) {
          setEstimatedSize(0);
          setIsLoading(false);
          return;
      }
      
      // 2. Fetch user profiles for the unique IDs
      const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', uniqueUserIds));
      const usersSnapshot = await getDocs(usersQuery);
      let users = usersSnapshot.docs.map(doc => doc.data() as User);

      // 3. Filter users by location and gender
      if (locations && locations.length > 0) {
          users = users.filter(user => user.country && locations.includes(user.country));
      }
      if (genders && genders.length > 0) {
          users = users.filter(user => user.gender && genders.includes(user.gender));
      }
      
      setEstimatedSize(users.length);
      setIsLoading(false);
    };

    const timeoutId = setTimeout(calculateAudience, 500); // Debounce calculation
    return () => clearTimeout(timeoutId);

  }, [criteria, locations, genders, firestore]);

  const getAudienceLevel = (size: number): { level: 'Acotado' | 'Medio' | 'Amplio'; progress: number; color: string } => {
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
