import { requireAdmin } from './admin-guard.js';

// Keep this hub hidden until the Firebase admin check completes.
await requireAdmin();
