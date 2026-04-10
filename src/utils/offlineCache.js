import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@aspyre_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cache utility for offline data storage.
 * Stores data with timestamps to handle expiration.
 */

// Cache keys
export const CACHE_KEYS = {
  FEED_DISCOVER: 'feed_discover',
  FEED_FRIENDS: 'feed_friends',
  JOURNALS: 'journals',
  GOALS: 'goals',
  PROFILE: 'profile',
};

/**
 * Store data in cache with timestamp
 */
export async function cacheData(key, data) {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify(cacheEntry)
    );
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

/**
 * Retrieve data from cache, returns null if expired or not found
 */
export async function getCachedData(key, maxAge = CACHE_EXPIRY_MS) {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > maxAge) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

/**
 * Clear specific cache key
 */
export async function clearCache(key) {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
}

/**
 * Clear all cache data
 */
export async function clearAllCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.warn('Cache clear all error:', error);
  }
}

/**
 * Get cache age in milliseconds, returns null if not cached
 */
export async function getCacheAge(key) {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const { timestamp } = JSON.parse(cached);
    return Date.now() - timestamp;
  } catch (error) {
    return null;
  }
}

/**
 * Format cache age as human-readable string
 */
export function formatCacheAge(ageMs) {
  if (!ageMs) return null;

  const minutes = Math.floor(ageMs / 60000);
  const hours = Math.floor(ageMs / 3600000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return 'over a day ago';
}
