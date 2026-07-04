# MyMusic — Personal Music App

## Prerequisites

- Node.js 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and on PATH: `brew install yt-dlp`
- Expo CLI: `npm install -g expo-cli`
- For iOS: Xcode + iOS Simulator or a physical device

---

## 1. Start the Backend

```bash
cd music-app/backend
npm install
npm start
```

The backend runs on `http://0.0.0.0:3000` (accessible on your home network).

---

## 2. Configure the Mobile App

Edit `mobile/src/api/client.ts` line 2:

```ts
export const BASE_URL = 'http://YOUR_COMPUTER_IP:3000/api';
```

Find your IP: `ipconfig getifaddr en0` (Mac) or `ip addr` (Linux).

---

## 3. Run the Mobile App

```bash
cd music-app/mobile
npm install
npx expo run:ios    # or run:android
```

> Expo Go won't work — you need a dev build because of `expo-av` native module.

---

## How to Use

### Feed (Home tab)
- Pull to refresh to check for new releases from artists you follow
- Shows: Recently Played, Library Suggestions, New from Artists

### Search tab
- Search YouTube, tap to play instantly
- Tap `+` to add a track to your library without playing

### Library tab
- All your saved tracks
- Long-press a track → Download for offline, Remove

### Playlists tab
- Tap `+` to create a playlist
- Long-press tracks in Library to add them to playlists

### Following Artists (feed new releases)
Use the backend API directly to follow an artist:

```bash
# Find the YouTube channel ID from a channel URL:
# https://www.youtube.com/@ArtistName -> get the channel ID with yt-dlp:
yt-dlp --print channel_id "https://www.youtube.com/@ArtistName"

# Then follow:
curl -X POST http://localhost:3000/api/artists \
  -H "Content-Type: application/json" \
  -d '{"name":"Artist Name","youtube_channel_id":"UCxxxxxx"}'
```

---

## File Structure

```
music-app/
├── backend/
│   ├── src/
│   │   ├── index.js       # Express server + cron
│   │   ├── db.js          # SQLite schema
│   │   ├── youtube.js     # yt-dlp wrapper
│   │   ├── feed.js        # Feed logic
│   │   └── routes/
│   │       ├── tracks.js
│   │       ├── playlists.js
│   │       ├── artists.js
│   │       └── feed.js
│   └── data/              # SQLite DB (auto-created)
│   └── downloads/         # Offline MP3s (auto-created)
└── mobile/
    ├── app/               # Expo Router screens
    ├── src/
    │   ├── api/client.ts  # API + types
    │   ├── store/player.ts # Playback state (Zustand)
    │   ├── components/    # MiniPlayer, TrackRow
    │   └── screens/       # Feed, Search, Library, Player, Playlists
    └── app.json
```
