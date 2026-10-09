# Command Center V7

Unzip into your existing project, preserving the css/, js/, and functions/ folders. V7 adds `js/v7-upgrades.js` and changes `index.html`, `js/app.js`, `js/store.js`, `css/style.css`.

## New data
Firestore collections: `accounts`, `accountHistory`, `usageLogs`. Existing shopping purchases remain in `shopping` with `purchased=true`, excluded from the open list; historical records remain accessible in Spending History. Financial forecasts use records in `dayPlans` with `kind='forecast'`.

## Deployment
Commit and push the static files. Firestore security rules must permit authenticated access to the three new collections. Do not open these collections to the public. No backend Cloud Function change is required for V7's manual balance tracking.

## Behavior
Habit creation generates/updates a recurring task with a stable `habit-task-<id>` ID. Existing habits are migrated automatically. Overdue one-time tasks are raised from Low to Medium or Medium to High once per overdue date. Financial account snapshots record before/after differences and an optional explanation; differences are not automatically classified as spending/income. Estimated net worth includes only accounts you entered. No bank feeds are connected. Usage logging records app interactions but not GPS location, IP addresses, or sensitive typed content. Analytics and Tray Assistant use fullscreen Bootstrap modals.

## Known limitations
This build is a feature implementation, not an end-to-end deployment test. Confirm Firestore rules, Storage rules, cross-device permissions, and browser behavior on your devices before relying on it. Notes attachments use Firebase Storage and require Storage permissions. Historical spending dates on previously purchased items may be absent. Usage records are event logs, not precise active-attention measurements. Savings and account balances are separate records; do not add both together as assets unless reconciled.
