// offlineSlice.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { persistReducer } from "redux-persist";

// ------------------------------
// 1. Constants & Configuration
// ------------------------------
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_MS = 1000;
const DEFAULT_MAX_QUEUE_SIZE = 1000;
const DEFAULT_CONCURRENT_JOBS = 1; // 1 = FIFO, >1 = parallel
const PROCESS_ON_WIFI_ONLY = false; // if true, skip on cellular

// Helper: unique ID
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper: exponential backoff with jitter
const getBackoffDelay = (retryCount, baseDelay = DEFAULT_BACKOFF_MS) => {
  const exponential = baseDelay * Math.pow(2, retryCount);
  const jitter = exponential * 0.2 * Math.random(); // ±20%
  return Math.min(exponential + jitter, 30000); // max 30s
};

// Helper: detect if an error is retryable (e.g., network, 5xx)
const isRetryableError = (error) => {
  if (!error) return true;
  // network / offline errors
  if (error.message?.includes("Network") || error.code === "ERR_NETWORK")
    return true;
  // HTTP status codes
  if (error.status) {
    return error.status >= 500 || error.status === 408 || error.status === 429;
  }
  return true;
};

// ------------------------------
// 2. IndexedDB Storage for large queues (optional)
// ------------------------------
const dbPromise = null;

async function persistLargeAction(action) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put("largeActions", action);
}

async function removeLargeAction(id) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete("largeActions", id);
}

// ------------------------------
// 3. Initial State (enhanced)
// ------------------------------
const initialState = {
  queue: [], // { id, action, retries, maxRetries, priority, group, timestamp, ... }
  processing: false,
  isOnline: true,
  networkQuality: "unknown", // 'slow-2g', '2g', '3g', '4g', 'wifi'
  failedQueue: [], // permanent failures
  lastSyncedAt: null,
  stats: {
    totalProcessed: 0,
    totalFailed: 0,
    lastError: null,
  },
  config: {
    maxQueueSize: DEFAULT_MAX_QUEUE_SIZE,
    concurrentJobs: DEFAULT_CONCURRENT_JOBS,
    processOnWifiOnly: PROCESS_ON_WIFI_ONLY,
  },
  activeJobs: 0, // current processing count
};

// ------------------------------
// 4. Slice Definition (with advanced reducers)
// ------------------------------
const offlineSlice = createSlice({
  name: "offline",
  initialState,
  reducers: {
    enqueueAction: (state, action) => {
      const {
        action: reduxAction,
        maxRetries = DEFAULT_MAX_RETRIES,
        priority = 0, // higher = processed first
        group = null,
        dedupeKey = null,
        optimisticUpdate = null,
        rollbackAction = null,
        persistLarge = false, // store payload in IndexedDB
      } = action.payload;

      // Deduplication
      if (dedupeKey) {
        const existingIndex = state.queue.findIndex(
          (item) => item.dedupeKey === dedupeKey,
        );
        if (existingIndex !== -1) state.queue.splice(existingIndex, 1);
      }

      // Queue size limit (drop oldest lowest priority)
      if (state.queue.length >= state.config.maxQueueSize) {
        state.queue.sort((a, b) => a.priority - b.priority);
        state.queue.shift();
      }

      const queueItem = {
        id: generateId(),
        originalAction: reduxAction,
        maxRetries,
        retryCount: 0,
        priority,
        group,
        dedupeKey: dedupeKey || null,
        optimisticUpdate,
        rollbackAction,
        timestamp: Date.now(),
        lastError: null,
        nextRetryAt: null,
        persistLarge,
      };

      // Optionally store large payload externally
      if (persistLarge && dbPromise) {
        persistLargeAction({ id: queueItem.id, payload: reduxAction.payload });
        queueItem.largePayloadStored = true;
        // replace payload with reference
        queueItem.originalAction = {
          ...reduxAction,
          payload: { __ref: queueItem.id },
        };
      }

      state.queue.push(queueItem);
      // Sort by priority desc, then timestamp asc
      state.queue.sort(
        (a, b) => b.priority - a.priority || a.timestamp - b.timestamp,
      );
    },

    dequeueAction: (state, action) => {
      const id = action.payload;
      const item = state.queue.find((i) => i.id === id);
      if (item?.largePayloadStored) removeLargeAction(id);
      state.queue = state.queue.filter((i) => i.id !== id);
      state.stats.totalProcessed++;
    },

    clearQueue: (state) => {
      state.queue.forEach((item) => {
        if (item.largePayloadStored) removeLargeAction(item.id);
      });
      state.queue = [];
      state.failedQueue = [];
      state.processing = false;
      state.activeJobs = 0;
    },

    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },

    setNetworkQuality: (state, action) => {
      state.networkQuality = action.payload;
    },

    incrementRetry: (state, action) => {
      const { id, error } = action.payload;
      const item = state.queue.find((i) => i.id === id);
      if (!item) return;

      item.retryCount++;
      item.lastError = error?.message || "Unknown error";

      if (item.retryCount >= item.maxRetries || !isRetryableError(error)) {
        // move to failed queue
        state.failedQueue.push({ ...item, failedAt: Date.now() });
        state.queue = state.queue.filter((i) => i.id !== id);
        state.stats.totalFailed++;
        state.stats.lastError = error?.message || "Max retries exceeded";
        if (item.rollbackAction) {
          // rollback will be dispatched by processing thunk
        }
      } else {
        // schedule next retry with backoff
        const delay = getBackoffDelay(
          item.retryCount,
          item.retryDelay || DEFAULT_BACKOFF_MS,
        );
        item.nextRetryAt = Date.now() + delay;
      }
    },

    retryFailedAction: (state, action) => {
      const id = action.payload;
      const failedItem = state.failedQueue.find((i) => i.id === id);
      if (failedItem) {
        const resetItem = {
          ...failedItem,
          retryCount: 0,
          nextRetryAt: null,
          lastError: null,
        };
        state.queue.push(resetItem);
        state.failedQueue = state.failedQueue.filter((i) => i.id !== id);
        state.queue.sort(
          (a, b) => b.priority - a.priority || a.timestamp - b.timestamp,
        );
      }
    },

    dismissFailedAction: (state, action) => {
      state.failedQueue = state.failedQueue.filter(
        (i) => i.id !== action.payload,
      );
    },

    setProcessing: (state, action) => {
      state.processing = action.payload;
    },

    incrementActiveJobs: (state) => {
      state.activeJobs++;
    },

    decrementActiveJobs: (state) => {
      state.activeJobs--;
    },

    updateLastSynced: (state) => {
      state.lastSyncedAt = Date.now();
    },

    updateConfig: (state, action) => {
      state.config = { ...state.config, ...action.payload };
    },
  },
});

