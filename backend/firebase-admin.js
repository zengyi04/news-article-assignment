const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with service account
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin SDK...');
  
  try {
    // Try to use service account file
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'news-fa2f1',
      storageBucket: 'news-fa2f1.firebasestorage.app'
    });
    console.log('Firebase Admin SDK initialized with service account');
  } catch (error) {
    console.error('Failed to initialize with service account:', error.message);
    
    // Fallback to environment variables
    try {
      admin.initializeApp({
        projectId: 'news-fa2f1',
        credential: admin.credential.applicationDefault(),
        storageBucket: 'news-fa2f1.firebasestorage.app'
      });
      console.log('Firebase Admin SDK initialized with application default credentials');
    } catch (fallbackError) {
      console.error('Failed to initialize Firebase Admin SDK:', fallbackError.message);
      process.exit(1);
    }
  }
}

// Export Firebase services
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = {
  admin,
  db,
  auth,
  storage
};
