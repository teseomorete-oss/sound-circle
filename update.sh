#!/data/data/com.termux/files/usr/bin/bash
# Update Sound Circle to the latest version, then start it.
# Your library (backend/data) and downloads are kept — they're gitignored.
cd "$(dirname "$0")"

echo "Fetching the latest version…"
git pull --ff-only || { echo "Update failed (local changes?). Try: git stash && bash update.sh"; exit 1; }

# Install any new backend deps if package.json changed
cd backend && npm install --no-audit --no-fund

cd ..
exec bash start.sh
