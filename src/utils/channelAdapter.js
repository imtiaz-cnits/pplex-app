// src/utils/channelAdapter.js
import { API_BASE_URL, INTEGRATION_MODE, XTREAM_USERNAME, XTREAM_PASSWORD } from '../config';

/**
 * Normalizes a raw array of channels from various backend server architectures
 * into the standard format expected by the PPLEX React Native client.
 * 
 * @param {Array} rawChannels Raw channels array from backend response
 * @param {Array} rawCategories Optional categories mapping (for Xtream Codes category_id resolution)
 * @returns {Array} Clean normalized channels array
 */
export function normalizeChannels(rawChannels, rawCategories = []) {
  if (!Array.isArray(rawChannels)) return [];

  // Create a fast lookup map for categories if using Xtream Codes
  const categoryMap = {};
  if (Array.isArray(rawCategories)) {
    rawCategories.forEach(cat => {
      if (cat.category_id && cat.category_name) {
        categoryMap[cat.category_id] = cat.category_name;
      }
    });
  }

  return rawChannels.map((item, index) => {
    // 1. XTREAM CODES PANEL INTEGRATION
    if (INTEGRATION_MODE === 'XTREAM' || (item.hasOwnProperty('stream_id') && item.hasOwnProperty('name'))) {
      const streamId = item.stream_id || item.id;
      
      // HLS format for Xtream Codes live streams:
      // http://<domain>:<port>/live/<username>/<password>/<stream_id>.m3u8
      const streamUrl = `${API_BASE_URL}/live/${XTREAM_USERNAME}/${XTREAM_PASSWORD}/${streamId}.m3u8`;
      
      const categoryName = categoryMap[item.category_id] || item.category_name || 'General';

      return {
        id: String(streamId),
        name: item.name || 'Unknown Channel',
        logoUrl: item.stream_icon || item.logo_url || '',
        streamUrl: streamUrl,
        category: categoryName,
        nowPlaying: 'Live Stream',
        logoBg: '#222222',
        logoColor: '#ffffff',
        iconName: 'tv'
      };
    }

    // 2. STANDARD CUSTOM REST API / JSON INTEGRATION (CamelCase & snake_case support)
    return {
      id: String(item.id || item.stream_id || index),
      name: item.name || item.title || 'Unknown Channel',
      logoUrl: item.logoUrl || item.logo_url || item.stream_icon || '',
      streamUrl: item.streamUrl || item.stream_url || '',
      category: item.category || item.category_name || 'General',
      nowPlaying: item.nowPlaying || item.now_playing || 'Live Stream',
      logoBg: item.logoBg || item.logo_bg || '#222222',
      logoColor: item.logoColor || item.logo_color || '#ffffff',
      iconName: item.iconName || item.icon_name || 'tv'
    };
  });
}
