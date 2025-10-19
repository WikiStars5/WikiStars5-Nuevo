'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // `useMemo` ensures `initializeFirebase` is called only once on the client.
  const { firebaseApp, auth, firestore } = useMemo(() => {
    try {
      return initializeFirebase();
    } catch (e) {
      console.error("Failed to initialize Firebase on client", e);
      // Return nulls if initialization fails, the provider will handle it.
      return { firebaseApp: null, auth: null, firestore: null };
    }
  }, []); 

  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
