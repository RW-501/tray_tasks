# Ron's Todo & Calendar — V1

Responsive personal productivity dashboard built with HTML, Bootstrap 5, vanilla JavaScript modules, and optional Firebase v9 Firestore.

## V1 features
- Responsive neon/dark dashboard inspired by the approved concept
- Week navigation and focus-day switching
- Add/edit/complete tasks
- Priority filters and global task search
- Day timeline generated from scheduled tasks
- Weekly progress calculations
- Goals, habits, notes and shopping lists
- LocalStorage demo mode so it works before Firebase setup
- Firebase v9 Firestore adapter
- Closed-by-default Firestore and Storage rules
- Node/Express OpenAI planning endpoint scaffold
- Mobile navigation and accessibility labels

## Run locally
ES modules require a local server. From the project folder run one of:

    npx serve .

or use VS Code Live Server.

## Connect Firebase
1. Create/select a Firebase project and add a Web App.
2. Enable Firestore.
3. Paste the Web App config into `js/firebase-config.js`.
4. V1 deliberately ships with Firestore rules closed. Before using Firebase, add Firebase Authentication and change the schema/rules to `/users/{uid}/...`.
5. Storage is scaffolded but intentionally closed until Auth is implemented.

## OpenAI / ChatGPT architecture
Never put an OpenAI API key in browser JavaScript. `functions/index.js` shows the server-side pattern. Set `OPENAI_API_KEY` only in your server environment and proxy `/api/plan-day` to that service. The browser currently uses a deterministic local planner so the dashboard remains functional without a paid API.

## Recommended V2
- Firebase Authentication (Google/email)
- User-scoped Firestore collections + security rules
- Firebase Storage attachments
- Real event CRUD and month/week calendar
- Drag/drop and task rescheduling
- Recurring tasks and rollover
- Notifications / PWA
- AI endpoint integration with structured JSON validation and explicit approval before writes
- Undo/delete, subtasks, dependencies, tags and saved filters
- Automated tests and CI deployment
