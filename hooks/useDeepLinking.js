import * as Linking from "expo-linking";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";

/**
 * Parses a URL string into its components: path, query parameters, and the raw URL.
 *
 * @param {string} url - The full URL (e.g., "myapp://profile?id=123" or "https://example.com/path?foo=bar").
 * @param {boolean} parseQuery - Whether to parse query parameters into an object.
 * @returns {{ path: string, query: object | null, rawUrl: string }}
 */
const parseDeepLink = (url, parseQuery = true) => {
  if (!url) return { path: "", query: null, rawUrl: "" };

  let parsed;
  try {
    // Expo Linking.parse works for both custom schemes and https URLs
    parsed = Linking.parse(url);
  } catch {
    // Fallback to a simple manual parse if Linking.parse fails
    const [pathAndQuery] = url.split("?");
    const queryString = url.includes("?") ? url.split("?")[1] : "";
    parsed = {
      path: pathAndQuery,
      queryParams: queryString,
    };
  }

  let query = null;
  if (parseQuery && parsed.queryParams) {
    query = Object.fromEntries(
      new URLSearchParams(parsed.queryParams).entries(),
    );
  }

  return {
    path: parsed.path || "",
    query,
    rawUrl: url,
  };
};

/**
 * Advanced deep linking hook for Expo apps.
 *
 * @param {Object} options - Configuration options.
 * @param {string[]} [options.prefixes] - Custom URL prefixes (schemes + hosts) to accept.
 *   Defaults to the result of `Linking.createURL('/')` (e.g., "myapp://").
 * @param {boolean} [options.parseQuery=true] - Automatically parse query parameters into an object.
 * @param {Function} [options.onDeepLink] - Optional callback invoked on every new deep link.
 * @param {boolean} [options.consumeOnNavigate=false] - Automatically clear the deep link after navigation.
 * @returns {{
 *   initialDeepLink: { path: string, query: object | null, rawUrl: string } | null,
 *   latestDeepLink: { path: string, query: object | null, rawUrl: string } | null,
 *   clearDeepLink: () => void,
 *   navigateToDeepLink: (navigate: (path: string, params?: object) => void) => boolean,
 *   matchPath: (pattern: string | string[]) => boolean
 * }}
 */
export const useDeepLinking = ({
  prefixes,
  parseQuery = true,
  onDeepLink,
  consumeOnNavigate = false,
} = {}) => {
  const defaultPrefix = useMemo(() => Linking.createURL("/"), []);
  const validPrefixes = useMemo(
    () => (prefixes && prefixes.length ? prefixes : [defaultPrefix]),
    [prefixes, defaultPrefix],
  );

  /** React Navigation `linking` prop shape (prefixes + screen map). */
  const config = useMemo(
    () => ({
      prefixes: validPrefixes,
      config: {
        screens: {
          MainTabs: {
            path: "",
            screens: {
              Home: "",
              Chakra: "chakra",
              Mood: "mood",
              Yoga: "yoga",
              Tools: "tools",
              "AI Chat": "ai-chat",
              Journal: "journal",
              Games: "games",
            },
          },
          ReliefMemes: "relief/memes",
          ReliefBooks: "relief/books",
          ReliefVR: "relief/vr",
          ReliefMusic: "relief/music",
          Consultation: "consultation",
        },
      },
    }),
    [validPrefixes],
  );

  const [initialDeepLink, setInitialDeepLink] = useState(null);
  const [latestDeepLink, setLatestDeepLink] = useState(null);
  const hasHandledInitial = useRef(false);

  // Core handler for a deep link URL
  const handleDeepLinkUrl = useCallback(
    (url) => {
      if (!url) return;

      // Optionally verify that the URL starts with one of our allowed prefixes
      const isAllowed = validPrefixes.some((prefix) => url.startsWith(prefix));
      if (!isAllowed) return;

      const parsed = parseDeepLink(url, parseQuery);
      setLatestDeepLink(parsed);

      if (onDeepLink) {
        onDeepLink(parsed);
      }
    },
    [validPrefixes, parseQuery, onDeepLink],
  );

  // Event listener for Expo Linking
  const handleDeepLinkEvent = useCallback(
    (event) => {
      handleDeepLinkUrl(event.url);
    },
    [handleDeepLinkUrl],
  );

  // Clear the current deep link (useful after navigation)
  const clearDeepLink = useCallback(() => {
    setLatestDeepLink(null);
  }, []);

  // Helper to automatically navigate using a provided router function
  const navigateToDeepLink = useCallback(
    (navigate) => {
      const target = latestDeepLink || initialDeepLink;
      if (!target || !target.path) return false;

      // Invoke the navigation function with path and optional query parameters
      navigate(target.path, target.query || undefined);

      if (consumeOnNavigate) {
        clearDeepLink();
      }
      return true;
    },
    [latestDeepLink, initialDeepLink, consumeOnNavigate, clearDeepLink],
  );

  // Path matching utility (supports exact strings or an array of strings)
  const matchPath = useCallback(
    (pattern) => {
      const currentPath = latestDeepLink?.path || initialDeepLink?.path;
      if (!currentPath) return false;

      if (Array.isArray(pattern)) {
        return pattern.includes(currentPath);
      }
      return currentPath === pattern;
    },
    [latestDeepLink, initialDeepLink],
  );

  // Handle the initial deep link when the app starts
  useEffect(() => {
    const getInitialUrl = async () => {
      if (hasHandledInitial.current) return;
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const parsed = parseDeepLink(initialUrl, parseQuery);
          setInitialDeepLink(parsed);
          setLatestDeepLink(parsed);
          if (onDeepLink) onDeepLink(parsed);
        }
      } catch (error) {
        console.warn("Failed to get initial deep link URL:", error);
      } finally {
        hasHandledInitial.current = true;
      }
    };

    getInitialUrl();
  }, [parseQuery, onDeepLink]);

  // Set up event listener for subsequent deep links
  useEffect(() => {
    const subscription = Linking.addEventListener("url", handleDeepLinkEvent);
    return () => subscription.remove();
  }, [handleDeepLinkEvent]);

  return {
    initialDeepLink,
    latestDeepLink,
    clearDeepLink,
    navigateToDeepLink,
    matchPath,
    config,
  };
};

export default useDeepLinking;
