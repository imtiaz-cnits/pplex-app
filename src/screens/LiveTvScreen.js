import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOverlays } from '../context/OverlayContext';
import TopBar from '../components/TopBar';
import { parseM3U } from '../utils/m3uParser';
import { MOCK_CHANNELS } from '../constants/mockData';

export default function LiveTvScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { setIsLoading, channels, setChannels, isFallback, fetchGlobalPlaylist } = useOverlays();
  const [categories, setCategories] = useState(['All']);
  const [selectedCat, setSelectedCat] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const updateCategories = (data) => {
    const cats = ['All', ...new Set(data.map((c) => c.category).filter(Boolean))];
    setCategories(cats);
  };

  const fetchPlaylist = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    const data = await fetchGlobalPlaylist();
    updateCategories(data);
    setIsLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPlaylist();
    });
    return unsubscribe;
  }, [navigation, channels]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlaylist(true);
  };

  const filteredChannels = channels.filter(
    (c) => selectedCat === 'All' || c.category === selectedCat
  );

  const renderChannelItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.chRow, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('Player', {
          streamUrl: item.streamUrl,
          title: item.name,
          channels: channels,
          currentChannelId: item.id,
          isLive: true,
        })
      }
    >
      <View style={[styles.chSq, { backgroundColor: item.logoBg || '#f0f0f0' }]}>
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.logoImage} />
        ) : (
          <Feather
            name={item.iconName === 'television' ? 'tv' : 'radio'}
            size={24}
            color={item.logoColor || '#333'}
          />
        )}
      </View>
      <View style={styles.chInfo}>
        <Text style={[styles.chName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.chNow, { color: colors.textSec }]}>
          Now Playing: <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.nowPlaying}</Text>
        </Text>
      </View>
      <View style={styles.chPlay}>
        <Feather name="play-circle" size={24} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderCategoryItem = (cat) => {
    const isSelected = selectedCat === cat;
    return (
      <TouchableOpacity
        key={cat}
        onPress={() => setSelectedCat(cat)}
        style={[
          styles.catItem,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          isSelected && {
            backgroundColor: colors.primary,
            borderColor: 'transparent',
          },
        ]}
        activeOpacity={0.7}
      >
        <Feather
          name={
            cat === 'All'
              ? 'grid'
              : cat.toLowerCase().includes('news')
                ? 'book-open'
                : cat.toLowerCase().includes('sport')
                  ? 'award'
                  : 'tv'
          }
          size={12}
          color={isSelected ? '#fff' : colors.textSec}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            styles.catText,
            { color: colors.textSec },
            isSelected && { color: '#fff', fontWeight: 'bold' },
          ]}
        >
          {cat}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />
      <TopBar navigation={navigation} />

      {/* Connection Failure Warning Banner */}
      {isFallback && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: theme === 'dark' ? '#2c1a04' : '#fff3e0',
              borderColor: theme === 'dark' ? '#b78103' : '#ffe0b2',
            },
          ]}
        >
          <Feather
            name="alert-triangle"
            size={16}
            color={theme === 'dark' ? '#ffd54f' : '#e65100'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.bannerText, { color: theme === 'dark' ? '#ffd54f' : '#e65100' }]}>
            VPN Offline: Connect to PPLEX VPN to stream Live TV. ({fetchError}). Showing offline mock channels.
          </Text>
        </View>
      )}

      {/* Category Selection Row */}
      <View style={styles.catWrapper}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => renderCategoryItem(item)}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.catList}
        />
      </View>

      {/* Channel List */}
      <FlatList
        data={filteredChannels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="slash" size={32} color={colors.textSec} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.textSec }]}>
              No channels in this category
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  bannerText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  catWrapper: {
    paddingVertical: 12,
  },
  catList: {
    paddingHorizontal: 15,
    gap: 8,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chList: {
    paddingHorizontal: 15,
    paddingBottom: 90, // space for bottom tabs
  },
  chRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  chSq: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  chInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  chName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  chNow: {
    fontSize: 11,
  },
  chPlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 13,
  },
});
