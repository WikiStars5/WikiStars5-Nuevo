
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
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

const createGuestProfileIfNeeded = async (firestore: Firestore, user: User) => {
    if (!user.isAnonymous) return;

    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const guestUsername = `Invitado_${user.uid.substring(0, 5)}`;
        const usernameLower = normalizeText(guestUsername);
        
        try {
            await setDoc(userRef, {
                username: guestUsername,
                usernameLower: usernameLower,
                createdAt: serverTimestamp(),
                isAnonymous: true,
            });
            // We don't create a document in /usernames for guests to avoid conflicts
            // and keep the collection clean. Username uniqueness for guests isn't critical.
        } catch (error) {
            console.error("Failed to create guest user profile:", error);
        }
    }
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  const areServicesReady = !!(firebaseApp && firestore && auth);

  const reloadUser = useCallback(async () => {
    if (auth?.currentUser) {
      try {
        await auth.currentUser.reload();
      } catch (error) {
        console.error("Error reloading user:", error);
        setUserAuthState(prev => ({...prev, userError: error as Error}));
      }
    }
  }, [auth]);

  useEffect(() => {
    if (!areServicesReady || !auth || !firestore) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Firebase services not available.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          await createGuestProfileIfNeeded(firestore, firebaseUser);
          setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
        } else {
          try {
            await signInAnonymously(auth);
          } catch (error) {
             console.error("FirebaseProvider: Anonymous sign-in failed:", error);
             setUserAuthState({ user: null, isUserLoading: false, userError: error as Error });
          }
        }
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth, firestore, areServicesReady]);

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

  if (userAuthState.isUserLoading) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Conectando...</p>
      </div>
    );
  }

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
    throw new Error('Firebase core services not available. This is an unexpected error.');
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

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
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
