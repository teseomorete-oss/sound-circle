import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/player';
import { useRouter } from 'expo-router';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, next, setPlaying } = usePlayerStore();
  const router = useRouter();

  if (!currentTrack) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={() => router.push('/player')}>
      {currentTrack.thumbnail ? (
        <Image source={{ uri: currentTrack.thumbnail }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist ?? 'Unknown'}</Text>
      </View>
      <TouchableOpacity onPress={() => setPlaying(!isPlaying)} style={styles.btn}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={next} style={styles.btn}>
        <Ionicons name="play-skip-forward" size={24} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  thumb: { width: 42, height: 42, borderRadius: 4 },
  thumbPlaceholder: { backgroundColor: '#333' },
  info: { flex: 1, marginHorizontal: 10 },
  title: { color: '#fff', fontSize: 14, fontWeight: '600' },
  artist: { color: '#aaa', fontSize: 12 },
  btn: { padding: 6 },
});
