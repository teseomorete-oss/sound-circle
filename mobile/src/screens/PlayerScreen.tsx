import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/player';
import { api } from '../api/client';
import { useRouter } from 'expo-router';

export default function PlayerScreen() {
  const { currentTrack, isPlaying, setPlaying, next, prev } = usePlayerStore();
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const router = useRouter();

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    });
  }, []);

  useEffect(() => {
    if (!currentTrack) return;
    loadAndPlay();
    return () => { soundRef.current?.unloadAsync(); };
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!soundRef.current) return;
    isPlaying ? soundRef.current.playAsync() : soundRef.current.pauseAsync();
  }, [isPlaying]);

  async function loadAndPlay() {
    if (!currentTrack) return;
    setLoading(true);
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: api.streamUrl(currentTrack.id) },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis ?? 0);
          setDuration(status.durationMillis ?? 0);
          if (status.didJustFinish) next();
        },
      );
      soundRef.current = sound;
      setPlaying(true);
    } catch (e) {
      console.error('Playback error', e);
    } finally {
      setLoading(false);
    }
  }

  function formatMs(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  if (!currentTrack) return null;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.chevron} onPress={() => router.back()}>
        <Ionicons name="chevron-down" size={28} color="#fff" />
      </TouchableOpacity>

      {currentTrack.thumbnail ? (
        <Image source={{ uri: currentTrack.thumbnail }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]}>
          <Ionicons name="musical-note" size={80} color="#444" />
        </View>
      )}

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>{currentTrack.title}</Text>
        <Text style={styles.artist}>{currentTrack.artist ?? 'Unknown Artist'}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: duration ? `${(position / duration) * 100}%` : '0%' }]} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatMs(position)}</Text>
        <Text style={styles.time}>{formatMs(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={prev}>
          <Ionicons name="play-skip-back" size={36} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playBtn} onPress={() => setPlaying(!isPlaying)}>
          {loading
            ? <ActivityIndicator color="#0f0f1a" />
            : <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#0f0f1a" />}
        </TouchableOpacity>
        <TouchableOpacity onPress={next}>
          <Ionicons name="play-skip-forward" size={36} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', alignItems: 'center' },
  chevron: { alignSelf: 'flex-start', padding: 16 },
  art: { width: 300, height: 300, borderRadius: 16, marginTop: 16 },
  artPlaceholder: { backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  meta: { marginTop: 32, paddingHorizontal: 32, width: '100%' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  artist: { color: '#aaa', fontSize: 16, marginTop: 6 },
  progressBar: { height: 4, backgroundColor: '#333', borderRadius: 2, width: '80%', marginTop: 24 },
  progressFill: { height: 4, backgroundColor: '#a855f7', borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between', width: '80%', marginTop: 6 },
  time: { color: '#666', fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 40, marginTop: 32 },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center',
  },
});
