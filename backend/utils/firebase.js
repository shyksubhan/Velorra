/* ============================================================
   VELORRA — Firebase Admin SDK Initialization
   Returns null safely when credentials are not configured.
   All routes check getDB() === null to use in-memory fallback.
   ============================================================ */
const admin = require('firebase-admin');

let db    = null;
let tried = false;

function initFirebase() {
  if (tried) return db;
  tried = true;

  if (admin.apps.length > 0) {
    db = admin.apps[0].firestore();
    db.settings({ ignoreUndefinedProperties: true });
    return db;
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  const isMissing = !projectId || !privateKey || !clientEmail ||
    projectId === 'your-firebase-project-id' ||
    clientEmail.includes('your-project');

  if (isMissing) {
    console.warn('⚠️  Firebase credentials not configured.');
    console.warn('   Running in DEMO MODE — data stored in memory only.');
    return null;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      })
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firebase Admin initialized — Project:', projectId);
    return db;

  } catch (err) {
    console.warn('⚠️  Firebase init failed:', err.message);
    console.warn('   Running in DEMO MODE — data stored in memory only.\n');
    return null;
  }
}

function getDB() {
  if (!tried) initFirebase();
  return db;
}

module.exports = { initFirebase, getDB };