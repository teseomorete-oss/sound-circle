# MyMusic — Web App

A web frontend for your personal music app. Talks to the same backend as the
(future) mobile app — no ads, no accounts, all self-hosted.

## Prerequisites

- Node.js 18+ (tested on Node 24)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) on PATH for YouTube search/stream/download:
  `brew install yt-dlp`

## Run

**1. Start the backend** (in one terminal):

```bash
cd ../backend
npm install
npm start          # http://localhost:3000
```

**2. Start the web app** (in another terminal):

```bash
npm install
npm run dev        # http://localhost:5173
```

Vite proxies `/api/*` to the backend automatically (see `vite.config.ts`), so
nothing else to configure for local use.

## Pages

| Page          | What it does                                                        |
|---------------|--------------------------------------------------------------------|
| **Home**      | Your feed: recently played, library suggestions, new releases      |
| **Search**    | Search YouTube → ▶ to play, ＋ to save to library                   |
| **Library**   | Saved tracks → play, add to playlist, download offline, remove     |
| **Playlists** | Create playlists, open to play all / manage tracks                 |
| **Following** | Follow artists (by YouTube channel ID) to get new releases in feed |

Playback uses the browser's native `<audio>`, streaming from the backend
(`/api/tracks/:id/stream`), which redirects to the YouTube audio URL or serves a
downloaded MP3 if you've saved it offline.

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

For production, set `BASE_URL` in `src/api/client.ts` to your backend's URL
(instead of the dev proxy), or serve `dist/` behind the same origin as the backend.

## Notes

- The backend is shared with the planned mobile app — both hit the same API.
- yt-dlp is required at runtime for anything YouTube-related. Without it, the app
  still runs but search/stream/download will error.
