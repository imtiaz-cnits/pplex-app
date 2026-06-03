import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Dimensions, Image, Easing, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';

const { width } = Dimensions.get('window');

export default function Preloader({ visible }) {
  const { colors, theme } = useTheme();
  const [shouldRender, setShouldRender] = useState(visible);
  
  const useND = Platform.OS !== 'web';

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const barTranslateX = useRef(new Animated.Value(-width)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    if (visible) {
      setShouldRender(true);
      fadeAnim.setValue(1);
      barTranslateX.setValue(-width);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);

      // Top bar progress animation
      Animated.timing(barTranslateX, {
        toValue: 0,
        duration: 800,
        useNativeDriver: useND,
      }).start();

      // Infinite Rotation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: useND,
        })
      ).start();

      // Gentle Pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: useND,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: useND,
          }),
        ])
      ).start();

    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: useND,
      }).start(() => {
        if (isMounted.current) {
          setShouldRender(false);
        }
      });
    }

    return () => {
      isMounted.current = false;
    };
  }, [visible]);

  // Guard: only render when needed
  if (!shouldRender) return null;

  // Interpolations are defined AFTER the early-return guard so they are
  // never evaluated unless the component is actually visible. This prevents
  // the "Animated.Value passed to a normal component" invariant violation
  // that React/Hermes throws during tab-transition mount cycles.
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[
      styles.container,
      {
        backgroundColor: colors.phBg,
        opacity: fadeAnim
      }
    ]}>
      {/* Top Progress Line */}
      <Animated.View style={[styles.pBar, { width: width, transform: [{ translateX: barTranslateX }], backgroundColor: colors.primary }]} />

      <View style={styles.content}>
        {/* Modern Spinning Ring */}
        <Animated.View
          style={[
            styles.loaderRing,
            {
              borderColor: colors.primary,
              borderTopColor: 'transparent',
              transform: [{ rotate: spin }]
            }
          ]}
        />

        {/* Logo with Pulse Effect */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Logo color="green" width={140} height={50} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: '#ffffff',
  },
  pBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
  },
  content: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loaderRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.8,
  },
  logoContainer: {
    zIndex: 10,
    padding: 10,
  },
});
