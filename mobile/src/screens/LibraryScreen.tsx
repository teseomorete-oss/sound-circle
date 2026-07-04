import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Alert, ActionSheetIOS, Platform,
} from 'react-native';
import { api, Track } from '../api/client';
import { usePlayerStore } from '../store/player';
import TrackRow from '../components/TrackRow';
import { Ionicons } from '@expo/vector-icons';

export default function LibraryScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { playTrack, setQueue } = usePlayerStore();

  const load = useCallback(async () => {
    try {
      const data = await api.getTracks();
      setTracks(data);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showOptions = (track: Track) => {
    const options = ['Play', 'Download for offline', 'Remove from library', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, destructiveButtonIndex: 2 },
        (i) => handleOption(i, track),
      );
    }
  };

  const handleOption = async (index: number, track: Track) => {
    if (index === 0) {
      setQueue(tracks, tracks.indexOf(track));
      playTrack(track);
    } else if (index === 1) {
      try {
        await api.downloadTrack(track.id);
        Alert.alert('Downloaded', `"${track.title}" saved for offline listening`);
        load();
      } catch (e: any) {
        Alert.alert('Download failed', e.message);
      }
    } else if (index === 2) {
      Alert.alert('Remove track?', track.title, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await api.deleteTrack(track.id);
            setTracks((prev) => prev.filter((t) => t.id !== track.id));
          },
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#a855f7" />
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            showDownloadBadge
            onPress={() => {
              setQueue(tracks, index);
              playTrack(item);
            }}
            onLongPress={() => showOptions(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="library" size={48} color="#333" />
            <Text style={styles.emptyText}>No tracks yet</Text>
            <Text style={styles.emptySub}>Search for music to add it here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySub: { color: '#666', fontSize: 14 },
});
