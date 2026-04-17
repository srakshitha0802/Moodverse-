import NetInfo from "@react-native-community/netinfo";
import { useEffect, useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import { setItems, setLastSync } from "../slices/dataSlice";
import {
  enqueueAction,
  dequeueAction,
  setOnlineStatus,
} from "../slices/offlineSlice";

/**
 * Local-first action queue: drains the queue without requiring internet (fake API + local refresh).
 * NetInfo still updates `isOnline` for UI if needed.
 * @returns {Object} { queueAction, syncQueue, refreshData, isOnline, isSyncing }
 */
export const useOfflineSync = () => {
  const dispatch = useDispatch();
  const queue = useSelector((state) => state.offline.queue);
  const isOnline = useSelector((state) => state.offline.isOnline);
  const syncLockRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fakeApiRequest = async (queueItem) => {
    console.log("[OfflineSync] Executing offline action:", queueItem?.id);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  };

  const fetchDataFromServer = async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [{ id: 1, name: "Offline-ready item", timestamp: Date.now() }];
  };

  /** Local-first refresh: no server; simulates sync for offline-only app. */
  const refreshData = useCallback(async () => {
    try {
      const freshData = await fetchDataFromServer();
      dispatch(setItems(freshData));
      dispatch(setLastSync(Date.now()));
    } catch (error) {
      console.error("[OfflineSync] Data refresh failed", error);
    }
  }, [dispatch]);

  const syncQueue = useCallback(async () => {
    if (syncLockRef.current || queue.length === 0) return;

    syncLockRef.current = true;
    setIsSyncing(true);
    console.log(`[OfflineSync] Syncing ${queue.length} actions...`);

    try {
      const queueSnapshot = [...queue];

      for (const item of queueSnapshot) {
        await fakeApiRequest(item);
        dispatch(dequeueAction(item.id));
      }

      await refreshData();
      console.log("[OfflineSync] Successfully synced all queued actions.");
    } catch (err) {
      console.error("[OfflineSync] Sync failed", err);
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
    }
  }, [queue, dispatch, refreshData]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(
        state.isConnected && state.isInternetReachable !== false
      );
      dispatch(setOnlineStatus(online));
    });
    return () => unsubscribe();
  }, [dispatch]);

  // Background only: NO cold start sync
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Delay sync until skeleton phase complete
    const timer = setTimeout(() => setIsReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Queue sync only when ready + queue exists
  useEffect(() => {
    if (!isReady || queue.length === 0) return;
    syncQueue();
  }, [queue.length, isReady, syncQueue]);

  // AppState background sync only
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && isReady) {
        if (queue.length > 0) {
          syncQueue();
        } else {
          refreshData();
        }
      }
    });
    return () => subscription.remove();
  }, [queue.length, isReady, syncQueue, refreshData]);

  const queueAction = useCallback(
    (action) => {
      const reduxAction =
        action && typeof action.type === "string"
          ? action
          : { type: "app/queuedPayload", payload: action };
      dispatch(
        enqueueAction({
          action: reduxAction,
          maxRetries: 3,
          priority: 0,
        }),
      );
    },
    [dispatch],
  );

  return { queueAction, syncQueue, refreshData, isOnline, isSyncing };
};

export default useOfflineSync;
