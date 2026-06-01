/**
 * Utility to parse M3U Playlists
 */

export function parseM3U(rawText) {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/);
  const channels = [];
  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      currentChannel = {};
      
      // Parse tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      if (logoMatch) {
        currentChannel.logoUrl = logoMatch[1];
      }

      // Parse group-title (category)
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch) {
        currentChannel.category = groupMatch[1].trim();
      } else {
        currentChannel.category = 'Other';
      }

      // Parse name (everything after the last comma)
      const lastCommaIndex = line.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        currentChannel.name = line.substring(lastCommaIndex + 1).trim();
      } else {
        // Fallback to tvg-name
        const nameMatch = line.match(/tvg-name="([^"]+)"/i);
        currentChannel.name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
      }
    } else if (line.startsWith('#')) {
      // Other tag lines, skip
    } else if (currentChannel) {
      // This must be the URL line
      currentChannel.streamUrl = line;
      currentChannel.id = `m3u-${channels.length + 1}`;
      
      // Generate some nice UI meta elements
      currentChannel.nowPlaying = 'Live Stream';
      
      // Generate aesthetic colors based on channel name
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
      const colorIndex = Math.abs(hashCode(currentChannel.name)) % colorsList.length;
      currentChannel.logoBg = colorsList[colorIndex].bg;
      currentChannel.logoColor = colorsList[colorIndex].color;
      
      // Determine iconography
      const cat = currentChannel.category.toLowerCase();
      if (cat.includes('news')) {
        currentChannel.iconName = 'radio-tower';
      } else if (cat.includes('sport')) {
        currentChannel.iconName = 'trophy';
      } else if (cat.includes('movie') || cat.includes('cinema')) {
        currentChannel.iconName = 'movie-roll';
      } else {
        currentChannel.iconName = 'television';
      }

      channels.push(currentChannel);
      currentChannel = null;
    }
  }

  return channels;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
