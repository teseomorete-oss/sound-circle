#!/data/data/com.termux/files/usr/bin/bash
# Start the MyMusic server. Open http://localhost:3000 in Chrome afterwards.
cd "$(dirname "$0")/backend"

# Install deps on first run if missing
[ -d node_modules ] || npm install

echo "MyMusic running → open Chrome at http://localhost:3000"
echo "(Keep this Termux session open while listening. Ctrl+C to stop.)"

# node:sqlite needs the --experimental-sqlite flag on older Node versions
if node -e "require('node:sqlite')" >/dev/null 2>&1; then
  exec node src/index.js
else
  exec node --experimental-sqlite src/index.js
fi
