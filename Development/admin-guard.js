import { getFirebaseAuth } from '../firebase-client.js';
import { isAdmin } from '../admin-access.js';

/** Reveal development content only after Firebase confirms the admin session. */
export async function requireAdmin() {
  const content = document.querySelector('#development-content');

  try {
    const { auth, sdk } = await getFirebaseAuth();

    return await new Promise(resolve => {
      sdk.onAuthStateChanged(auth, user => {
        const allowed = isAdmin(user);
        content.hidden = !allowed;

        if (!allowed) {
          window.location.replace(user ? '../project.html' : '../index.html');
        }

        resolve(allowed);
      }, () => {
        content.hidden = true;
        window.location.replace('../index.html');
        resolve(false);
      });
    });
  } catch {
    content.hidden = true;
    window.location.replace('../index.html');
    return false;
  }
}
