import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TouchableHighlight,
  StatusBar,
  FlatList,
  Share,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '../context/ThemeContext';
import TopBar from '../components/TopBar';
import { getImageUrl, getStreamUrl, fetchMovies, fetchMovieDetails } from '../services/jellyfinApi';

const { width } = Dimensions.get('window');

const RelatedMovieItem = React.memo(({ item, colors, onPress }) => {
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
        styles.relatedCard,
        { borderColor: 'transparent', borderWidth: 2 },
        isFocused && {
          borderColor: colors.primary,
          transform: [{ scale: 1.05 }],
        }
      ]}
    >
      <View style={styles.relatedCardInner}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.relatedImage} />
        ) : (
          <View style={styles.relatedPlaceholder}>
            <Feather name="film" size={20} color={colors.textSec} />
          </View>
        )}
        <View style={styles.relatedOverlay} />
        <Text style={styles.relatedTitle} numberOfLines={1}>
          {item.Name}
        </Text>
      </View>
    </TouchableHighlight>
  );
});

export default function MovieDetailScreen({ route, navigation }) {
  const { colors, theme } = useTheme();
  const { movie } = route.params || {};
  const [activeTab, setActiveTab] = useState('About');
  const [isLiked, setIsLiked] = useState(false);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [isPlayFocused, setIsPlayFocused] = useState(false);
  const [detailedMovie, setDetailedMovie] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'web' && !Platform.isTV) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((err) => {
          console.log('Error locking to portrait on MovieDetailScreen focus:', err);
        });
      }
    }, [])
  );

  useEffect(() => {
    if (!movie?.Id) return;
    const loadRelated = async () => {
      try {
        const allMovies = await fetchMovies();
        setRelatedMovies(allMovies.filter((m) => m.Id !== movie.Id));
      } catch (err) {
        console.log('Error loading related movies:', err);
      }
    };
    loadRelated();
  }, [movie?.Id]);

  useEffect(() => {
    if (!movie?.Id) return;
    const loadDetails = async () => {
      try {
        const details = await fetchMovieDetails(movie.Id);
        setDetailedMovie(details);
      } catch (err) {
        console.log('Error loading movie details:', err);
      }
    };
    loadDetails();
  }, [movie?.Id]);

  if (!movie) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>No movie details available.</Text>
      </SafeAreaView>
    );
  }

  const runtimeSource = detailedMovie?.RunTimeTicks || movie.RunTimeTicks;
  const durationMinutes = runtimeSource ? Math.round(runtimeSource / (10000000 * 60)) : null;
  const durationText = durationMinutes ? (durationMinutes > 60 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : `${durationMinutes}m`) : 'N/A';
  const genreText = movie.Genres && movie.Genres.length > 0 ? movie.Genres.join(', ') : 'Movie';
  const releaseYear = movie.ProductionYear || (movie.PremiereDate ? new Date(movie.PremiereDate).getFullYear() : 'N/A');
  const imageUrl = getImageUrl(movie.Id);
  const rating = movie.CommunityRating ? movie.CommunityRating.toFixed(1) : null;
  const actorSource = detailedMovie?.People || movie.People || [];
  const actors = actorSource.filter((p) => p.Type === 'Actor');

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Watch "${movie.Name}" on the PPLEX App!${rating ? ` Rating: ⭐ ${rating}` : ''}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleDownload = () => {
    Alert.alert('Download Started', `"${movie.Name}" is now downloading in the background. Check your notifications for progress.`);
  };

  const renderCastItem = ({ item }) => {
    const actorPic = getImageUrl(item.Id);
    return (
      <View style={styles.castItem}>
        {actorPic ? (
          <Image source={{ uri: actorPic }} style={styles.castImage} />
        ) : (
          <View style={[styles.castImagePlaceholder, { backgroundColor: colors.surface }]}>
            <Feather name="user" size={20} color={colors.textSec} />
          </View>
        )}
        <Text style={[styles.castName, { color: colors.text }]} numberOfLines={1}>
          {item.Name}
        </Text>
        {item.Role && (
          <Text style={[styles.castRole, { color: colors.textSec }]} numberOfLines={1}>
            as {item.Role}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />
      <TopBar back navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Backdrop */}
        <View style={styles.bannerContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.bannerImage} />
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: colors.surface }]} />
          )}
          <View style={styles.bannerOverlay} />
          <View style={[styles.hdBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.hdText}>HD</Text>
          </View>
        </View>

        {/* Movie Info */}
        <View style={styles.infoWrapper}>
          <Text style={[styles.movieTitle, { color: colors.text }]}>{movie.Name}</Text>

          {/* Metadata Tags */}
          <View style={styles.metadataRow}>
            <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textSec }]} numberOfLines={1}>{movie.Genres && movie.Genres.length > 0 ? movie.Genres[0] : 'Movie'}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textSec }]}>{releaseYear}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textSec }]}>{durationText}</Text>
            </View>

            {/* Stars */}
            {rating && (
              <View style={styles.starsRow}>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const numericRating = parseFloat(rating) / 2; // scale 10 to 5
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
                <Text style={[styles.starsRatingVal, { color: colors.textSec }]}>({rating})</Text>
              </View>
            )}
          </View>

          {/* Play Button CTA */}
          <TouchableHighlight
            focusable={true}
            isTVSelectable={true}
            onFocus={() => setIsPlayFocused(true)}
            onBlur={() => setIsPlayFocused(false)}
            onPress={() =>
              navigation.navigate('Player', {
                streamUrl: getStreamUrl(movie.Id),
                title: movie.Name,
                isLive: false,
                itemId: movie.Id,
                movie: detailedMovie || movie,
              })
            }
            underlayColor={colors.primary}
            style={[
              styles.playCta,
              { backgroundColor: colors.primary, shadowColor: colors.primary, borderColor: 'transparent', borderWidth: 2.5 },
              isPlayFocused && {
                borderColor: '#ffffff',
                transform: [{ scale: 1.03 }],
              },
            ]}
          >
            <View style={styles.playCtaInner}>
              <Feather name="play" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.playCtaText}>Watch Movie</Text>
            </View>
          </TouchableHighlight>

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
            {['About', 'Related'].map((tab) => {
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
              {detailedMovie === null ? (
                <View style={{ paddingVertical: 40, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.textSec, marginTop: 10, fontSize: 12 }}>Loading details...</Text>
                </View>
              ) : (
                <>
                  {/* Storyline */}
                  <Text style={[styles.subHeading, { color: colors.text }]}>Storyline</Text>
                  <Text style={[styles.storyline, { color: colors.textSec }]}>
                    {detailedMovie.Overview || 'No storyline details available for this movie.'}
                  </Text>

                  {/* Genres Detail */}
                  <Text style={[styles.subHeading, { color: colors.text, marginTop: 10 }]}>Genres</Text>
                  <Text style={[styles.storyline, { color: colors.textSec, marginBottom: 20 }]}>
                    {genreText}
                  </Text>

                  {/* Cast */}
                  {actors.length > 0 && (
                    <>
                      <Text style={[styles.subHeading, { color: colors.text }]}>Top Cast</Text>
                      <FlatList
                        data={actors}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        renderItem={renderCastItem}
                        keyExtractor={(item) => item.Id}
                        contentContainerStyle={styles.castList}
                      />
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {activeTab === 'Related' && (
            <View style={styles.tabContent}>
              <Text style={[styles.subHeading, { color: colors.text }]}>You May Also Like</Text>
              <FlatList
                data={relatedMovies}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <RelatedMovieItem
                    item={item}
                    colors={colors}
                    onPress={(pressedItem) => navigation.push('MovieDetail', { movie: pressedItem })}
                  />
                )}
                keyExtractor={(item) => item.Id}
                contentContainerStyle={styles.relatedList}
                ListEmptyComponent={
                  <Text style={[styles.emptyRelatedText, { color: colors.textSec }]}>
                    No related movies found.
                  </Text>
                }
              />
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
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
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
    maxWidth: 120,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    gap: 2,
  },
  starsRatingVal: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  playCta: {
    height: 48,
    borderRadius: 12,
    marginTop: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  playCtaInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 10,
  },
  castList: {
    gap: 15,
    paddingTop: 5,
  },
  castItem: {
    alignItems: 'center',
    width: 80,
  },
  castImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
    resizeMode: 'cover',
  },
  castImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  castName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  castRole: {
    fontSize: 8.5,
    textAlign: 'center',
    width: '100%',
    marginTop: 1,
  },
  relatedList: {
    gap: 12,
    paddingTop: 5,
  },
  relatedCard: {
    width: 130,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  relatedCardInner: {
    flex: 1,
    position: 'relative',
  },
  relatedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  relatedPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  relatedTitle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '750',
  },
  emptyRelatedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
