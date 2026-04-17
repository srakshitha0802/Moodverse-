/**
 * 🌟 Professional Design System Theme
 *
 * A deeply structured, scalable, and human-friendly theme configuration.
 * Supports web and React Native with consistent design tokens, responsive utilities,
 * and glass morphism effects. Fully documented for team trust and maintainability.
 *
 * @module theme
 * @version 2.0.0
 */

// ============================================================================
// 1. CORE DESIGN TOKENS (Immutable Base Values)
// ============================================================================

/**
 * Color Palette
 * Includes semantic, functional, and chakra/healing colors.
 * @type {Readonly<Record<string, string>>}
 */
const colors = {
  // Brand & UI
  primary: "#6C63FF",
  secondary: "#3F3D56",
  background: "#0F0E17",
  surface: "rgba(255, 255, 255, 0.08)",
  border: "rgba(255, 255, 255, 0.1)",
  text: "#FFFFFE",
  textSecondary: "#A7A9BE",
  accent: "#FF8906",
  warning: "#FFA726",
  error: "#FF5470",
  success: "#2CB67D",

  // Healing / Chakra Spectrum
  root: "#F44336",
  sacral: "#FF9800",
  solar: "#FFEB3B",
  heart: "#4CAF50",
  throat: "#2196F3",
  thirdEye: "#3F51B5",
  crown: "#9C27B0",
  gradientCalm: ["#1E1E2C", "#0F0E17"],
};

/**
 * Gradient Definitions (color arrays for linear-gradient)
 * @type {Readonly<Record<string, string[]>>}
 */
const gradients = {
  calm: ["#1E1E2C", "#0F0E17"],
  healing: ["#1a2a6c", "#b21f1f", "#fdbb2d"],
  nature: ["#11998e", "#38ef7d"],
  cosmic: ["#4e54c8", "#8f94fb"],
};

/**
 * Spacing Scale (in pixels or density-independent units)
 * Based on 4px grid system.
 * @type {Readonly<Record<string, number>>}
 */
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96,
};

/**
 * Border Radius Scale
 * @type {Readonly<Record<string, number>>}
 */
const borderRadius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 32,
  pill: 9999,
  circle: 9999,
};

/**
 * Typography Foundation
 * Font families, weights, sizes, and line heights.
 */
const typography = {
  fontFamily: {
    regular: "System",
    medium: "System",
    bold: "System",
    mono: "monospace",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.02,
    normal: 0,
    wide: 0.05,
  },
};

/**
 * Shadow Elevations (CSS box-shadow strings)
 * Cross-platform compatible (web). For React Native, use elevation numeric values.
 * @type {Readonly<Record<string, string>>}
 */
const shadows = {
  none: "none",
  xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
};

/**
 * Responsive Breakpoints (min-width)
 * @type {Readonly<Record<string, number>>}
 */
const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

/**
 * Animation & Transition Tokens
 */
const transitions = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },
  easing: {
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
  default: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
};

/**
 * Z-Index Layers
 */
const zIndices = {
  hide: -1,
  auto: "auto",
  base: 0,
  docked: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  toast: 600,
  tooltip: 700,
};

/**
 * Opacity Levels
 */
const opacities = {
  disabled: 0.4,
  hover: 0.8,
  active: 0.9,
  semiTransparent: 0.5,
  glass: 0.2,
  invisible: 0,
  opaque: 1,
};

/**
 * Border Widths
 */
const borderWidths = {
  thin: 1,
  medium: 2,
  thick: 4,
};

/**
 * Glass Morphism Effect (Original + Enhanced)
 * Use the original glass object for backward compatibility,
 * and an enhanced utility for advanced glass effects.
 */
const glass = {
  // Original glass definition
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderColor: "rgba(255, 255, 255, 0.2)",
  borderWidth: 1,

  // Enhanced glass preset (with blur and shadow)
  enhanced: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(12px)",
    borderRadius: borderRadius.lg,
    borderWidth: borderWidths.thin,
    borderColor: "rgba(255, 255, 255, 0.15)",
    boxShadow: shadows.md,
  },
};

// ============================================================================
// 2. UTILITY FUNCTIONS (Safe Access & Responsive Helpers)
// ============================================================================

