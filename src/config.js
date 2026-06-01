// config.js
// Centralized configuration for Pabna Cable Vision (PPLEX) App

// 1. API Endpoint Base URL (change this to point to the live server)
// In production, change this to your Next.js api domain or cPanel hosting domain.
export const API_BASE_URL = 'http://172.19.19.130';

// 2. Dynamic Live TV Integration Mode
// Options:
// - 'STANDARD': Custom JSON endpoint returning { id, name, logoUrl, streamUrl, category }
// - 'XTREAM': Xtream Codes API Panel (direct connection to IPTV server)
export const INTEGRATION_MODE = 'STANDARD';

// Xtream Codes API specific configurations (ignored in 'STANDARD' mode)
export const XTREAM_USERNAME = 'guest';
export const XTREAM_PASSWORD = 'password';

// 3. Client Release Metadata (used by the Force Update engine)
export const FORCE_MOCK_DATA = false; // Set to true to bypass all API fetching and use mock data without warnings


