import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/useTheme';

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  medications: 'medical',
  reminders: 'alarm',
  measurements: 'fitness',
  family: 'people',
};

export default function TabsLayout() {
  const theme = useAppTheme();
  const colors = theme.colors;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 4,
        },
        sceneStyle: { backgroundColor: colors.background },
        tabBarIcon: ({ color, size }) => <Ionicons name={iconMap[route.name] || 'ellipse'} size={size} color={color} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Panel' }} />
      <Tabs.Screen name="medications" options={{ title: 'Ilaclar' }} />
      <Tabs.Screen name="reminders" options={{ title: 'Hatirlatici' }} />
      <Tabs.Screen name="measurements" options={{ title: 'Olcum' }} />
      <Tabs.Screen name="family" options={{ title: 'Ailem' }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="ocr" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="measurement-detail" options={{ href: null }} />
    </Tabs>
  );
}
