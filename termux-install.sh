#!/data/data/com.termux/files/usr/bin/bash
# One-time setup for running MyMusic on Android via Termux.
set -e
echo "== MyMusic — Termux setup =="

echo ">> Updating packages…"
pkg update -y && pkg upgrade -y

echo ">> Installing Node.js, Python, ffmpeg…"
pkg install -y nodejs python ffmpeg

echo ">> Installing yt-dlp…"
pip install --upgrade yt-dlp

echo ">> Installing app dependencies…"
cd "$(dirname "$0")/backend"
npm install

echo ""
echo "✅ Setup complete!"
echo "   Start the app with:   ./start.sh"
echo "   Then open Chrome to:  http://localhost:3000"
