'use client';

import { FirebaseClientProvider } from '@/firebase/client-provider';
import { StreakAnimationProvider } from '@/context/StreakAnimationContext';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      disableTransitionOnChange
      suppressHydrationWarning
    >
      <FirebaseClientProvider>
        <StreakAnimationProvider>
          {children}
        </StreakAnimationProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
