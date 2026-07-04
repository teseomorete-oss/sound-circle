import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, TextInput, Modal, RefreshControl,
} from 'react-native';
import { api, Playlist } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setPlaylists(await api.getPlaylists());
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      await api.createPlaylist(newName.trim());
      setNewName('');
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={playlists}
        keyExtractor={(p) => p.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#a855f7" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id, name: item.name } })}
          >
            <View style={styles.icon}>
              <Ionicons name="musical-notes" size={22} color="#a855f7" />
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list" size={48} color="#333" />
            <Text style={styles.emptyText}>No playlists yet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor="#666"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={create}>
                <Text style={styles.create}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  icon: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  name: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: '#fff', fontSize: 18 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: { backgroundColor: '#0f0f1a', color: '#fff', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  cancel: { color: '#888', fontSize: 16 },
  create: { color: '#a855f7', fontSize: 16, fontWeight: '700' },
});
