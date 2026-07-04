// Deezer API — free, no key. Provides artist photos, albums, top tracks, and
// real square cover art. Playback itself still resolves to YouTube via yt-dlp.
const BASE = 'https://api.deezer.com';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Deezer ${res.status}`);
  return res.json();
}

export function mapTrack(t) {
  return {
    deezer_id: t.id,
    title: t.title_short ?? t.title,
    artist: t.artist?.name ?? null,
    artist_id: t.artist?.id ?? null,
    album: t.album?.title ?? null,
    album_id: t.album?.id ?? null,
    thumbnail: t.album?.cover_xl ?? t.album?.cover_big ?? t.album?.cover_medium ?? null,
    duration: t.duration ?? null,
  };
}

export function mapAlbum(a) {
  return {
    deezer_id: a.id,
    title: a.title,
    artist: a.artist?.name ?? null,
    artist_id: a.artist?.id ?? null,
    cover: a.cover_xl ?? a.cover_big ?? a.cover_medium ?? null,
    release_date: a.release_date ?? null,
    nb_tracks: a.nb_tracks ?? null,
  };
}

export function mapArtist(a) {
  return {
    deezer_id: a.id,
    name: a.name,
    picture: a.picture_xl ?? a.picture_big ?? a.picture_medium ?? null,
    nb_fan: a.nb_fan ?? null,
  };
}

export async function searchArtists(q, limit = 8) {
  const data = await get(`/search/artist?q=${encodeURIComponent(q)}&limit=${limit}`);
  return (data.data ?? []).map(mapArtist);
}

export async function searchTracks(q, limit = 20) {
  const data = await get(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return (data.data ?? []).map(mapTrack);
}

export async function searchAlbums(q, limit = 8) {
  const data = await get(`/search/album?q=${encodeURIComponent(q)}&limit=${limit}`);
  return (data.data ?? []).map(mapAlbum);
}

export async function getArtist(id) {
  return mapArtist(await get(`/artist/${id}`));
}

export async function artistTop(id, limit = 25) {
  const data = await get(`/artist/${id}/top?limit=${limit}`);
  return (data.data ?? []).map(mapTrack);
}

export async function artistAlbums(id, limit = 25) {
  const data = await get(`/artist/${id}/albums?limit=${limit}`);
  // Deezer returns newest first and includes many editions — dedupe by title.
  const seen = new Set();
  const out = [];
  for (const a of data.data ?? []) {
    const key = a.title.replace(/\s*\(.*?\)\s*/g, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(mapAlbum(a));
  }
  return out;
}

export async function getAlbum(id) {
  const a = await get(`/album/${id}`);
  return {
    ...mapAlbum(a),
    tracks: (a.tracks?.data ?? []).map((t) => ({
      ...mapTrack(t),
      // album cover isn't nested on album-track entries; inherit it
      thumbnail: a.cover_xl ?? a.cover_big ?? null,
      album: a.title,
      album_id: a.id,
      artist: t.artist?.name ?? a.artist?.name ?? null,
    })),
  };
}

// --- Discovery / suggestions (for a YT-Music-style feed) ---

export async function chartTracks(limit = 15) {
  const data = await get(`/chart/0/tracks?limit=${limit}`);
  return (data.data ?? []).map(mapTrack);
}

export async function chartArtists(limit = 12) {
  const data = await get(`/chart/0/artists?limit=${limit}`);
  return (data.data ?? []).map(mapArtist);
}

export async function newReleases(limit = 15) {
  const data = await get(`/editorial/0/releases?limit=${limit}`);
  return (data.data ?? []).map(mapAlbum);
}

export async function relatedArtists(id, limit = 12) {
  const data = await get(`/artist/${id}/related?limit=${limit}`);
  return (data.data ?? []).map(mapArtist);
}

// Endless "radio": a stream of similar tracks seeded from an artist. Deezer's
// /artist/{id}/radio returns a fresh mix of that artist + similar artists.
export async function artistRadio(id, limit = 25) {
  const data = await get(`/artist/${id}/radio?limit=${limit}`);
  return (data.data ?? []).map(mapTrack);
}

// Radio seeded from a single track's own artist, falling back to a text search.
export async function trackRadio({ artist_id, title, artist }, limit = 25) {
  let out = [];
  if (artist_id) out = await artistRadio(artist_id, limit).catch(() => []);
  if (out.length < 5 && (artist || title)) {
    out = await searchTracks(`${artist ?? ''} ${title ?? ''}`.trim(), limit).catch(() => []);
  }
  return out;
}

// Lightweight typeahead: a few artists + a few tracks for the search dropdown.
export async function suggest(q) {
  const [artists, tracks] = await Promise.all([
    searchArtists(q, 3).catch(() => []),
    searchTracks(q, 5).catch(() => []),
  ]);
  return { artists, tracks };
}
