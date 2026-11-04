// This tab-scoped marker identifies guest navigation; it never stores game progress.
const guestSessionKey = 'schale.guestSession';

/** Check whether this tab entered through the confirmed guest option. */
export function isGuestSession() {
  try { return sessionStorage.getItem(guestSessionKey) === '1'; }
  catch { return false; }
}

/** Begin guest access without creating a Firebase account or saving upgrades. */
export function startGuestSession() {
  sessionStorage.setItem(guestSessionKey, '1');
}

/** Return to account mode after a successful sign-in or registration. */
export function endGuestSession() {
  try { sessionStorage.removeItem(guestSessionKey); }
  catch { /* Storage may be disabled; an absent guest marker is already account mode. */ }
}
