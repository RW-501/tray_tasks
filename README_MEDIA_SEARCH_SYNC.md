# Tray Media Center: YouTube Search, Synced Playlists, Remote Playback

## Installation
Copy these files over the corresponding paths in your existing repository:
- `index.html`
- `js/media-center.js`
- `js/media-sync.js` (new)
- `js/voice-assistant.js`
- `js/store.js`
- `css/media-center.css`
- `functions/index.js`

This patch builds on the **Media Center Upgrade** and preserves the prior UI, media players and Tray integration. If you have modified those same files since that upgrade, merge changes instead of overwriting blindly. `functions/index.js` is based on the most recently supplied full repository and adds one new callable function.

## Required YouTube API setup
1. In Google Cloud Console for your Firebase project, enable **YouTube Data API v3**. Create an API key for this API. Keep the key server-side; do not put it in `index.html` or client JavaScript.
2. Run `firebase functions:secrets:set YOUTUBE_API_KEY` and enter your key.
3. Ensure `TRAY_OWNER_UID` is configured for the Functions runtime, matching your Firebase Auth user ID. The callable search rejects all other users. Existing private functions also depend on this variable. For Functions v2, use your existing runtime environment configuration method.
4. Run `firebase deploy --only functions:searchYouTubeMedia` from the repository root.
5. Deploy the static site to GitHub Pages. Hard refresh on each device.

## How it works
- Search YouTube from Media Center. The authenticated Cloud Function returns embeddable video search results, with a `Newest first` toggle. Click a result card to open the existing YouTube player.
- `mediaPlaylists` is a new collection in `js/store.js`, using the same private Firestore rules as other collections. Choose **New playlist**, play a video, then **Add playing video**. All signed-in devices sync playlist entries through the existing store listener. The original browser-local Saved items feature is retained separately.
- To send a video, select a registered device and click **Play on device**. The destination must have the updated app open, be signed in and registered, and receive the profile update. Remote commands expire after two minutes. Browsers may block automatic playback until the user interacts with the screen.
- Tray commands: `Find Sexyy Red on YouTube`, `Show me the latest Sexyy Red YouTube video`, `Play on my bedroom TV` (requires current video and matching device name).

## Limits and security
- YouTube search consumes API quota. Newest-first orders by upload date among search results; it does not prove an artist's official channel or the absolute newest official video.
- Videos with embed restrictions still cannot be played in the Command Center.
- Firestore rules must protect `mediaPlaylists` and `deviceProfiles` for the authenticated owner. The existing repository uses a collection wildcard owner-only rule; verify your deployed rules.
- Remote playback sends a request, not guaranteed autoplay or hardware power control. It does not report confirmed playback from the receiving device.
- `Play playlist` opens the first entry. Full automatic queue advancement is not included because it requires a properly initialized YouTube IFrame Player API and event handling.
- Browser testing and Firebase live integration testing are still required.
