import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Sun,
  Moon,
  Info,
  PlayCircle,
  Activity,
  Brain,
  Wind,
  Calendar,
  TrendingUp,
  CheckCircle,
  X,
  Timer,
  Star,
  StarOff,
  History,
  Heart,
  Repeat,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react-native";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";

import theme from "../styles/theme";
import {
  impactLight,
  notifySuccess,
  selectionAsync,
} from "../utils/safeHaptics";
import storage from "../utils/storage";
import usePreciseTimer from "../hooks/usePreciseTimer";

const { width, height } = Dimensions.get("window");

// YOGA_DATA, MEDITATION_DATA unchanged...
const YOGA_DATA = { /* ... same as before ... */ };
const MEDITATION_DATA = [ /* ... same as before ... */ ];

// Updated BREATHING_LIBRARY with {name, duration} phases for usePreciseTimer
const BREATHING_LIBRARY = {
  box: {
    name: "Box Breathing",
    pattern: [
      { name: 'Inhale', duration: 4000 },
      { name: 'Hold', duration: 4000 },
      { name: 'Exhale', duration: 4000 },
      { name: 'Hold', duration: 4000 }
    ]
  },
  fourSevenEight: {
    name: "4-7-8 Relaxing",
    pattern: [
      { name: 'Inhale', duration: 4000 },
      { name: 'Hold', duration: 7000 },
      { name: 'Exhale', duration: 8000 }
    ]
  },
  equal: {
    name: "Equal Breathing",
    pattern: [
      { name: 'Inhale', duration: 5000 },
      { name: 'Exhale', duration: 5000 }
    ]
  },
  kapalbhati: {
    name: "Kapalbhati (Skull Shining)",
    pattern: [
      { name: 'Passive Inhale', duration: 2000 },
      { name: 'Active Exhale', duration: 1000 }
    ]
  },
  nadiShodhana: {
    name: "Alternate Nostril",
    pattern: [
      { name: 'Inhale Left', duration: 4000 },
      { name: 'Exhale Right', duration: 4000 },
      { name: 'Inhale Right', duration: 4000 },
      { name: 'Exhale Left', duration: 4000 }
    ]
  },
};

// Updated useSessionTimer to usePreciseTimer for yoga/meditation sessions
const usePreciseSessionTimer = (initialSeconds, onFinish) => usePreciseTimer(
  [{ name: 'session', duration: initialSeconds * 1000 }],
  {
    onSessionComplete: () => onFinish?.(),
    toleranceMs: 500, // 500ms ok for session timers
  }
);

const useProgressStorage = () => {
  // unchanged
};

export default function YogaMeditation({ onBack }) {
  const [activeTab, setActiveTab] = useState("yoga");
  const [yogaCategory, setYogaCategory] = useState("morning");
  const [selectedItem, setSelectedItem] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSteps, setSessionSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const { stats, saveSession } = useProgressStorage();

  // Breathing using shared PreciseTimer hook
  const [breathingMode, setBreathingMode] = useState(null);
  const {
    isActive: breathingActive,
    currentPhase: breathingPhaseIdx,
    cycleCount: breathingCycleCount,
    sessionDuration: breathingSessionDuration,
    remainingMs: breathingRemainingMs,
    togglePlayPause: toggleBreathingPause,
    start: startBreathing,
    reset: stopBreathing,
  } = usePreciseTimer([], {
    onPhaseChange: (phaseName) => {
      setBreathingInstructions(phaseName);
      // Animate scale based on phase
      const isInhale = phaseName.toLowerCase().includes('inhale') || 
                       phaseName.toLowerCase().includes('passive');
      animateBreathingScale(isInhale, breathingRemainingMs);
    },
    onCycleComplete: (count) => console.log(`Breathing cycle ${count}`),
    hapticsEnabled: true,
  });

  const breatheAnim = useRef(new Animated.Value(1)).current;

  // Yoga/Meditation session timer (now PreciseTimer)
  const {
    remaining: sessionRemaining,
    isActive: sessionActiveTimer,
    togglePlayPause: toggleSessionPause,
    reset: resetSessionTimer,
  } = usePreciseSessionTimer(0, finishSession);

  // Load favorites unchanged
  useEffect(() => {
    storage.getItem("@yoga_favorites", { defaultValue: [] }).then(setFavorites);
  }, []);

  const toggleFavorite = async (id) => {
    // unchanged
  };

  const startYogaSession = (pose) => {
    setSelectedItem({ type: "yoga", data: pose });
    setSessionSteps(pose.steps);
    setStepIndex(0);
    setSessionActive(true);
    // PreciseTimer starts with pattern set to pose.duration*1000
    impactLight();
  };

  // ... startMeditationSession, finishSession, nextStep unchanged ...

  const startBreathingSession = useCallback((modeKey) => {
    const mode = BREATHING_LIBRARY[modeKey];
    if (!mode) return;
    setBreathingMode(mode);
    setBreathingInstructions("Get ready...");
    startBreathing(); // Hook starts first phase
  }, [startBreathing]);

  const animateBreathingScale = useCallback((isInhale, duration) => {
    const toValue = isInhale ? 1.4 : 0.7;
    Animated.timing(breatheAnim, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  }, [breatheAnim]);

  // Rest of component unchanged: renderYogaList, renderMeditationList, renderProgress, modals

  const renderBreathing = () => {
    if (breathingMode) {
      return (
        <View style={styles.breathingContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              { transform: [{ scale: breatheAnim }], backgroundColor: theme.colors.primary + "80" },
            ]}
          />
          <Text style={styles.breathingText}>{breathingInstructions}</Text>
          <Text style={styles.breathingTimer}>{(breathingRemainingMs / 1000).toFixed(1)}s</Text>
          <Text style={styles.breathingStats}>Cycle: {breathingCycleCount} | {Math.floor(breathingSessionDuration / 1000 / 60)}:{Math.floor(breathingSessionDuration / 1000 % 60).toString().padStart(2, '0')}</Text>
          <View style={styles.breathingControls}>
            <TouchableOpacity style={[styles.breathingControlBtn, breathingActive && styles.pauseBtn]} onPress={toggleBreathingPause}>
              <Text style={styles.breathingControlText}>{breathingActive ? '⏸️ Pause' : '▶️ Resume'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopBreathButton} onPress={stopBreathing}>
              <Text style={styles.stopBreathText}>⏹️ Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <ScrollView>
        <Text style={styles.sectionTitle}>Pranayama Techniques</Text>
        {Object.entries(BREATHING_LIBRARY).map(([key, mode]) => (
          <TouchableOpacity key={key} style={[styles.breathCard, theme.glass]} onPress={() => startBreathingSession(key)}>
            <Wind size={32} color={theme.colors.primary} />
            <Text style={styles.breathTitle}>{mode.name}</Text>
            <Text style={styles.breathDesc}>{mode.pattern.map(p => p.name).join(' · ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Rest of render functions, SessionModal, HistoryModal unchanged...

  return (
    <View style={styles.container}>
      {/* Header, tabs, content unchanged */}
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "yoga" && renderYogaList()}
        {activeTab === "meditation" && renderMeditationList()}
        {activeTab === "breathing" && renderBreathing()}
        {activeTab === "progress" && renderProgress()}
      </ScrollView>
      <SessionModal />
      <HistoryModal />
    </View>
  );
}

// styles unchanged
const styles = StyleSheet.create({
  // ... all styles same as before
});

export default YogaMeditation;
