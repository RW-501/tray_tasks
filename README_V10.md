# Command Center V10 — Private AI Life Review

## What is new
- Dedicated fullscreen modal for deep review of goals, projects, tasks, workouts, nutrition, or uploaded images.
- Image is resized on-device and sent only when you press Analyze.
- Optional checkbox shares a limited snapshot of tasks/goals/projects/habits/activity records.
- AI returns observations, suggested updates, and follow-up questions. **It does not save anything automatically.**
- New Firebase callable `privateLifeReview` requires authenticated owner UID **on the server**.

## Setup
1. Configure V9 owner UID in `js/private-config.js` and deploy V9 Firestore and Storage rules.
2. Set the Cloud Functions environment variable `TRAY_OWNER_UID` to that same UID **server-side**. Configure it in the Cloud Functions environment (not in GitHub Pages), and deploy the function. Do not put passwords or OpenAI keys in client files.
3. `firebase deploy --only functions:privateLifeReview`
4. Push updated frontend files to GitHub Pages.
5. Open the app and test with an authenticated account. Try an image and a text-only review.

## Known limitations / next priorities
- Existing V9 HTTP AI endpoints are not authenticated. Do not use them for sensitive data until migrated to verified callable functions.
- V10 recommendations are review-only; converting them to goal/task records remains a manual approval step.
- No background image scanning, automatic nutrition estimation, or medical diagnosis.
- The review request is sent to OpenAI through Firebase when submitted; avoid highly sensitive images or unnecessary personal details.
- The V10 module initializes or reuses the configured Firebase app and imports the existing store.
