import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOverlays } from '../context/OverlayContext';

import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LiveTvScreen from '../screens/LiveTvScreen';
import MoviesScreen from '../screens/MoviesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import PlayerScreen from '../screens/PlayerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const { colors, theme } = useTheme();
  const { isLoading } = useOverlays();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isTVMode = Platform.isTV || width > 900;

  return (
    <Tab.Navigator
      tabBar={(props) => {
        if (isTVMode) return null;
        return (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}>
            <BottomTabBar {...props} safeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }} />
          </View>
        );
      }}
      screenOptions={() => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSec,
        tabBarStyle: {
          position: 'absolute',
          bottom: 15 + insets.bottom,
          left: 15,
          right: 15,
          borderRadius: 16,
          height: 66,
          backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.45)',
          borderWidth: 1,
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          borderTopWidth: 1,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          paddingBottom: 10,
          paddingTop: 8,
          marginLeft: 10,
          marginRight: 10,
          overflow: 'hidden',
          display: isTVMode ? 'none' : 'flex',
        },
        tabBarBackground: () => (
          <BlurView
            tint={theme === 'dark' ? 'dark' : 'light'}
            intensity={100}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -2,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Feather name="home" color={color} size={20} />
          ),
        }}
      />
      <Tab.Screen
        name="Live"
        component={LiveTvScreen}
        options={{
          tabBarLabel: 'Live',
          tabBarIcon: ({ color }) => (
            <Feather name="tv" color={color} size={20} />
          ),
        }}
      />
      <Tab.Screen
        name="Movies"
        component={MoviesScreen}
        options={{
          tabBarLabel: 'Movies',
          tabBarIcon: ({ color }) => (
            <Feather name="film" color={color} size={20} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" color={color} size={20} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
      <Stack.Screen name="Player" component={PlayerScreen} />
    </Stack.Navigator>
  );
}
