# Prepared username backend - not deployed on Spark

Keep `usernameServiceEnabled=false` in account-service-config.js while on Spark. Email sign-in and client-side account editing/deletion work without Functions.

When the owner explicitly chooses Blaze later:
1. Install the functions dependencies and add a Firebase Functions source entry for this directory.
2. Deploy usernameLogin, claimUsername, getAccountProfile, deleteAccount and cleanupDeletedAccount. Use the Montreal region northamerica-northeast1.
3. Verify the runtime service account has least-privilege Firestore access, Firebase Authentication administration and permission to sign custom tokens (Service Account Token Creator on its own signer, not on unrelated accounts).
4. Verify callable login/username uniqueness/deletion and only then enable usernameServiceEnabled and deploy Hosting.

Usernames are case-insensitive 3-24 ASCII letters/numbers/underscores. Existing users sign in with email once and choose an available username in Account; display names remain independent and may be duplicated. Username-to-email resolution is server-only. There is no publicly readable email index. Passwords are transient POST inputs to Firebase Auth and are never stored or logged by this code. Login attempts are limited by a hash of client IP and username, with uniform credential-failure messages. Custom tokens are minted only after Firebase verifies the password.

Deletion requires a token authenticated in the last five minutes. The user-deletion trigger provides retryable cleanup of the save/profile/username reservation. All client access to username/profile/rate-limit collections remains denied by the deployed fallback rules; authenticated access happens via callables.
