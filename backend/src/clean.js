// Turn raw YouTube titles into clean song titles.
// "Daft Punk - Harder, Better… (Official Video)" -> "Harder, Better…"
export function cleanTitle(title, artist) {
  if (!title) return title;
  let t = title
    .replace(/\((?:official|lyrics?|audio|music|video|hd|4k|visuali[sz]er|explicit|clip|mv|m\/v)[^)]*\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\bofficial\s+(?:music\s+)?video\b/gi, '')
    .replace(/\bofficial\s+audio\b/gi, '')
    .replace(/\s*[-–—]\s*topic\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-–—|]\s*$/, '')
    .trim();

  // Strip a leading "Artist - " prefix if it matches the track's artist.
  if (artist) {
    const esc = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`^\\s*${esc}\\s*[-–—:]\\s*`, 'i'), '').trim();
  }
  return t || title;
}
