import { getFirebaseAuth } from './firebase-client.js';
import { startGuestSession, endGuestSession } from './guest-session.js';

// Cache the form elements used by the authentication controls.
const form = document.querySelector('#auth-form');
const password = document.querySelector('#password');
const message = document.querySelector('#message');
const submit = form.querySelector('[type="submit"]');
const guestButton = document.querySelector('#continue-as-guest');
const guestDialog = document.querySelector('#guest-confirmation');
let registering = false;


/** Switch between login and registration, updating fields and button labels. */
function toggleAuthMode() {
  registering = !registering;
  document.querySelector('#name-field').hidden = !registering;
  document.querySelector('#name').required = registering;
  document.querySelector('#password-hint').hidden = !registering;
  password.minLength = registering ? 8 : 1;
  password.autocomplete = registering ? 'new-password' : 'current-password';
  document.querySelector('#form-title').textContent = registering
    ? 'Create an account'
    : 'Welcome back, Sensei';
  document.querySelector('#form-description').textContent = registering
    ? 'Create your Sensei profile.'
    : 'Log in to continue.';
  document.querySelector('#submit-label').textContent = registering
    ? 'Create account'
    : 'Log in';
  document.querySelector('#switch-prompt').textContent = registering
    ? 'Already have an account?'
    : "Don't have an account?";
  document.querySelector('#switch-mode').textContent = registering
    ? 'Log in'
    : 'Create an account';
  document.title = registering
    ? 'Schale | Create account'
    : 'Schale | Log in';
  message.textContent = '';
  password.value = '';
}

/** Show or hide the password and update the button's accessible state. */
function togglePasswordVisibility(event) {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  event.currentTarget.textContent = visible ? 'Hide' : 'Show';
  event.currentTarget.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  event.currentTarget.setAttribute('aria-pressed', String(visible));
}

/** Translate Firebase failures into useful messages without exposing raw errors. */
function getAuthErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'This email already has an account. Please log in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/invalid-credential': 'Email or password is incorrect. Please try again.',
    'auth/user-not-found': 'Email or password is incorrect. Please try again.',
    'auth/wrong-password': 'Email or password is incorrect. Please try again.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/password-does-not-meet-requirements': 'Your password does not meet the account password policy.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Unable to connect. Check your internet connection.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'Email/password sign-in must be enabled in Firebase Console.',
    'auth/invalid-api-key': 'Firebase configuration is invalid. Check firebase-config.js.',
    'app/missing-config': 'Add your Firebase web configuration to firebase-config.js first.'
  };

  return messages[error.code] || 'Authentication is unavailable. Please try again later.';
}

/** Register or sign in through Firebase, then open the empty project workspace. */
async function handleAuthSubmit(event) {
  event.preventDefault();
  message.textContent = '';

  const email = document.querySelector('#email').value.trim();
  const name = document.querySelector('#name').value.trim();
  const switchButton = document.querySelector('#switch-mode');

  if (registering && !name) {
    message.textContent = 'Please enter your Sensei name.';
    return;
  }

  // Prevent mode changes or repeated submissions while authentication is pending.
  submit.disabled = true;
  guestButton.disabled = true;
  switchButton.disabled = true;
  form.setAttribute('aria-busy', 'true');

  try {
    const { auth, sdk } = await getFirebaseAuth();

    if (registering) {
      const credential = await sdk.createUserWithEmailAndPassword(
        auth,
        email,
        password.value
      );

      // Account creation already signs the user in. A profile error must not
      // suggest that registration failed and prompt duplicate registrations.
      try {
        await sdk.updateProfile(credential.user, { displayName: name });
      } catch {
        console.warn('Account created; display name could not be saved.');
      }
    } else {
      await sdk.signInWithEmailAndPassword(auth, email, password.value);
    }

    password.value = '';
    endGuestSession();
    window.location.assign('project.html');
  } catch (error) {
    message.textContent = getAuthErrorMessage(error);
  } finally {
    submit.disabled = false;
    guestButton.disabled = false;
    switchButton.disabled = false;
    form.removeAttribute('aria-busy');
  }
}

// Connect the page controls to their event handlers.
document.querySelector('#switch-mode').addEventListener('click', toggleAuthMode);
document.querySelector('.reveal').addEventListener('click', togglePasswordVisibility);
form.addEventListener('submit', handleAuthSubmit);

/** Ask before entering an unsaved guest session; Cancel and Escape keep the login page. */
guestButton.addEventListener('click', () => {
  guestDialog.returnValue = '';
  guestDialog.showModal();
});
guestDialog.addEventListener('close', () => {
  if (guestDialog.returnValue !== 'continue') return;
  try {
    startGuestSession();
    window.location.assign('project.html');
  } catch {
    message.textContent = 'Guest access needs session storage. Allow it in your browser and try again.';
  }
});

/** Right-click dismisses the guest confirmation just like Cancel. */
guestDialog.addEventListener('pointerdown', event => {
  if (event.button !== 2) return;
  event.preventDefault();
  event.stopPropagation();
  guestDialog.close('cancel');
});
guestDialog.addEventListener('contextmenu', event => event.preventDefault());
