import React, { createContext, useState, useContext } from 'react';
import { MOCK_CHANNELS, MOCK_NOTIFICATIONS } from '../constants/mockData';
import { API_BASE_URL, INTEGRATION_MODE, XTREAM_USERNAME, XTREAM_PASSWORD, FORCE_MOCK_DATA } from '../config';
import { normalizeChannels } from '../utils/channelAdapter';
import { parseM3U } from '../utils/m3uParser';

const OverlayContext = createContext();

export const OverlayProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [channels, setChannels] = useState(MOCK_CHANNELS);
  const [isFallback, setIsFallback] = useState(true);
  const [pipActive, setPipActive] = useState(false);
  const [pipVideoInfo, setPipVideoInfo] = useState(null);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);


  const fetchNotifications = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const fetchUrl = `${API_BASE_URL}/notifications.json`;

      const response = await fetch(fetchUrl, { signal: controller.signal });
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

  const fetchGlobalPlaylist = async () => {
    // Refresh notifications in parallel
    fetchNotifications();

    if (FORCE_MOCK_DATA) {
      setChannels(MOCK_CHANNELS);
      setIsFallback(false);
      return MOCK_CHANNELS;
    }
    if (INTEGRATION_MODE === 'XTREAM') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const fetchUrl = `${API_BASE_URL}/player_api.php?username=${XTREAM_USERNAME}&password=${XTREAM_PASSWORD}&action=get_live_streams`;
        const categoriesUrl = `${API_BASE_URL}/player_api.php?username=${XTREAM_USERNAME}&password=${XTREAM_PASSWORD}&action=get_live_categories`;

        const response = await fetch(fetchUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const rawData = await response.json();
          let rawCategories = [];
          
          try {
            const catController = new AbortController();
            const catTimeout = setTimeout(() => catController.abort(), 5000);
            const catResponse = await fetch(categoriesUrl, { signal: catController.signal });
            clearTimeout(catTimeout);
            if (catResponse.ok) {
              rawCategories = await catResponse.json();
            }
          } catch (catError) {
            console.log('Failed to fetch categories mapping:', catError.message);
          }

          const normalized = normalizeChannels(rawData, rawCategories);
          if (normalized && normalized.length > 0) {
            setChannels(normalized);
            setIsFallback(false);
            return normalized;
          }
        }
      } catch (e) {
        console.log('Xtream Codes playlist fetch failed:', e.message);
      }
    } else {
      // STANDARD Custom JSON API or M3U Playlist (Parallel Fetch with 2s Timeout)
      const urls = [
        `${API_BASE_URL}/playlist.m3u8`,
        `${API_BASE_URL}/channels.php`,
        `${API_BASE_URL}/api/channels`
      ];

      const fetchWithTimeout = (url) => new Promise(async (resolve, reject) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error('Timeout'));
        }, 2000);

        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
            const text = await response.text();
            // Check if M3U format
            if (text.trim().startsWith('#EXTM3U') || url.endsWith('.m3u8') || url.endsWith('.m3u')) {
              const parsed = parseM3U(text);
              if (parsed && parsed.length > 0) {
                resolve(parsed);
                return;
              }
            } else {
              // Try parsing as standard JSON
              const rawData = JSON.parse(text);
              const normalized = normalizeChannels(rawData);
              if (normalized && normalized.length > 0) {
                resolve(normalized);
                return;
              }
            }
          }
          reject(new Error('Non-ok response'));
        } catch (err) {
          clearTimeout(timeoutId);
          reject(err);
        }
      });

      // Standard Promise.any safe helper for older Hermes engines
      const safePromiseAny = (promises) => new Promise((resolve, reject) => {
        let errors = [];
        let remaining = promises.length;
        promises.forEach((p) => {
          Promise.resolve(p)
            .then(resolve)
            .catch((err) => {
              errors.push(err);
              remaining -= 1;
              if (remaining === 0) reject(new Error('All failed'));
            });
        });
      });

      try {
        const normalized = await safePromiseAny(urls.map(url => fetchWithTimeout(url)));
        setChannels(normalized);
        setIsFallback(false);
        return normalized;
      } catch (e) {
        console.log('Standard channels parallel fetch failed:', e.message);
      }
    }

    setChannels(MOCK_CHANNELS);
    setIsFallback(true);
    return MOCK_CHANNELS;
  };

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
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlays = () => useContext(OverlayContext);
