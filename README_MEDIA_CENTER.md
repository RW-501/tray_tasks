# Tray Media Center — Installation

Replace `index.html`, `js/voice-assistant.js`, and `js/web-viewer.js`; add `js/media-center.js` and `css/media-center.css`. No Firebase data migration or backend deployment required.

The new sidebar **Media Center** opens a standalone player/reader. Paste a YouTube video, Spotify track/playlist, Twitch channel, Wikipedia article, or direct MP4/MP3 link. Save items locally and use Next to cycle through saved YouTube videos. Tray chat and voice commands use the same interpreter.

Important: This does not bypass iframe, DRM, CORS, or paywall restrictions. YouTube search/latest verification is not implemented without an authorized YouTube search backend. Supported embeds can still be disabled by their owners. Spotify playback can require sign-in. Picture-in-Picture is supported only for compatible native video. Saved items are local to this browser, not Firestore.

Suggested tests: open YouTube video URL; Wikipedia article; Spotify track; ask Tray `pause video`; close Media Center and confirm video stops; open a task and confirm task behavior unchanged.
