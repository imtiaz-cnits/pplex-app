import { JELLYFIN_URL, JELLYFIN_API_KEY, JELLYFIN_USER_ID } from '../config';

export const getImageUrl = (itemId) => {
  if (!itemId) return '';
  return `${JELLYFIN_URL}/Items/${itemId}/Images/Primary?api_key=${JELLYFIN_API_KEY}`;
};

export const getBackdropUrl = (itemId) => {
  if (!itemId) return '';
  return `${JELLYFIN_URL}/Items/${itemId}/Images/Backdrop?api_key=${JELLYFIN_API_KEY}`;
};

export const getStreamUrl = (itemId) => {
  if (!itemId) return '';
  // HLS stream with device capabilities and mediaSourceId to prevent 400 Bad Request, forcing AAC audio transcoding
  return `${JELLYFIN_URL}/Videos/${itemId}/master.m3u8?api_key=${JELLYFIN_API_KEY}&deviceId=pplex-app&mediaSourceId=${itemId}&videoCodec=h264&audioCodec=aac&transcodingContainer=ts&transcodingProtocol=hls&audioChannels=2`;
};

export const fetchMovies = async (limit = 30, startIndex = 0) => {
  try {
    const url = `${JELLYFIN_URL}/Users/${JELLYFIN_USER_ID}/Items?IncludeItemTypes=Movie,Series&Recursive=true&Fields=Genres,PrimaryImageAspectRatio,PremiereDate,ProductionYear,ImageTags,Path,DateCreated,UserData&SortBy=DateCreated&SortOrder=Descending&api_key=${JELLYFIN_API_KEY}&Limit=${limit}&StartIndex=${startIndex}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Jellyfin API responded with status ${response.status}`);
    const data = await response.json();
    return data.Items || [];
  } catch (error) {
    console.error('Error fetching movies:', error);
    throw error;
  }
};

export const fetchLatestMovies = async (limit = 20) => {
  return await fetchMovies(limit);
};

export const fetchFeaturedMovies = async () => {
  try {
    const url = `${JELLYFIN_URL}/Users/${JELLYFIN_USER_ID}/Items?IncludeItemTypes=Movie,Series&Recursive=true&Fields=Genres,PrimaryImageAspectRatio,PremiereDate,ProductionYear,ImageTags,Path,DateCreated&SortBy=CommunityRating,DateCreated&SortOrder=Descending&api_key=${JELLYFIN_API_KEY}&Limit=10`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Jellyfin API responded with status ${response.status}`);
    const data = await response.json();
    return data.Items || [];
  } catch (error) {
    console.error('Error fetching featured movies:', error);
    return [];
  }
};


export const fetchMovieDetails = async (itemId) => {
  try {
    const response = await fetch(`${JELLYFIN_URL}/Users/${JELLYFIN_USER_ID}/Items/${itemId}?Fields=Overview,People,RunTimeTicks,UserData&api_key=${JELLYFIN_API_KEY}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

export const groupMoviesByGenre = (movies) => {
  const genreMap = {};
  movies.forEach((movie) => {
    const genres = movie.Genres || [];
    if (genres.length === 0) {
      const defaultGenre = 'General';
      if (!genreMap[defaultGenre]) {
        genreMap[defaultGenre] = [];
      }
      genreMap[defaultGenre].push(movie);
    } else {
      genres.forEach((genre) => {
        if (!genreMap[genre]) {
          genreMap[genre] = [];
        }
        genreMap[genre].push(movie);
      });
    }
  });

  return Object.keys(genreMap).map((genre) => ({
    genre,
    data: genreMap[genre],
  }));
};

export const groupMoviesByCategory = (movies) => {
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

  const grouped = [];
  const usedIds = new Set();

  targetCategories.forEach(category => {
    const categoryMovies = movies.filter(m => {
      const matchesGenre = m.Genres && m.Genres.some(g => g.toLowerCase().includes(category.toLowerCase()));
      const matchesPath = m.Path && m.Path.toLowerCase().includes(category.toLowerCase());
      return matchesGenre || matchesPath;
    });

    // Remove duplicates that might appear in multiple categories
    const uniqueCategoryMovies = categoryMovies.filter(m => {
      if (usedIds.has(m.Id)) return false;
      usedIds.add(m.Id);
      return true;
    });

    if (uniqueCategoryMovies.length > 0) {
      grouped.push({
        category: category,
        data: uniqueCategoryMovies
      });
    }
  });

  // Group remaining items into 'Others'
  const otherMovies = movies.filter(m => !usedIds.has(m.Id));
  if (otherMovies.length > 0) {
    grouped.push({ category: 'Others', data: otherMovies });
  }

  return grouped;
};

export const searchMovies = async (query) => {
  try {
    const url = `${JELLYFIN_URL}/Users/${JELLYFIN_USER_ID}/Items?IncludeItemTypes=Movie,Series&Recursive=true&Fields=Genres,PrimaryImageAspectRatio,PremiereDate,ProductionYear,ImageTags,Path,DateCreated&SearchTerm=${encodeURIComponent(query)}&SortBy=SortName&api_key=${JELLYFIN_API_KEY}&Limit=50`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Jellyfin API responded with status ${response.status}`);
    const data = await response.json();
    return data.Items || [];
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};

export const reportPlaybackProgress = async (itemId, positionTicks) => {
  try {
    const url = `${JELLYFIN_URL}/Sessions/Playing/Progress?api_key=${JELLYFIN_API_KEY}&ItemId=${itemId}&PositionTicks=${positionTicks}`;
    await fetch(url, { method: 'POST' });
  } catch (error) {
    console.error('Failed to report playback progress:', error);
  }
};


