# Command Center V9 — Private Apple-first edition

## REQUIRED SETUP BEFORE DEPLOYING
1. In Firebase Authentication, enable Email/Password and create your private user. Copy the UID from Authentication > Users.
2. Replace REPLACE_WITH_YOUR_FIREBASE_AUTH_UID in js/private-config.js, firestore.rules, and storage.rules with the exact UID.
3. Deploy Firestore and Storage rules BEFORE putting financial data online. Use Firebase Console Rules tabs or `firebase deploy --only firestore:rules,storage` after configuring firebase.json appropriately. Do not use open test-mode rules.
4. Verify only your UID can read/write data. Firebase Web config is public by design; security is enforced by rules.
5. Upload the files to GitHub Pages. Sign in on each device; in iOS Safari Share > Add to Home Screen.

## Included
- Private Firebase email/password sign-in gate, no fallback to insecure local demo if Firebase auth fails.
- Owner-only Firestore and Storage rules templates.
- Responsive iPhone/iPad layout, touch-size controls, safe-area support, scrollable modal bodies.
- Installable web manifest / Apple standalone metadata.
- Existing V8 data and Firestore snapshot listeners retained.

## Important limitations
- No native iOS background microphone or push notifications. Browser voice support varies.
- Offline writes depend on Firebase client behavior; this version does NOT promise reliable offline-first writes or conflict resolution.
- The existing Cloud Function API is not authenticated by this change; restrict it separately before treating AI endpoints as private.
- The broad owner-only rules apply to existing top-level collections; review any other data paths before deployment.
- Do not include private passwords in source files.
