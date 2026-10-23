// Zone tactile instantanée : déclenche à l'appui (responder), sans le délai de Pressable.
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export function Hit({ onDown, disabled, style, children, label }: { onDown: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; children?: React.ReactNode; label?: string }) {
  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={label}
      onStartShouldSetResponder={() => !disabled}
      onResponderGrant={() => onDown()}
      style={style}
    >
      {children}
    </View>
  );
}
