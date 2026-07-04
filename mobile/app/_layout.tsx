import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import MiniPlayer from '../src/components/MiniPlayer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#0f0f1a' }}>
          <Tabs
            screenOptions={{
              tabBarStyle: { backgroundColor: '#0f0f1a', borderTopColor: '#1a1a2e' },
              tabBarActiveTintColor: '#a855f7',
              tabBarInactiveTintColor: '#666',
              headerStyle: { backgroundColor: '#0f0f1a' },
              headerTintColor: '#fff',
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
                tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
                headerTitle: 'Home',
              }}
            />
            <Tabs.Screen
              name="search"
              options={{
                title: 'Search',
                tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="library"
              options={{
                title: 'Library',
                tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="playlists"
              options={{
                title: 'Playlists',
                tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
              }}
            />
          </Tabs>
          <MiniPlayer />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
