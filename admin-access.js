import {isSecondaryDeveloper} from './secondary-account.js';
// Shared UI access policy for the project screen and development previews.
export const adminUid = 'k8ncp3tED8YjjxoTXHlYBSoxcFW2';

/** Return whether the signed-in Firebase user is the designated developer. */
export function isAdmin(user) {
  return user?.uid === adminUid;
}

/** Content access is separate from primary-only Development access. */
export function hasAllContent(user){return isAdmin(user)||isSecondaryDeveloper(user);}
