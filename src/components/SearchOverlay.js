import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { MOCK_MOVIES } from '../constants/mockData';
import { useOverlays } from '../context/OverlayContext';

const CATEGORIES = ['All', 'Live TV', 'Movies', 'News', 'Sports', 'Entertainment'];

// Reliable status bar height for Android (insets can be 0 inside Modals)
const STATUSBAR_H =
  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

export default function SearchOverlay({ visible, onClose, navigation }) {
  const { colors, theme } = useTheme();
  const { channels } = useOverlays();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const isDark = theme === 'dark';

  // Safe top padding — take the bigger of insets.top or StatusBar.currentHeight
  const safeTop = Math.max(insets.top, STATUSBAR_H);

  // Theme-derived colors
  const overlayBg   = colors.bg;
  const inputBg     = isDark ? '#1a1a1a' : '#ebebeb';
  const inputBorder = isDark ? '#2a2a2a' : '#ddd';
  const chipBg      = isDark ? '#1a1a1a' : '#e8e8e8';
  const chipBorder  = isDark ? '#2a2a2a' : '#d5d5d5';
  const dividerCol  = isDark ? '#1e1e1e' : '#e4e4e4';
  const iconColor   = isDark ? '#555' : '#999';
  const emptyIcon   = isDark ? '#2a2a2a' : '#ccc';
  const cardBg      = isDark ? '#1a1a1a' : '#e8e8e8';

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setQuery('');
      setResults([]);
      setActiveCategory('All');
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      const q = query.toLowerCase();

      let filteredChannels = channels
        .filter(
          c =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.category && c.category.toLowerCase().includes(q))
        )
        .map(item => ({ ...item, type: 'channel' }));

      let filteredMovies = MOCK_MOVIES.filter(
        m =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.genre && m.genre.toLowerCase().includes(q))
      ).map(item => ({ ...item, type: 'movie' }));

      if (activeCategory === 'Live TV') {
        setResults(filteredChannels);
      } else if (activeCategory === 'Movies') {
        setResults(filteredMovies);
      } else if (activeCategory === 'News') {
        setResults(filteredChannels.filter(c => c.category?.toLowerCase() === 'news'));
      } else if (activeCategory === 'Sports') {
        setResults(filteredChannels.filter(c => c.category?.toLowerCase() === 'sports'));
      } else if (activeCategory === 'Entertainment') {
        setResults([
          ...filteredChannels.filter(c => c.category?.toLowerCase() === 'entertainment'),
          ...filteredMovies,
        ]);
      } else {
        setResults([...filteredChannels, ...filteredMovies]);
      }

      setIsSearching(false);
    }, 300);
  }, [query, channels, activeCategory]);

  const handleItemPress = item => {
    onClose();
    setQuery('');
    if (navigation) {
      if (item.type === 'movie') {
        navigation.navigate('MovieDetail', { movie: item });
      } else {
        navigation.navigate('Player', {
          streamUrl: item.streamUrl,
          title: item.name,
          isLive: true,
        });
      }
    }
  };

  const getCategoryIcon = cat => {
    switch (cat) {
      case 'Live TV':       return 'tv';
      case 'Movies':        return 'film';
      case 'News':          return 'radio';
      case 'Sports':        return 'activity';
      case 'Entertainment': return 'star';
      default:              return 'grid';
    }
  };

  const getChannelFallbackIcon = category => {
    const cat = (category || '').toLowerCase();
    if (cat === 'news')          return 'radio';
    if (cat === 'sports')        return 'activity';
    if (cat === 'entertainment') return 'tv';
    if (cat === 'music')         return 'music';
    return 'tv';
  };

  /* ── Channel thumbnail ─────────────────────────────────── */
  const ChannelThumb = ({ item }) => {
    const logoUri = item.logoUrl || item.logo || item.stream_icon || null;
    const [imgError, setImgError] = useState(false);

    if (logoUri && !imgError) {
      return (
        <Image
          source={{ uri: logoUri }}
          style={[styles.channelLogoImg, { backgroundColor: cardBg }]}
          resizeMode="contain"
          onError={() => setImgError(true)}
        />
      );
    }
    // Fallback icon
    return (
      <View
        style={[
          styles.channelLogo,
          { backgroundColor: item.logoBg || (isDark ? '#1c1c2e' : '#e8e8ff') },
        ]}
      >
        <Feather
          name={getChannelFallbackIcon(item.category)}
          size={20}
          color={item.logoColor || colors.primary}
        />
      </View>
    );
  };

  /* ── Result row ───────────────────────────────────────── */
  const renderItem = ({ item }) => {
    const isChannel = item.type === 'channel';
    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: dividerCol }]}
        activeOpacity={0.7}
        onPress={() => handleItemPress(item)}
      >
        {isChannel ? (
          <ChannelThumb item={item} />
        ) : (
          <Image
            source={{ uri: item.image }}
            style={[styles.moviePoster, { backgroundColor: cardBg }]}
          />
        )}

        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {isChannel ? item.name : item.title}
          </Text>
          <View style={styles.metaRow}>
            {isChannel ? (
              <>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={[styles.itemMeta, { color: colors.textSec }]}>
                  {item.category}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.itemMeta, { color: colors.textSec }]}>{item.year}</Text>
                <Text style={[styles.dotSep, { color: isDark ? '#444' : '#bbb' }]}>•</Text>
                <Text style={[styles.itemMeta, { color: colors.textSec }]}>{item.genre}</Text>
                {item.rating && (
                  <>
                    <Text style={[styles.dotSep, { color: isDark ? '#444' : '#bbb' }]}>•</Text>
                    <Feather name="star" size={10} color="#f5c518" />
                    <Text style={[styles.itemMeta, { color: '#f5c518', marginLeft: 2 }]}>
                      {item.rating}
                    </Text>
                  </>
                )}
              </>
            )}
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={iconColor} />
      </TouchableOpacity>
    );
  };

  /* ── Empty / loading state ────────────────────────────── */
  const renderEmpty = () => {
    if (isSearching) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyLabel, { color: colors.textSec, marginTop: 12 }]}>
            Searching...
          </Text>
        </View>
      );
    }
    if (query.trim().length > 0) {
      return (
        <View style={styles.centerState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: cardBg }]}>
            <Feather name="search" size={30} color={emptyIcon} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No results for "{query}"
          </Text>
          <Text style={[styles.emptyLabel, { color: colors.textSec }]}>
            Try different keywords or change the filter
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.centerState}>
        <View style={[styles.emptyIconWrap, { backgroundColor: cardBg }]}>
          <Feather name="search" size={30} color={emptyIcon} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Search PPLEX</Text>
        <Text style={[styles.emptyLabel, { color: colors.textSec }]}>
          Find movies, shows and live channels
        </Text>
        <View style={styles.suggestionsWrap}>
          {['News', 'Sports', 'Drama', 'BTV', 'NTV', 'Cricket'].map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setQuery(s)}
              style={[
                styles.suggestion,
                { backgroundColor: cardBg, borderColor: chipBorder },
              ]}
            >
              <Feather
                name="trending-up"
                size={12}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      statusBarTranslucent
    >
      {/* Force correct status-bar style */}
      <StatusBar
        backgroundColor={overlayBg}
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
      />

      {/* Root fills whole screen including behind status bar */}
      <View style={[styles.root, { backgroundColor: overlayBg }]}>
        {/* Status-bar spacer */}
        <View style={{ height: safeTop, backgroundColor: overlayBg }} />

        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: dividerCol }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: inputBg, borderColor: inputBorder },
            ]}
          >
            <Feather name="search" size={18} color={iconColor} style={{ marginRight: 8 }} />
            <TextInput
              ref={inputRef}
              placeholder="Movies, Shows, Live TV..."
              placeholderTextColor={colors.placeholder}
              value={query}
              onChangeText={setQuery}
              style={[styles.input, { color: colors.text }]}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
                <Feather name="x-circle" size={17} color={iconColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Category chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesWrap}
        >
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isActive ? colors.primary : chipBg,
                    borderColor:     isActive ? colors.primary : chipBorder,
                  },
                ]}
              >
                <Feather
                  name={getCategoryIcon(cat)}
                  size={13}
                  color={isActive ? '#fff' : colors.textSec}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: isActive ? '#fff' : colors.textSec },
                    isActive && { fontWeight: '700' },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Thin divider */}
        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Result count label */}
        {query.trim().length > 0 && !isSearching && results.length > 0 && (
          <Text style={[styles.resultsCount, { color: colors.textSec }]}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </Text>
        )}

        {/* ── List — flex:1 so empty state is vertically centred ── */}
        <FlatList
          data={results}
          keyExtractor={item => item.type + '-' + item.id}
          renderItem={renderItem}
          contentContainerStyle={
            results.length === 0
              ? styles.listContainerEmpty   // flex:1 + centred
              : styles.listContainerFilled
          }
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: { padding: 6 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  categoriesWrap: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: { fontSize: 13, fontWeight: '500' },
  divider: { height: 1, marginHorizontal: 14 },
  resultsCount: {
    fontSize: 12,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  listContainerFilled: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  listContainerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  channelLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLogoImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  moviePoster: {
    width: 42,
    height: 58,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  liveBadge: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  liveText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemMeta: { fontSize: 12 },
  dotSep: { fontSize: 12, marginHorizontal: 5 },
  /* Empty / loading centre block */
  centerState: {
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyLabel: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    margin: 4,
  },
  suggestionText: { fontSize: 13 },
});
