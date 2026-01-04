'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  sendEmailVerification as firebaseSendEmailVerification,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore, FirestoreSettings } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';


// --- Singleton Pattern for Firebase Initialization ---

// 1. Initialize the App
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. Initialize Auth
const auth: Auth = getAuth(app);

// 3. Initialize App Check
if (typeof window !== 'undefined') {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        // Set to true for local testing with reCAPTCHA keys.
        // In a real production environment, you might want this to be false.
        isTokenAutoRefreshEnabled: true
      });
      console.log("Firebase App Check initialized successfully.");
    } catch (error) {
      console.error("Error initializing Firebase App Check:", error);
    }
  } else {
    console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. Firebase App Check is not enabled.");
  }
}

// 4. Initialize Firestore with Modern Cache (Singleton)
let firestore: Firestore;

try {
  // Try to initialize with multi-tab persistence
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error: any) {
  // This error means it's already initialized, so we can just grab the existing instance
  if (error.code === 'failed-precondition') {
     console.warn(
      "Firebase (Firestore): Firestore has already been initialized. This is normal in development with Hot-Reload."
    );
  }
  firestore = getFirestore(app);
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // This function now simply returns the singleton instances.
  return { firebaseApp: app, auth, firestore };
}

// Deprecated, but kept for compatibility with any old code.
export function getSdks(firebaseApp: FirebaseApp, firestoreSettings?: FirestoreSettings) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp, firestoreSettings),
  };
}


/**
 * Sends a verification email to the given user.
 * This is a non-blocking operation.
 * @param user The user to send the verification email to.
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  // We don't await this promise. The email is sent in the background.
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
export { GoogleAuthProvider, signInWithPopup };
