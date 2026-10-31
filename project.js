import { getFirebaseAuth } from './firebase-client.js';
import { isAdmin } from './admin-access.js';

const developmentLink = document.querySelector('#development-link');

/** Wait for Firebase to restore the session before allowing workspace access. */
async function requireSignIn() {
  try {
    const { auth, sdk } = await getFirebaseAuth();

    sdk.onAuthStateChanged(auth, user => {
      developmentLink.hidden = !isAdmin(user);
      if (!user) {
        window.location.replace('index.html');
      }
    }, () => {
      developmentLink.hidden = true;
      window.location.replace('index.html');
    });
  } catch {
    // Keep the workspace visually empty; setup and login happen on index.html.
    window.location.replace('index.html');
  }
}

requireSignIn();
