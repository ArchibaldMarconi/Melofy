import React, { useEffect } from 'react';
import { audio } from './src/audio/RNAudioEngine';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TreeScreen } from './src/screens/TreeScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { PracticeScreen } from './src/screens/PracticeScreen';
import { AtelierScreen } from './src/screens/AtelierScreen';
import { DeepLessonScreen } from './src/screens/DeepLessonScreen';
import { MetronomeScreen } from './src/screens/MetronomeScreen';
import { TunerScreen } from './src/screens/TunerScreen';
import { StatusBar } from 'expo-status-bar';
import { isDark } from './src/theme';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PlacementScreen } from './src/screens/PlacementScreen';
import { WhatsNew } from './src/components/WhatsNew';
import { unseenReleases } from './src/version';
import { useUserStore } from './src/store/useUserStore';
import type { RootStackParamList } from './src/screens/navigation';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const icon = (glyph: string) => ({ color }: { color: string }) => <Text style={{ fontSize: 20, color }}>{glyph}</Text>;

function Tabs() {
  return (
    // la séance du jour est l'écran d'ouverture : c'est ce que l'élève vient faire chaque jour
    <Tab.Navigator initialRouteName="Workout" screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: colors.tabInactive, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 10 } }}>
      {/* l'ordre du plan : 1 Workout, 2 Leçons, 3 Pratique, 4 Métronome, 5 Accordeur, 6 Profil */}
      <Tab.Screen name="Workout" component={WorkoutScreen} options={{ tabBarIcon: icon('▶') }} />
      <Tab.Screen name="Arbre" component={TreeScreen} options={{ tabBarIcon: icon('♪'), tabBarLabel: 'Leçons', title: 'Leçons' }} />
      <Tab.Screen name="Pratique" component={AtelierScreen} options={{ tabBarIcon: icon('◎') }} />
      <Tab.Screen name="Metronome" component={MetronomeScreen} options={{ tabBarIcon: icon('♩'), tabBarLabel: 'Métronome', title: 'Métronome' }} />
      <Tab.Screen name="Accordeur" component={TunerScreen} options={{ tabBarIcon: icon('⋔') }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarIcon: icon('●') }} />
    </Tab.Navigator>
  );
}

function WhatsNewGate() {
  const seen = useUserStore((s) => s.seenRelease);
  const markSeen = useUserStore((s) => s.markReleaseSeen);
  return <WhatsNew releases={unseenReleases(seen)} onClose={markSeen} />;
}

export default function App() {
  const onboarded = useUserStore((s) => s.onboarded);
  const instrument = useUserStore((s) => s.settings.instrument);
  useEffect(() => { if (onboarded) audio.warm?.(instrument); }, [onboarded, instrument]);
  const droneVolume = useUserStore((s) => s.settings.droneVolume ?? 0.6);
  useEffect(() => { audio.droneVolume = droneVolume; }, [droneVolume]);
  const placementPending = useUserStore((s) => s.placementPending);
  if (!onboarded) return <SafeAreaProvider><OnboardingScreen /></SafeAreaProvider>;
  if (placementPending) return <SafeAreaProvider><PlacementScreen /></SafeAreaProvider>;
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <WhatsNewGate />
      <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper } }}>
        <Stack.Navigator>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Practice" component={PracticeScreen} options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="DeepLesson" component={DeepLessonScreen} options={{ presentation: 'modal', headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
