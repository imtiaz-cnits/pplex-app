import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Animated, TouchableWithoutFeedback, useWindowDimensions, PanResponder } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import Sidebar from './Sidebar';
import SearchOverlay from './SearchOverlay';
import NotificationDrawer from './NotificationDrawer';
import Preloader from './Preloader';
import ComingSoonModal from './ComingSoonModal';
import ForceUpdateModal from './ForceUpdateModal';
import { useOverlays } from '../context/OverlayContext';
import { navigationRef } from '../navigation/navigationRef';

export default function OverlayManager() {
  const {
    sidebarOpen,
    setSidebarOpen,
    searchOpen,
    setSearchOpen,
    notiOpen,
    setNotiOpen,
    isLoading,
    comingSoonVisible,
    comingSoonFeature,
    setComingSoonVisible,
    fetchGlobalPlaylist,
    pipActive,
    setPipActive,
    pipVideoInfo,
    forceUpdateData,
  } = useOverlays();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLargeScreen = Platform.isTV || screenWidth > 900 || (screenWidth > screenHeight && Platform.OS === 'android');

  const pipWidth = isLargeScreen ? 380 : 210;
  const pipHeight = isLargeScreen ? 214 : 120;
  const targetTranslateX = isLargeScreen ? -38 : -18;
  const pipBtnSize = isLargeScreen ? 36 : 28;
  const pipBtnRadius = isLargeScreen ? 18 : 14;
  const pipIconSize = isLargeScreen ? 18 : 14;

  const [isZoomed, setIsZoomed] = useState(false);
  const scaleVal = useRef(new Animated.Value(1.0)).current;
  const zoomTimeoutRef = useRef(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        isDragging.current = true;
        pan.x.setValue(gestureState.dx);
        pan.y.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        if (!isDragging.current && (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5)) {
          handlePipPress();
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  useEffect(() => {
    fetchGlobalPlaylist();
  }, []);

  // Reset zoom state if PiP becomes inactive
  useEffect(() => {
    if (!pipActive) {
      setIsZoomed(false);
      scaleVal.setValue(1.0);
      pan.setValue({ x: 0, y: 0 });
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    }
  }, [pipActive]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  const handlePipPress = () => {
    const nextZoomState = !isZoomed;
    setIsZoomed(nextZoomState);

    Animated.spring(scaleVal, {
      toValue: nextZoomState ? 1.15 : 1.0,
      useNativeDriver: false,
      friction: 8,
      tension: 45,
    }).start();

    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }

    if (nextZoomState) {
      // Auto-collapse after 3 seconds of inactivity
      zoomTimeoutRef.current = setTimeout(() => {
        setIsZoomed(false);
        Animated.spring(scaleVal, {
          toValue: 1.0,
          useNativeDriver: false,
          friction: 8,
          tension: 45,
        }).start();
      }, 3000);
    }
  };

  // Interpolate scaleVal for opacity of controls/title
  const opacityVal = scaleVal.interpolate({
    inputRange: [1.0, 1.15],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Shift left when zooming to keep spacing from the right screen edge
  const translateXVal = scaleVal.interpolate({
    inputRange: [1.0, 1.15],
    outputRange: [0, targetTranslateX],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigation={navigationRef}
      />
      <SearchOverlay
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        navigation={navigationRef}
      />
      <NotificationDrawer
        visible={notiOpen}
        onClose={() => setNotiOpen(false)}
      />
      {/* <Preloader visible={isLoading} /> */}
      <ComingSoonModal
        visible={comingSoonVisible}
        featureName={comingSoonFeature}
        onClose={() => setComingSoonVisible(false)}
      />
      {forceUpdateData.visible && (
        <ForceUpdateModal
          visible={forceUpdateData.visible}
          downloadUrl={forceUpdateData.downloadUrl}
          latestVersionName={forceUpdateData.latestVersion}
        />
      )}

      {/* Picture-in-Picture Floating Player */}
      {pipActive && pipVideoInfo && (
        <Animated.View 
          {...panResponder.panHandlers}
          style={[
            styles.pipContainer, 
            { 
              width: pipWidth, 
              height: pipHeight, 
              right: isLargeScreen ? 25 : 20,
              transform: [
                { translateX: Animated.add(pan.x, translateXVal) },
                { translateY: pan.y },
                { scale: scaleVal }
              ] 
            }
          ]}
        >
          <Video
            source={{ uri: pipVideoInfo.streamUrl }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            shouldPlay={true}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            staysActiveInBackground={true}
            style={styles.pipVideo}
          />
          {/* PiP Overlay Controls */}
          <Animated.View 
            pointerEvents={isZoomed ? 'auto' : 'none'}
            style={[styles.pipControls, { opacity: opacityVal }]}
          >
            <TouchableOpacity
              style={[styles.pipBtn, { width: pipBtnSize, height: pipBtnSize, borderRadius: pipBtnRadius }]}
              activeOpacity={0.7}
              onPress={() => {
                setPipActive(false);
                navigationRef.navigate('Player', {
                  streamUrl: pipVideoInfo.streamUrl,
                  title: pipVideoInfo.title,
                  channels: pipVideoInfo.channels,
                  currentChannelId: pipVideoInfo.currentChannelId,
                  isLive: pipVideoInfo.isLive,
                });
              }}
            >
              <Feather name="maximize-2" size={pipIconSize} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pipBtn, 
                { 
                  backgroundColor: 'rgba(255, 61, 0, 0.9)', 
                  width: pipBtnSize, 
                  height: pipBtnSize, 
                  borderRadius: pipBtnRadius 
                }
              ]}
              activeOpacity={0.7}
              onPress={() => setPipActive(false)}
            >
              <Feather name="x" size={pipIconSize} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
          {/* PiP Mini Title Banner */}
          <Animated.View 
            style={[styles.pipTitleBg, { opacity: opacityVal }]}
            pointerEvents="none"
          >
            <Text style={styles.pipTitle} numberOfLines={1}>
              {pipVideoInfo.title}
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pipContainer: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    width: 210,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
        outlineStyle: 'none',
      },
    }),
  },
  pipVideo: {
    width: '100%',
    height: '100%',
  },
  pipControls: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10000,
  },
  pipBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  pipTitleBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    zIndex: 10000,
  },
  pipTitle: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
