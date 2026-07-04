import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { api, FeedSection, Track } from '../api/client';
import { usePlayerStore } from '../store/player';
import TrackRow from '../components/TrackRow';

export default function FeedScreen() {
  const [sections, setSections] = useState<FeedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { playTrack, setQueue } = usePlayerStore();

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        await api.refreshFeed();
      }
      const data = await api.getFeed();
      setSections(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const playSection = (items: Track[], index: number) => {
    setQueue(items, index);
    playTrack(items[index]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (!sections.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Your feed is empty.</Text>
        <Text style={styles.emptySub}>Search for music, follow artists, and start listening.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#a855f7" />
      }
    >
      {sections.map((section) => (
        <View key={section.type} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              showDownloadBadge
              onPress={() => playSection(section.items, i)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, backgroundColor: '#0f0f1a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySub: { color: '#888', fontSize: 14, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 12 },
});