/**
 * Safely retrieves a nested value from the theme using dot notation.
 * @param {Object} theme - The theme object.
 * @param {string} path - Dot-separated path (e.g., 'colors.primary').
 * @param {*} defaultValue - Fallback value if path not found.
 * @returns {*} The resolved value or default.
 */
const getThemeValue = (theme, path, defaultValue = null) => {
  return (
    path.split(".").reduce((acc, key) => acc?.[key], theme) ?? defaultValue
  );
};

/**
 * Generates responsive style values based on breakpoints.
 * @param {Object} breakpointValues - Object with breakpoint keys as properties.
 * @returns {Object} Media query style object (CSS-in-JS compatible).
 * @example
 * responsive({ base: { fontSize: 16 }, md: { fontSize: 24 } })
 */
const responsive = (breakpointValues) => {
  const result = {};
  Object.entries(breakpointValues).forEach(([bp, styles]) => {
    if (bp === "base") {
      Object.assign(result, styles);
    } else if (breakpoints[bp]) {
      result[`@media (min-width: ${breakpoints[bp]}px)`] = styles;
    }
  });
  return result;
};

/**
 * Creates a CSS gradient string from a color array.
 * @param {string[]} colorStops - Array of color strings.
 * @param {string} direction - Gradient direction (default: '135deg').
 * @returns {string} CSS linear-gradient rule.
 */
const createGradient = (colorStops, direction = "135deg") => {
  return `linear-gradient(${direction}, ${colorStops.join(", ")})`;
};

/**
 * Pre-defined gradient strings for direct use.
 */
const gradientStrings = {
  calm: createGradient(gradients.calm),
  healing: createGradient(gradients.healing),
  nature: createGradient(gradients.nature),
  cosmic: createGradient(gradients.cosmic),
};

// ============================================================================
// 3. THEME OBJECT (Fully Composed & Extendable)
// ============================================================================

/**
 * Master Theme Configuration
 * Combines all design tokens, utilities, and original structure.
 * Use this object with styled-components, emotion, or React Native Paper.
 */
export const theme = {
  // Original structure preserved for backward compatibility
  colors,
  spacing,
  borderRadius,
  fonts: typography.fontFamily, // Legacy reference
  glass,

  // Enhanced tokens
  gradients,
  gradientStrings,
  typography,
  shadows,
  breakpoints,
  transitions,
  zIndices,
  opacities,
  borderWidths,

  // Utility methods (safe to use in components)
  utils: {
    getValue: getThemeValue,
    responsive,
    gradient: createGradient,
  },
};

/**
 * Theme Extension Helper
 * Deeply merges custom overrides with the base theme.
 * @param {Object} customTheme - Partial theme overrides.
 * @returns {Object} Merged theme.
 */
export const extendTheme = (customTheme) => {
  const mergeDeep = (target, source) => {
    const result = { ...target };
    Object.keys(source).forEach((key) => {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = mergeDeep(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    return result;
  };
  return mergeDeep(theme, customTheme);
};

// ============================================================================
// 4. TYPE DEFINITIONS (JSDoc for IDE Autocomplete)
// ============================================================================

/**
 * @typedef {Object} Theme
 * @property {typeof colors} colors
 * @property {typeof spacing} spacing
 * @property {typeof borderRadius} borderRadius
 * @property {typeof typography.fontFamily} fonts
 * @property {typeof glass} glass
 * @property {typeof gradients} gradients
 * @property {typeof gradientStrings} gradientStrings
 * @property {typeof typography} typography
 * @property {typeof shadows} shadows
 * @property {typeof breakpoints} breakpoints
 * @property {typeof transitions} transitions
 * @property {typeof zIndices} zIndices
 * @property {typeof opacities} opacities
 * @property {typeof borderWidths} borderWidths
 * @property {typeof theme.utils} utils
 */

// Optional: Freeze theme in development to prevent mutations
if (process.env.NODE_ENV === "development") {
  Object.freeze(colors);
  Object.freeze(spacing);
  Object.freeze(typography);
  Object.freeze(theme);
}

// Default export for convenience
export default theme;
