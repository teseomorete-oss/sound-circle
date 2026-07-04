# Run MyMusic entirely on your Android phone (Termux)

This runs the **whole app on your phone** — no laptop, works on any network
(Wi-Fi or mobile data). The phone does everything: UI, database, and fetching
audio with yt-dlp.

One `node` process serves the whole thing at `http://localhost:3000`.

---

## 1. Install Termux

Install **Termux from F-Droid** (NOT the Play Store — that version is old and broken):
👉 https://f-droid.org/packages/com.termux/

Open Termux and run each command below (paste, press Enter).

## 2. Install the tools

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs python ffmpeg
pip install -U yt-dlp
```

Check Node is 22.5 or newer (needed for the built-in database):

```bash
node --version
```

## 3. Get the app onto your phone

Transfer **`music-app-phone.zip`** (from your laptop) to your phone — AirDrop,
Google Drive, a USB cable, WhatsApp to yourself, whatever's easiest. Save it to
your **Downloads** folder.

Then in Termux:

```bash
termux-setup-storage        # tap "Allow" when prompted
cd ~
unzip ~/storage/downloads/music-app-phone.zip -d music-app
```

## 4. Install & run

```bash
cd ~/music-app/backend
npm install
npm start
```

You should see:

```
Serving web UI from /.../web/dist
Music backend running on http://0.0.0.0:3000
```

Leave Termux running.

## 5. Open the app

Open **Chrome** on your phone and go to:

```
http://localhost:3000
```

Then **Chrome menu (⋮) → "Add to Home screen"** — now it opens like a real app,
fullscreen, with an icon, and background/lock-screen playback works.

---

## Every time you want to use it

Open Termux and run:

```bash
cd ~/music-app/backend && npm start
```

(Then open the app from your home-screen icon.)

💡 To keep it running when Termux is in the background, install the Termux:Boot
add-on, or run `termux-wake-lock` before `npm start` so Android doesn't sleep it.

---

## Troubleshooting

- **`node: command not found`** → rerun `pkg install -y nodejs`.
- **`DatabaseSync is not a constructor` / sqlite error** → your Node is too old.
  Run `node --version`; it must be **22.5+**. Update with `pkg upgrade nodejs`.
- **Search/playback errors** → yt-dlp isn't installed or is outdated:
  `pip install -U yt-dlp` and make sure `ffmpeg` installed.
- **Downloads fail** → `pkg install -y ffmpeg`.
- **Port already in use** → close the other Termux session, or run
  `PORT=3001 npm start` and open `http://localhost:3001`.
- **App loads but is blank** → make sure you transferred the whole zip (it must
  contain both `backend/` and `web/dist/`).

## Notes

- First play of a brand-new song takes ~2–4s (yt-dlp contacts YouTube). Hovering
  isn't a thing on phones, but the top songs on artist/album pages are prewarmed.
- Everything is stored on the phone: your library, playlists, likes, downloads.
- It's a bit slower than a laptop but fully self-contained and private.
