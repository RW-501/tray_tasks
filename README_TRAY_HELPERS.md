# Tray conversational helpers

Copy both files into `js/` and commit. `voice-assistant.js` imports `tray-helpers.js` as a module. No backend changes.

## What changed
- A deterministic, stateful water-activity conversation shared by voice and chat.
- Recognizes “i container” (speech-recognition variant of “1 container”), “now”, “5 mins ago”, HH:MM, AM/PM, yes/no/cancel.
- Computes actual local timestamps and writes to the existing `activityLogs` Firestore collection through `store.upsert` only after confirmation.
- Displays save failures and does not claim success if the write fails.
- Simple arithmetic helper for numeric expressions, with divide-by-zero handling.
- Other prompts still use existing Tray AI routing.

## Test
Say or type: `I drank water` → `i container` → `5 mins ago` → `yes`. Verify an activity record exists.

## Limitations
The pending conversation is held in memory for this page session. Other activity types and natural-language arithmetic are not yet covered. The recorded quantity is a container count, not a volume in ounces unless separately specified. This does not automatically update hydration goals.
