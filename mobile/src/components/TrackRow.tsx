import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../api/client';

interface Props {
  track: Track;
  onPress: () => void;
  onLongPress?: () => void;
  showDownloadBadge?: boolean;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackRow({ track, onPress, onLongPress, showDownloadBadge }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} onLongPress={onLongPress}>
      {track.thumbnail ? (
        <Image source={{ uri: track.thumbnail }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="musical-note" size={20} color="#666" />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {track.artist ?? 'Unknown'}
          {track.duration ? `  ·  ${formatDuration(track.duration)}` : ''}
        </Text>
      </View>
      {showDownloadBadge && track.downloaded_path && (
        <Ionicons name="arrow-down-circle" size={16} color="#4ade80" style={{ marginRight: 8 }} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thumb: { width: 48, height: 48, borderRadius: 4, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: '#2a2a3e', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '500' },
  sub: { color: '#888', fontSize: 13, marginTop: 2 },
});
