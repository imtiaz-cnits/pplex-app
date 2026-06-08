import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
  PanResponder,
  FlatList,
  ImageBackground,
  Image,
  Platform,
  DeviceEventEmitter,
  NativeModules,
  BackHandler,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Battery from 'expo-battery';
import { useTheme } from '../context/ThemeContext';
import * as Brightness from 'expo-brightness';
import * as NavigationBar from 'expo-navigation-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useOverlays } from '../context/OverlayContext';
import { reportPlaybackProgress, fetchMovieDetails } from '../services/jellyfinApi';

const { PipModule } = NativeModules;
const isPipAvailable = PipModule && typeof PipModule.setCanEnterPip === 'function';

// Safe load of react-native-volume-manager for Expo Go compatibility
let VolumeManager = null;
try {
  VolumeManager = require('react-native-volume-manager').VolumeManager;
} catch (e) {
  // Bypassed for Expo Go compatibility to prevent crash.
}

const CATEGORY_IMAGES = {
  'All': 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400',
  'News': 'https://images.unsplash.com/photo-1505775561242-727b7fba20f0?q=80&w=400',
  'Sports': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=400',
  'Entertainment': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400',
  'Drama': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400',
  'Sci-Fi': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400',
  'Other': 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400',
};

const { width: initWidth, height: initHeight } = Dimensions.get('window');
const isTVGlobal = Platform.isTV || (Math.min(initWidth, initHeight) >= 500 && Math.max(initWidth, initHeight) > 900);

