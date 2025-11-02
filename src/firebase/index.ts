
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  sendEmailVerification as firebaseSendEmailVerification,
  User,
  EmailAuthProvider,
  linkWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const firestore = getFirestore(firebaseApp);
  // Enable multi-tab persistence to allow offline capabilities across tabs.
  // This can help with connection stability and reduce timeout warnings.
  try {
    enableMultiTabIndexedDbPersistence(firestore);
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      // This error means persistence is already enabled in another tab.
      // This is a normal scenario and can be ignored.
    } else {
      console.error("Firebase: Could not enable multi-tab persistence.", error);
    }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore,
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
export { EmailAuthProvider, linkWithCredential, GoogleAuthProvider, signInWithPopup };