export const {
  enqueueAction,
  dequeueAction,
  clearQueue,
  setOnlineStatus,
  setNetworkQuality,
  incrementRetry,
  retryFailedAction,
  dismissFailedAction,
  setProcessing,
  incrementActiveJobs,
  decrementActiveJobs,
  updateLastSynced,
  updateConfig,
} = offlineSlice.actions;

// ------------------------------
// 5. Async Thunks
// ------------------------------
/**
 * Process the queue with concurrency control.
 * Automatically respects network quality, retry delays, and priority.
 */
export const processQueue = createAsyncThunk(
  "offline/processQueue",
  async (_, { dispatch, getState }) => {
    const state = getState();
    const { queue, isOnline, processing, activeJobs, config, networkQuality } =
      state.offline;

    if (!isOnline || processing) return;
    if (config.processOnWifiOnly && networkQuality !== "wifi") return;

    const availableSlots = Math.max(0, config.concurrentJobs - activeJobs);
    if (availableSlots === 0 || queue.length === 0) return;

    dispatch(setProcessing(true));

    // Get next items respecting priority and retry timers
    const now = Date.now();
    const processable = queue
      .filter((item) => !item.nextRetryAt || item.nextRetryAt <= now)
      .slice(0, availableSlots);

    if (processable.length === 0) {
      dispatch(setProcessing(false));
      return;
    }

    // Process each in parallel (throttled by availableSlots)
    const promises = processable.map(async (item) => {
      dispatch(incrementActiveJobs());

      try {
        // Restore large payload if needed
        let actionToDispatch = item.originalAction;
        if (item.largePayloadStored && dbPromise) {
          const db = await dbPromise;
          const stored = await db.get("largeActions", item.id);
          if (stored) {
            actionToDispatch = {
              ...item.originalAction,
              payload: stored.payload,
            };
          }
        }

        // Dispatch the actual action – assumes it returns a promise (e.g., createAsyncThunk)
        await dispatch(actionToDispatch).unwrap();

        // success
        dispatch(dequeueAction(item.id));
        dispatch(updateLastSynced());
      } catch (error) {
        console.error(
          `Offline action failed (${item.retryCount + 1}/${item.maxRetries}):`,
          error,
        );
        dispatch(incrementRetry({ id: item.id, error }));

        // Dispatch rollback if provided and action failed permanently
        const updatedState = getState();
        const failedItem = updatedState.offline.failedQueue.find(
          (i) => i.id === item.id,
        );
        if (failedItem && item.rollbackAction) {
          dispatch(item.rollbackAction);
        }
      } finally {
        dispatch(decrementActiveJobs());
      }
    });

    await Promise.allSettled(promises);
    dispatch(setProcessing(false));

    // Recurse to process next batch
    const newState = getState();
    if (newState.offline.queue.length > 0 && newState.offline.isOnline) {
      dispatch(processQueue());
    }
  },
);

/**
 * Network listener initializer (cross-tab, service worker, quality)
 */
