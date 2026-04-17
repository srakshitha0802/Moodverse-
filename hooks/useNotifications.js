import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useState, useRef, useCallback } from "react";
import { Platform, AppState, Alert } from "react-native";

// Configure default notification behavior for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Advanced hook for managing push and local notifications.
 * Provides token management, notification listeners, scheduling, and persistence.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.storeNotifications - Whether to persist received notifications (default: true)
 * @param {Function} options.onNotificationTap - Callback when user taps on a notification
 * @param {Function} options.onNotificationReceived - Callback when a notification is received while app is foreground
 * @returns {Object} Notification utilities and state
 */
export const useNotifications = (options = {}) => {
  const {
    storeNotifications = true,
    onNotificationTap,
    onNotificationReceived,
    /** Expo push token needs network & EAS project id — off by default for offline-first apps */
    requestRemotePushToken = false,
  } = options;

  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null); // Last received notification
  const [notificationsList, setNotificationsList] = useState([]); // History of notifications
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const notificationListenerRef = useRef();
  const responseListenerRef = useRef();
  const tokenListenerRef = useRef();
  const appStateRef = useRef(AppState.currentState);

  // Load stored notifications from AsyncStorage
  const loadStoredNotifications = useCallback(async () => {
    if (!storeNotifications) return;
    try {
      const stored = await AsyncStorage.getItem("expo_notifications_history");
      if (stored) {
        setNotificationsList(JSON.parse(stored));
      }
    } catch (err) {
      console.warn("[Notifications] Failed to load stored notifications", err);
    }
  }, [storeNotifications]);

  // Save notifications to AsyncStorage
  const saveNotificationToHistory = useCallback(
    async (newNotification) => {
      if (!storeNotifications) return;
      try {
        const updatedList = [
          {
            id: newNotification.request.identifier,
            data: newNotification.request.content.data,
            title: newNotification.request.content.title,
            body: newNotification.request.content.body,
            timestamp: Date.now(),
            ...newNotification,
          },
          ...notificationsList,
        ].slice(0, 50); // Keep last 50 notifications
        setNotificationsList(updatedList);
        await AsyncStorage.setItem(
          "expo_notifications_history",
          JSON.stringify(updatedList),
        );
      } catch (err) {
        console.warn("[Notifications] Failed to save notification", err);
      }
    },
    [storeNotifications, notificationsList],
  );

  // Clear notification history
  const clearNotificationHistory = useCallback(async () => {
    setNotificationsList([]);
    if (storeNotifications) {
      await AsyncStorage.removeItem("expo_notifications_history");
    }
  }, [storeNotifications]);

  /**
   * Sync channels / token from current permission state only.
   * Never calls requestPermissionsAsync (required on web & for Safari "user gesture" rule).
   */
  const ensureNotificationSetup = useCallback(async () => {
    if (Platform.OS === "web") {
      setPermissionStatus("denied");
      setExpoPushToken(null);
      return null;
    }

    setError(null);
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);

      if (status !== "granted") {
        setExpoPushToken(null);
        return null;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
          enableVibrate: true,
          enableLights: true,
        });

        await Notifications.setNotificationChannelAsync("alerts", {
          name: "Alerts",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
        });

        await Notifications.setNotificationChannelAsync("silent", {
          name: "Silent",
          importance: Notifications.AndroidImportance.LOW,
          sound: null,
        });
      }

      let remoteToken = null;
      if (requestRemotePushToken) {
        try {
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            Constants.easConfig?.projectId;
          const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
          );
          remoteToken = tokenData.data;
          setExpoPushToken(remoteToken);
        } catch (tokenErr) {
          console.warn(
            "[Notifications] Push token unavailable (offline or missing projectId)",
            tokenErr,
          );
          setExpoPushToken(null);
        }
      } else {
        setExpoPushToken(null);
      }

      return remoteToken;
    } catch (err) {
      setError(err.message);
      console.error("[Notifications] Setup error:", err);
      return null;
    }
  }, [requestRemotePushToken]);

  /** @deprecated use ensureNotificationSetup — kept for callers expecting the old name */
  const registerForPushNotifications = ensureNotificationSetup;

  // Send a local notification immediately
  const sendLocalNotification = useCallback(
    async (title, body, data = {}, options = {}) => {
      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
            sound: options.sound ?? true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            badge: options.badge,
            categoryIdentifier: options.categoryId,
            ...options,
          },
          trigger: null, // null = immediate
        });
        console.log("[Notifications] Local notification sent:", notificationId);
        return notificationId;
      } catch (err) {
        console.error("[Notifications] Failed to send local notification", err);
        return null;
      }
    },
    [],
  );

  // Schedule a notification for a future time
  const scheduleNotification = useCallback(
    async (title, body, trigger, data = {}, options = {}) => {
      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
            sound: options.sound ?? true,
            badge: options.badge,
            categoryIdentifier: options.categoryId,
          },
          trigger,
        });
        console.log(
          "[Notifications] Scheduled notification:",
          notificationId,
          trigger,
        );
        return notificationId;
      } catch (err) {
        console.error("[Notifications] Failed to schedule notification", err);
        return null;
      }
    },
    [],
  );

  // Cancel a specific scheduled notification
  const cancelNotification = useCallback(async (notificationId) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }, []);

  // Cancel all scheduled notifications
  const cancelAllScheduled = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  // Dismiss a specific delivered notification from notification center
  const dismissNotification = useCallback(async (notificationId) => {
    await Notifications.dismissNotificationAsync(notificationId);
  }, []);

  // Dismiss all delivered notifications
  const dismissAllNotifications = useCallback(async () => {
    await Notifications.dismissAllNotificationsAsync();
  }, []);

  // Get all scheduled notifications
  const getScheduledNotifications = useCallback(async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
  }, []);

  // Get all delivered notifications
  const getDeliveredNotifications = useCallback(async () => {
    return await Notifications.getPresentedNotificationsAsync();
  }, []);

  /** Call from a button press — may show the system prompt (not allowed on mount / web). */
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === "web") return "denied";
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    await ensureNotificationSetup();
    return status;
  }, [ensureNotificationSetup]);

  // Set application badge number
  const setBadgeCount = useCallback(async (count) => {
    await Notifications.setBadgeCountAsync(count);
  }, []);

  // Get current badge number
  const getBadgeCount = useCallback(async () => {
    return await Notifications.getBadgeCountAsync();
  }, []);

  // Listen for token refreshes (native only)
  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    tokenListenerRef.current = Notifications.addPushTokenListener((token) => {
      console.log("[Notifications] Push token refreshed:", token);
      setExpoPushToken(token.data);
    });
    return () => {
      if (tokenListenerRef.current) {
        Notifications.removePushTokenSubscription(tokenListenerRef.current);
      }
    };
  }, []);

  // Main notification listeners (no permission prompt on mount)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadStoredNotifications();
      if (cancelled) return;
      if (Platform.OS === "web") {
        setLoading(false);
        return;
      }
      setLoading(true);
      await ensureNotificationSetup();
      if (!cancelled) setLoading(false);
    })();

    if (Platform.OS === "web") {
      return () => {
        cancelled = true;
      };
    }

    // Listen for notifications received while app is foreground
    notificationListenerRef.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("[Notifications] Received:", notification);
        setNotification(notification);
        if (storeNotifications) {
          saveNotificationToHistory(notification);
        }
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      });

    // Listen for user interaction with notification (tap)
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { notification, actionIdentifier } = response;
        console.log(
          "[Notifications] User tapped notification:",
          actionIdentifier,
          notification,
        );

        // Handle custom actions
        if (actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
          console.log(
            "[Notifications] Custom action triggered:",
            actionIdentifier,
          );
        }

        if (onNotificationTap) {
          onNotificationTap(notification, actionIdentifier);
        } else {
          // Default behavior: show alert with data
          const data = notification.request.content.data;
          if (data && Object.keys(data).length > 0) {
            Alert.alert(
              notification.request.content.title || "Notification",
              notification.request.content.body || "",
              [{ text: "OK" }],
            );
          }
        }
      });

    // Handle app state changes (e.g., background to foreground)
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // App came to foreground, clear badge if needed
          // setBadgeCount(0); // Optionally clear badge on foreground
        }
        appStateRef.current = nextAppState;
      },
    );

    return () => {
      cancelled = true;
      if (notificationListenerRef.current) {
        Notifications.removeNotificationSubscription(
          notificationListenerRef.current,
        );
      }
      if (responseListenerRef.current) {
        Notifications.removeNotificationSubscription(
          responseListenerRef.current,
        );
      }
      appStateSubscription.remove();
    };
  }, [
    ensureNotificationSetup,
    loadStoredNotifications,
    saveNotificationToHistory,
    storeNotifications,
    onNotificationReceived,
    onNotificationTap,
  ]);

  return {
    // State
    expoPushToken,
    notification,
    notificationsList,
    permissionStatus,
    error,
    loading,

    // Actions
    scheduleNotification,
    sendLocalNotification,
    cancelNotification,
    cancelAllScheduled,
    dismissNotification,
    dismissAllNotifications,
    getScheduledNotifications,
    getDeliveredNotifications,
    requestPermissions,
    setBadgeCount,
    getBadgeCount,
    clearNotificationHistory,

    // Helper
    registerForPushNotifications, // manual re-registration if needed
  };
};

export default useNotifications;
