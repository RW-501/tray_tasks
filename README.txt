RON'S COMMAND CENTER V6 - INSTALL

Replace your deployed frontend with this structure:
  index.html
  css/style.css
  css/calendar-popup.css
  js/app.js
  js/store.js
  js/calendar-popup.js
  js/delete-manager.js
  js/firebase-config.js
  js/recurrence.js
  js/data.js

The functions/index.js file is included so your current Firebase Functions source stays with the project.
If your local functions/index.js already contains the newest Analyze Note code, keep that version or compare it with this copy before deploying.

WHAT V4 ADDS
- Close button + Settings in sidebar
- Settings modal with compact mode, sidebar preference, completed task visibility, slideshow setting
- Fullscreen expand/exit button on every dashboard widget
- Clickable http/https links in view modals and text-driven widgets
- Tasks can link to both Goals and Projects
- Shopping can link to Goal and/or Project, with quantity, cost, purchased status, totals
- Savings collection/widget with goal links, target, starting balance, transaction additions, progress calculations
- Complete Workout Builder with exercise rows, sets, reps, weight, notes, schedule, minutes, goal link
- Goal / Project / Workout / Savings / Shopping / Task detail views
- Timeline opens Task View first; Task View has Complete/Reopen + Edit
- Firestore realtime onSnapshot sync for all collections so multiple screens update without reload
- Task Picture Board with featured-picture selection and slideshow; clicking picture opens its linked task
- Hidden modal scrollbars and sticky modal footers
- Advanced search now supports linked projects
- Existing recurrence/calendar/delete systems retained

FIRESTORE
A new collection named "savings" is used. Firestore creates it automatically on the first saved tracker if your rules allow writes.
Existing documents remain backward compatible because new fields are optional.

FIREBASE STORAGE
Task picture uploads use your existing Firebase Storage integration. Make sure your Storage rules allow the signed-in/current app flow you are already using.

DEPLOY FRONTEND
From your GitHub project folder:
  git add .
  git commit -m "Command Center V4 upgrade"
  git push

Then hard refresh each house display once after GitHub Pages finishes deploying. After that, Firestore changes will update live without refreshing.

FIREBASE FUNCTION
If you change functions/index.js:
  firebase deploy --only functions

V5 PRODUCTIVITY INTELLIGENCE ADDITIONS
- activityLogs collection: actual occurrence history for tasks, shopping, workouts, work, sleep, school and habits
- dailyBlocks collection: supports multiple work/sleep/school/workout blocks on the same day
- dayPlans collection: realtime cached AI daily plan shared across displays
- Batched completion-time review (default every 3 actions; configurable to 2 or 3)
- Completion timestamps are marked pending until confirmed instead of pretending checkbox time is exact
- Automatic habit-pattern discovery from confirmed activity history
- Task title autocomplete based on prior tasks/shopping/activity frequency
- Activity Patterns widget: 30-day actions, tracked hours, common part of day, pending time confirmations
- Smart Reminder carousel: AI day plan, work/sleep/school blocks and open tasks
- AI day planner receives tasks + daily blocks + recent confirmed behavior
- Auto day-plan refresh uses a 10-minute cooldown to avoid excessive API calls
- Workout View has Log Workout action and contributes to activity history

NEW FIRESTORE COLLECTIONS
activityLogs
dailyBlocks
dayPlans
They are created automatically on first write if Firestore rules permit them.

IMPORTANT: functions/index.js changed for the richer planner payload. Deploy it with:
  firebase deploy --only functions

V6 PRODUCTIVITY ANALYTICS + TRAY VOICE ASSISTANT
================================================
New files:
- js/analytics.js
- js/voice-assistant.js

New workspace screens:
- Productivity Analytics: 7/30/90-day KPIs, activity heatmap, time-of-day distribution, activity-type distribution, repeated behaviors, schedule drift, tracked sleep/work totals, and optional AI observations.
- Tray Assistant: text + browser voice recognition, browser speech synthesis talk-back, wake phrase, listening schedule, conversational follow-up questions, and confirm-before-save suggested actions.

Voice privacy/behavior:
- Voice is OFF by default.
- Enabling voice may prompt for browser microphone permission.
- Wake phrase defaults to "Hey Tray".
- Scheduled listening defaults to 07:00-22:00 and is configurable per display.
- The UI always shows the current microphone/listening state.
- Browser speech recognition is device/browser dependent and is designed for an open Command Center tab, not hidden background surveillance.
- Assistant-proposed records are not written until the user clicks the suggested action.

Backend routes added:
POST /api/productivity-insights
POST /api/assistant-chat

DEPLOY V6
1. Replace the site files with this package.
2. Commit/push the frontend to GitHub Pages.
3. Run: firebase deploy --only functions
4. Hard refresh each Command Center display once after deployment.
