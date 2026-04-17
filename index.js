import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import {
  LogBox,
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from "react-native";
import { Provider, useSelector } from "react-redux";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

import App from "./App";
import { useOfflineSync } from "./hooks/useOfflineSync";
import dataReducer from "./slices/dataSlice";
import offlineReducer from "./slices/offlineSlice";
import userReducer from "./slices/userSlice";
import { migrate } from "./utils/persistMigrate";

// App & slices

// Optional: Error tracking (uncomment when ready)
// import * as Sentry from 'sentry-expo';

// ---------------------------------------------------------------------
// 1. Environment & error tracking setup
// ---------------------------------------------------------------------
const isDev = __DEV__;

// if (!isDev) {
//   Sentry.init({
//     dsn: 'YOUR_SENTRY_DSN',
//     enableInExpoDevelopment: false,
//   });
// }

// Ignore noisy warnings
LogBox.ignoreLogs([
  "Remote debugger",
  "AsyncStorage has been extracted",
  "Require cycle:", // optional
]);

// ---------------------------------------------------------------------
// 2. Redux store with persist config
// ---------------------------------------------------------------------
const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["user"], // MINIMAL: only user.onboarded/plan (stats → FAST_storage)
  blacklist: ["offline"], // queue ephemeral
  throttle: 2000,
  version: 2,
  // Transform: prune large fields
  transforms: [
    (state) => ({
      ...state,
      user: {
        ...state.user,
        // Keep only critical fields persisted
        onboarded: state.user?.onboarded,
        plan: state.user?.plan || "free",
      },
    }),
  ],
};

const rootReducer = combineReducers({
  user: userReducer,
  offline: offlineReducer,
  data: dataReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

const persistor = persistStore(store);

// ---------------------------------------------------------------------
// 3. Custom loading component for PersistGate
// ---------------------------------------------------------------------
const PersistLoading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>Loading your data...</Text>
  </View>
);

// ---------------------------------------------------------------------
// 4. Error Boundary (class component needed for React error boundaries)
// ---------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global error caught:", error, errorInfo);
    // if (!isDev) Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😵</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {isDev ? this.state.error?.message : "Please restart the app"}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------
// 5. RootApp – waits for offline sync readiness before hiding splash
// ---------------------------------------------------------------------
function RootApp() {
  const isOnline = useSelector((state) => state.offline.isOnline);
  const { queueAction, syncQueue } = useOfflineSync();
  const [isReady, setIsReady] = useState(false);

  // Splash screen management: hide only after initial sync (or 2s timeout)
  useEffect(() => {
    const initApp = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();

        // Optional: run initial sync of pending actions after rehydration
        if (isOnline && typeof syncQueue === "function") {
          await syncQueue();
        }
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    initApp();
  }, [isOnline, syncQueue]);

  // Show nothing until splash is hidden (avoids UI flicker)
  if (!isReady) {
    return null;
  }

  return <App isOnline={isOnline} onQueueAction={queueAction} />;
}

// ---------------------------------------------------------------------
// 6. Index – entry point with providers + error boundary + persist gate
// ---------------------------------------------------------------------
function Index() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate
          loading={<PersistLoading />}
          persistor={persistor}
          onBeforeLift={() => {
            // This runs right before the app renders for the first time
            console.log("Redux rehydration complete");
          }}
        >
          <RootApp />
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------
// 7. Styles & registration
// ---------------------------------------------------------------------
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

registerRootComponent(Index);
