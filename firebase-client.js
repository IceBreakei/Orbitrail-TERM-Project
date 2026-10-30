import { firebaseConfig } from './firebase-config.js';

let authPromise;

/** Load Firebase once and share the same Authentication instance across callers. */
export function getFirebaseAuth() {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];

  if (requiredFields.some(field => !firebaseConfig[field]?.trim())) {
    const error = new Error('Firebase web configuration is missing.');
    error.code = 'app/missing-config';
    return Promise.reject(error);
  }

  if (!authPromise) {
    authPromise = initializeAuthentication().catch(error => {
      // Allow another attempt after a temporary SDK download or startup failure.
      authPromise = undefined;
      throw error;
    });
  }

  return authPromise;
}

/** Download the modular SDK and initialize Firebase with the web app settings. */
async function initializeAuthentication() {
  const [appSdk, sdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')
  ]);

  const app = appSdk.initializeApp(firebaseConfig);
  const auth = sdk.getAuth(app);

  // Keep the user signed in for this browser tab, including page navigation.
  await sdk.setPersistence(auth, sdk.browserSessionPersistence);

  return { auth, sdk };
}
