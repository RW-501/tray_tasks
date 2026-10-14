# Tray chat / voice integration patch

Replace index.html and js/voice-assistant.js, and add css/tray-dock.css.

- Tray floating chat is always available, even outside Assistant screen. Hide it by closing the panel; its bubble remains.
- Voice transcripts and replies appear in both full Assistant chat and floating chat.
- Local layout, web, activity and remote commands use the same send pipeline as typed chat.
- AI-proposed record mutations still require clicking their action confirmation in full Assistant screen. This is intentional.
- Navigation commands depend on actual navigation selectors; missing destinations return an error instead of pretending to navigate.
- Requires browser microphone permission and supported Web Speech API.
- This patch does not add background microphone support after the tab is closed or bypass browser restrictions.
