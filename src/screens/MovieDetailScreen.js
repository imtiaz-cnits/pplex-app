import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import TopBar from '../components/TopBar';
import { MOCK_MOVIES } from '../constants/mockData';

export default function MovieDetailScreen({ route, navigation }) {
  const { colors, theme } = useTheme();
  const { movie } = route.params || { movie: MOCK_MOVIES[0] };
  const [activeTab, setActiveTab] = useState('About');
  const [isLiked, setIsLiked] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Watch "${movie.title}" on the PPLEX App! rating: ⭐ ${movie.rating}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleDownload = () => {
    Alert.alert('Download Started', `"${movie.title}" is now downloading in the background. Check your notifications for progress.`);
  };

  const renderCastItem = ({ item }) => (
    <View style={styles.castItem}>
      <Image source={{ uri: item.image }} style={styles.castImage} />
      <Text style={[styles.castName, { color: colors.text }]} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );

  const renderRelatedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.relatedCard}
      activeOpacity={0.8}
      onPress={() => navigation.push('MovieDetail', { movie: item })}
    >
      <Image source={{ uri: item.image }} style={styles.relatedImage} />
      <View style={styles.relatedOverlay} />
      <Text style={styles.relatedTitle} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />
      <TopBar back navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Backdrop */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: movie.image }} style={styles.bannerImage} />
          <View style={styles.bannerOverlay} />
          <View style={[styles.hdBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.hdText}>HD</Text>
          </View>
        </View>

        {/* Movie Info */}
        <View style={styles.infoWrapper}>
          <Text style={[styles.movieTitle, { color: colors.text }]}>{movie.title}</Text>

          {/* Metadata Tags */}
          <View style={styles.metadataRow}>
            <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textSec }]}>{movie.genre}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textSec }]}>{movie.year}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textSec }]}>{movie.duration || '2h 18m'}</Text>
            </View>

            {/* Stars */}
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, idx) => {
                const numericRating = parseFloat(movie.rating) / 2; // scale 10 to 5
                const isFilled = idx + 1 <= Math.floor(numericRating);
                const isHalf = !isFilled && idx < numericRating;
                return (
                  <MaterialCommunityIcons
                    key={idx}
                    name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
                    size={14}
                    color="#FFD600"
                  />
                );
              })}
            </View>
          </View>

          {/* Play Button CTA */}
          <TouchableOpacity
            style={[styles.playCta, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Player', { streamUrl: movie.streamUrl, title: movie.title, isLive: false })}
          >
            <Feather name="play" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.playCtaText}>Watch Movie</Text>
          </TouchableOpacity>

          {/* Social Action Tabs */}
          <View style={[styles.socialRow, { borderBottomColor: colors.border, borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => setIsLiked(!isLiked)}>
              <Feather name="heart" size={18} color={isLiked ? '#ff5252' : colors.textSec} fill={isLiked ? '#ff5252' : 'none'} />
              <Text style={[styles.socialText, { color: isLiked ? '#ff5252' : colors.textSec }]}>
                {isLiked ? 'Liked' : 'Like'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} onPress={handleDownload}>
              <Feather name="download" size={18} color={colors.textSec} />
              <Text style={[styles.socialText, { color: colors.textSec }]}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} onPress={handleShare}>
              <Feather name="share-2" size={18} color={colors.textSec} />
              <Text style={[styles.socialText, { color: colors.textSec }]}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Content Tabs */}
          <View style={styles.tabsContainer}>
            {['About', 'Related', 'Reviews'].map((tab) => {
              const isSelected = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabItem, isSelected && { borderBottomColor: colors.primary }]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: colors.textSec },
                      isSelected && { color: colors.primary, fontWeight: 'bold' },
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Contents */}
          {activeTab === 'About' && (
            <View style={styles.tabContent}>
              {/* Storyline */}
              <Text style={[styles.subHeading, { color: colors.text }]}>Storyline</Text>
              <Text style={[styles.storyline, { color: colors.textSec }]}>{movie.description}</Text>

              {/* Cast */}
              {movie.cast && movie.cast.length > 0 && (
                <>
                  <Text style={[styles.subHeading, { color: colors.text }]}>Top Cast</Text>
                  <FlatList
                    data={movie.cast}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={renderCastItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.castList}
                  />
                </>
              )}
            </View>
          )}

          {activeTab === 'Related' && (
            <View style={styles.tabContent}>
              <Text style={[styles.subHeading, { color: colors.text }]}>You May Also Like</Text>
              <FlatList
                data={MOCK_MOVIES.filter((m) => m.id !== movie.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderRelatedItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.relatedList}
              />
            </View>
          )}

          {activeTab === 'Reviews' && (
            <View style={styles.tabContent}>
              <Text style={[styles.subHeading, { color: colors.text }]}>User Reviews</Text>
              <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewUser, { color: colors.text }]}>Imtiaz Khan</Text>
                  <View style={styles.reviewStars}>
                    <MaterialCommunityIcons name="star" size={12} color="#FFD600" />
                    <Text style={[styles.reviewRating, { color: colors.text }]}>{movie.rating}</Text>
                  </View>
                </View>
                <Text style={[styles.reviewText, { color: colors.textSec }]}>
                  Absolutely amazing! The performance was incredible and the story kept me engaged all the way through. Highly recommend this movie.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    height: 220,
    width: '100%',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  hdBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hdText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  infoWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  movieTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 2,
  },
  playCta: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  socialBtn: {
    alignItems: 'center',
    gap: 4,
  },
  socialText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabItem: {
    paddingVertical: 10,
    marginRight: 25,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabContent: {
    paddingVertical: 15,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  storyline: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 20,
  },
  castList: {
    gap: 15,
    paddingTop: 5,
  },
  castItem: {
    alignItems: 'center',
    width: 65,
  },
  castImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
    resizeMode: 'cover',
  },
  castName: {
    fontSize: 10,
    fontWeight: '600',
  },
  relatedList: {
    gap: 12,
    paddingTop: 5,
  },
  relatedCard: {
    width: 120,
    height: 76,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
  },
  relatedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  relatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  relatedTitle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  reviewCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUser: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reviewRating: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
