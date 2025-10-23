'use client';

import { FirebaseClientProvider } from '@/firebase/client-provider';
import { StreakAnimationProvider } from '@/context/StreakAnimationContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <StreakAnimationProvider>
        {children}
      </StreakAnimationProvider>
    </FirebaseClientProvider>
  );
}
