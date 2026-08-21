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
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvjsil+U0a1uDV\nv+bJTwrXZXgcyUwpv4cx6Q1V06d4KQZg+jVTJrwcXtD24JGv4E/9yyZy7wuSo3zD\ne9Z3/jsbvgh0k/wOlYd/QtMSc+fgSKAUptopwlykhNCPOzBRcwr2vT4P2JJDRq93\nGTYxsq1YMSTg/EP6kfR4/A1PoFcIrDM5ZThr2KVqziL4Wun4TI6Ab4hsoZynQ8NO\nahXPFmb7yfY6rpaIzTAgiRDXLqQHhySuQtDaWCYWSnQMEHH96FC+srU/XZ/I6JSk\nTRuxj7YZ4xcRKTuhYsG1+nYrcmM5IFbTfULjIDt9HHtZrImxjbf+R7nVE4+v6B6i\n26Q0Pvw9AgMBAAECggEAPT+a6DD0gh8inOBRM72UYjaf86cVH+GW2MZepSltHYJu\nm8nfbc2vRlScIe2SVmJzde940BNvHa9VGVxspDt5wsGHcKiqgSoQ9kjJm//9D2Y3\nF01pArWxHaLKopX7UwdIdXHro5qi2L7h+7K7khYs3P50R9wrGVHvkYAaYsPlaXwa\nYrXgy/Q9QwqwF2bzh2j5S4wa7hGqJupjXC8Qrfc2lAxS7fAePjVcWiWfRd+Mg+r5\n+AD0dLguaniXm7H5mzUcv23GJgxSrydAPREFYc+ngPOo1JzPpBXC/L/RBcnlx3nv\nxCQzg16+zlbtoeoSqNItC570ULURbcv1w1S4ha7HrwKBgQDeJgxhbIJ8YIbVfz3T\nAuNkI81ewCnj495dRr4lC4zRzhOA4TZlFi/H09c0S9Zt//Z+QqUekWDEXSFq5iSM\n0sopSV9wjjOMbZ8i9lDB50MyV2VCcP/R4DhvWriMgm0Q74JvJ04tzYUI+GS8l0y6\n5sVt4IxD7oY+RwRrFCde7JZ46wKBgQDKTz08K4AWoVAYjWU6lN6uOLjdHcvpGlGg\n07igpc0OrF+AeF2MnzV+NItf8f1R6LDp7HWaQt5M37cJ6t7o2wh6eTiroMuozmz+\na52/U53eqX5l/yDFseZueeG+bJbRXjoaae36q9p3WOoySRNnGn3KSgZ0aN+wOOoF\nZluvtsSVdwKBgBcE7E2AF/lZaz9eQwLFjtiGmTZTRUP3Dciulu9xxfLLntvA+oj5\nBpR3UBp8LUkSt/EXaNLFD7jpSZgxJuJsyUQD9V7NbWwEw/O0gGPHWgAybCy5Vtjh\nmhd32B2/OhwCJYrtEL3QSRPH4XBlYS8Q0K51ETPM2J5Fb6DE4tuEOodnAoGAW4Wd\nXisPty0i3viYYvgWBRsEBoQES1/sraUaURKwwYKZcbUCHSupN37tzmna/8MUxb6D\nNVYq2vwaAhKO5SixnTZZvMrxV1yLUk28/2EEekaTN/FDEix44mGhDlRxpiXKg0iI\nsG4uVu+Sg00ryejiHzF92gvXphEZTXgQ4lz8ceECgYEAzFZ5AMOnbS6XlxBVSXsx\nhiMtXobWxZ4UcaK4WbmCJO3JWR19YoWYxFpJRexnybkt5VDmaqz4DLcjl/gGQU0j\nv/8yzQdOIy0/xzCjxcYWPuglZVOhFAPUgGFALpst/3TzkEx+LqzeROtnzqlw4xBx\nm0FLog00p2gvlTV7mWeNnz4=\n-----END PRIVATE KEY-----\n",
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