
import { initializeApp, getApps, getApp, FirebaseApp, cert, type AppOptions } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';


function getAdminApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  
  // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
  // for authentication when running in a Google Cloud environment.
  // By explicitly passing `credential: credential.applicationDefault()`,
  // we ensure it uses the runtime credentials and does not look for a local file.
  const options: AppOptions = {
    credential: credential.applicationDefault(),
  };

  return initializeApp(options);
}

export function getSdks() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

    