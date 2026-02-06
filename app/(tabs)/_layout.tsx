import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors, Layout, Typography } from '@/constants/design';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppColors.black,
        tabBarInactiveTintColor: AppColors.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarItemStyle: styles.tabBarItem,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'PRACTICE',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <IconSymbol size={26} name="book.fill" color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'ABOUT',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <IconSymbol size={26} name="info.circle.fill" color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <IconSymbol size={26} name="gearshape.fill" color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: AppColors.cream,
    borderTopWidth: Layout.borderWidth,
    borderTopColor: AppColors.black,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 0, // Remove default Android shadow
    shadowOpacity: 0, // Remove any iOS-style shadow leak
  },
  tabBarLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    letterSpacing: 1.5,
  },
  tabBarIcon: {
    marginBottom: -2,
  },
  tabBarItem: {
    paddingTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 3,
    backgroundColor: AppColors.yellow,
  },
});
