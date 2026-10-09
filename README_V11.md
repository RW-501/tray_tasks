# V11 — Google, email and SMS sign-in

Configured owner UID: `KlvIvSRpWparxUGkj9AzV0VkZYn1` (from user-provided UID). Access is based on Firebase UID, **not email address or phone number**.

## Firebase Console steps
1. Authentication > Sign-in method: enable **Google**, **Email/Password**, and **Phone**.
2. Authentication > Settings > Authorized domains: add `rw-501.github.io` (and any custom host).
3. Phone sign-in requires reCAPTCHA, a real SMS-capable device, and may require Firebase billing/SMS region setup. Test on a real iPhone using Safari.
4. **Important:** Signing in independently with Google, email, or phone may create DIFFERENT Firebase UIDs. To use all methods with the SAME private data, link the Google, email/password, and phone credentials to the existing authorized Firebase user account using Firebase Auth account linking. Do not just add emails/phone numbers to an allowlist. The UI rejects any different UID.
5. Deploy `firestore.rules` and `storage.rules` only after checking that all your collections follow the single-level paths these templates cover. Backup your existing rules first. `firebase deploy --only firestore:rules,storage`.
6. If your Firebase Auth user UID differs from the configured one, update `js/private-config.js`, both rules files, and the Cloud Function `TRAY_OWNER_UID` environment setting consistently.
7. Upload frontend and hard refresh. Do not publish password, SMS codes, or service account credentials.

## Limitations
Google sign-in popup falls back to redirect where supported. Phone auth requires verification and reCAPTCHA. This update does not provide an in-app provider-linking flow; link credentials through an authenticated account-linking process first. Existing Cloud Function endpoints other than `privateLifeReview` still need auth hardening.
