import { create } from 'zustand';
import { api, Song, Album } from '../api/client';

interface SocialState {
  likedSongs: Set<number>;    // deezer track ids
  likedAlbums: Set<number>;   // deezer album ids
  followed: Set<number>;      // deezer artist ids
  loaded: boolean;
  load: () => Promise<void>;
  toggleSong: (song: Song) => Promise<void>;
  toggleAlbum: (album: Album) => Promise<void>;
  toggleFollow: (artist: { deezer_id: number; name: string; picture: string | null }) => Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  likedSongs: new Set(),
  likedAlbums: new Set(),
  followed: new Set(),
  loaded: false,

  async load() {
    const [songs, albums, follows] = await Promise.all([
      api.getLikedSongs().catch(() => []),
      api.getLikedAlbums().catch(() => []),
      api.getFollowed().catch(() => []),
    ]);
    set({
      likedSongs: new Set(songs.map((s) => s.deezer_id).filter(Boolean) as number[]),
      likedAlbums: new Set(albums.map((a) => a.deezer_id)),
      followed: new Set(follows.map((f) => f.deezer_id).filter(Boolean) as number[]),
      loaded: true,
    });
  },

  async toggleSong(song) {
    const liked = new Set(get().likedSongs);
    if (liked.has(song.deezer_id)) {
      liked.delete(song.deezer_id);
      set({ likedSongs: liked });
      await api.unlikeSong(song.deezer_id).catch(() => {});
    } else {
      liked.add(song.deezer_id);
      set({ likedSongs: liked });
      await api.likeSong(song).catch(() => {});
    }
  },

  async toggleAlbum(album) {
    const liked = new Set(get().likedAlbums);
    if (liked.has(album.deezer_id)) {
      liked.delete(album.deezer_id);
      set({ likedAlbums: liked });
      await api.unlikeAlbum(album.deezer_id).catch(() => {});
    } else {
      liked.add(album.deezer_id);
      set({ likedAlbums: liked });
      await api.likeAlbum({ deezer_id: album.deezer_id, title: album.title, artist: album.artist, cover: album.cover }).catch(() => {});
    }
  },

  async toggleFollow(artist) {
    const followed = new Set(get().followed);
    if (followed.has(artist.deezer_id)) {
      followed.delete(artist.deezer_id);
      set({ followed });
      await api.unfollow(artist.deezer_id).catch(() => {});
    } else {
      followed.add(artist.deezer_id);
      set({ followed });
      await api.follow(artist).catch(() => {});
    }
  },
}));
