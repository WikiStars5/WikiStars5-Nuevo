'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { User as AppUser } from '@/lib/types';

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

const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

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
        setUserAuthState(prev => ({...prev, user: auth.currentUser}));
      } catch (error) {
        console.error("Error reloading user:", error);
        setUserAuthState(prev => ({...prev, userError: error as Error}));
      }
    }
  }, [auth]);

  useEffect(() => {
    if (!areServicesReady || !auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: null });
      return;
    }

    const unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
            setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });

            if (firebaseUser && firestore) {
                const userRef = doc(firestore, 'users', firebaseUser.uid);
                getDoc(userRef).then(userSnap => {
                    const userData = userSnap.data() as AppUser;
                    const lastVisitDate = userData?.lastVisit?.toDate();
                    const today = new Date();

                    if (!lastVisitDate || !isSameDay(lastVisitDate, today)) {
                         setDoc(userRef, { 
                            visitCount: increment(1),
                            lastVisit: serverTimestamp() 
                        }, { merge: true });
                    }
                }).catch(error => {
                    console.error("Error tracking user visit:", error);
                });
            }
        },
        (error) => {
            console.error("FirebaseProvider: onAuthStateChanged error:", error);
            setUserAuthState({ user: null, isUserLoading: false, userError: error });
        }
    );

    return () => unsubscribe();
  }, [auth, areServicesReady, firestore]);


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

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    return {
      areServicesAvailable: false,
      firebaseApp: null,
      firestore: null,
      auth: null,
      user: null,
      isUserLoading: true,
      userError: null,
      reloadUser: async () => {},
    };
  }
  return context;
};

export const useUser = () => {
  const { user, isUserLoading, userError, reloadUser } = useFirebase();
  return { user, isUserLoading, userError, reloadUser };
};

export const useAuth = (): Auth | null => {
  const context = useContext(FirebaseContext);
  return context?.auth || null;
};

export const useFirestore = (): Firestore | null => {
    const context = useContext(FirebaseContext);
    return context?.firestore || null;
};

export const useFirebaseApp = (): FirebaseApp | null => {
    const context = useContext(FirebaseContext);
    return context?.firebaseApp || null;
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
