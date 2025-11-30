'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signInAnonymously, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { UserHookResult } from './auth/use-user';
import { normalizeText } from '@/lib/keywords';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  reloadUser: () => Promise<void>; 
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  reloadUser: () => Promise<void>;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: auth?.currentUser || null,
    isUserLoading: !auth?.currentUser,
    userError: null,
  });

  const areServicesReady = !!(firebaseApp && firestore && auth);

  const reloadUser = useCallback(async () => {
    if (auth?.currentUser) {
      try {
        await auth.currentUser.reload();
        // Manually update state after reload if needed, though onAuthStateChanged should catch it.
        setUserAuthState(prev => ({...prev, user: auth.currentUser}));
      } catch (error) {
        console.error("Error reloading user:", error);
        setUserAuthState(prev => ({...prev, userError: error as Error}));
      }
    }
  }, [auth]);

  useEffect(() => {
    if (!areServicesReady || !auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Firebase services not available.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
            setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
        },
        (error) => {
            console.error("FirebaseProvider: onAuthStateChanged error:", error);
            if (error.code === 'auth/user-token-expired' && auth) {
                console.warn("User token expired. Signing out to refresh session.");
                auth.signOut();
            } else {
                setUserAuthState({ user: null, isUserLoading: false, userError: error });
            }
        }
    );

    return () => unsubscribe();
  }, [auth, areServicesReady]);


  const contextValue = useMemo((): FirebaseContextState => {
    return {
      areServicesAvailable: areServicesReady,
      firebaseApp: areServicesReady ? firebaseApp : null,
      firestore: areServicesReady ? firestore : null,
      auth: areServicesReady ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      reloadUser,
    };
  }, [firebaseApp, firestore, auth, userAuthState, areServicesReady, reloadUser]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    // This case should ideally not be hit if the provider handles loading state correctly.
    // However, it's a safeguard.
    // In a server component context, or before hydration, this might be expected.
    // We throw an error to make it clear that services are not ready.
    throw new Error('Firebase core services not available. This might be due to accessing the context before Firebase is initialized.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    reloadUser: context.reloadUser,
  };
};

export const useAuth = (): Auth | null => {
  const context = useContext(FirebaseContext);
   if (context === undefined) {
    // During SSR or initial render, context can be undefined. Return null.
    return null;
  }
  return context.auth;
};


export const useFirestore = (): Firestore | null => {
    const context = useContext(FirebaseContext);
     if (context === undefined) {
        return null;
    }
    return context.firestore;
};

export const useFirebaseApp = (): FirebaseApp | null => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        return null;
    }
    return context.firebaseApp;
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);

  if (memoized && typeof memoized === 'object') {
    Object.defineProperty(memoized, '__memo', {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }

  return memoized as T;
}
