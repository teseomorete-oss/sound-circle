# Install MyMusic on your Android phone (Termux)

This runs the whole app **on your phone** — no laptop needed, works on any
network, and installs as a real full-screen app.

## 1. Install Termux
Get **Termux** from **F-Droid** (recommended) or GitHub — *not* the outdated
Play Store version. https://f-droid.org/en/packages/com.termux/

## 2. Copy the app onto your phone
Transfer `music-app-termux.zip` to your phone (USB, Google Drive, email…),
then in Termux:

```bash
pkg install -y unzip           # if needed
termux-setup-storage           # allow storage access, then:
cd ~
unzip /sdcard/Download/music-app-termux.zip -d mymusic
cd mymusic
```

(Adjust the path if your file landed somewhere other than Download.)

## 3. Set it up (one time)

```bash
bash termux-install.sh
```

This installs Node.js, Python, ffmpeg and yt-dlp, and the app's dependencies.
Takes a few minutes.

## 4. Start it

```bash
bash start.sh
```

Leave this Termux screen open while you listen.

## 5. Open & install the app
Open **Chrome** on the phone and go to:

```
http://localhost:3000
```

Because it's `localhost`, Chrome treats it as secure and lets you install it:
**⋮ menu → Install app** → you get a **MyMusic icon** on your home screen that
opens full-screen like a native app, with lock-screen controls.

## Everyday use
- Open Termux → `cd ~/mymusic && bash start.sh` → open the MyMusic app icon.
- To keep it alive in the background, install **Termux:Boot** or run
  `termux-wake-lock` before `start.sh` so Android doesn't kill it.

## Notes
- First launch of a song still takes ~2s (yt-dlp contacts YouTube once); after
  that it's cached.
- Everything is local to your phone: your library, playlists, likes, downloads.
- No ads, no account, no subscription.
