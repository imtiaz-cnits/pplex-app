import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Platform,
  useWindowDimensions,
  DeviceEventEmitter,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOverlays } from '../context/OverlayContext';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../components/TopBar';
import Logo from '../components/Logo';
import { MOCK_CHANNELS, MOCK_ACTORS } from '../constants/mockData';
import { fetchLatestMovies, getImageUrl, getBackdropUrl } from '../services/jellyfinApi';

const { width, height } = Dimensions.get('window');
const isTVGlobal = Platform.isTV || (Math.min(width, height) >= 500 && Math.max(width, height) > 900);
const CAROUSEL_HEIGHT = Platform.isTV ? 380 : 250;
const TV_LIVE_ROW_HEIGHT = 117;
const TV_MOVIE_ROW_HEIGHT = 204;

const HeroCarouselItem = React.memo(({ item, index, colors, isTV, onPress, width, CAROUSEL_HEIGHT }) => {
  const backdropUrl = getBackdropUrl(item.Id) || getImageUrl(item.Id);
  const rating = item.CommunityRating ? item.CommunityRating.toFixed(1) : null;
  const releaseYear = item.ProductionYear || (item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : 'N/A');
  const genre = item.Genres && item.Genres.length > 0 ? item.Genres[0] : 'Movie';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{ width: width, height: CAROUSEL_HEIGHT, position: 'relative' }}
      onPress={() => onPress(item)}
    >
      {backdropUrl ? (
        <Image source={{ uri: backdropUrl }} style={styles.heroImage} />
      ) : (
        <View style={[styles.heroImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]} />
      )}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0, 0, 0, 0.6)', colors.phBg]}
        style={styles.heroOverlay}
      />
      <View style={styles.badgeContainer}>
        <View style={[styles.heroBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroBadgeText}>Trending #{index + 1}</Text>
        </View>
      </View>
      <View style={styles.heroInfo}>
        <Text style={[styles.heroTitle, { fontSize: isTV ? 36 : 28 }]} numberOfLines={1}>{item.Name}</Text>
        <Text style={styles.heroSub}>
          {`${genre} • ${releaseYear}${rating ? ` • ⭐ ${rating}` : ''}`}
        </Text>
        {item.Overview ? (
          <Text style={styles.heroOverview} numberOfLines={2}>
            {item.Overview}
          </Text>
        ) : null}
      </View>
      <View style={styles.playFab}>
        <Feather name="play" size={24} color="#fff" style={{ marginLeft: 2 }} />
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { setIsLoading, channels, fetchGlobalPlaylist, showComingSoon } = useOverlays();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const sWidth = (typeof screenWidth === 'number' && !isNaN(screenWidth) && screenWidth > 0) ? screenWidth : 960;
  const sHeight = (typeof screenHeight === 'number' && !isNaN(screenHeight) && screenHeight > 0) ? screenHeight : 540;

  const isTV = isTVGlobal;

  const tvContentWidth = sWidth - 70;
  const numCols = 5;
  const gridGap = 12;
  const tvCardWidth = Math.floor((tvContentWidth - (numCols - 1) * gridGap) / numCols);

  const [tvSection, setTvSection] = useState('live');
  const [tvLiveCat, setTvLiveCat] = useState('All');
  const [tvMovieCat, setTvMovieCat] = useState('All');
  const [tvActiveSubScreen, setTvActiveSubScreen] = useState('hub');
  const [movies, setMovies] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [initialFocusDone, setInitialFocusDone] = useState(false);

  useEffect(() => {
    setInitialFocusDone(false);
    const timer = setTimeout(() => {
      setInitialFocusDone(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [tvActiveSubScreen]);

  const [customFocusedKey, setCustomFocusedKey] = useState(isTV ? 'hub-0' : 'sidebar-0');
  const tvGridRef = useRef(null);
  const tvCatScrollRef = useRef(null);

  const liveCategories = ['All', ...new Set(channels.map((c) => c.category?.trim()).filter(Boolean))];
  const movieCategories = ['All', ...new Set(movies.map((m) => m.Genres?.[0]?.trim()).filter(Boolean))];

  const activeCategories = tvSection === 'live' ? liveCategories : movieCategories;
  const activeCategory = tvSection === 'live' ? tvLiveCat : tvMovieCat;
  const setActiveCategory = tvSection === 'live' ? setTvLiveCat : setTvMovieCat;

  const filteredItems = tvSection === 'live'
    ? channels.filter((c) => tvLiveCat === 'All' || c.category?.trim() === tvLiveCat)
    : movies.filter((m) => tvMovieCat === 'All' || (m.Genres && m.Genres.includes(tvMovieCat)));

  const customFocusedKeyRef = useRef(customFocusedKey);
  const tvSectionRef = useRef(tvSection);
  const activeCategoriesRef = useRef(activeCategories);
  const filteredItemsRef = useRef(filteredItems);
  const channelsRef = useRef(channels);
  const tvActiveSubScreenRef = useRef(tvActiveSubScreen);
  const isTVRef = useRef(isTV);

  useEffect(() => { customFocusedKeyRef.current = customFocusedKey; }, [customFocusedKey]);
  useEffect(() => { tvSectionRef.current = tvSection; }, [tvSection]);
  useEffect(() => { activeCategoriesRef.current = activeCategories; }, [activeCategories]);
  useEffect(() => { filteredItemsRef.current = filteredItems; }, [filteredItems]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);
  useEffect(() => { tvActiveSubScreenRef.current = tvActiveSubScreen; }, [tvActiveSubScreen]);
  useEffect(() => { isTVRef.current = isTV; }, [isTV]);

  // Active Focus recovery to keep tvActiveSubScreen and customFocusedKey in sync
  useEffect(() => {
    if (isTV) {
      if (tvActiveSubScreen === 'hub') {
        if (!customFocusedKey || !customFocusedKey.startsWith('hub-')) {
          console.log('[DEBUG] Focus Recovery: Resetting customFocusedKey to hub-0');
          setCustomFocusedKey('hub-0');
        }
      } else if (tvActiveSubScreen === 'live_grid' || tvActiveSubScreen === 'movie_grid') {
        if (!customFocusedKey || (!customFocusedKey.startsWith('grid-') && customFocusedKey !== 'back-btn')) {
          console.log('[DEBUG] Focus Recovery: Resetting customFocusedKey to grid-0');
          setCustomFocusedKey('grid-0');
        }
      }
    }
  }, [tvActiveSubScreen, isTV, customFocusedKey]);

  // Custom TV D-Pad Focus Event Listener
  useEffect(() => {
    console.log('[DEBUG] HomeScreen mounted/rendered. isTV:', isTV, 'width:', screenWidth, 'height:', screenHeight, 'OS:', Platform.OS);
  }, [isTV, screenWidth, screenHeight]);

  // Custom TV D-Pad Focus Event Listener (using native device event emitter)
  useEffect(() => {
    console.log('[DEBUG] Enabling Custom onHWKeyEvent listener in HomeScreen (Unconditional)');

    const subscription = DeviceEventEmitter.addListener('onHWKeyEvent', (evt) => {
      try {
        if (!evt) return;

        const { eventType, eventKeyAction } = evt;
        setDebugLogs((prev) => {
          const logStr = `${new Date().toLocaleTimeString()}: ${eventType} (action: ${eventKeyAction})`;
          return [logStr, ...prev].slice(0, 5);
        });

        console.log('[DEBUG] TV Key Event in HomeScreen:', eventType, 'action:', eventKeyAction);
        if (eventKeyAction !== undefined && eventKeyAction !== 0) return;

        const currentFocusedKey = String(customFocusedKeyRef.current || 'hub-0');
        const currentTvSection = tvSectionRef.current;
        const currentActiveCategories = activeCategoriesRef.current || [];
        const currentFilteredItems = filteredItemsRef.current || [];
        const currentTvActiveSubScreen = tvActiveSubScreenRef.current || 'hub';

        if (
          eventType === 'up' ||
          eventType === 'down' ||
          eventType === 'left' ||
          eventType === 'right'
        ) {
          let nextKey = currentFocusedKey;

          if (currentTvActiveSubScreen === 'hub') {
            if (currentFocusedKey.startsWith('hub-')) {
              const idx = parseInt(currentFocusedKey.split('-')[1], 10);
              if (eventType === 'left') {
                nextKey = `hub-${Math.max(0, idx - 1)}`;
              } else if (eventType === 'right') {
                nextKey = `hub-${Math.min(2, idx + 1)}`;
              }
            } else {
              nextKey = 'hub-0';
            }
          }
          else if (currentFocusedKey === 'back-btn') {
            if (eventType === 'down') {
              if (currentFilteredItems.length > 0) {
                nextKey = 'grid-0';
              }
            }
          }
          else if (currentFocusedKey.startsWith('grid-')) {
            const idx = parseInt(currentFocusedKey.split('-')[1], 10);
            const cols = 5;

            if (eventType === 'left') {
              const col = idx % cols;
              if (col > 0) {
                nextKey = `grid-${idx - 1}`;
              }
            } else if (eventType === 'right') {
              const col = idx % cols;
              if (col < cols - 1 && idx + 1 < currentFilteredItems.length) {
                nextKey = `grid-${idx + 1}`;
              }
            } else if (eventType === 'down') {
              if (idx + cols < currentFilteredItems.length) {
                nextKey = `grid-${idx + cols}`;
              }
            } else if (eventType === 'up') {
              if (idx >= cols) {
                nextKey = `grid-${idx - cols}`;
              } else {
                nextKey = 'back-btn';
              }
            }
          }

          if (nextKey !== currentFocusedKey) {
            console.log('[DEBUG] Transitioning customFocusedKey from:', currentFocusedKey, 'to:', nextKey, 'on event:', eventType);
            setCustomFocusedKey(nextKey);
          } else {
            console.log('[DEBUG] Focus key did not change from:', currentFocusedKey, 'on event:', eventType);
          }
        }
        else if (eventType === 'select' || eventType === 'center' || eventType === 'playPause') {
          console.log('[DEBUG] Select/Enter key pressed on key:', currentFocusedKey);
          if (currentTvActiveSubScreen === 'hub') {
            if (currentFocusedKey === 'hub-0') {
              setTvSection('live');
              setTvLiveCat('All');
              setTvActiveSubScreen('live_grid');
              setCustomFocusedKey('grid-0');
            } else if (currentFocusedKey === 'hub-1') {
              setTvSection('movies');
              setTvMovieCat('All');
              setTvActiveSubScreen('movie_grid');
              setCustomFocusedKey('grid-0');
            } else if (currentFocusedKey === 'hub-2') {
              setIsLoading(true);
              fetchGlobalPlaylist().finally(() => {
                setIsLoading(false);
              });
            }
          }
          else if (currentFocusedKey === 'back-btn') {
            setTvActiveSubScreen('hub');
            setCustomFocusedKey(currentTvSection === 'live' ? 'hub-0' : 'hub-1');
          }
          else if (currentFocusedKey.startsWith('grid-')) {
            const idx = parseInt(currentFocusedKey.split('-')[1], 10);
            if (idx >= 0 && idx < currentFilteredItems.length) {
              const item = currentFilteredItems[idx];
              if (currentTvSection === 'live') {
                navigation.navigate('Player', {
                  streamUrl: item.streamUrl,
                  title: item.name,
                  channels: channelsRef.current,
                  currentChannelId: item.id,
                  isLive: true
                });
              } else {
                navigation.navigate('MovieDetail', { movie: item });
              }
            }
          }
        }
      } catch (err) {
        console.error('[ERROR] Error in onHWKeyEvent listener:', err);
      }
    });

    return () => {
      console.log('[DEBUG] Cleaning up Custom onHWKeyEvent listener in HomeScreen');
      subscription.remove();
    };
  }, []);

  // Auto-scroll ScrollViews/FlatLists on D-pad navigation
  useEffect(() => {
    if (!isTV) return;

    const timer = setTimeout(() => {
      try {
        if (customFocusedKey.startsWith('grid-')) {
          const idx = parseInt(customFocusedKey.split('-')[1], 10);
          const rowIndex = Math.floor(idx / numCols);
          const cardHeight = tvSection === 'live' ? tvCardWidth / 1.3 : tvCardWidth / 0.7;
          const rowHeight = cardHeight + gridGap;
          const targetOffset = Math.max(0, rowIndex * rowHeight - rowHeight);

          tvGridRef.current?.scrollToOffset({
            offset: targetOffset,
            animated: false,
          });
        } else if (customFocusedKey.startsWith('category-')) {
          const idx = parseInt(customFocusedKey.split('-')[1], 10);
          tvCatScrollRef.current?.scrollTo({
            x: Math.max(0, idx * 110 - 100),
            animated: false,
          });
        }
      } catch (err) {
        console.log('[DEBUG] Auto-scroll error in HomeScreen:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [customFocusedKey, isTV, tvSection, tvCardWidth]);

  // Scroll to last focused item when screen gains focus
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (isTV) {
        const currentFocusedKey = customFocusedKeyRef.current;
        if (currentFocusedKey.startsWith('grid-')) {
          const idx = parseInt(currentFocusedKey.split('-')[1], 10);
          const rowIndex = Math.floor(idx / numCols);
          const cardHeight = tvSectionRef.current === 'live' ? tvCardWidth / 1.3 : tvCardWidth / 0.7;
          const rowHeight = cardHeight + gridGap;
          const targetOffset = Math.max(0, rowIndex * rowHeight - rowHeight);

          setTimeout(() => {
            try {
              tvGridRef.current?.scrollToOffset({
                offset: targetOffset,
                animated: false,
              });
            } catch (err) {
              console.log('[DEBUG] Focus listener scroll error in HomeScreen:', err);
            }
          }, 50);
        }
      }
    });
    return unsubscribeFocus;
  }, [navigation, isTV, tvCardWidth]);

  // TV remote hardware back button listener
  useEffect(() => {
    const backAction = () => {
      if (isTV && tvActiveSubScreenRef.current !== 'hub') {
        setTvActiveSubScreen('hub');
        setCustomFocusedKey(tvSectionRef.current === 'live' ? 'hub-0' : 'hub-1');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isTV]);

  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef(null);
  const slideInterval = useRef(null);

  const newMoviesRef = useRef(null);
  const trendingRef = useRef(null);
  const newMoviesOffset = useRef(0);
  const trendingOffset = useRef(0);

  const slideList = (ref, offsetRef, direction) => {
    const cardWidth = 142;
    const step = cardWidth * 2;
    let newOffset = offsetRef.current + direction * step;
    if (newOffset < 0) newOffset = 0;
    offsetRef.current = newOffset;
    ref.current?.scrollToOffset({ offset: newOffset, animated: true });
  };

  const handleScroll = (event, offsetRef) => {
    offsetRef.current = event.nativeEvent.contentOffset.x;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await fetchGlobalPlaylist();
      const latestMovies = await fetchLatestMovies(200);
      setMovies(latestMovies);
    } catch (err) {
      console.log('Error loading HomeScreen data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  // Target categories in the exact specific order requested
  const targetCategories = [
    'Bollywood',
    'Hollywood',
    'TV Shows & Web Series',
    'Bangla',
    'Bangla Dubbed',
    'Hindi Dubbed',
    'Collections',
    'Animation'
  ];

  let selectedHeroMovies = [];
  let usedIds = new Set();

  targetCategories.forEach(category => {
    // Find exactly 1 valid item for this category (max 8 slides total)
    const matches = movies.filter(m => {
      if (usedIds.has(m.Id)) return false; // Avoid duplicates across categories
      if (!m.BackdropImageTags || m.BackdropImageTags.length === 0) return false; // Must have a backdrop

      // Check if it matches via Genre or Folder Path
      const matchesGenre = m.Genres && m.Genres.some(g => g.toLowerCase().includes(category.toLowerCase()));
      const matchesPath = m.Path && m.Path.toLowerCase().includes(category.toLowerCase());

      return matchesGenre || matchesPath;
    }).slice(0, 1);

    matches.forEach(m => {
      selectedHeroMovies.push(m);
      usedIds.add(m.Id);
    });
  });

  const heroMovies = selectedHeroMovies;
  const recentChannels = channels.slice(0, 4);

  // Auto-sliding Hero Carousel
  useEffect(() => {
    if (!heroMovies || heroMovies.length === 0) return;

    slideInterval.current = setInterval(() => {
      if (isNaN(activeSlide)) {
        setActiveSlide(0);
        return;
      }
      let nextSlide = (activeSlide + 1) % heroMovies.length;
      if (isNaN(nextSlide)) return;
      setActiveSlide(nextSlide);
      sliderRef.current?.scrollToIndex({
        index: nextSlide,
        animated: true,
      });
    }, 4000);

    return () => {
      if (slideInterval.current) clearInterval(slideInterval.current);
    };
  }, [activeSlide, heroMovies.length]);

  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (!slideSize || isNaN(slideSize) || slideSize === 0) return;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    if (isNaN(index)) return;
    const roundIndex = Math.round(index);
    if (!isNaN(roundIndex) && roundIndex !== activeSlide) {
      setActiveSlide(roundIndex);
    }
  };



  const renderChannelItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chDot}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Player', { streamUrl: item.streamUrl, title: item.name, channels: channels, currentChannelId: item.id, isLive: true })}
    >
      <View
        style={[
          styles.ring,
          { borderColor: colors.border, backgroundColor: colors.surface },
          item.id === '1' && { borderColor: '#00C853', backgroundColor: theme === 'light' ? '#E8F5E9' : 'rgba(0, 200, 83, 0.1)' },
        ]}
      >
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.chLogo} />
        ) : (
          <Feather
            name={item.iconName === 'television' ? 'tv' : 'radio'}
            size={24}
            color={item.id === '1' ? '#00C853' : '#555'}
          />
        )}
      </View>
      <Text style={[styles.chName, { color: colors.textSec }]} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('Player', { streamUrl: item.streamUrl, title: item.name, channels: channels, currentChannelId: item.id, isLive: true })}
    >
      <View style={styles.recentThumb}>
        <Image source={{ uri: item.logoUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=200' }} style={styles.recentImage} />
        <View style={styles.recentOverlay}>
          <Feather name="play" size={16} color="#fff" />
        </View>
        <View style={styles.liveTag}>
          <View style={styles.liveDotSmall} />
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
      </View>
      <View style={styles.recentInfo}>
        <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.recentSub, { color: colors.textSec }]}>Watched 2m ago</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMovieItem = ({ item }) => {
    const posterUrl = getImageUrl(item.Id);
    const rating = item.CommunityRating ? item.CommunityRating.toFixed(1) : null;
    const releaseYear = item.ProductionYear || (item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : 'N/A');
    const genre = item.Genres && item.Genres.length > 0 ? item.Genres[0] : 'Movie';

    return (
      <TouchableOpacity
        style={[styles.movieCard, { backgroundColor: colors.surface }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('MovieDetail', { movie: item })}
      >
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.movieImage} />
        ) : (
          <View style={[styles.movieImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}>
            <Feather name="film" size={24} color={colors.textSec} />
          </View>
        )}
        {rating && (
          <View style={styles.ratingBadge}>
            <MaterialCommunityIcons name="star" size={10} color="#000" />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.95)']}
          style={styles.movieDetails}
        >
          <Text style={styles.movieTitle} numberOfLines={1}>
            {item.Name}
          </Text>
          <Text style={styles.movieMeta} numberOfLines={1}>
            {`${releaseYear} • ${genre}`}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderActorItem = ({ item }) => (
    <View style={styles.actorItem}>
      <Image source={{ uri: item.image }} style={styles.actorImage} />
      <Text style={[styles.actorName, { color: colors.text }]} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );

  const renderTvLayout = () => {
    const focusColor = tvSection === 'live' ? '#00C853' : '#FF0000';
    const focusBgColor = tvSection === 'live' ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 0, 0, 0.3)';

    return (
      <View style={{ flex: 1 }}>
        {tvActiveSubScreen === 'hub' ? (
          <View style={[styles.tvHubContainer, { backgroundColor: colors.phBg }]}>
            <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />

            {/* Header section of Hub */}
            <View style={styles.tvHubHeader}>
              <Image
                source={require('../../assets/logo_tv.png')}
                style={{ width: 180, height: 55, resizeMode: 'contain' }}
              />
              <Text style={[styles.tvHubSubtitle, { color: colors.textSec }]}>
                ● SYSTEM ONLINE • SELECT A SERVICE TO START STREAMING
              </Text>
            </View>

            {/* Service Cards Container */}
            <View style={styles.tvHubCardsRow}>
              {/* Live TV Card */}
              <Pressable
                focusable={true}
                hasTVPreferredFocus={isTV && customFocusedKey === 'hub-0'}
                onFocus={() => {
                  setCustomFocusedKey('hub-0');
                }}
                onPress={() => {
                  setTvSection('live');
                  setTvLiveCat('All');
                  setTvActiveSubScreen('live_grid');
                  setCustomFocusedKey('grid-0');
                }}
                style={[
                  styles.tvHubCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  customFocusedKey === 'hub-0' && { borderColor: '#00C853', backgroundColor: '#00C853' }
                ]}
              >
                <Feather
                  name="tv"
                  size={48}
                  color={customFocusedKey === 'hub-0' ? '#000' : colors.textSec}
                />
                <Text style={[styles.tvHubCardTitle, { color: colors.text }]}>Live TV Channels</Text>
                <Text style={[styles.tvHubCardDesc, { color: colors.textSec }]}>
                  Watch local and international live streams
                </Text>
              </Pressable>

              {/* Movies Card */}
              <Pressable
                focusable={true}
                hasTVPreferredFocus={isTV && customFocusedKey === 'hub-1'}
                onFocus={() => {
                  setCustomFocusedKey('hub-1');
                }}
                onPress={() => {
                  setTvSection('movies');
                  setTvMovieCat('All');
                  setTvActiveSubScreen('movie_grid');
                  setCustomFocusedKey('grid-0');
                }}
                style={[
                  styles.tvHubCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  customFocusedKey === 'hub-1' && { borderColor: '#FF0000', backgroundColor: '#FF0000' }
                ]}
              >
                <Feather
                  name="film"
                  size={48}
                  color={customFocusedKey === 'hub-1' ? '#fff' : colors.textSec}
                />
                <Text style={[styles.tvHubCardTitle, { color: colors.text }]}>Movies & VOD</Text>
                <Text style={[styles.tvHubCardDesc, { color: colors.textSec }]}>
                  Browse premium movies on demand
                </Text>
              </Pressable>

              {/* Refresh Card */}
              <Pressable
                focusable={true}
                hasTVPreferredFocus={isTV && customFocusedKey === 'hub-2'}
                onFocus={() => {
                  setCustomFocusedKey('hub-2');
                }}
                onPress={() => {
                  setIsLoading(true);
                  fetchGlobalPlaylist().finally(() => {
                    setIsLoading(false);
                  });
                }}
                style={[
                  styles.tvHubCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  customFocusedKey === 'hub-2' && { borderColor: '#FFD600', backgroundColor: '#FFD600' }
                ]}
              >
                <Feather
                  name="refresh-cw"
                  size={48}
                  color={customFocusedKey === 'hub-2' ? '#000' : colors.textSec}
                />
                <Text style={[styles.tvHubCardTitle, { color: colors.text }]}>Refresh Playlist</Text>
                <Text style={[styles.tvHubCardDesc, { color: colors.textSec }]}>
                  Reload latest channels from server
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.tvGridPageContainer, { backgroundColor: colors.phBg }]}>
            <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />

            {/* Full-width Header with Back Button */}
            <View style={styles.tvGridHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tvGridHeaderTitle, { color: colors.text }]}>
                  {tvSection === 'live' ? 'Live TV Channels' : 'Movies & Video Library'}
                </Text>
                <Text style={[styles.tvGridHeaderSubtitle, { color: colors.textSec }]}>
                  {tvSection === 'live'
                    ? `${filteredItems.length} live streams available`
                    : `${filteredItems.length} premium movies to watch`
                  }
                </Text>
              </View>

              {/* Back to Hub button */}
              <Pressable
                focusable={true}
                hasTVPreferredFocus={isTV && !initialFocusDone && customFocusedKey === 'back-btn'}
                onFocus={() => {
                  setCustomFocusedKey('back-btn');
                }}
                onPress={() => {
                  setTvActiveSubScreen('hub');
                  setCustomFocusedKey(tvSection === 'live' ? 'hub-0' : 'hub-1');
                }}
                style={[
                  styles.tvGridBackBtn,
                  { backgroundColor: colors.surface, borderColor: 'transparent' },
                  customFocusedKey === 'back-btn' && { borderColor: focusColor, backgroundColor: focusBgColor }
                ]}
              >
                <Feather
                  name="arrow-left"
                  size={18}
                  color={customFocusedKey === 'back-btn' ? focusColor : colors.text}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tvGridBackBtnText, { color: colors.text }]}>Back to Hub</Text>
              </Pressable>
            </View>

            {/* Main Grid View (Full Width) */}
            <FlatList
              ref={tvGridRef}
              key={tvSection}
              data={filteredItems}
              keyExtractor={(item) => String(item.id || item.Id || '')}
              numColumns={5}
              style={{ flex: 1, overflow: 'hidden' }}
              contentContainerStyle={styles.tvGridContent}
              columnWrapperStyle={styles.tvGridRow}
              removeClippedSubviews={false}
              renderItem={({ item, index }) => {
                const isFocused = customFocusedKey === `grid-${index}`;
                if (tvSection === 'live') {
                  return (
                    <Pressable
                      focusable={true}
                      hasTVPreferredFocus={isTV && !initialFocusDone && customFocusedKey === `grid-${index}`}
                      onFocus={() => {
                        setCustomFocusedKey(`grid-${index}`);
                      }}
                      onPress={() => {
                        navigation.navigate('Player', {
                          streamUrl: item.streamUrl,
                          title: item.name,
                          channels: channelsRef.current,
                          currentChannelId: item.id,
                          isLive: true
                        });
                      }}
                      style={[
                        styles.tvChannelCard,
                        { width: tvCardWidth, backgroundColor: 'transparent', borderColor: 'transparent' },
                        isFocused && {
                          borderColor: focusColor,
                        }
                      ]}
                    >
                      <View style={[styles.tvChannelLogoWrapper, { backgroundColor: 'transparent', borderBottomColor: colors.border }]}>
                        {item.logoUrl ? (
                          <Image source={{ uri: item.logoUrl }} style={styles.tvChannelLogo} />
                        ) : (
                          <Feather
                            name={item.iconName === 'television' ? 'tv' : 'radio'}
                            size={40}
                            color={item.logoColor || '#00C853'}
                          />
                        )}
                      </View>
                      <View style={styles.tvChannelInfo}>
                        <Text style={[styles.tvChannelName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                      </View>
                    </Pressable>
                  );
                } else {
                  return (
                    <Pressable
                      focusable={true}
                      hasTVPreferredFocus={isTV && !initialFocusDone && customFocusedKey === `grid-${index}`}
                      onFocus={() => {
                        setCustomFocusedKey(`grid-${index}`);
                      }}
                      onPress={() => {
                        navigation.navigate('MovieDetail', { movie: item });
                      }}
                      style={[
                        styles.tvMovieCard,
                        { width: tvCardWidth, backgroundColor: 'transparent', borderColor: 'transparent' },
                        isFocused && {
                          borderColor: focusColor,
                        }
                      ]}
                    >
                      {getImageUrl(item.Id) ? (
                        <Image source={{ uri: getImageUrl(item.Id) }} style={styles.tvMovieImage} />
                      ) : (
                        <View style={[styles.tvMovieImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}>
                          <Feather name="film" size={30} color={colors.textSec} />
                        </View>
                      )}
                      {item.CommunityRating && (
                        <View style={styles.tvMovieRatingBadge}>
                          <MaterialCommunityIcons name="star" size={12} color="#000" />
                          <Text style={styles.tvMovieRatingText}>{item.CommunityRating.toFixed(1)}</Text>
                        </View>
                      )}
                      <View style={styles.tvMovieMetaWrapper}>
                        <Text style={[styles.tvMovieTitle, { color: colors.text }]} numberOfLines={1}>{item.Name}</Text>
                        <Text style={[styles.tvMovieYearGenre, { color: colors.textSec }]} numberOfLines={1}>
                          {(item.ProductionYear || (item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : 'N/A'))} • {item.Genres?.[0] || 'Movie'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }
              }}
              ListEmptyComponent={
                <View style={styles.tvEmptyContainer}>
                  <Feather name="slash" size={48} color={colors.textSec} />
                  <Text style={[styles.tvEmptyText, { color: colors.textSec }]}>No content available in this category</Text>
                </View>
              }
            />
          </View>
        )}

        {/* Floating Debug Panel
        <View style={{
          position: 'absolute',
          top: 10,
          right: 10,
          backgroundColor: 'rgba(0,0,0,0.85)',
          padding: 8,
          borderRadius: 8,
          zIndex: 9999,
          borderWidth: 1,
          borderColor: '#FF0000',
        }}>
          <Text style={{ color: '#00C853', fontSize: 10, fontWeight: 'bold' }}>[TV DEBUG PANEL]</Text>
          <Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>SubScreen: {tvActiveSubScreen}</Text>
          <Text style={{ color: '#fff', fontSize: 10 }}>FocusedKey: {customFocusedKey}</Text>
          <Text style={{ color: '#fff', fontSize: 10 }}>isTV: {isTV ? 'true' : 'false'}</Text>
          <Text style={{ color: '#FFD600', fontSize: 10, marginTop: 4, fontWeight: 'bold' }}>Key Logs:</Text>
          {debugLogs.length === 0 ? (
            <Text style={{ color: '#aaa', fontSize: 9 }}>No keys received yet</Text>
          ) : (
            debugLogs.map((log, i) => (
              <Text key={i} style={{ color: '#aaa', fontSize: 9 }}>{log}</Text>
            ))
          )}
        </View>
        */}
      </View>
    );
  };

  const isLandscapeMobile = !isTV && sWidth > sHeight;

  if (isLandscapeMobile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.phBg, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.phBg} />
        <Image
          source={require('../../assets/logo_tv.png')}
          style={{ width: 140, height: 45, resizeMode: 'contain', marginBottom: 20, opacity: 0.8 }}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isTV) {
    return renderTvLayout();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />
      <TopBar navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} removeClippedSubviews={false}>
        {/* Hero Slider */}
        <View style={styles.heroContainer}>
          <FlatList
            ref={sliderRef}
            data={heroMovies}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyExtractor={(item) => String(item.Id || item.id || '')}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={3}
            removeClippedSubviews={Platform.OS === 'android'}
            getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
            renderItem={({ item, index }) => (
              <HeroCarouselItem
                item={item}
                index={index}
                colors={colors}
                isTV={isTV}
                width={width}
                CAROUSEL_HEIGHT={CAROUSEL_HEIGHT}
                onPress={(movie) => navigation.navigate('MovieDetail', { movie })}
              />
            )}
          />
          {/* Slider Dots */}
          <View style={styles.dotsRow}>
            {heroMovies.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: activeSlide === index ? colors.primary : 'rgba(255, 255, 255, 0.4)' },
                  activeSlide === index && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Our Services Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Our Services</Text>
        </View>
        <View style={styles.servicesRow}>
          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Live')}
          >
            <Logo color="green" subtext="LIVE TV" width={110} height={35} />
            <Text style={[styles.serviceName, { color: colors.text }]}>PPLEX Live TV</Text>
            <Text style={[styles.serviceTag, { color: '#39B54A', backgroundColor: 'rgba(57, 181, 74, 0.1)' }]}>
              LIVE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Movies')}
          >
            <Logo color="red" subtext="MEDIA SERVER" width={110} height={35} />
            <Text style={[styles.serviceName, { color: colors.text }]}>PPLEX Media Server</Text>
            <Text style={[styles.serviceTag, { color: '#FF0000', backgroundColor: 'rgba(255, 0, 0, 0.1)' }]}>
              VOD
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live TV Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Live TV</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Live')}>
            <Text style={[styles.seeAll, { color: '#00C853' }]}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={channels}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderChannelItem}
          keyExtractor={(item) => String(item.id || item.Id || '')}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={false}
        />

        {/* New Movies Section */}
        <View style={[styles.sectionHeader, { paddingTop: 28 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>New Movies</Text>
          <View style={styles.sectionRightActions}>
            <TouchableOpacity style={[styles.seeAllBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Movies')}>
              <Text style={styles.seeAllText}>SEE ALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.arrowBtn, { borderColor: colors.border }]} onPress={() => slideList(newMoviesRef, newMoviesOffset, -1)}>
              <Feather name="chevron-left" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.arrowBtn, { borderColor: colors.border }]} onPress={() => slideList(newMoviesRef, newMoviesOffset, 1)}>
              <Feather name="chevron-right" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          ref={newMoviesRef}
          data={movies.slice(0, 15)}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderMovieItem}
          keyExtractor={(item) => String(item.Id || item.id || '')}
          contentContainerStyle={styles.horizontalList}
          onScroll={(e) => handleScroll(e, newMoviesOffset)}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
        />

        {/* Trending Now Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Now</Text>
          <View style={styles.sectionRightActions}>
            <TouchableOpacity style={[styles.seeAllBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Movies')}>
              <Text style={styles.seeAllText}>SEE ALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.arrowBtn, { borderColor: colors.border }]} onPress={() => slideList(trendingRef, trendingOffset, -1)}>
              <Feather name="chevron-left" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.arrowBtn, { borderColor: colors.border }]} onPress={() => slideList(trendingRef, trendingOffset, 1)}>
              <Feather name="chevron-right" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          ref={trendingRef}
          data={movies.slice(15)}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderMovieItem}
          keyExtractor={(item) => String(item.Id || item.id || '')}
          contentContainerStyle={styles.horizontalList}
          onScroll={(e) => handleScroll(e, trendingOffset)}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
        />

        {/* Popular Actors Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Actors</Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary, textDecorationLine: 'underline' }]}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={MOCK_ACTORS}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderActorItem}
          keyExtractor={(item) => String(item.id || '')}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroContainer: {
    height: CAROUSEL_HEIGHT,
    position: 'relative',
    marginBottom: 0,
  },
  heroBanner: {
    width: width,
    height: CAROUSEL_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  badgeContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 2,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroBadgeText: {
    fontFamily: 'System',
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroInfo: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 80,
    zIndex: 2,
  },
  heroTitle: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '850',
    color: '#fff',
    ...Platform.select({
      web: {
        textShadow: '0px 2px 8px rgba(0, 0, 0, 0.75)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
  },
  heroSub: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    fontWeight: '600',
  },
  heroOverview: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 8,
    lineHeight: 18,
    ...Platform.select({
      web: {
        textShadow: '0px 1px 4px rgba(0, 0, 0, 0.8)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  playFab: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '700',
  },
  seeAll: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  horizontalList: {
    paddingHorizontal: 15,
    gap: 12,
  },
  chDot: {
    alignItems: 'center',
    width: 62,
  },
  ring: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  chLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  chName: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
  },
  recentCard: {
    width: 160,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 8,
  },
  recentThumb: {
    width: '100%',
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  recentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  liveDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  liveTagText: {
    fontFamily: 'System',
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  recentInfo: {
    marginTop: 8,
  },
  recentTitle: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '700',
  },
  recentSub: {
    fontFamily: 'System',
    fontSize: 10,
    marginTop: 2,
  },
  movieCard: {
    width: 130,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  movieImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFD600',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    zIndex: 2,
  },
  ratingText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  movieDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 12,
    paddingTop: 30,
  },
  movieTitle: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  movieMeta: {
    fontFamily: 'System',
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  sectionRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seeAllText: {
    fontFamily: 'System',
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  actorItem: {
    alignItems: 'center',
    width: 70,
  },
  actorImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
    resizeMode: 'cover',
  },
  actorName: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  servicesRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 12,
    marginBottom: 0,
  },
  serviceCard: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 0,
    paddingHorizontal: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceName: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  serviceTag: {
    fontFamily: 'System',
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  tvContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tvSidebar: {
    width: '20%',
    borderRightWidth: 1,
    paddingVertical: 35,
    paddingHorizontal: 15,
    justifyContent: 'flex-start',
  },
  tvLogoArea: {
    alignItems: 'center',
    marginBottom: 35,
  },
  tvLogoWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tvLiveDot: {
    fontFamily: 'System',
    color: '#39B54A',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 1,
  },
  tvNavLinks: {
    gap: 8,
  },
  tvSidebarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 10,
    borderWidth: 3,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  tvSidebarBtnActive: {
    // Background color dynamically handled in component style prop based on theme
  },
  tvSidebarBtnFocused: {
    borderColor: '#FFD600',
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    transform: [{ scale: 1.03 }],
  },
  tvSidebarBtnText: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tvSidebarBtnTextActive: {
    fontFamily: 'System',
    fontWeight: '700',
  },
  tvContentArea: {
    width: '80%',
    padding: 25,
    flex: 1,
    flexDirection: 'column',
  },
  tvHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  tvHeaderTitle: {
    fontFamily: 'System',
    fontSize: 26,
    fontWeight: '700',
  },
  tvHeaderSubtitle: {
    fontFamily: 'System',
    fontSize: 14,
    marginTop: 4,
  },
  tvCategoriesContainer: {
    marginBottom: 15,
    height: 40,
  },
  tvCatScroll: {
    gap: 8,
    alignItems: 'center',
  },
  tvCatChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  tvCatChipFocused: {
    borderColor: '#FFD600',
    backgroundColor: '#FFD600',
    transform: [{ scale: 1.03 }],
  },
  tvCatChipText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
  },
  tvGridContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 12,
  },
  tvGridRow: {
    justifyContent: 'flex-start',
    gap: 12,
    overflow: 'visible',
  },
  tvChannelCard: {
    aspectRatio: 1.3,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 3,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  tvChannelLogoWrapper: {
    height: '68%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    padding: 6,
  },
  tvChannelLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  tvChannelInfo: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: '32%',
    justifyContent: 'center',
  },
  tvChannelName: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  tvChannelNow: {
    fontFamily: 'System',
    fontSize: 11,
    marginTop: 4,
  },
  tvMovieCard: {
    aspectRatio: 0.7,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  tvMovieImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  tvMovieRatingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFD600',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    zIndex: 2,
  },
  tvMovieRatingText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  tvMovieMetaWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 30,
  },
  tvMovieTitle: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700',
  },
  tvMovieYearGenre: {
    fontFamily: 'System',
    fontSize: 10,
    marginTop: 2,
  },
  tvCardFocused: {
    borderColor: '#FFD600',
    transform: [{ scale: 1.04 }],
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  tvEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
    width: '100%',
  },
  tvEmptyText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
  },
  tvHubContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tvHubHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  tvHubSubtitle: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 1.5,
  },
  tvHubCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  tvHubCard: {
    width: 230,
    height: 250,
    borderRadius: 20,
    borderWidth: 3,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  tvHubCardTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  tvHubCardDesc: {
    fontFamily: 'System',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  tvGridPageContainer: {
    flex: 1,
    padding: 30,
    flexDirection: 'column',
  },
  tvGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tvGridHeaderTitle: {
    fontFamily: 'System',
    fontSize: 26,
    fontWeight: '700',
  },
  tvGridHeaderSubtitle: {
    fontFamily: 'System',
    fontSize: 14,
    marginTop: 4,
  },
  tvGridBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 3,
  },
  tvGridBackBtnText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
  },
});
