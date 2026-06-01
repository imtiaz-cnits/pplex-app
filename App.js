import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { OverlayProvider } from './src/context/OverlayContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import OverlayManager from './src/components/OverlayManager';

export default function App() {
  useEffect(() => {
    async function lockTV() {
      if (Platform.isTV) {
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } catch (err) {
          console.log('Error locking TV orientation:', err);
        }
      }
    }
    lockTV();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <OverlayProvider>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
          <OverlayManager />
        </OverlayProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
