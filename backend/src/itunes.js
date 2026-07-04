// iTunes Search API — free, no key. Gives real square album covers, clean
// track/artist/album metadata, and an artist's popular songs.
const BASE = 'https://itunes.apple.com';

function hi(artworkUrl) {
  // Upscale the 100x100 thumbnail to a crisp 600x600 cover.
  return artworkUrl ? artworkUrl.replace('100x100bb', '600x600bb') : null;
}

function mapSong(r) {
  return {
    title: r.trackName,
    artist: r.artistName,
    album: r.collectionName ?? null,
    thumbnail: hi(r.artworkUrl100),
    duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : null,
  };
}

// Best square cover + metadata for a single "artist - title" track.
export async function findCover(artist, title) {
  const term = encodeURIComponent(`${artist ?? ''} ${title}`.trim());
  try {
    const res = await fetch(`${BASE}/search?term=${term}&media=music&entity=song&limit=1`);
    const data = await res.json();
    const r = data.results?.[0];
    return r ? mapSong(r) : null;
  } catch {
    return null;
  }
}

// An artist's popular songs (relevance-ordered ≈ most popular first), deduped.
export async function artistTopSongs(name, limit = 25) {
  const term = encodeURIComponent(name);
  const res = await fetch(
    `${BASE}/search?term=${term}&entity=song&attribute=artistTerm&limit=${limit}`,
  );
  const data = await res.json();
  const seen = new Set();
  const songs = [];
  for (const r of data.results ?? []) {
    const key = r.trackName?.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    songs.push(mapSong(r));
  }
  return songs;
}

// Search for artists (for the browse/discover flow).
export async function searchArtists(query, limit = 10) {
  const term = encodeURIComponent(query);
  const res = await fetch(
    `${BASE}/search?term=${term}&entity=musicArtist&limit=${limit}`,
  );
  const data = await res.json();
  return (data.results ?? []).map((r) => ({
    name: r.artistName,
    genre: r.primaryGenreName ?? null,
  }));
}
