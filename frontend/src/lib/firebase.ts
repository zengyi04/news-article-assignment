import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    __newsArticleFirebaseApp?: FirebaseApp;
  }
}

const globalWindow = window as Window & typeof globalThis;

// Initialize Firebase app once and reuse it across Vite hot reloads
const app = globalWindow.__newsArticleFirebaseApp ?? (getApps().length ? getApp() : initializeApp(firebaseConfig));
globalWindow.__newsArticleFirebaseApp = app;

export const auth = getAuth();

// Get Firestore instance with optimized settings
export const db = getFirestore(app);

// Check if we're in development and connect to emulator if needed
if (window.location.hostname === 'localhost' && import.meta.env.DEV) {
  // Uncomment to use Firestore emulator for faster development
  // connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('Firestore initialized for development');
}

// Configure auth settings for development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  auth.settings.appVerificationDisabledForTesting = true;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const message = error instanceof Error ? error.message : String(error);
  const friendlyMessage = message.includes('Missing or insufficient permissions')
    ? 'Firestore permissions are blocking writes. Deploy frontend/firestore.rules to the Firebase project, then reload the app.'
    : message;

  const errInfo: FirestoreErrorInfo = {
    error: friendlyMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}
