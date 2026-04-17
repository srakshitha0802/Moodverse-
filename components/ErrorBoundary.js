import { AlertTriangle, RefreshCw, Mail } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../styles/theme";

/**
 * Standard Error Boundary for the Moodverse application.
 * Catches runtime errors and displays a user-friendly recovery screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
    // In a real app, you might log this to Sentry or a similar service.
  }

  handleRestart = () => {
    // Basic reload mechanism
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <AlertTriangle
                  color={theme.colors.error}
                  size={64}
                  strokeWidth={1.5}
                />
              </View>
              <Text style={styles.title}>Oops! Something went wrong.</Text>
              <Text style={styles.message}>
                Even a deep breath couldn't fix this one! The app encountered an
                unexpected issue. Don't worry, your data is safe and offline.
              </Text>

              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorText}>
                  {this.state.error?.toString() || "Unknown runtime error"}
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.restartButton}
                  onPress={this.handleRestart}
                >
                  <RefreshCw color="white" size={20} />
                  <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.supportButton}
                  onPress={() => console.log("Support contact initiated")}
                >
                  <Mail color={theme.colors.primary} size={20} />
                  <Text
                    style={[styles.buttonText, { color: theme.colors.primary }]}
                  >
                    Support
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F0E17",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.error + "10",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: theme.spacing.xxl,
  },
  errorCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: theme.spacing.xxl,
  },
  errorTitle: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  errorText: {
    color: "white",
    fontSize: 12,
    fontFamily: "monospace",
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  restartButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  supportButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ErrorBoundary;
