import { NavigateFunction } from 'react-router-dom';
import { api } from '../api/client';

// Open an artist's page directly. If we already have the Deezer id, go straight
// there; otherwise resolve the name via Deezer, falling back to search.
export async function openArtist(navigate: NavigateFunction, name: string | null, artistId?: number | null) {
  if (!name) return;
  if (artistId) { navigate(`/artist/${artistId}`); return; }
  try {
    const results = await api.searchArtists(name);
    if (results[0]?.deezer_id) { navigate(`/artist/${results[0].deezer_id}`); return; }
  } catch {}
  navigate(`/search?q=${encodeURIComponent(name)}`);
}
