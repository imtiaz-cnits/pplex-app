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
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOverlays } from '../context/OverlayContext';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../components/TopBar';
import Logo from '../components/Logo';
import { MOCK_CHANNELS, MOCK_MOVIES, MOCK_ACTORS } from '../constants/mockData';

const { width } = Dimensions.get('window');
const CAROUSEL_HEIGHT = Platform.isTV ? 320 : 200;

export default function HomeScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { setIsLoading, channels, fetchGlobalPlaylist, showComingSoon } = useOverlays();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isTV = Platform.isTV || screenWidth > 900;

  const [tvSection, setTvSection] = useState('live');
  const [tvLiveCat, setTvLiveCat] = useState('All');
  const [tvMovieCat, setTvMovieCat] = useState('All');
  const [focusedId, setFocusedId] = useState(null);

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

  useEffect(() => {
    // Initial fetch on mount for TV mode when tab navigation focus triggers don't fire\\\\
    setIsLoading(true);
    fetchGlobalPlaylist().finally(() => {
      setIsLoading(false);
    });

    const unsubscribe = navigation.addListener('focus', () => {
      setIsLoading(true);
      fetchGlobalPlaylist().finally(() => {
        setIsLoading(false);
      });
    });

    return unsubscribe;
  }, [navigation]);

  const heroMovies = MOCK_MOVIES.slice(0, 3);
  const recentChannels = channels.slice(0, 4);

  // Auto-sliding Hero Carousel
  useEffect(() => {
    slideInterval.current = setInterval(() => {
      let nextSlide = (activeSlide + 1) % heroMovies.length;
      setActiveSlide(nextSlide);
      sliderRef.current?.scrollToIndex({
        index: nextSlide,
        animated: true,
      });
    }, 4000);

    return () => {
      if (slideInterval.current) clearInterval(slideInterval.current);
    };
  }, [activeSlide]);

  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeSlide) {
      setActiveSlide(roundIndex);
    }
  };

  const renderHeroItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.heroBanner}
      onPress={() => showComingSoon('Movies & Video on Demand')}
    >
      <Image source={{ uri: item.image }} style={styles.heroImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.35)', 'rgba(0, 0, 0, 0.9)']}
        style={styles.heroOverlay}
      />
      <View style={styles.badgeContainer}>
        <View style={[styles.heroBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroBadgeText}>Trending #{heroMovies.indexOf(item) + 1}</Text>
        </View>
      </View>
      <View style={styles.heroInfo}>
        <Text style={styles.heroTitle}>{item.title}</Text>
        <Text style={styles.heroSub}>{`${item.genre} • ${item.year} • ⭐ ${item.rating}`}</Text>
      </View>
      <View style={styles.playFab}>
        <Feather name="play" size={24} color="#fff" style={{ marginLeft: 2 }} />
      </View>
    </TouchableOpacity>
  );

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
          item.id === '1' && { borderColor: colors.primary, backgroundColor: theme === 'light' ? '#FFEBEB' : 'rgba(255, 0, 0, 0.1)' },
        ]}
      >
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.chLogo} />
        ) : (
          <Feather
            name={item.iconName === 'television' ? 'tv' : 'radio'}
            size={24}
            color={item.id === '1' ? colors.primary : '#555'}
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

  const renderMovieItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.movieCard, { backgroundColor: colors.surface }]}
      activeOpacity={0.85}
      onPress={() => showComingSoon('Movies & Video on Demand')}
    >
      <Image source={{ uri: item.image }} style={styles.movieImage} />
      <View style={styles.ratingBadge}>
        <MaterialCommunityIcons name="star" size={10} color="#000" />
        <Text style={styles.ratingText}>{item.rating}</Text>
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.95)']}
        style={styles.movieDetails}
      >
        <Text style={styles.movieTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.movieMeta} numberOfLines={1}>
          {`${item.year} • ${item.genre}`}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderActorItem = ({ item }) => (
    <View style={styles.actorItem}>
      <Image source={{ uri: item.image }} style={styles.actorImage} />
      <Text style={[styles.actorName, { color: colors.text }]} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );

  const renderTvLayout = () => {
    const liveCategories = ['All', ...new Set(channels.map((c) => c.category).filter(Boolean))];
    const movieCategories = ['All', ...new Set(MOCK_MOVIES.map((m) => m.genre).filter(Boolean))];

    const activeCategories = tvSection === 'live' ? liveCategories : movieCategories;
    const activeCategory = tvSection === 'live' ? tvLiveCat : tvMovieCat;
    const setActiveCategory = tvSection === 'live' ? setTvLiveCat : setTvMovieCat;

    const filteredItems = tvSection === 'live'
      ? channels.filter((c) => tvLiveCat === 'All' || c.category === tvLiveCat)
      : MOCK_MOVIES.filter((m) => tvMovieCat === 'All' || m.genre === tvMovieCat);

    return (
      <View style={[styles.tvContainer, { backgroundColor: colors.phBg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />

        {/* Left Sidebar */}
        <View style={[styles.tvSidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
          {/* Brand/Logo Area */}
          <View style={styles.tvLogoArea}>
            <View style={[
              styles.tvLogoWrapper,
              {
                backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'transparent',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                borderWidth: theme === 'dark' ? 1 : 0
              }
            ]}>
              <Image
                source={tvSection === 'live' ? require('../../assets/logo_tv.png') : require('../../assets/logo_movie.png')}
                style={{ width: 135, height: 42, resizeMode: 'contain' }}
              />
            </View>
            <Text style={styles.tvLiveDot}>● ONLINE</Text>
          </View>

          {/* Navigation Links */}
          <View style={styles.tvNavLinks}>
            {/* Live TV Button */}
            <TouchableOpacity
              focusable={true}
              activeOpacity={0.9}
              onFocus={() => setFocusedId('tv-menu-live')}
              onBlur={() => { if (focusedId === 'tv-menu-live') setFocusedId(null); }}
              onPress={() => {
                setTvSection('live');
                setTvLiveCat('All');
              }}
              style={[
                styles.tvSidebarBtn,
                tvSection === 'live' && { backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                focusedId === 'tv-menu-live' && styles.tvSidebarBtnFocused
              ]}
            >
              <Feather
                name="tv"
                size={18}
                color={tvSection === 'live' || focusedId === 'tv-menu-live' ? '#FFD600' : colors.textSec}
              />
              <Text style={[
                styles.tvSidebarBtnText,
                { color: colors.textSec },
                (tvSection === 'live' || focusedId === 'tv-menu-live') && [styles.tvSidebarBtnTextActive, { color: colors.text }]
              ]}>Live TV</Text>
            </TouchableOpacity>

            {/* Movies & VOD Button */}
            <TouchableOpacity
              focusable={true}
              activeOpacity={0.9}
              onFocus={() => setFocusedId('tv-menu-movies')}
              onBlur={() => { if (focusedId === 'tv-menu-movies') setFocusedId(null); }}
              onPress={() => {
                setTvSection('movies');
                setTvMovieCat('All');
              }}
              style={[
                styles.tvSidebarBtn,
                tvSection === 'movies' && { backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                focusedId === 'tv-menu-movies' && styles.tvSidebarBtnFocused
              ]}
            >
              <Feather
                name="film"
                size={18}
                color={tvSection === 'movies' || focusedId === 'tv-menu-movies' ? '#FFD600' : colors.textSec}
              />
              <Text style={[
                styles.tvSidebarBtnText,
                { color: colors.textSec },
                (tvSection === 'movies' || focusedId === 'tv-menu-movies') && [styles.tvSidebarBtnTextActive, { color: colors.text }]
              ]}>Movies</Text>
            </TouchableOpacity>

            {/* Refresh Playlist Button */}
            <TouchableOpacity
              focusable={true}
              activeOpacity={0.9}
              onFocus={() => setFocusedId('tv-menu-refresh')}
              onBlur={() => { if (focusedId === 'tv-menu-refresh') setFocusedId(null); }}
              onPress={() => {
                setIsLoading(true);
                fetchGlobalPlaylist().finally(() => {
                  setIsLoading(false);
                });
              }}
              style={[
                styles.tvSidebarBtn,
                focusedId === 'tv-menu-refresh' && styles.tvSidebarBtnFocused
              ]}
            >
              <Feather
                name="refresh-cw"
                size={18}
                color={focusedId === 'tv-menu-refresh' ? '#FFD600' : colors.textSec}
              />
              <Text style={[
                styles.tvSidebarBtnText,
                { color: colors.textSec },
                focusedId === 'tv-menu-refresh' && [styles.tvSidebarBtnTextActive, { color: colors.text }]
              ]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Content Area */}
        <View style={[styles.tvContentArea, { backgroundColor: colors.phBg }]}>
          {/* Content Header: Title & Category Row */}
          <View style={styles.tvHeader}>
            <View>
              <Text style={[styles.tvHeaderTitle, { color: colors.text }]}>
                {tvSection === 'live' ? 'Live TV Channels' : 'Movies & Video Library'}
              </Text>
              <Text style={[styles.tvHeaderSubtitle, { color: colors.textSec }]}>
                {tvSection === 'live'
                  ? `${filteredItems.length} live streams available`
                  : `${filteredItems.length} premium movies to watch`
                }
              </Text>
            </View>
          </View>

          {/* Category Chips Container */}
          <View style={styles.tvCategoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tvCatScroll}>
              {activeCategories.map((cat) => {
                const isSelected = activeCategory === cat;
                const chipId = `tv-cat-${tvSection}-${cat}`;
                return (
                  <TouchableOpacity
                    key={cat}
                    focusable={true}
                    activeOpacity={0.8}
                    onFocus={() => setFocusedId(chipId)}
                    onBlur={() => { if (focusedId === chipId) setFocusedId(null); }}
                    onPress={() => setActiveCategory(cat)}
                    style={[
                      styles.tvCatChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: 'transparent' },
                      focusedId === chipId && styles.tvCatChipFocused
                    ]}
                  >
                    <Text style={[
                      styles.tvCatChipText,
                      { color: colors.textSec },
                      isSelected && { color: '#fff', fontWeight: 'bold' },
                      focusedId === chipId && { color: '#000' }
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Main Grid View */}
          <FlatList
            key={`${tvSection}-${activeCategory}`}
            data={filteredItems}
            keyExtractor={(item) => item.id}
            numColumns={5}
            contentContainerStyle={styles.tvGridContent}
            columnWrapperStyle={styles.tvGridRow}
            renderItem={({ item }) => {
              const itemId = `tv-grid-item-${item.id}`;
              const isFocused = focusedId === itemId;

              if (tvSection === 'live') {
                return (
                  <TouchableOpacity
                    focusable={true}
                    activeOpacity={0.85}
                    onFocus={() => setFocusedId(itemId)}
                    onBlur={() => { if (focusedId === itemId) setFocusedId(null); }}
                    onPress={() => {
                      navigation.navigate('Player', {
                        streamUrl: item.streamUrl,
                        title: item.name,
                        channels: channels,
                        currentChannelId: item.id,
                        isLive: true
                      });
                    }}
                    style={[
                      styles.tvChannelCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isFocused && styles.tvCardFocused
                    ]}
                  >
                    <View style={[styles.tvChannelLogoWrapper, { backgroundColor: item.logoBg || colors.border, borderBottomColor: colors.border }]}>
                      {item.logoUrl ? (
                        <Image source={{ uri: item.logoUrl }} style={styles.tvChannelLogo} />
                      ) : (
                        <Feather
                          name={item.iconName === 'television' ? 'tv' : 'radio'}
                          size={40}
                          color={item.logoColor || colors.primary}
                        />
                      )}
                    </View>
                    <View style={styles.tvChannelInfo}>
                      <Text style={[styles.tvChannelName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              } else {
                return (
                  <TouchableOpacity
                    focusable={true}
                    activeOpacity={0.85}
                    onFocus={() => setFocusedId(itemId)}
                    onBlur={() => { if (focusedId === itemId) setFocusedId(null); }}
                    onPress={() => {
                      navigation.navigate('Player', {
                        streamUrl: item.streamUrl,
                        title: item.title,
                        channels: MOCK_MOVIES,
                        currentChannelId: item.id,
                        isLive: false
                      });
                    }}
                    style={[
                      styles.tvMovieCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isFocused && styles.tvCardFocused
                    ]}
                  >
                    <Image source={{ uri: item.image }} style={styles.tvMovieImage} />
                    <View style={styles.tvMovieRatingBadge}>
                      <MaterialCommunityIcons name="star" size={12} color="#000" />
                      <Text style={styles.tvMovieRatingText}>{item.rating}</Text>
                    </View>
                    <LinearGradient
                      colors={['transparent', 'rgba(0, 0, 0, 0.95)']}
                      style={styles.tvMovieMetaWrapper}
                    >
                      <Text style={styles.tvMovieTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.tvMovieYearGenre}>{item.year} • {item.genre}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
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
      </View>
    );
  };

  if (isTV) {
    return renderTvLayout();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />
      <TopBar navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            renderItem={renderHeroItem}
            keyExtractor={(item) => item.id}
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
            <Text style={[styles.seeAll, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={channels}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderChannelItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
        />

        {/* New Movies Section */}
        <View style={[styles.sectionHeader, { paddingTop: 28 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>New Movies</Text>
          <View style={styles.sectionRightActions}>
            <TouchableOpacity style={[styles.seeAllBtn, { backgroundColor: colors.primary }]} onPress={() => showComingSoon('Movies & Video on Demand')}>
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
          data={MOCK_MOVIES.filter((m) => m.isNew)}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderMovieItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
          onScroll={(e) => handleScroll(e, newMoviesOffset)}
          scrollEventThrottle={16}
        />

        {/* Trending Now Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Now</Text>
          <View style={styles.sectionRightActions}>
            <TouchableOpacity style={[styles.seeAllBtn, { backgroundColor: colors.primary }]} onPress={() => showComingSoon('Movies & Video on Demand')}>
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
          data={MOCK_MOVIES.filter((m) => m.isTrending)}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderMovieItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
          onScroll={(e) => handleScroll(e, trendingOffset)}
          scrollEventThrottle={16}
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
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
    bottom: 20,
    left: 20,
    right: 80,
    zIndex: 2,
  },
  heroTitle: {
    fontFamily: 'System',
    fontSize: 22,
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
  playFab: {
    position: 'absolute',
    bottom: 20,
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
    borderWidth: 2,
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
    borderWidth: 2,
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
    paddingBottom: 20,
    gap: 15,
  },
  tvGridRow: {
    justifyContent: 'flex-start',
    gap: 15,
  },
  tvChannelCard: {
    width: '18.4%',
    aspectRatio: 1.3,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    elevation: 3,
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
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  tvChannelNow: {
    fontFamily: 'System',
    fontSize: 11,
    marginTop: 4,
  },
  tvMovieCard: {
    width: '18.4%',
    aspectRatio: 0.7,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    elevation: 3,
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
});
