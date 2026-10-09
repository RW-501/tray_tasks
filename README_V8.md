# Command Center V8 — additive upgrade

Deploy all files over V7 and push to GitHub Pages. No new AI endpoint is required.

## New
- Reconciliation modal compares manual account snapshots and shows tentative same-amount purchases within three days. All explanations require explicit classification and save.
- New `balanceExplanations` Firestore collection. Ensure Firestore security rules permit authorized access.
- Notes photo/video media library. Note pictures also appear in the existing Picture Board, though opening note-linked pictures from the task slideshow is not yet wired.
- Local JSON export (not an import). Media binaries are not bundled.
- Opt-out for device usage logging. This is local per device and does not erase existing logs.

## Known limits / security
- V8 does not infer account transactions from balance changes, reconcile transfers, or connect bank accounts. Never treat inferred matches as verified.
- Financial analytics are rule-based; no new AI reconciliation endpoint has been deployed.
- Multi-device sync needs Firestore permissions and an authenticated, appropriately restricted backend.
- Do not deploy to a public site with open Firestore read/write rules; account data and usage logs are sensitive.
- Browser speech recognition/wake phrase depends on the browser and microphone permissions.
- For a true installed phone experience, offline support, and background voice, a separately tested PWA/native phase is required.
