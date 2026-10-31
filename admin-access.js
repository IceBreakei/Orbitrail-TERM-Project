// Shared UI access policy for the project screen and development previews.
export const adminUid = 'k8ncp3tED8YjjxoTXHlYBSoxcFW2';

/** Return whether the signed-in Firebase user is the designated developer. */
export function isAdmin(user) {
  return user?.uid === adminUid;
}
