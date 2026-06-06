import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import parser from 'iptv-playlist-parser';
import { MOCK_CHANNELS, MOCK_NOTIFICATIONS } from '../constants/mockData';
import { API_BASE_URL, INTEGRATION_MODE, XTREAM_USERNAME, XTREAM_PASSWORD, FORCE_MOCK_DATA, CONFIG } from '../config';
import { normalizeChannels } from '../utils/channelAdapter';
import { parseM3U } from '../utils/m3uParser';

const OverlayContext = createContext();

const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

export const OverlayProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [channels, setChannels] = useState(MOCK_CHANNELS);
  const [isFallback, setIsFallback] = useState(true);
  const [isOffNetwork, setIsOffNetwork] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [pipVideoInfo, setPipVideoInfo] = useState(null);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [forceUpdateData, setForceUpdateData] = useState({ visible: false, downloadUrl: '', latestVersion: '' });


  const fetchNotifications = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const fetchUrl = `${API_BASE_URL}/notifications.json?t=${Date.now()}`;
      const response = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const rawData = await response.json();
        if (Array.isArray(rawData)) {
          setNotifications(rawData);
          return rawData;
        }
      }
    } catch (e) {
      console.log('Dynamic notifications fetch failed, falling back to mock:', e.message);
    }
    setNotifications(MOCK_NOTIFICATIONS);
    return MOCK_NOTIFICATIONS;
  };

  const fetchLiveChannels = async () => {
    if (FORCE_MOCK_DATA) {
      setChannels(MOCK_CHANNELS);
      setIsFallback(false);
      setIsOffNetwork(false);
      return MOCK_CHANNELS;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const cacheBustUrl = `${CONFIG.LIVE_TV_SOURCE}?t=${Date.now()}`;
      const response = await fetch(cacheBustUrl, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const parsed = parser.parse(text);
        
        if (parsed && parsed.items && parsed.items.length > 0) {
          const seenIds = new Set();
          const mapped = parsed.items.map((item, index) => {
            const colorsList = [
              { bg: '#e8f5e9', color: '#2e7d32' },
              { bg: '#fff3e0', color: '#ef6c00' },
              { bg: '#e3f2fd', color: '#1565c0' },
              { bg: '#f3e5f5', color: '#7b1fa2' },
              { bg: '#ffebee', color: '#c62828' },
              { bg: '#e0f7fa', color: '#00838f' },
              { bg: '#fce4ec', color: '#ad1457' },
              { bg: '#f1f8e9', color: '#558b2f' },
            ];
            const name = item.name || 'Unknown Channel';
            const colorIndex = Math.abs(hashCode(name)) % colorsList.length;
            const category = item.group?.title?.trim() || 'Other';
            
            let iconName = 'television';
            const cat = category.toLowerCase();
            if (cat.includes('news')) {
              iconName = 'radio-tower';
            } else if (cat.includes('sport')) {
              iconName = 'trophy';
            } else if (cat.includes('movie') || cat.includes('cinema')) {
              iconName = 'movie-roll';
            }

            // Ensure unique ID
            const rawId = item.tvg?.id?.trim() || `m3u-${index + 1}`;
            let uniqueId = rawId;
            let counter = 1;
            while (seenIds.has(uniqueId)) {
              uniqueId = `${rawId}-${counter}`;
              counter++;
            }
            seenIds.add(uniqueId);

            return {
              id: uniqueId,
              name: name,
              logoUrl: item.tvg?.logo || '',
              streamUrl: item.url || '',
              category: category,
              nowPlaying: 'Live Stream',
              logoBg: colorsList[colorIndex].bg,
              logoColor: colorsList[colorIndex].color,
              iconName: iconName,
              // Native properties for future/backward compatibility
              tvg: item.tvg,
              group: item.group,
              url: item.url
            };
          });

          console.log(`[PCV] Playlist loaded: ${mapped.length} channels from server`);
          setChannels(mapped);
          setIsFallback(false);
          setIsOffNetwork(false);
          return mapped;
        }
      }
      throw new Error('Response status not OK or playlist empty');
    } catch (error) {
      console.log('Local network fetch failed:', error.message);
      setChannels(MOCK_CHANNELS);
      setIsFallback(true);
      setIsOffNetwork(true);
      return MOCK_CHANNELS;
    }
  };

  const fetchGlobalPlaylist = async () => {
    fetchNotifications();
    return await fetchLiveChannels();
  };

  const checkAppVersion = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `${API_BASE_URL}/version.json?t=${Date.now()}`;
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.minimumVersionCode === 'number') {
          if (CONFIG.CURRENT_VERSION_CODE < data.minimumVersionCode) {
            setForceUpdateData({
              visible: true,
              downloadUrl: data.downloadUrl || '',
              latestVersion: data.latestVersion || 'latest'
            });
          }
        }
      }
    } catch (e) {
      console.log('App version check failed/offline:', e.message);
    }
  };

  useEffect(() => {
    // Check version on mount
    checkAppVersion();

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App returned to foreground, auto-syncing channels...');
        fetchLiveChannels();
        checkAppVersion();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);


  const closeAll = () => {
    setSidebarOpen(false);
    setSearchOpen(false);
    setNotiOpen(false);
  };

  const showComingSoon = (featureName) => {
    setComingSoonFeature(featureName);
    setComingSoonVisible(true);
  };

  return (
    <OverlayContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        searchOpen,
        setSearchOpen,
        notiOpen,
        setNotiOpen,
        isLoading,
        setIsLoading,
        channels,
        setChannels,
        isFallback,
        isOffNetwork,
        fetchLiveChannels,
        fetchGlobalPlaylist,
        closeAll,
        showComingSoon,
        comingSoonVisible,
        setComingSoonVisible,
        comingSoonFeature,
        setComingSoonFeature,
        pipActive,
        setPipActive,
        pipVideoInfo,
        setPipVideoInfo,
        notifications,
        setNotifications,
        fetchNotifications,
        forceUpdateData,
        checkAppVersion,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlays = () => useContext(OverlayContext);
