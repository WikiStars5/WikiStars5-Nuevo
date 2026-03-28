'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  sendEmailVerification as firebaseSendEmailVerification,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  Auth,
} from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore, FirestoreSettings } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';


// --- Singleton Pattern for Firebase Initialization ---

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

// Defer App Check to prevent blocking the main thread during initial load
if (typeof window !== 'undefined') {
  const initAppCheck = () => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true
        });
        console.log("Firebase App Check initialized deferred.");
      } catch (error) {
        console.error("Error initializing Firebase App Check:", error);
      }
    }
  };

  // Run after the page is fully loaded and main execution is finished
  if (document.readyState === 'complete') {
    setTimeout(initAppCheck, 2000);
  } else {
    window.addEventListener('load', () => setTimeout(initAppCheck, 2000));
  }
}

let firestore: Firestore;

try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error: any) {
  if (error.code === 'failed-precondition') {
     console.warn(
      "Firebase (Firestore): Firestore has already been initialized."
    );
  }
  firestore = getFirestore(app);
}

export function initializeFirebase() {
  return { firebaseApp: app, auth, firestore };
}

export function getSdks(firebaseApp: FirebaseApp, firestoreSettings?: FirestoreSettings) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp, firestoreSettings),
  };
}

export async function sendVerificationEmail(user: User): Promise<void> {
  return firebaseSendEmailVerification(user);
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
export * from './auth/use-admin';
export * from './auth/use-user';
export * from './fcm';
export { GoogleAuthProvider, signInWithPopup, signInAnonymously };
