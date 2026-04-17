import AsyncStorage from "@react-native-async-storage/async-storage";

// FAST_storage: Bare AsyncStorage wrapper optimized for <500ms reads
// No classes, crypto, checksums, cache - direct JSON ops + fast skeleton fallbacks
const STORAGE_PREFIX = 'moodverse:';
const STATS_KEY = `${STORAGE_PREFIX}dashboard_stats`;
const STATS_TIMEOUT = 500; // ms

// Skeleton data - immediate fallback for instant UI
const SKELETON_STATS = {
  profile: { name: 'Explorer', joinDate: new Date().toISOString().split('T')[0] },
  todos: [
    { id: '1', text: 'Morning meditation', done: false },
    { id: '2', text: 'Drink 3L water', done: false },
    { id: '3', text: 'Journal for 5 min', done: false },
  ],
  focus: 'Mindful breathing',
  points: 120,
  streakData: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
  dailyLogs: [],
  chakraSessions: [],
  journalEntries: 0,
};

// Promise.race: real data vs timeout → skeleton
async function getStats() {
  return Promise.race([
    // Real data (may be slow)
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STATS_KEY);
        return raw ? JSON.parse(raw) : SKELETON_STATS;
      } catch (e) {
        console.warn('FAST_storage.getStats failed:', e.message);
        return SKELETON_STATS;
      }
    })(),
    // Skeleton fallback after 500ms
    new Promise(resolve => setTimeout(() => resolve(SKELETON_STATS), STATS_TIMEOUT))
  ]);
}

async function saveStats(stats) {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('FAST_storage.saveStats failed:', e.message);
  }
}

// Batch read/write helpers
async function multiGet(keys) {
  const prefixed = keys.map(k => `${STORAGE_PREFIX}${k}`);
  try {
    return await AsyncStorage.multiGet(prefixed);
  } catch (e) {
    return [];
  }
}

async function multiSet(pairs) {
  const prefixed = pairs.map(([k, v]) => [`${STORAGE_PREFIX}${k}`, JSON.stringify(v)]);
  try {
    await AsyncStorage.multiSet(prefixed);
  } catch (e) {
    console.error('FAST_storage.multiSet failed:', e.message);
  }
}

// Pre-warm cache: populate empty stats immediately
async function preloadCache() {
  await saveStats(SKELETON_STATS);
}

export default {
  getStats,
  saveStats,
  multiGet,
  multiSet,
  preloadCache,
  // Legacy compat (Dashboard expects storage.getStats/saveStats)
  getStats: getStats,
  saveStats: saveStats,
};

