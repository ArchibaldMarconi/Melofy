import React, { useEffect } from 'react';
import { audio } from './src/audio/RNAudioEngine';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import type { PlayStackParamList, RootStackParamList } from './src/screens/navigation';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();
const PlayStack = createNativeStackNavigator<PlayStackParamList>();

/** écrans ouverts depuis « Jouer » (le Jam) : un en-tête simple avec retour */
const toolHeader = { headerBackTitle: 'Jouer', headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false } as const;

/** onglet Jouer : le Jam s'ouvre dans l'onglet, la barre reste visible pour changer de page à tout moment */
function PlayTab() {
  return (
    <PlayStack.Navigator>
      <PlayStack.Screen name="Atelier" component={AtelierScreen} options={{ headerShown: false, title: 'Jouer' }} />
      <PlayStack.Screen name="Jam" component={JamScreen} options={{ ...toolHeader, title: 'Jam' }} />
    </PlayStack.Navigator>
  );
}

const icon = (glyph: string) => function TabIcon({ color }: { color: string }) { return <Text style={{ fontSize: 20, color }}>{glyph}</Text>; };
/** libellé d'onglet sur une ligne : sur un petit iPhone, il rétrécit à peine plutôt que d'être coupé (« Métron… ») */
const label = (text: string) => function TabLabel({ color }: { color: string }) {
  return <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ fontSize: 10, letterSpacing: -0.2, color, textAlign: 'center' }}>{text}</Text>;
};

function Tabs() {
  return (
    // la séance du jour ouvre l'appli ; le métronome et l'accordeur ont chacun leur page, à portée d'un toucher.
    // Six onglets : libellés en 10 pt, pour que « Métronome » et « Accordeur » tiennent en entier
    <Tab.Navigator initialRouteName="Workout" screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: colors.tabInactive, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line } }}>
      <Tab.Screen name="Workout" component={WorkoutScreen} options={{ tabBarIcon: icon('▶'), tabBarLabel: label('Séance'), title: 'Séance' }} />
      <Tab.Screen name="Arbre" component={TreeScreen} options={{ tabBarIcon: icon('♪'), tabBarLabel: label('Leçons'), title: 'Leçons' }} />
      <Tab.Screen name="Pratique" component={PlayTab} options={{ tabBarIcon: icon('◎'), tabBarLabel: label('Jouer'), title: 'Jouer' }} />
      <Tab.Screen name="Metronome" component={MetronomeScreen} options={{ tabBarIcon: icon('♩'), tabBarLabel: label('Métronome'), title: 'Métronome' }} />
      <Tab.Screen name="Accordeur" component={TunerScreen} options={{ tabBarIcon: icon('⋔'), tabBarLabel: label('Accordeur'), title: 'Accordeur' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarIcon: icon('●'), tabBarLabel: label('Moi'), title: 'Moi' }} />
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
  if (!onboarded) return <Root><OnboardingScreen /></Root>;
  if (placementPending) return <Root><PlacementScreen /></Root>;
  return (
    <Root>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <WhatsNewGate />
      <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper } }}>
        <Stack.Navigator>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Practice" component={PracticeScreen} options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="DeepLesson" component={DeepLessonScreen} options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="Focus" component={FocusScreen} options={{ presentation: 'modal', headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </Root>
  );
}

/** racine de l'appli : les gestes (Gesture Handler) ne sont reconnus qu'à l'intérieur de GestureHandlerRootView */
function Root({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
