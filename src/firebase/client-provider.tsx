
'use client';

import { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // `useMemo` ensures `initializeFirebase` is called only once on the client.
  const { firebaseApp, auth, firestore } = useMemo(() => {
    try {
      const { firebaseApp, auth, firestore } = initializeFirebase();

      // Enable multi-tab persistence to allow offline capabilities across tabs.
      // This MUST be done after getting the firestore instance and before any other operations.
      enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          // This error means persistence is already enabled in another tab.
          // This is a normal scenario and can be ignored.
        } else {
          console.error("Firebase: Could not enable multi-tab persistence.", err);
        }
      });
      
      return { firebaseApp, auth, firestore };
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

    