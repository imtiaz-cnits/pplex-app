import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableHighlight,
  Image,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../components/TopBar';
import { fetchMovies, fetchFeaturedMovies, searchMovies, getImageUrl } from '../services/jellyfinApi';

const { width, height } = Dimensions.get('window');
const isTVGlobal = Platform.isTV || (Math.min(width, height) >= 500 && Math.max(width, height) > 900);

// Grid Movie Card for clean layout
const MovieGridItem = React.memo(({ item, colors, onPress }) => {
  const [isFocused, setIsFocused] = useState(false);
  const posterUrl = getImageUrl(item.Id);
  const rating = item.CommunityRating ? item.CommunityRating.toFixed(1) : null;

  const dateObj = new Date(item.DateCreated || item.PremiereDate);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : (item.ProductionYear || 'N/A');

  return (
    <TouchableHighlight
      focusable={true}
      isTVSelectable={true}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={() => onPress(item)}
      underlayColor={colors.primary}
      style={[
        styles.movieGridCard,
        { backgroundColor: colors.surface, borderColor: 'transparent' },
        isFocused && {
          borderColor: colors.primary,
          borderWidth: 3,
          transform: [{ scale: 1.05 }],
        }
      ]}
    >
      <View style={styles.movieCardInner}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.movieGridImage} />
        ) : (
          <View style={[styles.posterPlaceholder, { backgroundColor: colors.bg }]}>
            <Feather name="film" size={28} color={colors.textSec} />
          </View>
        )}

        {rating && (
          <View style={[styles.ratingBadge, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="star" size={10} color="#fff" />
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
            {formattedDate}
          </Text>
        </LinearGradient>
      </View>
    </TouchableHighlight>
  );
});

const FeaturedMovieItem = React.memo(({ item, colors, onPress }) => {
  const [isFocused, setIsFocused] = useState(false);
  const posterUrl = getImageUrl(item.Id);
  return (
    <TouchableHighlight
      focusable={true}
      isTVSelectable={true}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={() => onPress(item)}
      underlayColor={colors.primary}
      style={[
        styles.featuredCard,
        { backgroundColor: colors.surface, borderColor: 'transparent' },
        isFocused && {
          borderColor: colors.primary,
          borderWidth: 2,
          transform: [{ scale: 1.05 }],
        }
      ]}
    >
      <View style={styles.movieCardInner}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.movieGridImage} />
        ) : (
          <View style={[styles.posterPlaceholder, { backgroundColor: colors.bg }]}>
            <Feather name="film" size={24} color={colors.textSec} />
          </View>
        )}
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>FEATURED</Text>
        </View>
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.9)']}
          style={styles.movieDetails}
        >
          <Text numberOfLines={1} style={styles.movieTitle}>
            {item.Name}
          </Text>
          <Text numberOfLines={1} style={styles.movieMeta}>
            {item.ProductionYear || 'N/A'}
          </Text>
        </LinearGradient>
      </View>
    </TouchableHighlight>
  );
});

export default function MoviesScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const [movies, setMovies] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [startIndex, setStartIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isTV = isTVGlobal;
  const numGridColumns = isTV ? 5 : 3;
  const gridPadding = 15;
  const gridGap = 12;
  const gridCardWidth = (width - (gridPadding * 2) - (gridGap * (numGridColumns - 1))) / numGridColumns;
  const LIMIT = 30;

  const loadMovies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, featured] = await Promise.all([
        fetchMovies(LIMIT, 0),
        fetchFeaturedMovies()
      ]);
      setMovies(data);
      setFeaturedMovies(featured);
      setStartIndex(LIMIT);
      setHasMore(data.length === LIMIT);
    } catch (err) {
      setError('Failed to fetch movies from Jellyfin server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || searchQuery.length > 0) return;

    setLoadingMore(true);
    try {
      const data = await fetchMovies(LIMIT, startIndex);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setMovies((prev) => [...prev, ...data]);
        setStartIndex((prev) => prev + LIMIT);
        if (data.length < LIMIT) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.log('Error loading more movies:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const handleMoviePress = useCallback((movie) => {
    navigation.navigate('MovieDetail', { movie });
  }, [navigation]);

  const renderFeaturedItem = useCallback(({ item }) => (
    <FeaturedMovieItem colors={colors} item={item} onPress={handleMoviePress} />
  ), [colors, handleMoviePress]);

  const renderMovieItem = useCallback(({ item }) => (
    <View style={{ width: gridCardWidth, marginBottom: gridGap }}>
      <MovieGridItem
        item={item}
        colors={colors}
        onPress={handleMoviePress}
      />
    </View>
  ), [gridCardWidth, gridGap, colors, handleMoviePress]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true);
        const results = await searchMovies(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const displayMovies = searchQuery.length > 0 ? searchResults : movies;

  const renderHeader = useCallback(() => {
    if (searchQuery.length > 0) return null; // Hide header during search

    return (
      <View style={styles.headerContainer}>
        {featuredMovies.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Movies</Text>
            <FlatList
              data={featuredMovies}
              horizontal
              keyExtractor={(item) => String('feat-' + (item.Id || item.id || ''))}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredListContent}
              renderItem={renderFeaturedItem}
            />
          </>
        )}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 15 }]}>Recent Movies</Text>
      </View>
    );
  }, [searchQuery.length, featuredMovies, colors, renderFeaturedItem]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />
      <TopBar navigation={navigation} />

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={[styles.searchWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Feather name="search" size={16} color={colors.textSec} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search Movies & VOD..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableHighlight
              onPress={() => setSearchQuery('')}
              underlayColor="transparent"
              style={styles.clearBtn}
            >
              <Feather name="x" size={16} color={colors.textSec} />
            </TouchableHighlight>
          )}
        </View>
      </View>

      {isLoading || isSearching ? (
        <View style={styles.centerWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSec }]}>
            {isSearching ? 'Searching database...' : 'Loading movies library...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrapper}>
          <Feather name="alert-triangle" size={48} color={colors.primary} style={{ marginBottom: 12 }} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableHighlight
            focusable={true}
            isTVSelectable={true}
            onPress={loadMovies}
            underlayColor={colors.primary}
            style={[styles.retryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.retryText, { color: colors.text }]}>Retry Connection</Text>
          </TouchableHighlight>
        </View>
      ) : (
        <FlatList
          data={displayMovies}
          keyExtractor={(item) => String(item.Id || item.id || '')}
          numColumns={numGridColumns}
          key={`grid-${numGridColumns}`}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={15}
          windowSize={5}
          contentContainerStyle={[styles.gridContent, { paddingHorizontal: gridPadding }]}
          columnWrapperStyle={styles.gridRow}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderHeader}
          renderItem={renderMovieItem}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <Feather name="film" size={40} color={colors.textSec} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyText, { color: colors.textSec }]}>
                {searchQuery.length > 0 ? "No movies match your search." : "No movies found on Jellyfin."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchWrapper: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13.5,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '650',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  /* Grid Layout Styling (for VOD & Search Results) */

  gridContent: {
    paddingTop: 5,
    paddingBottom: 110,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  movieGridCard: {
    aspectRatio: 2 / 3,
    borderRadius: 12,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  movieGridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  /* Common Inner Item Styling */
  movieCardInner: {
    flex: 1,
    position: 'relative',
  },
  posterPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  ratingText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },
  movieDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  movieMeta: {
    color: '#ccc',
    fontSize: 9,
    marginTop: 2,
  },
  headerContainer: {
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  featuredListContent: {
    paddingHorizontal: 15,
    gap: 12,
  },
  featuredCard: {
    width: 120,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  featuredBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#00C853',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
