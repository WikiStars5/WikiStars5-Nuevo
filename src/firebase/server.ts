import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  
  // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
  // for authentication.
  return initializeApp();
}

export function getSdks() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}
