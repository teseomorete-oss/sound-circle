import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { api, YTResult } from '../api/client';
import { usePlayerStore } from '../store/player';
import TrackRow from '../components/TrackRow';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YTResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { playTrack } = usePlayerStore();

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.search(query.trim());
      setResults(data);
    } catch (e: any) {
      Alert.alert('Search failed', e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const addAndPlay = async (item: YTResult) => {
    try {
      const track = await api.addYouTubeTrack(item);
      playTrack(track);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const addToLibrary = async (item: YTResult) => {
    try {
      await api.addYouTubeTrack(item);
      Alert.alert('Added', `"${item.title}" added to library`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Search YouTube..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator color="#a855f7" style={{ marginTop: 32 }} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.youtube_id}
        renderItem={({ item }) => (
          <View style={styles.resultRow}>
            <TrackRow
              track={{ ...item, id: item.youtube_id, source: 'youtube', album: null, downloaded_path: null, created_at: 0 }}
              onPress={() => addAndPlay(item)}
            />
            <TouchableOpacity style={styles.addBtn} onPress={() => addToLibrary(item)}>
              <Ionicons name="add" size={22} color="#a855f7" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading && query.length > 0 ? (
            <Text style={styles.empty}>No results. Try a different search.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { paddingHorizontal: 16 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
});