// Custom component for drawer items to manage focus state locally and prevent sticky focus
const DrawerChannelItem = React.memo(({
  item,
  index,
  isActive,
  isLive,
  isTV,
  rightDrawerOpen,
  focusedDrawerIndex,
  initialFocusDone,
  onPress,
  onFocus,
  getTvProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusColor = isLive ? '#00C853' : '#FF0000';
  const focusBgColor = isLive ? 'rgba(0, 200, 83, 0.35)' : 'rgba(255, 0, 0, 0.35)';

  const tvProps = getTvProps('drawer-ch-' + item.id);

  return (
    <Pressable
      focusable={tvProps.focusable}
      hasTVPreferredFocus={isTV && rightDrawerOpen && !initialFocusDone && index === focusedDrawerIndex}
      onPress={onPress}
      onFocus={() => {
        setIsFocused(true);
        tvProps.onFocus();
        onFocus(index);
      }}
      onBlur={() => {
        setIsFocused(false);
        tvProps.onBlur();
      }}
      style={[
        styles.drawerItem,
        isActive && styles.drawerItemActive,
        isActive && { backgroundColor: isLive ? 'rgba(0, 200, 83, 0.08)' : 'rgba(255, 0, 0, 0.08)' },
        isFocused && {
          borderColor: focusColor,
          backgroundColor: focusBgColor,
          borderWidth: 3,
          borderRadius: 8,
          transform: [{ scale: 1.05 }],
        }
      ]}
    >
      {item.logoUrl ? (
        <Image source={{ uri: item.logoUrl }} style={styles.drawerItemLogo} />
      ) : (
        <View style={[styles.drawerItemLogoPlaceholder, { backgroundColor: item.logoBg || '#222' }]}>
          <Feather
            name={item.iconName === 'television' ? 'tv' : 'radio'}
            size={18}
            color={item.logoColor || '#fff'}
          />
        </View>
      )}
      <Text
        style={[
          styles.drawerItemText,
          isActive && styles.drawerItemTextActive,
          isActive && { color: isLive ? '#00C853' : '#FF0000' }
        ]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
      {isActive && <View style={[styles.activeDot, { backgroundColor: isLive ? '#00C853' : '#FF0000' }]} />}
    </Pressable>
  );
});

export default function PlayerScreen({ route, navigation }) {
  useKeepAwake();
  const { colors, theme } = useTheme();
  const { setPipActive, setPipVideoInfo } = useOverlays();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isPortrait = width < height;
  const isTV = isTVGlobal;
  const isTVDevice = isTVGlobal;
  const videoRef = useRef(null);

  // PiP State
  const [isInPip, setIsInPip] = useState(false);

  // Params
  const { streamUrl, title, channels = [], currentChannelId = null, isLive: isLiveParam, itemId, movie } = route.params || {};

  const positionRef = useRef(route.params?.resumePosition || 0);
  const startPositionTicks = movie?.UserData?.PlaybackPositionTicks || 0;
  const startPositionMillis = Math.round(startPositionTicks / 10000); // 1ms = 10,000 ticks
  const initialPosition = route.params?.resumePosition || startPositionMillis;

  const [resumePosition, setResumePosition] = useState(initialPosition);

  const itemIdRef = useRef(itemId);
  useEffect(() => {
    itemIdRef.current = itemId;
  }, [itemId]);

  useEffect(() => {
    return () => {
      if (itemIdRef.current && positionRef.current > 0) {
        const positionTicks = positionRef.current * 10000;
        reportPlaybackProgress(itemIdRef.current, positionTicks);
      }
    };
  }, []);

  useEffect(() => {
    const refreshPlaybackData = async () => {
      if (!itemId || route.params?.resumePosition) return;
      try {
        const freshDetails = await fetchMovieDetails(itemId);
        if (freshDetails?.UserData?.PlaybackPositionTicks) {
          const freshTicks = freshDetails.UserData.PlaybackPositionTicks;
          const freshMillis = Math.round(freshTicks / 10000);
          setResumePosition(freshMillis);

          // Seek to the fresh position if player is loaded
          if (videoRef.current && freshMillis > 0) {
            videoRef.current.setPositionAsync(freshMillis);
            positionRef.current = freshMillis;
          }
        }
      } catch (err) {
        console.log('Error refreshing playback progress:', err);
      }
    };

    refreshPlaybackData();
  }, [itemId, route.params?.resumePosition]);

  // Current Playback State
  const [currentUrl, setCurrentUrl] = useState(streamUrl || 'https://vjs.zencdn.net/v/oceans.mp4');
  const [currentTitle, setCurrentTitle] = useState(title || 'PPLEX Live Stream');
  const [activeChannelId, setActiveChannelId] = useState(currentChannelId);

  // Player controls
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState({});
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Custom HUD & Gestures state
  const [volume, setVolume] = useState(1.0);
  const [brightness, setBrightness] = useState(1.0);
  const [hudVisible, setHudVisible] = useState(false);
  const [hudType, setHudType] = useState('volume'); // 'volume', 'brightness', 'auto_rotate', 'lock_landscape', 'lock_portrait'

  // Screen overlays & menus
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockBtnVisible, setLockBtnVisible] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [resizeModeIndex, setResizeModeIndex] = useState(0); // 0: CONTAIN, 1: COVER, 2: STRETCH
  const [speed, setSpeed] = useState(1.0);
  const [orientationMode, setOrientationMode] = useState('landscape'); // default to 'landscape' on start

  // Drawers
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false); // Category Drawer
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false); // Channels Switcher Drawer
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [seekIndicator, setSeekIndicator] = useState(null); // 'forward' or 'backward'
  const [systemTime, setSystemTime] = useState('9:41');
  const [batteryLevel, setBatteryLevel] = useState(85);

  // Layout size for Seekbar
  const [seekBarWidth, setSeekBarWidth] = useState(0);

  // Refs for tracking values inside PanResponder
  const brightnessRef = useRef(brightness);
  const volumeRef = useRef(volume);
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  const startVolume = useRef(1.0);
  const startBrightness = useRef(1.0);
  const controlsTimerRef = useRef(null);
  const hudTimerRef = useRef(null);
  const doubleTapTimerRef = useRef(null);
  const lastTapRef = useRef(null);
  const channelsListRef = useRef(null);
  const categoriesListRef = useRef(null);

  // Update refs
  useEffect(() => { brightnessRef.current = brightness; }, [brightness]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { widthRef.current = width; }, [width]);
  useEffect(() => { heightRef.current = height; }, [height]);

  const isLive = isLiveParam !== undefined ? isLiveParam : ((channels && channels.length > 0) || !status.durationMillis || status.durationMillis === 0);
  const originalBrightnessRef = useRef(1.0);

  const handlePreviousChannelRef = useRef(handlePreviousChannel);
  const handleNextChannelRef = useRef(handleNextChannel);
  const isLiveRef = useRef(isLive);

  useEffect(() => {
    handlePreviousChannelRef.current = handlePreviousChannel;
    handleNextChannelRef.current = handleNextChannel;
    isLiveRef.current = isLive;
  });

  // TV D-Pad Focus State
  const [focusedBtnId, setFocusedBtnId] = useState(null);
  const focusedBtnIdRef = useRef(null);
  const [focusedDrawerIndex, setFocusedDrawerIndex] = useState(0);
  const [initialFocusDone, setInitialFocusDone] = useState(false);

  useEffect(() => {
    if (rightDrawerOpen) {
      setInitialFocusDone(false);
      const timer = setTimeout(() => {
        setInitialFocusDone(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setInitialFocusDone(false);
    }
  }, [rightDrawerOpen]);

  useEffect(() => {
    focusedBtnIdRef.current = focusedBtnId;
    if (focusedBtnId) {
      setControlsVisible(true);
    }
  }, [focusedBtnId]);

  // Initialize drawer focus index when open
  useEffect(() => {
    if (rightDrawerOpen && filteredChannels.length > 0) {
      const activeIdx = filteredChannels.findIndex(c => String(c.id) === String(activeChannelId));
      if (activeIdx !== -1) {
        setFocusedDrawerIndex(activeIdx);
      } else {
        setFocusedDrawerIndex(0);
      }
    }
  }, [rightDrawerOpen, activeChannelId, filteredChannels]);

  // Scroll to focused item in drawer
  useEffect(() => {
    if (rightDrawerOpen && filteredChannels.length > 0) {
      try {
        if (focusedDrawerIndex >= 0 && focusedDrawerIndex < filteredChannels.length) {
          channelsListRef.current?.scrollToIndex({
            index: focusedDrawerIndex,
            animated: false,
            viewPosition: 0.5,
          });
        }
      } catch (err) {
        // Fallback if layout not ready
      }
    }
  }, [focusedDrawerIndex, rightDrawerOpen, filteredChannels]);

  // Helper to inject D-Pad focus properties
  const getTvProps = (btnId, baseStyle = {}) => {
    const isFocused = focusedBtnId === btnId;
    const isDrawerItem = btnId.startsWith('drawer-');

    // Trap focus inside the drawer when open, and inside control overlay when closed.
    const isFocusable = isDrawerItem ? rightDrawerOpen : !rightDrawerOpen;

    const focusColor = isLive ? '#00C853' : '#FF0000';
    const focusBgColor = isLive ? 'rgba(0, 200, 83, 0.35)' : 'rgba(255, 0, 0, 0.35)';
    return {
      focusable: isFocusable,
      onFocus: () => {
        setFocusedBtnId(btnId);
        showControlsWithTimeout();
      },
      onBlur: () => {
        setFocusedBtnId((prev) => (prev === btnId ? null : prev));
        showControlsWithTimeout();
      },
      style: [
        baseStyle,
        isFocused && (isDrawerItem ? {
          backgroundColor: focusBgColor,
          borderColor: focusColor,
          borderWidth: 3,
          borderRadius: btnId.startsWith('drawer-cat-') ? 20 : 8,
          transform: [{ scale: 1.05 }],
        } : {
          borderColor: focusColor,
          backgroundColor: focusBgColor,
          transform: [{ scale: 1.08 }],
          shadowColor: focusColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
          elevation: 8,
        })
      ]
    };
  };

  const RESIZE_MODES = [ResizeMode.CONTAIN, ResizeMode.COVER, ResizeMode.STRETCH];
  const RESIZE_LABELS = ['Fit', 'Fill', 'Stretch'];

  const SPEEDS = [0.5, 1.0, 1.25, 1.5, 2.0];

  // Screen orientation lock & System time updater & Battery Level fetcher
  useEffect(() => {
    // 0. Disable PiP when entering full screen player
    setPipActive(false);

    if (isPipAvailable) {
      PipModule.setCanEnterPip(true);
    }

    const pipSubscription = DeviceEventEmitter.addListener(
      'onPictureInPictureModeChanged',
      (event) => {
        setIsInPip(event.isInPictureInPictureMode);
      }
    );

    // 1. Initialize screen orientation to Landscape on mount
    const initOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setOrientationMode('landscape');
      } catch (err) {
        console.log('Orientation initialization error:', err);
      }
    };
    initOrientation();

    // Hiding bottom system navigation bar on Android for immersive fullscreen playback
    const setupNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
      } catch (err) {
        console.log('Error setting navigation bar visibility:', err);
      }
    };
    setupNavigationBar();

    // 2. Fetch and Subscribe to Battery status
    let batterySubscription = null;
    const setupBattery = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        // level returns -1 if battery state is unknown, default to 85 in that case
        setBatteryLevel(level >= 0 ? Math.round(level * 100) : 85);

        batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
          setBatteryLevel(Math.round(batteryLevel * 100));
        });
      } catch (err) {
        console.log('Battery listener setup error:', err);
      }
    };
    setupBattery();

    // 3. Dynamic Clock updater
    const updateTime = () => {
      const d = new Date();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setSystemTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 60000);

    // 4. Sync Initial Brightness and Volume settings
    const syncInitialSettings = async () => {
      if (!isTV) {
        try {
          let systemBrightness = await Brightness.getBrightnessAsync();
          if (systemBrightness === null || systemBrightness === undefined || systemBrightness < 0) {
            systemBrightness = 1.0; // Default to 1.0 (fully bright) if -1 or invalid
          }
          originalBrightnessRef.current = systemBrightness;
          setBrightness(systemBrightness);
        } catch (err) {
          console.log('Error getting initial brightness:', err);
          setBrightness(1.0);
        }
      } else {
        setBrightness(1.0);
      }

      if (VolumeManager) {
        try {
          const volumeState = await VolumeManager.getVolume();
          const currentVol = volumeState.volume ?? volumeState;
          setVolume(currentVol);
          // Disable native system volume UI overlay during custom slider adjustments
          await VolumeManager.showNativeVolumeUI({ enabled: false });
        } catch (err) {
          console.log('Error getting initial volume:', err);
        }
      }
    };
    syncInitialSettings();

    // 5. Add Hardware Volume Button Listener
    let volumeListener = null;
    if (VolumeManager) {
      try {
        volumeListener = VolumeManager.addVolumeListener((result) => {
          setVolume(result.volume);
        });
      } catch (err) {
        console.log('Error adding volume listener:', err);
      }
    }

    // Hide status bar when watching a video for immersive experience
    StatusBar.setHidden(true, 'fade');
    showControlsWithTimeout();

    return () => {
      if (isPipAvailable) {
        PipModule.setCanEnterPip(false);
      }
      if (pipSubscription) {
        pipSubscription.remove();
      }

      // Restore original system brightness
      if (!isTV) {
        if (Platform.OS === 'android') {
          Brightness.restoreSystemBrightnessAsync().catch(err => {
            console.log('Error restoring brightness (Android):', err);
          });
        } else {
          Brightness.setBrightnessAsync(originalBrightnessRef.current).catch(err => {
            console.log('Error restoring brightness (iOS):', err);
          });
        }
      }

      // Restore orientation to Portrait when leaving
      const restorePortrait = async () => {
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } catch (err) {
          console.log('Orientation restore error:', err);
        }
      };
      restorePortrait();

      // Restore navigation bar visibility when leaving player
      const restoreNavigationBar = async () => {
        try {
          await NavigationBar.setVisibilityAsync('visible');
        } catch (err) {
          console.log('Error restoring navigation bar visibility:', err);
        }
      };
      restoreNavigationBar();

      if (batterySubscription) batterySubscription.remove();
      if (volumeListener) {
        try {
          volumeListener.remove();
        } catch (err) {
          console.log('Error removing volume listener:', err);
        }
      }
      if (VolumeManager) {
        try {
          VolumeManager.showNativeVolumeUI({ enabled: true });
        } catch (err) {
          console.log('Error restoring native volume UI:', err);
        }
      }
      StatusBar.setHidden(false, 'fade');
      clearInterval(timeInterval);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
    };
  }, []);

  // Compute unique categories dynamically from channels
  const categories = ['All', ...new Set(channels.map((c) => c.category).filter(Boolean))];

  // Filter channels based on chosen category
  const filteredChannels = channels.filter(
    (c) => selectedCategory === 'All' || c.category === selectedCategory
  );

  const showControlsWithTimeout = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    const timeoutDuration = isTV ? 5000 : 3000;
    controlsTimerRef.current = setTimeout(() => {
      if (isTV && focusedBtnIdRef.current) {
        // Keep controls visible if a button is focused on TV
        showControlsWithTimeout();
        return;
      }
      setControlsVisible(false);
      setShowSpeedMenu(false);
    }, timeoutDuration);
  };

  const toggleControls = () => {
    if (isLocked) {
      setLockBtnVisible(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(() => setLockBtnVisible(false), 2000);
      return;
    }
    if (isLive) {
      setRightDrawerOpen(!rightDrawerOpen);
      showControlsWithTimeout();
      return;
    }
    if (controlsVisible) {
      setControlsVisible(false);
      setShowSpeedMenu(false);
    } else {
      showControlsWithTimeout();
    }
  };

  // 3-State Screen Orientation Cycle (Auto-sensor -> Force Landscape -> Force Portrait -> Auto-sensor)
  const toggleOrientationMode = async () => {
    let nextMode = 'auto';
    try {
      if (orientationMode === 'auto') {
        nextMode = 'landscape';
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else if (orientationMode === 'landscape') {
        nextMode = 'portrait';
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } else {
        nextMode = 'auto';
        await ScreenOrientation.unlockAsync();
      }
    } catch (err) {
      console.log('Toggle orientation error:', err);
    }

    setOrientationMode(nextMode);

    // Trigger visual HUD popup
    setHudType(
      nextMode === 'auto'
        ? 'auto_rotate'
        : nextMode === 'landscape'
          ? 'lock_landscape'
          : 'lock_portrait'
    );
    setHudVisible(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudVisible(false), 1200);

    showControlsWithTimeout();
  };

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyLandscape = width > height;
      if (isCurrentlyLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setOrientationMode('portrait');
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setOrientationMode('landscape');
      }
    } catch (err) {
      console.log('Toggle fullscreen error:', err);
    }
    showControlsWithTimeout();
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await videoRef.current.playAsync();
      setIsPlaying(true);
    }
    showControlsWithTimeout();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    showControlsWithTimeout();
  };

  const cycleResizeMode = () => {
    const nextIndex = (resizeModeIndex + 1) % RESIZE_MODES.length;
    setResizeModeIndex(nextIndex);

    // Show visual HUD feedback
    setHudType('aspect');
    setHudVisible(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudVisible(false), 1200);

    showControlsWithTimeout();
  };

  const changeSpeed = async (val) => {
    setSpeed(val);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      await videoRef.current.setRateAsync(val, true);
    }
    showControlsWithTimeout();
  };

  const handlePreviousChannel = () => {
    if (!channels || channels.length === 0) return;
    const currentIndex = channels.findIndex((c) => String(c.id) === String(activeChannelId));
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
    const prevChannel = channels[prevIndex];
    switchToChannel(prevChannel);
  };

  const handleNextChannel = () => {
    if (!channels || channels.length === 0) return;
    const currentIndex = channels.findIndex((c) => String(c.id) === String(activeChannelId));
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % channels.length;
    const nextChannel = channels[nextIndex];
    switchToChannel(nextChannel);
  };

  const switchToChannel = (channel) => {
    setActiveChannelId(channel.id);
    setCurrentUrl(channel.streamUrl);
    setCurrentTitle(channel.name);
    setIsLoading(true);
    setIsPlaying(true);
    showControlsWithTimeout();
  };

  const handlePrevCategory = () => {
    const currentIdx = categories.indexOf(selectedCategory);
    let nextIdx = currentIdx - 1;
    if (nextIdx < 0) nextIdx = categories.length - 1;
    setSelectedCategory(categories[nextIdx]);
    showControlsWithTimeout();
  };

  const handleNextCategory = () => {
    const currentIdx = categories.indexOf(selectedCategory);
    let nextIdx = (currentIdx + 1) % categories.length;
    setSelectedCategory(categories[nextIdx]);
    showControlsWithTimeout();
  };

  const getItemLayout = (data, index) => ({
    length: 46,
    offset: 46 * index,
    index,
  });

  const getCatItemLayout = (data, index) => ({
    length: 90,
    offset: 90 * index,
    index,
  });



  const focusedDrawerIndexRef = useRef(focusedDrawerIndex);
  const filteredChannelsRef = useRef(filteredChannels);
  useEffect(() => { focusedDrawerIndexRef.current = focusedDrawerIndex; }, [focusedDrawerIndex]);
  useEffect(() => { filteredChannelsRef.current = filteredChannels; }, [filteredChannels]);

  // TV Remote D-Pad Event Handler (using native device event emitter)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onHWKeyEvent', (evt) => {
      if (!evt) return;
      const { eventType, eventKeyAction } = evt;
      if (eventKeyAction !== undefined && eventKeyAction !== 0) return;

      const currentFocusedDrawerIndex = focusedDrawerIndexRef.current;
      const currentFilteredChannels = filteredChannelsRef.current;

      if (rightDrawerOpen) {
        if (eventType === 'up') {
          const nextIdx = Math.max(0, currentFocusedDrawerIndex - 1);
          setFocusedDrawerIndex(nextIdx);
          showControlsWithTimeout();
        } else if (eventType === 'down') {
          const nextIdx = Math.min(currentFilteredChannels.length - 1, currentFocusedDrawerIndex + 1);
          setFocusedDrawerIndex(nextIdx);
          showControlsWithTimeout();
        } else if (eventType === 'left') {
          handlePrevCategory();
        } else if (eventType === 'right') {
          handleNextCategory();
        } else if (eventType === 'select' || eventType === 'center' || eventType === 'playPause') {
          const targetChannel = currentFilteredChannels[currentFocusedDrawerIndex];
          if (targetChannel) {
            switchToChannel(targetChannel);
            setRightDrawerOpen(false);
          }
        }
      } else {
        if (isLive) {
          if (eventType === 'up') {
            handlePreviousChannel();
          } else if (eventType === 'down') {
            handleNextChannel();
          } else if (eventType === 'select' || eventType === 'center' || eventType === 'playPause') {
            setRightDrawerOpen(true);
            showControlsWithTimeout();
          }
        } else {
          // VOD Stream D-pad support
          if (eventType === 'select' || eventType === 'center' || eventType === 'playPause') {
            handlePlayPause();
            showControlsWithTimeout();
          } else if (eventType === 'left') {
            seekRelative(-10000);
            showControlsWithTimeout();
          } else if (eventType === 'right') {
            seekRelative(10000);
            showControlsWithTimeout();
          } else if (eventType === 'up' || eventType === 'down') {
            showControlsWithTimeout();
          }
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, [rightDrawerOpen, isLive, activeChannelId, channels, categories, selectedCategory, controlsVisible]);

  // Handle hardware back press (close drawer if open, otherwise trigger PiP)
  useEffect(() => {
    const backAction = () => {
      if (rightDrawerOpen) {
        setRightDrawerOpen(false);
        return true;
      }
      handlePopout();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [rightDrawerOpen, currentUrl, currentTitle, channels, activeChannelId, isLive]);

  async function handlePopout() {
    const currentPos = positionRef.current;

    if (isTVDevice) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      return;
    }

    if (isPipAvailable) {
      try {
        const supported = await PipModule.isPipSupported();
        if (supported) {
          await PipModule.enterPip(16, 9);
          return;
        }
      } catch (err) {
        console.log('Error triggering native PiP:', err);
      }
    }

    setPipVideoInfo({
      streamUrl: currentUrl,
      title: currentTitle,
      channels: channels,
      currentChannelId: activeChannelId,
      isLive: isLive,
      resumePosition: currentPos
    });
    setPipActive(true);

    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (err) {
      console.log('Orientation lock error in handlePopout:', err);
    }

    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }, 150);
  }

  const seekTo = async (millis) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(millis);
    showControlsWithTimeout();
  };

  const seekRelative = async (ms) => {
    if (!videoRef.current || !status.isLoaded) return;
    const newPosition = Math.max(0, Math.min(status.durationMillis || 0, status.positionMillis + ms));
    await videoRef.current.setPositionAsync(newPosition);
    showControlsWithTimeout();
  };

  const showSeekIndicator = (type) => {
    setSeekIndicator(type);
    if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
    doubleTapTimerRef.current = setTimeout(() => {
      setSeekIndicator(null);
    }, 800);
  };

  // Double tap handler
  const handleTap = (event) => {
    if (isLocked) {
      toggleControls();
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const locationX = event.nativeEvent.locationX;

    if (lastTapRef.current && (now - lastTapRef.current.time) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const thirdWidth = widthRef.current / 3;
      if (locationX < thirdWidth) {
        // Double tap left third - seek backward 10s (only for VOD)
        if (status.durationMillis) {
          seekRelative(-10000);
          showSeekIndicator('backward');
        }
      } else if (locationX > widthRef.current - thirdWidth) {
        // Double tap right third - seek forward 10s (only for VOD)
        if (status.durationMillis) {
          seekRelative(10000);
          showSeekIndicator('forward');
        }
      } else {
        // Double tap center - play/pause
        handlePlayPause();
      }
      lastTapRef.current = null;
    } else {
      // Single tap register
      lastTapRef.current = { time: now };
      setTimeout(() => {
        if (lastTapRef.current && (Date.now() - lastTapRef.current.time) >= DOUBLE_TAP_DELAY) {
          toggleControls();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  // PanResponder to manage swipes (Volume & Brightness & Horizontal Channel Swiping)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        // Ignore top 50px and bottom 40px to prevent conflicts with phone status bar pull-down
        if (pageY < 50 || pageY > heightRef.current - 40) return false;
        // Ignore left 60px and right 60px to prevent conflicts with system back/navigation gestures
        if (pageX < 60 || pageX > widthRef.current - 60) return false;
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { pageX, pageY } = evt.nativeEvent;
        if (pageY < 50 || pageY > heightRef.current - 40) return false;
        if (pageX < 60 || pageX > widthRef.current - 60) return false;
        return Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: (evt, gestureState) => {
        startVolume.current = volumeRef.current;
        startBrightness.current = brightnessRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy, x0 } = gestureState;

        // If horizontal movement is dominant, ignore volume/brightness adjustment
        if (Math.abs(dx) > Math.abs(dy)) {
          return;
        }

        const scale = 800; // Increased scale from 200 to 800 for slower, more controlled adjustments
        const delta = -dy / scale;

        if (x0 < widthRef.current / 2) {
          // Adjust screen brightness (left 50%)
          const val = Math.max(0.25, Math.min(1.0, startBrightness.current + delta));
          setBrightness(val);
          brightnessRef.current = val; // Synchronously update ref to prevent stale jumps
          if (!isTV) {
            Brightness.setBrightnessAsync(val).catch((err) => {
              console.log('Error setting screen brightness:', err);
            });
          }
          setHudType('brightness');
          setHudVisible(true);
        } else {
          // Adjust audio volume (right 50%)
          const val = Math.max(0.0, Math.min(1.0, startVolume.current + delta));
          setVolume(val);
          volumeRef.current = val; // Synchronously update ref to prevent stale jumps
          if (VolumeManager) {
            try {
              VolumeManager.setVolume(val);
            } catch (err) {
              console.log('Error setting system volume:', err);
            }
          }
          setHudType('volume');
          setHudVisible(true);
        }

        showControlsWithTimeout();
        if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;

        // Swipe channel navigation logic (only for live TV streams)
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
          if (isLiveRef.current) {
            if (dx > 0) {
              handlePreviousChannelRef.current?.();
            } else {
              handleNextChannelRef.current?.();
            }
          }
        }

        hudTimerRef.current = setTimeout(() => {
          setHudVisible(false);
        }, 1000);
      },
    })
  ).current;

  // Format position & duration
  const formatTime = (millis) => {
    if (!millis || isNaN(millis)) return '00:00';
    const totalSeconds = millis / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const pad = (num) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const progress = (isLive || !status.durationMillis || status.durationMillis === 0) ? 0 : (status.positionMillis / status.durationMillis) * 100;

  const handleSeekBarTouch = (event) => {
    if (isLive || !status.durationMillis || seekBarWidth === 0) return;
    const { locationX } = event.nativeEvent;
    const pct = Math.max(0, Math.min(1, locationX / seekBarWidth));
    const target = pct * status.durationMillis;
    seekTo(target);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Video Content Container */}
      <View
        style={styles.videoContainer}
        {...(!isInPip ? panResponder.panHandlers : {})}
      >
        <Video
          ref={videoRef}
          source={{ uri: currentUrl }}
          rate={speed}
          volume={volume}
          isMuted={isMuted}
          resizeMode={RESIZE_MODES[resizeModeIndex]}
          shouldPlay={isPlaying}
          useNativeControls={false}
          staysActiveInBackground={true}
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => {
            setIsLoading(false);
            if (videoRef.current) {
              if (speed !== 1.0) {
                videoRef.current.setRateAsync(speed, true);
              }
              if (resumePosition > 0) {
                videoRef.current.setPositionAsync(resumePosition);
                positionRef.current = resumePosition;
              }
            }
          }}
          onError={(error) => {
            setIsLoading(false);
            console.log('Video error:', error, 'for URL:', currentUrl);
          }}
          onPlaybackStatusUpdate={(statusUpdate) => {
            setStatus(statusUpdate);
            if (statusUpdate.isLoaded) {
              positionRef.current = statusUpdate.positionMillis;
              if (statusUpdate.didJustFinish) {
                setIsPlaying(false);
              } else {
                setIsPlaying(statusUpdate.shouldPlay);
              }
            }
          }}
          style={styles.video}
        />

        {!isInPip && (
          <>
            {/* TV Box D-Pad Listener Background Focus Capture */}
            {isTV && !rightDrawerOpen && (isLive || !controlsVisible) && (
              <Pressable
                focusable={true}
                hasTVPreferredFocus={true}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  backgroundColor: 'transparent',
                  left: 0,
                  top: 0,
                }}
                onFocus={() => {
                  setFocusedBtnId('background-focus');
                }}
                onBlur={() => {
                  setFocusedBtnId((prev) => prev === 'background-focus' ? null : prev);
                }}
              />
            )}

            {/* Local Brightness Simulated Shade Layer */}
            {!isTV && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: '#000',
                    opacity: 1 - brightness,
                  },
                ]}
                pointerEvents="none"
              />
            )}

            {/* Transparent tap layer behind buttons to capture screen play toggling/double-taps */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleTap}
            />

            {/* Left edge touch area to open channels list */}
            {!isLocked && !rightDrawerOpen && (
              <TouchableOpacity
                style={styles.leftEdgeTouchZone}
                activeOpacity={1}
                onPress={() => {
                  setRightDrawerOpen(true);
                  showControlsWithTimeout();
                }}
              />
            )}

            {/* Right edge touch area to open channels list */}
            {!isLocked && !rightDrawerOpen && (
              <TouchableOpacity
                style={styles.rightEdgeTouchZone}
                activeOpacity={1}
                onPress={() => {
                  setRightDrawerOpen(true);
                  showControlsWithTimeout();
                }}
              />
            )}

            {/* Loading Spinner overlay */}
            {isLoading && (
              <View style={styles.spinnerWrapper} pointerEvents="none">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text style={styles.loadingText}>Loading Stream...</Text>
              </View>
            )}

            {/* Dynamic HUD Indicator Capsule (Gestures & Orientation matched) */}
            {hudVisible && (
              <View
                style={(hudType === 'volume' || hudType === 'brightness' || hudType === 'aspect') ? styles.hudSimpleContainer : styles.hudContainer}
                pointerEvents="none"
              >
                {hudType === 'volume' || hudType === 'brightness' || hudType === 'aspect' ? (
                  <Text style={styles.hudSimpleText}>
                    {hudType === 'volume'
                      ? `Volume: ${Math.round(volume * 100)}%`
                      : hudType === 'brightness'
                        ? `Brightness: ${Math.round(brightness * 100)}%`
                        : `Aspect: ${RESIZE_LABELS[resizeModeIndex]}`}
                  </Text>
                ) : (
                  <>
                    <Feather
                      name={
                        hudType === 'auto_rotate'
                          ? 'rotate-cw'
                          : hudType === 'lock_landscape'
                            ? 'video'
                            : 'smartphone'
                      }
                      size={24}
                      color="#FF0000"
                      style={{ marginBottom: 8 }}
                    />
                    <Text style={styles.hudText}>
                      {hudType === 'auto_rotate'
                        ? 'Auto Rotate'
                        : hudType === 'lock_landscape'
                          ? 'Landscape Locked'
                          : 'Portrait Locked'}
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* Double-Tap Seeking overlay indicator */}
            {seekIndicator && (
              <View style={styles.seekIndicatorContainer} pointerEvents="none">
                <View style={styles.seekIndicatorCircle}>
                  <Feather
                    name={seekIndicator === 'forward' ? 'chevrons-right' : 'chevrons-left'}
                    size={32}
                    color="#fff"
                  />
                  <Text style={styles.seekIndicatorText}>
                    {seekIndicator === 'forward' ? '+10s' : '-10s'}
                  </Text>
                </View>
              </View>
            )}

            {/* Control Interface Overlay */}
            {controlsVisible && !isLocked && (
              <View style={[styles.overlayWrapper, isLive && { backgroundColor: 'transparent' }]} pointerEvents="box-none">
                {/* Header section (HTML style matched) */}
                {!isLive && (
                  <View style={[
                    styles.header,
                    {
                      paddingTop: Math.max(12, insets.top),
                      paddingLeft: Math.max(20, insets.left),
                      paddingRight: Math.max(20, insets.right)
                    }
                  ]}>
                    <View style={styles.headerLeft}>
                      {channels && channels.length > 0 && (
                        <Pressable
                          onPress={() => {
                            setRightDrawerOpen(true);
                            showControlsWithTimeout();
                          }}
                          {...getTvProps('btn-menu', [styles.iconBtn, isPortrait && styles.iconBtnPortrait])}
                        >
                          <Feather name="menu" size={isPortrait ? 20 : 24} color="#fff" />
                        </Pressable>
                      )}

                      <Pressable
                        onPress={handlePopout}
                        {...getTvProps('btn-back', [styles.iconBtn, isPortrait && styles.iconBtnPortrait, { marginLeft: isPortrait ? 6 : 10 }])}
                      >
                        <Feather name="arrow-left" size={isPortrait ? 20 : 24} color="#fff" />
                      </Pressable>

                      <Text style={styles.headerTitle} numberOfLines={1}>
                        {currentTitle}
                      </Text>
                    </View>

                    <View style={styles.headerRight}>
                      {/* Cast Icon (Mocked) */}
                      {!isLive && (
                        <Feather name="cast" size={isPortrait ? 18 : 22} color="#fff" style={{ marginRight: 15 }} />
                      )}

                      {/* Settings Toggle */}
                      {!isLive && (
                        <Pressable
                          onPress={() => {
                            setShowSpeedMenu(!showSpeedMenu);
                            showControlsWithTimeout();
                          }}
                          {...getTvProps('btn-settings', [styles.iconBtn, isPortrait && styles.iconBtnPortrait])}
                        >
                          <Feather name="settings" size={isPortrait ? 18 : 22} color="#fff" />
                        </Pressable>
                      )}

                      {/* Device Info Indicator with Accurate Battery Status */}
                      <Text style={styles.deviceInfoText}>
                        {systemTime} · {batteryLevel}%
                      </Text>

                      {/* Right Switcher Categories Drawer Trigger */}
                      {channels && channels.length > 0 && (
                        <Pressable
                          onPress={() => {
                            setRightDrawerOpen(true);
                            showControlsWithTimeout();
                          }}
                          {...getTvProps('btn-list', [styles.iconBtn, isPortrait && styles.iconBtnPortrait, { marginLeft: isPortrait ? 8 : 12 }])}
                        >
                          <Feather name="list" size={isPortrait ? 18 : 22} color="#fff" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}

                {/* Playback Settings Dropdown */}
                {showSpeedMenu && !isLive && (
                  <View style={[
                    styles.speedMenu,
                    {
                      top: Math.max(65, 50 + insets.top),
                      right: Math.max(20, insets.right) + 50,
                    }
                  ]}>
                    <Text style={styles.settingsSectionTitle}>Playback Speed</Text>
                    <View style={styles.settingsRow}>
                      {SPEEDS.map((sp) => (
                        <TouchableOpacity
                          key={sp}
                          onPress={() => changeSpeed(sp)}
                          {...getTvProps('speed-' + sp, [styles.settingsOption, speed === sp && styles.settingsOptionActive])}
                        >
                          <Text style={[styles.settingsText, speed === sp && styles.settingsTextActive]}>
                            {sp === 1.0 ? 'Normal' : `${sp}x`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>


                  </View>
                )}

                {/* Middle Play/Pause Assist Button centered strictly */}
                {!isPlaying && !isLive && (
                  <TouchableOpacity
                    onPress={handlePlayPause}
                    activeOpacity={0.8}
                    {...getTvProps('btn-mid-play', [styles.midPlayBtn, isPortrait && styles.midPlayBtnPortrait])}
                  >
                    <Feather name="play" size={isPortrait ? 32 : 44} color="#FF0000" style={{ marginLeft: isPortrait ? 4 : 6 }} />
                  </TouchableOpacity>
                )}

                {/* Bottom Controls Area (HTML structure matched) */}
                {!isLive && (
                  <View style={[
                    styles.bottomControls,
                    {
                      paddingBottom: Math.max(15, insets.bottom),
                      paddingLeft: Math.max(20, insets.left),
                      paddingRight: Math.max(20, insets.right)
                    }
                  ]}>
                    {/* VOD Progress Bar and Time labels */}
                    {!isLive && (
                      <View style={styles.progressBlock}>
                        <View style={styles.ptimeRow}>
                          <Text style={styles.timeText}>
                            {formatTime(status.positionMillis)}
                          </Text>
                          <Text style={styles.timeText}>
                            {formatTime(status.durationMillis)}
                          </Text>
                        </View>

                        {/* HTML style Seekbar */}
                        <TouchableOpacity
                          style={styles.seekBarWrapper}
                          activeOpacity={1}
                          onPress={handleSeekBarTouch}
                          onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
                        >
                          <View style={styles.seekBarBg}>
                            <View style={[styles.seekBarFill, { width: `${progress}%` }]} />
                            <View style={[styles.seekBarKnob, { left: `${progress}%` }]} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* LIVE Stream overlay layout */}
                    {isLive && (
                      <View style={styles.liveContainer}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE STREAM</Text>
                      </View>
                    )}

                    {/* Control Action Buttons Row */}
                    {isPortrait ? (
                      <View style={styles.portraitControlsWrapper}>
                        {/* Row 1: Lock Button & Right Actions */}
                        <View style={styles.portraitTopRow}>
                          <TouchableOpacity
                            onPress={() => {
                              setIsLocked(true);
                              setControlsVisible(false);
                              setLockBtnVisible(true);
                            }}
                            activeOpacity={0.7}
                            {...getTvProps('btn-lock', [styles.lockBtn, styles.lockBtnPortrait])}
                          >
                            <Feather name="lock" size={20} color="#fff" />
                          </TouchableOpacity>

                          <View style={[styles.rightActionsRow, styles.rightActionsRowPortrait]}>
                            <TouchableOpacity
                              onPress={toggleMute}
                              activeOpacity={0.7}
                              {...getTvProps('btn-mute', [styles.actionIconBtn, styles.actionIconBtnPortrait])}
                            >
                              <Feather
                                name={isMuted || volume === 0 ? 'volume-x' : 'volume-2'}
                                size={20}
                                color="#fff"
                              />
                            </TouchableOpacity>

                            {!isTVDevice && (
                              <TouchableOpacity
                                onPress={handlePopout}
                                activeOpacity={0.7}
                                {...getTvProps('btn-pip', [styles.actionIconBtn, styles.actionIconBtnPortrait, { marginLeft: 8 }])}
                              >
                                <MaterialIcons name="picture-in-picture-alt" size={20} color="#fff" />
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              onPress={cycleResizeMode}
                              activeOpacity={0.7}
                              {...getTvProps('btn-aspect', [styles.actionIconBtn, styles.actionIconBtnPortrait, { marginLeft: 8 }])}
                            >
                              <MaterialIcons name="aspect-ratio" size={20} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Row 2: Playback Controls (Skip/Play/Seek) */}
                        {!isLive && (
                          <View style={styles.portraitBottomRow}>
                            <TouchableOpacity
                              onPress={() => {
                                if (channels && channels.length > 0) {
                                  handlePreviousChannel();
                                } else {
                                  seekTo(0);
                                }
                              }}
                              disabled={isLive && (!channels || channels.length === 0)}
                              {...getTvProps('btn-prev', [styles.ctrlIconBtn, styles.ctrlIconBtnPortrait, isLive && (!channels || channels.length === 0) && { opacity: 0.25 }])}
                            >
                              <Feather name="skip-back" size={20} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => seekRelative(-10000)}
                              disabled={isLive}
                              {...getTvProps('btn-replay', [styles.ctrlIconBtn, styles.ctrlIconBtnPortrait, isLive && { opacity: 0.25 }])}
                            >
                              <MaterialIcons name="replay-10" size={22} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={handlePlayPause}
                              activeOpacity={0.7}
                              {...getTvProps('btn-play', [styles.mainPlayCircle, styles.mainPlayCirclePortrait])}
                            >
                              <Feather
                                name={isPlaying ? 'pause' : 'play'}
                                size={24}
                                color="#fff"
                                style={!isPlaying && { marginLeft: 3 }}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => seekRelative(10000)}
                              disabled={isLive}
                              {...getTvProps('btn-forward', [styles.ctrlIconBtn, styles.ctrlIconBtnPortrait, isLive && { opacity: 0.25 }])}
                            >
                              <MaterialIcons name="forward-10" size={22} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => {
                                if (channels && channels.length > 0) {
                                  handleNextChannel();
                                } else {
                                  seekTo(status.durationMillis || 0);
                                }
                              }}
                              disabled={isLive && (!channels || channels.length === 0)}
                              {...getTvProps('btn-next', [styles.ctrlIconBtn, styles.ctrlIconBtnPortrait, isLive && (!channels || channels.length === 0) && { opacity: 0.25 }])}
                            >
                              <Feather name="skip-forward" size={20} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.controlButtonsRow}>
                        {/* Lock Trigger Button */}
                        <TouchableOpacity
                          onPress={() => {
                            setIsLocked(true);
                            setControlsVisible(false);
                            setLockBtnVisible(true);
                          }}
                          activeOpacity={0.7}
                          {...getTvProps('btn-lock', [styles.lockBtn, isPortrait && styles.lockBtnPortrait])}
                        >
                          <Feather name="lock" size={isPortrait ? 20 : 24} color="#fff" />
                        </TouchableOpacity>

                        {/* Main Player Skip / Rewind / Play Controls (HTML styled) */}
                        {!isLive && (
                          <View style={[styles.pctrl, isPortrait && styles.pctrlPortrait]}>
                            <TouchableOpacity
                              onPress={() => {
                                if (channels && channels.length > 0) {
                                  handlePreviousChannel();
                                } else {
                                  seekTo(0);
                                }
                              }}
                              disabled={isLive && (!channels || channels.length === 0)}
                              {...getTvProps('btn-prev', [
                                styles.ctrlIconBtn,
                                isPortrait && styles.ctrlIconBtnPortrait,
                                isLive && (!channels || channels.length === 0) && { opacity: 0.25 }
                              ])}
                            >
                              <Feather name="skip-back" size={isPortrait ? 20 : 24} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => seekRelative(-10000)}
                              disabled={isLive}
                              {...getTvProps('btn-replay', [styles.ctrlIconBtn, isPortrait && styles.ctrlIconBtnPortrait, isLive && { opacity: 0.25 }])}
                            >
                              <MaterialIcons name="replay-10" size={isPortrait ? 22 : 26} color="#fff" />
                            </TouchableOpacity>

                            {/* Main Play Circle Icon */}
                            <TouchableOpacity
                              onPress={handlePlayPause}
                              activeOpacity={0.7}
                              {...getTvProps('btn-play', [styles.mainPlayCircle, isPortrait && styles.mainPlayCirclePortrait])}
                            >
                              <Feather
                                name={isPlaying ? 'pause' : 'play'}
                                size={isPortrait ? 24 : 30}
                                color="#fff"
                                style={!isPlaying && { marginLeft: isPortrait ? 3 : 5 }}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => seekRelative(10000)}
                              disabled={isLive}
                              {...getTvProps('btn-forward', [styles.ctrlIconBtn, isPortrait && styles.ctrlIconBtnPortrait, isLive && { opacity: 0.25 }])}
                            >
                              <MaterialIcons name="forward-10" size={isPortrait ? 22 : 26} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => {
                                if (channels && channels.length > 0) {
                                  handleNextChannel();
                                } else {
                                  seekTo(status.durationMillis || 0);
                                }
                              }}
                              disabled={isLive && (!channels || channels.length === 0)}
                              {...getTvProps('btn-next', [
                                styles.ctrlIconBtn,
                                isPortrait && styles.ctrlIconBtnPortrait,
                                isLive && (!channels || channels.length === 0) && { opacity: 0.25 }
                              ])}
                            >
                              <Feather name="skip-forward" size={isPortrait ? 20 : 24} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Right controls layout (Volume, Aspect Ratio) */}
                        <View style={[styles.rightActionsRow, isPortrait && styles.rightActionsRowPortrait]}>
                          <TouchableOpacity
                            onPress={toggleMute}
                            activeOpacity={0.7}
                            {...getTvProps('btn-mute', [styles.actionIconBtn, isPortrait && styles.actionIconBtnPortrait])}
                          >
                            <Feather
                              name={isMuted || volume === 0 ? 'volume-x' : 'volume-2'}
                              size={isPortrait ? 20 : 24}
                              color="#fff"
                            />
                          </TouchableOpacity>

                          {/* Popout / Picture-in-Picture Button */}
                          {!isTVDevice && (
                            <TouchableOpacity
                              onPress={handlePopout}
                              activeOpacity={0.7}
                              {...getTvProps('btn-pip', [
                                styles.actionIconBtn,
                                isPortrait && styles.actionIconBtnPortrait,
                                { marginLeft: isPortrait ? 8 : 15 }
                              ])}
                            >
                              <MaterialIcons name="picture-in-picture-alt" size={isPortrait ? 20 : 24} color="#fff" />
                            </TouchableOpacity>
                          )}

                          {/* Aspect Ratio Button to toggle fit/fill/stretch */}
                          <TouchableOpacity
                            onPress={cycleResizeMode}
                            activeOpacity={0.7}
                            {...getTvProps('btn-aspect', [
                              styles.actionIconBtn,
                              isPortrait && styles.actionIconBtnPortrait,
                              { marginLeft: isPortrait ? 8 : 15 }
                            ])}
                          >
                            <MaterialIcons
                              name="aspect-ratio"
                              size={isPortrait ? 20 : 24}
                              color="#fff"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Lock Overlay screen HUD */}
            {(isLocked && (lockBtnVisible || controlsVisible)) && (
              <TouchableOpacity
                style={styles.lockOverlay}
                activeOpacity={1}
                onPress={toggleControls}
              >
                <TouchableOpacity
                  onPress={() => {
                    setIsLocked(false);
                    setControlsVisible(true);
                    showControlsWithTimeout();
                  }}
                  activeOpacity={0.7}
                  {...getTvProps('btn-unlock', [styles.lockBtnFloating])}
                >
                  <Feather name="lock" size={20} color="#FF0000" />
                  <Text style={styles.lockHintText}>Tap to Unlock</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Unified Channels & Categories Switcher Drawer Sidebar */}
      {rightDrawerOpen && channels && channels.length > 0 && !isInPip && (
        <View style={styles.drawerWrapper}>
          <View style={[styles.leftDrawerPanel, { width: 260, paddingTop: 0 }]}>
            <View style={{ flex: 1 }}>
              {/* Single Category Row */}
              <View style={styles.drawerCategoriesRow}>
                <Pressable
                  onPress={handlePrevCategory}
                  {...getTvProps('drawer-cat-prev', styles.drawerCategoryArrowBtn)}
                >
                  <Feather name="chevron-left" size={20} color="#fff" />
                </Pressable>

                <View style={styles.drawerCategoryTextContainer}>
                  <Text style={[styles.drawerCategoryTextSingle, { color: isLive ? '#00C853' : '#FF0000' }]}>
                    {selectedCategory}
                  </Text>
                </View>

                <Pressable
                  onPress={handleNextCategory}
                  {...getTvProps('drawer-cat-next', styles.drawerCategoryArrowBtn)}
                >
                  <Feather name="chevron-right" size={20} color="#fff" />
                </Pressable>
              </View>

              {/* Vertical Channels List */}
              <FlatList
                // ম্যাজিক ফিক্স: যখনই ড্রয়ার ওপেন হবে, এই key চেঞ্জ হবে এবং লিস্ট নতুন করে সঠিক পজিশনে রেন্ডার হবে
                key={rightDrawerOpen ? 'drawer-open' : 'drawer-closed'}
                ref={channelsListRef}
                getItemLayout={getItemLayout}
                data={filteredChannels}
                keyExtractor={(item) => item.id}
                // ইনডেক্স খুঁজে বের করার লজিক একটু সেফ করে দিলাম
                initialScrollIndex={
                  filteredChannels.findIndex(c => String(c.id) === String(activeChannelId)) > 0
                    ? filteredChannels.findIndex(c => String(c.id) === String(activeChannelId))
                    : 0
                }
                viewPosition={0} // লিস্টের একদম উপরে দেখাবে
                contentContainerStyle={styles.drawerList}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={false}
                // স্ক্রলিং ফেইল করলে যাতে অ্যাপ ক্র্যাশ না করে
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise(resolve => setTimeout(resolve, 500));
                  wait.then(() => {
                    channelsListRef.current?.scrollToIndex({ index: info.index, animated: false });
                  });
                }}
                ListEmptyComponent={
                  <View style={styles.emptyDrawerContainer}>
                    <Text style={styles.emptyDrawerText}>No channels in this category</Text>
                  </View>
                }
                renderItem={({ item, index }) => (
                  <DrawerChannelItem
                    item={item}
                    index={index}
                    isActive={String(item.id) === String(activeChannelId)}
                    isLive={isLive}
                    isTV={isTV}
                    rightDrawerOpen={rightDrawerOpen}
                    focusedDrawerIndex={focusedDrawerIndex}
                    initialFocusDone={initialFocusDone}
                    onPress={() => {
                      setActiveChannelId(item.id);
                      setCurrentUrl(item.streamUrl);
                      setCurrentTitle(item.name);
                      setIsLoading(true);
                      setRightDrawerOpen(false);
                      setIsPlaying(true);
                      showControlsWithTimeout();
                    }}
                    onFocus={(idx) => {
                      setFocusedDrawerIndex(idx);
                    }}
                    getTvProps={getTvProps}
                  />
                )}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setRightDrawerOpen(false)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  leftEdgeTouchZone: {
    position: 'absolute',
    left: 0,
    top: 80,
    bottom: 80,
    width: 300,
    zIndex: 8,
    backgroundColor: 'transparent',
  },
  rightEdgeTouchZone: {
    position: 'absolute',
    right: 0,
    top: 80,
    bottom: 80,
    width: 300,
    zIndex: 8,
    backgroundColor: 'transparent',
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  spinnerWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '600',
  },
  hudContainer: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    minWidth: 100,
  },
  hudSimpleContainer: {
    position: 'absolute',
    top: '48%',
    alignSelf: 'center',
    zIndex: 15,
    backgroundColor: 'transparent',
  },
  hudSimpleText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    ...Platform.select({
      web: {
        textShadow: '1.5px 1.5px 4px rgba(0, 0, 0, 0.8)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1.5, height: 1.5 },
        textShadowRadius: 4,
      },
    }),
  },
  hudBarVerticalOuter: {
    width: 4,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  hudBarVerticalInner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF0000',
    width: '100%',
  },
  hudPercentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  hudText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  seekIndicatorContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 12,
  },
  seekIndicatorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  header: {
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBtn: {
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  iconBtnPortrait: {
    padding: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceInfoText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 15,
  },
  speedMenu: {
    position: 'absolute',
    right: 70,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 20,
    width: 250,
  },
  settingsSectionTitle: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  settingsOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsOptionActive: {
    backgroundColor: 'rgba(0, 200, 83, 0.2)',
    borderColor: 'rgba(0, 200, 83, 0.4)',
    borderWidth: 0.5,
  },
  settingsText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
  },
  settingsTextActive: {
    color: '#FF0000',
    fontWeight: '700',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  midPlayBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 200, 83, 0.5)',
  },
  midPlayBtnPortrait: {
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  bottomControls: {
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: '100%',
  },
  progressBlock: {
    width: '100%',
    marginBottom: 10,
  },
  ptimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  timeText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '600',
  },
  seekBarWrapper: {
    width: '100%',
    height: 16,
    justifyContent: 'center',
  },
  seekBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  seekBarFill: {
    height: '100%',
    backgroundColor: '#FF0000',
    borderRadius: 2,
  },
  seekBarKnob: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0000',
    position: 'absolute',
    top: -4,
    marginLeft: -6,
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 5px rgba(255, 0, 0, 0.8)',
      },
      default: {
        shadowColor: '#FF0000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
      },
    }),
    elevation: 3,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  controlButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  lockBtn: {
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  pctrl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlIconBtn: {
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  mainPlayCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 18,
  },
  lockBtnFloating: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF0000',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  lockHintText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  playerBtnFocused: {
    borderColor: '#FFD600',
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    transform: [{ scale: 1.08 }],
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 5,
  },
  drawerItemFocused: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderColor: '#FFD600',
    borderWidth: 1.5,
    borderRadius: 8,
  },
  drawerWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 30,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  leftDrawerPanel: {
    width: 260,
    height: '100%',
    backgroundColor: 'rgba(10, 10, 10, 0.25)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 0,
  },
  drawerPanel: {
    height: '100%',
    backgroundColor: 'rgba(10, 10, 10, 0.25)', // 60% transparent background (40% opacity)
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 15,
  },
  drawerCategoriesRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  drawerCategoryArrowBtn: {
    padding: 6,
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  drawerCategoryTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCategoryTextSingle: {
    fontSize: 15,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  leftDrawerList: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  drawerList: {
    paddingVertical: 10,
  },
  categoryCard: {
    width: '100%',
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  categoryCardBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 15,
    borderWidth: 3,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  drawerItemActive: {
    backgroundColor: 'rgba(0, 200, 83, 0.08)',
  },
  drawerItemLogo: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 12,
    resizeMode: 'contain',
    backgroundColor: '#fff',
  },
  drawerItemLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerItemText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  drawerItemTextActive: {
    color: '#FF0000',
    fontWeight: '700',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
  },
  emptyDrawerContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyDrawerText: {
    color: '#888',
    fontSize: 12,
  },
  lockBtnPortrait: {
    padding: 6,
  },
  pctrlPortrait: {
  },
  ctrlIconBtnPortrait: {
    padding: 6,
    marginHorizontal: 3,
  },
  mainPlayCirclePortrait: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 6,
  },
  rightActionsRowPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtnPortrait: {
    padding: 6,
  },
  portraitControlsWrapper: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  portraitTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  portraitBottomRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
