/* ============================================================
   VELORRA — Firebase Admin SDK Initialization
   Returns null safely when credentials are not configured.
   All routes check getDB() === null to use in-memory fallback.
   ============================================================ */
const admin = require('firebase-admin');

let db   = null;
let tried = false;  /* Only attempt init once */

function initFirebase() {
  if (tried) return db;
  tried = true;

  /* Skip if already initialized */
  if (admin.apps.length > 0) {
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    return db;
  }

  /* Check that real credentials are present */
  const projectId  = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  const isMissing = !projectId || !privateKey || !clientEmail ||
    projectId === 'your-firebase-project-id' ||
    privateKey.includes('your-private-key-here') ||
    clientEmail.includes('your-project');

  if (isMissing) {
    console.warn('⚠️  Firebase credentials not configured.');
    console.warn('   Running in DEMO MODE — data stored in memory only.');
    console.warn('   Add Firebase credentials to .env to enable persistence.\n');
    return null;
  }

  try {
    const serviceAccount = {
      type:                        'service_account',
      project_id:                  projectId,
      private_key_id:              process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key:                 privateKey.replace(/\\n/g, '\n'),
      client_email:                clientEmail,
      client_id:                   process.env.FIREBASE_CLIENT_ID,
      auth_uri:                    'https://accounts.google.com/o/oauth2/auth',
      token_uri:                   'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url:        process.env.FIREBASE_CLIENT_CERT_URL,
    };

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
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

/* Always safe — never throws, returns null when Firebase unavailable */
function getDB() {
  if (!tried) initFirebase();
  return db;
}

module.exports = { initFirebase, getDB };
