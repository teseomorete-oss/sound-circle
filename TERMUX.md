# Install Sound Circle on your Android phone (Termux)

This runs the whole app **on your phone** — no laptop needed, works on any
network, installs as a real full-screen app, and updates with one command.

## 1. Install Termux
Get **Termux** from **F-Droid** (recommended) — *not* the outdated Play Store
version. https://f-droid.org/en/packages/com.termux/

## 2. Install the tools (one time)

```bash
pkg update -y && pkg install -y git nodejs yt-dlp ffmpeg
```

## 3. Get the app (one time)

```bash
cd ~
git clone https://github.com/teseomorete-oss/sound-circle mymusic
cd mymusic
bash start.sh
```

The first `start.sh` installs the app's Node dependencies, then prints:
**"MyMusic running → open Chrome at http://localhost:3000"**. Leave Termux open.

## 4. Open & install the app
Open **Chrome** and go to:

```
http://localhost:3000
```

Because it's `localhost`, Chrome treats it as secure and lets you install it:
**⋮ menu → Install app** → you get a **Sound Circle icon** that opens
full-screen like a native app, with lock-screen controls.

## Everyday use
Open Termux → `cd ~/mymusic && bash start.sh` → open the Sound Circle icon.
To keep it alive in the background, run `termux-wake-lock` before `start.sh`
so Android doesn't kill it.

## Updating — the easy part
Whenever there's a new version, just:

```bash
cd ~/mymusic && bash update.sh
```

`update.sh` pulls the latest code from GitHub, installs any new deps, and
starts the app. **Your library, playlists, likes, downloads and stats are
untouched** — they live in `backend/data` and `backend/downloads`, which are
never part of the repo. No more broken download links.

## Notes
- First launch of a song takes ~2s (yt-dlp contacts YouTube once); then cached.
- Everything is local to your phone: library, playlists, likes, downloads,
  stats — and each device you install on keeps its own separate library/feed.
- No ads, no account, no subscription.
