// Démarrage : on lit d'abord le thème choisi et la sauvegarde de l'élève (AsyncStorage est asynchrone),
// puis on charge l'appli. Ainsi les couleurs et la progression sont justes dès le premier écran.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { registerRootComponent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

function Boot() {
  const [App, setApp] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('melofy-ui:theme');
        if (t) (globalThis as { __melofyTheme?: string }).__melofyTheme = t;
      } catch { /* thème par défaut */ }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useUserStore } = require('./src/store/useUserStore');
      if (!useUserStore.persist.hasHydrated()) {
        await new Promise<void>((res) => {
          const un = useUserStore.persist.onFinishHydration(() => { un(); res(); });
          setTimeout(res, 3000);
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      setApp(() => require('./App').default);
    })();
  }, []);
  if (!App) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211A45' }}><ActivityIndicator color="#FFFFFF" /></View>;
  return <App />;
}

registerRootComponent(Boot);
