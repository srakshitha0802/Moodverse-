import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import {
  StatusBar,
  ActivityIndicator,
  View,
  Text,
  LogBox,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import AIChatbot from "./components/AIChatbot";
import ChakraBreathing from "./components/ChakraBreathing";
import Dashboard from "./components/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import Games from "./components/Games";
import Journal from "./components/Journal";
import MoodScanner from "./components/MoodScanner";
import Onboarding from "./components/Onboarding";

// Components
import ReliefTools from "./components/ReliefTools";
import YogaMeditation from "./components/YogaMeditation";

// Custom Hooks
import useAnalytics from "./hooks/useAnalytics";
import useDeepLinking from "./hooks/useDeepLinking";
import useNotifications from "./hooks/useNotifications";
import useOfflineSync from "./hooks/useOfflineSync";
import useUserData from "./hooks/useUserData";
import { theme } from "./styles/theme";

// Error Boundary

// Navigation Param List (TypeScript style for intellisense)
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Ignore specific logs (optional)
LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
]);

// ---------- Bottom Tab Navigator (Main Screens) ----------
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      })}
    >
      <Tab.Screen name="Home" component={Dashboard} />
      <Tab.Screen name="Chakra" component={ChakraBreathing} />
      <Tab.Screen name="Mood" component={MoodScanner} />
      <Tab.Screen name="Yoga" component={YogaMeditation} />
      <Tab.Screen name="Tools">{() => <ReliefTools type="tools" />}</Tab.Screen>
      <Tab.Screen name="AI Chat" component={AIChatbot} />
      <Tab.Screen name="Journal" component={Journal} />
      <Tab.Screen name="Games" component={Games} />
    </Tab.Navigator>
  );
}

// ---------- Stack Navigator (Full‑screen screens & onboarding) ----------
import FAST_storage from "./utils/FAST_storage";

function AppStack({ onQueueAction, isOnline }) {
  const { user, loading: userLoading, completeOnboarding } = useUserData();
  const analytics = useAnalytics({ endpoint: null });

  // Preload FAST_storage in parallel (non-blocking)
  useEffect(() => {
    FAST_storage.preloadCache().catch(console.warn);
  }, []);

  // Track screen views (skeleton-safe)
  useEffect(() => {
    if (user?.id) {
      analytics.trackEvent("app_start", { userId: user.id || "anonymous" });
    }
  }, [user?.id, analytics]);

  // Skeleton instantly → data fills in
  const isSkeleton = userLoading || !user;
  const isOnboarded = user?.onboarded ?? false;

  if (isSkeleton && !isOnboarded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Initializing Sanctuary...</Text>
      </View>
    );
  }

  // Show Onboarding if needed (now skeleton-safe)
  if (!isOnboarded) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {(props) => <MainTabs {...props} />}
      </Stack.Screen>
      {/* Full‑screen standalone tools */}
      <Stack.Screen name="ReliefMemes">
        {(props) => (
          <ReliefTools
            {...props}
            type="memes"
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ReliefBooks">
        {(props) => (
          <ReliefTools
            {...props}
            type="books"
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ReliefVR">
        {(props) => (
          <ReliefTools
            {...props}
            type="vr"
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ReliefMusic">
        {(props) => (
          <ReliefTools
            {...props}
            type="music"
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Consultation">
        {(props) => (
          <Games
            {...props}
            type="consult"
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ---------- Main App with Navigation, ErrorBoundary, Notifications ----------
export default function App({ isOnline, onQueueAction }) {
  const deepLinking = useDeepLinking();
  const notifications = useNotifications();

  // Initialize push notifications & other side effects once
  useEffect(() => {
    // Configure push notifications for Expo
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Log online status for debugging integration
    console.log(
      `[App] Initialized. Status: ${isOnline ? "Online" : "Offline"}`,
    );
  }, [isOnline]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar
            barStyle="light-content"
            backgroundColor={theme.colors.background}
          />
          <NavigationContainer
            linking={deepLinking.config}
            fallback={
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            }
          >
            <AppStack onQueueAction={onQueueAction} isOnline={isOnline} />
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// ---------- Styles ----------
const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 18,
    textAlign: "center",
  },
};
