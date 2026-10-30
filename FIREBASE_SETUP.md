# Firebase Authentication setup

1. Open [Firebase Console](https://console.firebase.google.com/), create or select a project, and register a **Web app**.
2. In **Project settings > General > Your apps**, copy the web app's configuration into `firebase-config.js`. Keep any additional configuration properties supplied by Firebase. Never paste a service-account key into browser code.
3. In **Authentication > Sign-in method**, enable **Email/Password**.
4. In **Authentication > Settings > Authorized domains**, add your deployment hostname and `localhost` for development if needed.
5. Serve this folder over HTTP, for example with VS Code Live Server or `python -m http.server 8000`. Open `http://localhost:8000` instead of double-clicking the HTML file.
6. Create an account and confirm it appears in **Authentication > Users**. Close the tab, reopen the site, and verify login with the same account. Also check incorrect passwords, duplicate registration, and direct access to `project.html` while signed out.

The app uses Firebase's modular browser SDK, email/password accounts, and tab-scoped session persistence. Successful registration or login opens the intentionally empty workspace. Names are saved to the Firebase user's display name when possible. Existing local-demo accounts are not Firebase accounts; register them again.

The workspace redirect is a navigation guard. When project data is added, protect it with Firebase Security Rules or server-side ID-token validation; browser redirects do not authorize data access.

Reference: [Firebase email/password authentication](https://firebase.google.com/docs/auth/web/password-auth), [browser SDK setup](https://firebase.google.com/docs/web/alt-setup).