export const initOfflineSupport = () => async (dispatch) => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return () => {};
  }

  const handleOnline = () => {
    dispatch(setOnlineStatus(true));
    dispatch(processQueue());
  };
  const handleOffline = () => dispatch(setOnlineStatus(false));

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  dispatch(setOnlineStatus(navigator.onLine));

  let channel = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel("offline_queue");
      channel.onmessage = (event) => {
        if (event.data.type === "QUEUE_UPDATED") {
          dispatch(processQueue());
        }
      };
    } catch (_) {
      channel = null;
    }
  }

  if ("connection" in navigator && navigator.connection) {
    const updateConnection = () => {
      const conn = navigator.connection;
      dispatch(setNetworkQuality(conn?.effectiveType || "unknown"));
    };
    updateConnection();
    navigator.connection.addEventListener("change", updateConnection);
  }

  if (
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "SyncManager" in window
  ) {
    navigator.serviceWorker.ready
      .then((registration) =>
        registration.sync?.register?.("offline-queue-sync"),
      )
      .catch(() => {});
  }

  if (navigator.onLine) dispatch(processQueue());

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    if (channel) {
      try {
        channel.close();
      } catch (_) {}
    }
  };
};

/**
 * Force retry all failed actions
 */
export const retryAllFailed = () => async (dispatch, getState) => {
  const { failedQueue } = getState().offline;
  for (const item of failedQueue) {
    dispatch(retryFailedAction(item.id));
  }
  dispatch(processQueue());
};

/**
 * Cancel a queued action by ID
 */
export const cancelQueuedAction = (id) => async (dispatch) => {
  dispatch(dequeueAction(id));
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel("offline_queue");
      channel.postMessage({ type: "QUEUE_UPDATED" });
      channel.close();
    } catch (_) {}
  }
};

// ------------------------------
// 6. Middleware: Auto‑queue actions marked with `offline` meta
// ------------------------------
export const offlineMiddleware = (store) => (next) => (action) => {
  const { offline } = action.meta || {};
  if (offline) {
    const { effect, commit, rollback, maxRetries, priority, group, dedupeKey } =
      offline;
    const state = store.getState();

    if (!state.offline.isOnline) {
      // offline: queue it
      store.dispatch(
        enqueueAction({
          action: {
            type: action.type,
            payload: action.payload,
            meta: action.meta,
          },
          maxRetries,
          priority,
          group,
          dedupeKey,
          optimisticUpdate: commit,
          rollbackAction: rollback,
        }),
      );
      if (commit) store.dispatch(commit());
      return action;
    } else {
      // online: try to execute effect immediately
      return effect(action.payload)
        .then((result) => {
          if (commit) store.dispatch(commit(result));
          return result;
        })
        .catch((error) => {
          if (rollback) store.dispatch(rollback(error));
          throw error;
        });
    }
  }
  return next(action);
};

// ------------------------------
// 7. Selectors (memoized)
// ------------------------------
export const selectQueueState = (state) => state.offline;
export const selectQueueLength = createSelector(
  selectQueueState,
  (offline) => offline.queue.length,
);
export const selectIsOnline = createSelector(
  selectQueueState,
  (offline) => offline.isOnline,
);
export const selectFailedQueue = createSelector(
  selectQueueState,
  (offline) => offline.failedQueue,
);
export const selectQueue = createSelector(
  selectQueueState,
  (offline) => offline.queue,
);
export const selectQueueStats = createSelector(
  selectQueueState,
  (offline) => offline.stats,
);
export const selectNetworkQuality = createSelector(
  selectQueueState,
  (offline) => offline.networkQuality,
);
export const selectHasPendingActions = createSelector(
  selectQueueLength,
  (len) => len > 0,
);

// ------------------------------
// 8. React Hook (optional but convenient)
// ------------------------------
/**
 * useOfflineQueueStatus – returns { isOnline, queueLength, failedCount, processQueue }
 */
export const useOfflineQueueStatus = () => {
  const dispatch = useDispatch();
  const isOnline = useSelector(selectIsOnline);
  const queueLength = useSelector(selectQueueLength);
  const failedCount = useSelector((state) => state.offline.failedQueue.length);
  return {
    isOnline,
    queueLength,
    failedCount,
    processQueue: () => dispatch(processQueue()),
  };
};

// ------------------------------
// 9. Redux Persist Configuration (advanced)
// ------------------------------
const persistConfig = {
  key: "offline",
  storage: AsyncStorage,
  whitelist: ["queue", "failedQueue", "stats", "config"],
  version: 2,
  migrate: async (state) => {
    if (state && !state.queue) {
      return { ...initialState, ...state };
    }
    return state;
  },
};

export const persistedOfflineReducer = persistReducer(
  persistConfig,
  offlineSlice.reducer,
);

// ------------------------------
// 10. Export default reducer (choose persisted or plain)
// ------------------------------
export default persistedOfflineReducer;
