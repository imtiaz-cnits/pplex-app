import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Animated, TouchableWithoutFeedback, useWindowDimensions, PanResponder, Dimensions } from 'react-native';
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
  const pipPositionRef = useRef(0);
  const pipVideoRef = useRef(null);

  useEffect(() => {
    if (pipVideoInfo) {
      pipPositionRef.current = pipVideoInfo.resumePosition || 0;
    }
  }, [pipVideoInfo]);

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
        
        // Dynamically calculate boundaries to support screen rotations safely
        const { width: currentScreenWidth, height: currentScreenHeight } = Dimensions.get('window');
        const currentIsLargeScreen = Platform.isTV || currentScreenWidth > 900 || (currentScreenWidth > currentScreenHeight && Platform.OS === 'android');
        const currentPipWidth = currentIsLargeScreen ? 380 : 210;
        const currentPipHeight = currentIsLargeScreen ? 214 : 120;
        const rightOffset = currentIsLargeScreen ? 25 : 20;
        const bottomOffset = 95;
        
        const targetX = pan.x._offset + gestureState.dx;
        const targetY = pan.y._offset + gestureState.dy;
        
        const minX = -(currentScreenWidth - rightOffset - currentPipWidth);
        const maxX = rightOffset;
        const minY = -(currentScreenHeight - bottomOffset - currentPipHeight);
        const maxY = bottomOffset;
        
        const clampedX = Math.max(minX, Math.min(maxX, targetX));
        const clampedY = Math.max(minY, Math.min(maxY, targetY));
        
        pan.x.setValue(clampedX - pan.x._offset);
        pan.y.setValue(clampedY - pan.y._offset);
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
            ref={pipVideoRef}
            source={{ uri: pipVideoInfo.streamUrl }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            shouldPlay={true}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            staysActiveInBackground={true}
            onLoad={() => {
              if (pipVideoRef.current && pipVideoInfo?.resumePosition) {
                pipVideoRef.current.setPositionAsync(pipVideoInfo.resumePosition);
              }
            }}
            onError={(error) => {
              console.log('PiP Video error:', error, 'for URL:', pipVideoInfo.streamUrl);
            }}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded) {
                pipPositionRef.current = status.positionMillis;
              }
            }}
            style={styles.pipVideo}
          />
          {/* PiP Overlay Controls */}
          <Animated.View
            pointerEvents={isZoomed ? 'auto' : 'none'}
            style={[styles.pipControls, { opacity: opacityVal }]}
          >
            {/* Centered Maximize Button */}
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
                  resumePosition: pipPositionRef.current,
                });
              }}
            >
              <Feather name="maximize-2" size={pipIconSize} color="#fff" />
            </TouchableOpacity>

            {/* Top-Right Close Button */}
            <TouchableOpacity
              style={[
                styles.pipCloseBtn,
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  pipCloseBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 10001,
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
