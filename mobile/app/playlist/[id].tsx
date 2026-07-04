import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, Track } from '../../src/api/client';
import { usePlayerStore } from '../../src/store/player';
import TrackRow from '../../src/components/TrackRow';
import { Ionicons } from '@expo/vector-icons';

export default function PlaylistDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [tracks, setTracks] = useState<Track[]>([]);
  const { playTrack, setQueue } = usePlayerStore();

  useEffect(() => {
    api.getPlaylistTracks(id).then(setTracks).catch(console.error);
  }, [id]);

  const remove = (track: Track) => {
    Alert.alert('Remove?', track.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await api.removeFromPlaylist(id, track.id);
          setTracks((prev) => prev.filter((t) => t.id !== track.id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{name}</Text>
      {tracks.length > 0 && (
        <TouchableOpacity style={styles.playAll} onPress={() => { setQueue(tracks, 0); playTrack(tracks[0]); }}>
          <Ionicons name="play" size={18} color="#0f0f1a" />
          <Text style={styles.playAllText}>Play All</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            showDownloadBadge
            onPress={() => { setQueue(tracks, index); playTrack(item); }}
            onLongPress={() => remove(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No tracks in this playlist yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { color: '#fff', fontSize: 24, fontWeight: '700', padding: 16 },
  playAll: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#a855f7', marginHorizontal: 16, marginBottom: 8,
    paddingVertical: 12, borderRadius: 12, justifyContent: 'center',
  },
  playAllText: { color: '#0f0f1a', fontWeight: '700', fontSize: 16 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60 },
});
