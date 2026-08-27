import { router, usePathname } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';

const tabs = [
  {
    label: 'Home',
    icon: '🏠',
    route: '/',
  },
  {
    label: 'Map',
    icon: '🗺️',
    route: '/map',
  },
  {
    label: 'Report',
    icon: '➕',
    route: '/report',
  },
  {
    label: 'Profile',
    icon: '👤',
    route: '/profile',
  },
];

export default function AppTabs() {
  const pathname = usePathname();
  const isDark = useColorScheme() === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const isActive =
            tab.route === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.route);

          return (
            <Pressable
              key={tab.route}
              onPress={() => router.push(tab.route as never)}
              style={[
                styles.tab,
                isActive && styles.activeTab,
              ]}
            >
              <Text style={styles.icon}>
                {tab.icon}
              </Text>

              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.tabIconSelected : colors.tabIconDefault },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },

  tabs: {
    flexDirection: 'row',
    height: 68,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },

  tab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 3,
  },

  activeTab: {
    backgroundColor: '#E8F5EE',
  },

  icon: {
    fontSize: 21,
  },

  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});