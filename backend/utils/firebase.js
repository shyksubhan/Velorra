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

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "velorra",
        clientEmail: "firebase-adminsdk-fbsvc@velorra.iam.gserviceaccount.com",
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
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