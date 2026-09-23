const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");
const path = require("path");

/**
 * Resolve Firebase Admin credentials securely from multiple potential sources:
 * 1. Environment variable path in GOOGLE_APPLICATION_CREDENTIALS
 * 2. Environment variable path or JSON in FIREBASE_SERVICE_ACCOUNT_KEY
 * 3. Environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * 4. Local service account JSON files in Backend root
 * 5. Downloaded service account JSON file from project setup
 */
function resolveCredential() {
  // 1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) {
      try {
        const sa = JSON.parse(fs.readFileSync(credPath, "utf8"));
        return admin.cert(sa);
      } catch (err) {
        console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS JSON:", err.message);
      }
    }
  }

  // 2. FIREBASE_SERVICE_ACCOUNT_KEY env var (raw JSON string or file path)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if (raw.startsWith("{")) {
      try {
        const sa = JSON.parse(raw);
        return admin.cert(sa);
      } catch (err) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY string:", err.message);
      }
    } else {
      const credPath = path.resolve(raw);
      if (fs.existsSync(credPath)) {
        try {
          const sa = JSON.parse(fs.readFileSync(credPath, "utf8"));
          return admin.cert(sa);
        } catch (err) {
          console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY file:", err.message);
        }
      }
    }
  }

  // 3. Individual environment variables
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }

  // 4. Local serviceAccountKey.json or firebase-service-account.json in Backend root
  const localCandidates = [
    path.join(__dirname, "../../serviceAccountKey.json"),
    path.join(__dirname, "../../firebase-service-account.json"),
    path.join(__dirname, "../../firebase-adminsdk.json"),
  ];

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const sa = JSON.parse(fs.readFileSync(candidate, "utf8"));
        return admin.cert(sa);
      } catch (err) {
        console.error(`Failed to parse ${candidate}:`, err.message);
      }
    }
  }

  // 5. Downloaded service account JSON file from initial setup
  const downloadsPath = "/Users/Apple/Downloads/ticketing-system-auth-app-firebase-adminsdk-fbsvc-628e22ea5a.json";
  if (fs.existsSync(downloadsPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(downloadsPath, "utf8"));
      return admin.cert(sa);
    } catch (err) {
      console.error("Failed to parse downloaded service account file:", err.message);
    }
  }

  // 6. Application default credentials fallback
  try {
    return admin.applicationDefault();
  } catch (err) {
    console.warn("Could not load application default credentials:", err.message);
  }

  return null;
}

const { getApps, initializeApp, getApp } = require("firebase-admin/app");

// Initialize Firebase Admin if not already initialized
let app;
const apps = getApps();
if (apps.length === 0) {
  const credential = resolveCredential();
  const options = {
    projectId: process.env.FIREBASE_PROJECT_ID || "ticketing-system-auth-app",
  };

  if (credential) {
    options.credential = credential;
  }

  app = initializeApp(options);
} else {
  app = getApp();
}

const authInstance = getAuth(app);

// Attach compatibility wrapper so both admin.auth().* and getAuth(app).* work seamlessly
admin.auth = () => authInstance;
admin.app = () => app;

module.exports = {
  admin,
  auth: authInstance,
  app,
};
