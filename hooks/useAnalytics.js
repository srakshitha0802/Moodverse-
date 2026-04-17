import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef, useCallback, useState } from "react";

const DEFAULT_STORAGE_KEY = "@Moodverse_Analytics_Queue";
const DEFAULT_FLUSH_INTERVAL_MS = 30000; // 30 seconds
const DEFAULT_MAX_QUEUE_SIZE = 500; // prevent unbounded growth
const DEFAULT_BATCH_SIZE = 20; // max events per batch
const DEFAULT_RETRY_DELAY_MS = 5000; // initial delay for failed sends
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes

/**
 * Advanced offline-first analytics hook.
 * Features:
 * - Persists events to AsyncStorage
 * - Automatically flushes when online and on interval
 * - Batches events to reduce network calls
 * - Exponential backoff retries for failed sends
 * - Respects user consent (disabled by default until consent given)
 * - Queue size limits & event dropping
 * - Optional session tracking (session start / end)
 * - Customisable endpoint, headers, and batch format
 */
export const useAnalytics = ({
  storageKey = DEFAULT_STORAGE_KEY,
  /** Omit or set null for fully offline apps (no network). */
  endpoint = null,
  headers = { "Content-Type": "application/json" },
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
  maxQueueSize = DEFAULT_MAX_QUEUE_SIZE,
  batchSize = DEFAULT_BATCH_SIZE,
  initialConsent = false, // GDPR – require explicit opt‑in
  enableSessionTracking = false,
  onSendSuccess = (batch) => {},
  onSendError = (error, batch) => {},
  transformEvent = (event) => event, // allow sanitisation / enrichment
} = {}) => {
  const queueRef = useRef([]); // in‑memory queue
  const flushTimerRef = useRef(null);
  const isFlushingRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const [isOnline, setIsOnline] = useState(true);
  const [hasConsent, setHasConsent] = useState(initialConsent);
  const sessionIdRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const trackEventRef = useRef(() => {});

  // ---------------------- Session management (uses ref so order vs trackEvent is safe) ----------------------
  const startSession = useCallback(() => {
    sessionIdRef.current = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStartTimeRef.current = Date.now();
    trackEventRef.current("session_start", {
      session_id: sessionIdRef.current,
    });
  }, []);

  const endSession = useCallback(() => {
    if (sessionIdRef.current) {
      const duration = Date.now() - sessionStartTimeRef.current;
      trackEventRef.current("session_end", {
        session_id: sessionIdRef.current,
        duration_ms: duration,
      });
      sessionIdRef.current = null;
      sessionStartTimeRef.current = null;
    }
  }, []);

  // ---------------------- Queue persistence ----------------------
  const loadQueue = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          queueRef.current = parsed.slice(0, maxQueueSize);
        }
      }
    } catch (err) {
      console.error("[Analytics] Failed to load queue", err);
    }
  }, [storageKey, maxQueueSize]);

  const persistQueue = useCallback(async () => {
    try {
      const toStore = queueRef.current.slice(0, maxQueueSize);
      await AsyncStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch (err) {
      console.error("[Analytics] Failed to persist queue", err);
    }
  }, [storageKey, maxQueueSize]);

  // ---------------------- Send events to server (batch) ----------------------
  const sendBatch = useCallback(
    async (events) => {
      if (!hasConsent) {
        console.debug("[Analytics] No consent – dropping batch");
        return true; // pretend success so events are removed
      }
      if (!endpoint) {
        console.warn("[Analytics] No endpoint configured – dropping batch");
        return true;
      }

      try {
        const payload = {
          events: events.map(transformEvent),
          sent_at: new Date().toISOString(),
        };
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          onSendSuccess?.(events);
          return true;
        } else {
          const errorText = await response.text();
          throw new Error(`Server error ${response.status}: ${errorText}`);
        }
      } catch (err) {
        console.error("[Analytics] Send batch failed", err);
        onSendError?.(err, events);
        return false;
      }
    },
    [endpoint, headers, hasConsent, transformEvent, onSendSuccess, onSendError],
  );

  // ---------------------- Flush logic with retries & batching ----------------------
  const flush = useCallback(async () => {
    if (!hasConsent) return;
    if (!isOnline) {
      console.debug("[Analytics] Offline – skipping flush");
      return;
    }
    if (isFlushingRef.current) {
      console.debug("[Analytics] Flush already in progress");
      return;
    }
    if (queueRef.current.length === 0) return;

    isFlushingRef.current = true;
    try {
      // Take up to batchSize events from the front of the queue
      const toSend = queueRef.current.splice(0, batchSize);
      const success = await sendBatch(toSend);
      if (!success) {
        // Put events back at the front (preserve order)
        queueRef.current.unshift(...toSend);
        // Schedule a retry with exponential backoff
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        const retryDelay = Math.min(
          MAX_RETRY_DELAY_MS,
          DEFAULT_RETRY_DELAY_MS * Math.pow(2, retryCountRef.current),
        );
        retryCountRef.current += 1;
        retryTimeoutRef.current = setTimeout(() => {
          flush();
        }, retryDelay);
      } else {
        // Success – reset retry counter
        retryCountRef.current = 0;
        // After successful send, persist the reduced queue
        await persistQueue();
        // If there are still events, continue flushing immediately
        if (queueRef.current.length > 0) {
          flush();
        }
      }
    } catch (err) {
      console.error("[Analytics] Unexpected flush error", err);
    } finally {
      isFlushingRef.current = false;
    }
  }, [hasConsent, isOnline, batchSize, sendBatch, persistQueue]);

  // ---------------------- Public API: trackEvent ----------------------
  const trackEvent = useCallback(
    (event, params = {}) => {
      if (!hasConsent) {
        console.debug("[Analytics] No consent – ignoring event", event);
        return;
      }
      if (queueRef.current.length >= maxQueueSize) {
        console.warn("[Analytics] Queue full – dropping oldest event");
        queueRef.current.shift();
      }
      const enriched = {
        event,
        params,
        timestamp: Date.now(),
        session_id: sessionIdRef.current,
      };
      queueRef.current.push(enriched);
      persistQueue();

      // If online, try to flush immediately (but don't await)
      if (isOnline && !isFlushingRef.current) {
        flush();
      }
    },
    [hasConsent, maxQueueSize, persistQueue, isOnline, flush],
  );

  trackEventRef.current = trackEvent;

  const trackScreen = useCallback(
    (screenName, params = {}) => {
      trackEvent("screen_view", { screen_name: screenName, ...params });
    },
    [trackEvent],
  );

  // ---------------------- Consent management ----------------------
  const setConsent = useCallback(
    (consentGiven) => {
      setHasConsent(consentGiven);
      if (consentGiven && !sessionIdRef.current && enableSessionTracking) {
        startSession();
      } else if (!consentGiven) {
        endSession();
        // Optionally clear the queue when consent is revoked
        queueRef.current = [];
        persistQueue();
      }
    },
    [enableSessionTracking, startSession, endSession, persistQueue],
  );

  // ---------------------- Manual flush / clear ----------------------
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    persistQueue();
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryCountRef.current = 0;
  }, [persistQueue]);

  // ---------------------- Network monitoring ----------------------
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = isOnline;
      const nowOnline =
        state.isConnected && state.isInternetReachable !== false;
      setIsOnline(nowOnline);
      if (!wasOnline && nowOnline && hasConsent) {
        console.debug("[Analytics] Network regained – flushing queue");
        flush();
      }
    });
    return () => unsubscribe();
  }, [isOnline, hasConsent, flush]);

  // ---------------------- Initialisation & interval flush ----------------------
  useEffect(() => {
    loadQueue();

    if (flushIntervalMs > 0) {
      flushTimerRef.current = setInterval(() => {
        if (hasConsent && isOnline && !isFlushingRef.current) {
          flush();
        }
      }, flushIntervalMs);
    }

    if (enableSessionTracking && hasConsent) {
      startSession();
      // Optionally end session on app background – you'd need AppState listener
      // For brevity, we only start on mount.
    }

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (enableSessionTracking && hasConsent) {
        endSession();
      }
      // Final flush attempt before unmount (best effort)
      if (hasConsent && isOnline) {
        flush();
      }
    };
  }, []); // empty deps – run once on mount

  // ---------------------- Return value ----------------------
  return {
    trackEvent,
    trackScreen,
    flush, // force flush
    clearQueue, // discard all pending events
    setConsent, // enable/disable tracking
    hasConsent,
    isOnline,
    queueSize: queueRef.current.length,
    startSession, // manual session control
    endSession,
  };
};

export default useAnalytics;
