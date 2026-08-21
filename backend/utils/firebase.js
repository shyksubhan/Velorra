const admin = require('firebase-admin');

let db    = null;
let tried = false;

/**
 * Robustly resolves the Firebase private key from environment variables.
 * Supports THREE formats so it works regardless of how the hosting panel
 * (Hostinger, Render, etc.) stores the value:
 *
 * 1. FIREBASE_PRIVATE_KEY_B64  -> base64-encoded key (RECOMMENDED, most reliable)
 * 2. FIREBASE_PRIVATE_KEY      -> raw key with literal "\n" that needs replacing
 * 3. FIREBASE_PRIVATE_KEY      -> raw key with actual newlines already (Render-style)
 */
function resolvePrivateKey() {
  // 1. Prefer base64 version if present — this is immune to newline/quote mangling
  if (process.env.FIREBASE_PRIVATE_KEY_B64) {
    const decoded = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_B64, 'base64').toString('utf8');
    return decoded.trim();
  }

  // 2. Fallback to raw env var, handling both literal \n and real newlines
  let key = process.env.FIREBASE_PRIVATE_KEY || '';

  // Remove wrapping quotes if the panel added them
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }

  // Replace literal backslash-n with real newlines
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  return key.trim();
}

function initFirebase() {
  if (tried) return db;
  tried = true;

  if (admin.apps.length > 0) {
    db = admin.apps[0].firestore();
    db.settings({ ignoreUndefinedProperties: true });
    return db;
  }

  try {
    const privateKey = resolvePrivateKey();

    if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error(
        'Private key missing or malformed after parsing. ' +
        'Got length: ' + privateKey.length +
        '. Check FIREBASE_PRIVATE_KEY_B64 or FIREBASE_PRIVATE_KEY env vars.'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "velorra",
        clientEmail: "firebase-adminsdk-fbsvc@velorra.iam.gserviceaccount.com",
        privateKey: privateKey,
      })
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firebase Admin initialized — Project: velorra');
    return db;

  } catch (err) {
    console.warn('⚠️  Firebase init failed:', err.message);
    return null;
  }
}

function getDB() {
  if (!tried) initFirebase();
  return db;
}

module.exports = { initFirebase, getDB };
