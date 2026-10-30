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
import { FocusScreen } from './src/screens/FocusScreen';
import { JamScreen } from './src/screens/JamScreen';
import { StatusBar } from 'expo-status-bar';
import { colors, isDark } from './src/theme';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PlacementScreen } from './src/screens/PlacementScreen';
import { WhatsNew } from './src/components/WhatsNew';
import { unseenReleases } from './src/version';
import { useUserStore } from './src/store/useUserStore';
import type { RootStackParamList } from './src/screens/navigation';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

/** outils ouverts depuis « Jouer » : un en-tête simple avec retour */
const toolHeader = { headerBackTitle: 'Jouer', headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false } as const;

const icon = (glyph: string) => function TabIcon({ color }: { color: string }) { return <Text style={{ fontSize: 20, color }}>{glyph}</Text>; };

function Tabs() {
  return (
    // quatre destinations, un verbe chacune (et, plus tard, un objet de la maison) ; la séance du jour ouvre l'appli
    <Tab.Navigator initialRouteName="Workout" screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: colors.tabInactive, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tab.Screen name="Workout" component={WorkoutScreen} options={{ tabBarIcon: icon('▶'), tabBarLabel: 'Séance', title: 'Séance' }} />
      <Tab.Screen name="Arbre" component={TreeScreen} options={{ tabBarIcon: icon('♪'), tabBarLabel: 'Leçons', title: 'Leçons' }} />
      <Tab.Screen name="Pratique" component={AtelierScreen} options={{ tabBarIcon: icon('◎'), tabBarLabel: 'Jouer', title: 'Jouer' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarIcon: icon('●'), tabBarLabel: 'Moi', title: 'Moi' }} />
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
          <Stack.Screen name="Focus" component={FocusScreen} options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="Metronome" component={MetronomeScreen} options={{ ...toolHeader, title: 'Métronome' }} />
          <Stack.Screen name="Accordeur" component={TunerScreen} options={{ ...toolHeader, title: 'Accordeur' }} />
          <Stack.Screen name="Jam" component={JamScreen} options={{ ...toolHeader, title: 'Jam' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
