import { LinearGradient } from "expo-linear-gradient";
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Activity,
  Heart,
} from "lucide-react-native";
import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import Svg, { Circle as SvgCircle } from "react-native-svg";

import theme from "../styles/theme";
import usePreciseTimer from "../hooks/usePreciseTimer";

const { width } = Dimensions.get("window");
const CIRCLE_SIZE = width * 0.6;
const BREATH_SCALE_MIN = 1;
const BREATH_SCALE_MAX = 1.35;

// Helper function to convert hex to rgba with opacity
const hexToRgba = (hex, opacity) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`
    : hex;
};

// Chakra data with colors, patterns, and benefits
const CHAKRAS = [
  {
    id: "root",
    name: "🌱 Root Chakra",
    subtitle: "Grounding & Stability",
    pattern: [{ name: 'inhale', duration: 4000 }, { name: 'hold', duration: 4000 }, { name: 'exhale', duration: 4000 }],
    gradient: ["#FF416C", "#FF4B2B"],
    color: "#FF4B2B",
    mantra: "Lam",
  },
  {
    id: "sacral",
    name: "🧡 Sacral Chakra",
    subtitle: "Creativity & Flow",
    pattern: [{ name: 'inhale', duration: 4000 }, { name: 'hold', duration: 2000 }, { name: 'exhale', duration: 6000 }],
    gradient: ["#FF9A9E", "#FECFEF"],
    color: "#FF6B9D",
    mantra: "Vam",
  },
  {
    id: "solar",
    name: "☀️ Solar Plexus",
    subtitle: "Power & Confidence",
    pattern: [{ name: 'inhale', duration: 4000 }, { name: 'hold', duration: 4000 }, { name: 'exhale', duration: 4000 }],
    gradient: ["#FAD961", "#F76B1C"],
    color: "#F7B42C",
    mantra: "Ram",
  },
  {
    id: "heart",
    name: "💚 Heart Chakra",
    subtitle: "Love & Compassion",
    pattern: [{ name: 'inhale', duration: 5000 }, { name: 'hold', duration: 5000 }, { name: 'exhale', duration: 5000 }],
    gradient: ["#A8E6CF", "#3E8E7E"],
    color: "#2ECC71",
    mantra: "Yam",
  },
  {
    id: "throat",
    name: "💙 Throat Chakra",
    subtitle: "Expression & Truth",
    pattern: [{ name: 'inhale', duration: 4000 }, { name: 'hold', duration: 2000 }, { name: 'exhale', duration: 4000 }],
    gradient: ["#4FACFE", "#00F2FE"],
    color: "#3498DB",
    mantra: "Ham",
  },
  {
    id: "thirdEye",
    name: "🔮 Third Eye",
    subtitle: "Intuition & Insight",
    pattern: [{ name: 'inhale', duration: 4000 }, { name: 'hold', duration: 4000 }, { name: 'exhale', duration: 6000 }],
    gradient: ["#9D4EDD", "#5A189A"],
    color: "#9B59B6",
    mantra: "Om",
  },
  {
    id: "crown",
    name: "👑 Crown Chakra",
    subtitle: "Spiritual Connection",
    pattern: [{ name: 'inhale', duration: 6000 }, { name: 'hold', duration: 6000 }, { name: 'exhale', duration: 6000 }],
    gradient: ["#E0C3FC", "#8EC5FC"],
    color: "#E84393",
    mantra: "Ah",
  },
];

const ChakraBreathing = ({ navigation, onBack }) => {
  const [selectedChakra, setSelectedChakra] = useState(CHAKRAS[1]);
  const [showChakraModal, setShowChakraModal] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [instructions, setInstructions] = useState("Tap play to begin your breath journey");

  const pattern = selectedChakra.pattern;
  const cycleTotalMs = pattern.reduce((sum, p) => sum + p.duration, 0);
  const targetCycles = selectedDuration > 0 ? Math.ceil(selectedDuration * 60 * 1000 / cycleTotalMs) : null;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const phaseScaleAnim = useRef(new Animated.Value(1)).current;

  const {
    isActive,
    currentPhase,
    cycleCount,
    sessionDuration,
    remainingMs,
    togglePlayPause,
    start,
    reset: resetTimer,
  } = usePreciseTimer(pattern, {
    onPhaseChange: (phaseName, duration) => {
      let instr = '';
      let hapticDuration = 50;
      if (phaseName?.toLowerCase().includes('inhale')) {
        instr = 'Breathe in slowly...';
        hapticDuration = 80;
        animateScale('inhale', duration);
      } else if (phaseName?.toLowerCase().includes('hold')) {
        instr = 'Hold gently...';
        hapticDuration = 30;
      } else if (phaseName?.toLowerCase().includes('exhale')) {
        instr = 'Exhale completely...';
        hapticDuration = 120;
        animateScale('exhale', duration);
      }
      setInstructions(instr);
      vibrate(hapticDuration);
    },
    onCycleComplete: (count) => {
      vibrate(80);
      setInstructions('Great cycle! Continue breathing...');
    },
    onSessionComplete: (cycles, totalSeconds) => {
      setInstructions(`✨ Session complete! ${cycles} cycles (${Math.floor(totalSeconds/60)}:${(totalSeconds%60).toString().padStart(2,'0')})`);
      vibrate(500);
    },
    hapticsEnabled,
    toleranceMs: 100,
  });

  const vibrate = useCallback((duration = 50, intensity = "light") => {
    if (!hapticsEnabled) return;
    Vibration.vibrate(intensity === "heavy" ? [0, duration, 100] : duration);
  }, [hapticsEnabled]);

  const animateScale = useCallback((phase, duration) => {
    if (phase === "hold") return;
    const toValue = phase === "inhale" ? BREATH_SCALE_MAX : BREATH_SCALE_MIN;
    scaleAnim.stopAnimation();
    Animated.timing(scaleAnim, { toValue, duration, useNativeDriver: true }).start();
    progressAnim.stopAnimation();
    Animated.timing(progressAnim, { toValue: 1, duration, useNativeDriver: false }).start();
    phaseScaleAnim.stopAnimation();
    Animated.spring(phaseScaleAnim, { toValue: 1.1, tension: 200, useNativeDriver: true }).start();
  }, [scaleAnim, progressAnim, phaseScaleAnim]);

  const resetSession = useCallback(() => {
    resetTimer();
    setInstructions("Ready to begin. Tap play.");
    scaleAnim.setValue(1);
    progressAnim.setValue(0);
    phaseScaleAnim.setValue(1);
  }, [resetTimer]);

  // Update timer phases when chakra/pattern changes
  React.useEffect(() => {
    if (!isActive) {
      usePreciseTimer.setPhases(pattern, targetCycles);
    }
  }, [pattern, targetCycles]);

  // Start session logic in togglePlayPause if ready
  const handleToggle = useCallback(() => {
    if (!isActive && currentPhase === 0) {
      start();
      return;
    }
    togglePlayPause();
  }, [isActive, currentPhase, start, togglePlayPause]);

  const formatRemaining = (ms) => (ms <= 0 ? "0.0" : (ms / 1000).toFixed(1)) + 's';
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  const getPhaseDisplay = () => {
    const phaseName = pattern[currentPhase]?.name || 'ready';
    const phaseNames = {
      inhale: '🌬️ INHALE',
      hold: '🌀 HOLD', 
      exhale: '💨 EXHALE',
      ready: '✨ READY',
    };
    return phaseNames[phaseName] || phaseNames.ready;
  };

  const currentGradient = selectedChakra.gradient;

  return (
    <LinearGradient colors={currentGradient} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack || (() => navigation?.goBack())} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chakraSelector} onPress={() => setShowChakraModal(true)}>
          <Text style={styles.chakraSelectorText}>{selectedChakra.name}</Text>
          <Text style={{ color: "white" }}>▼</Text>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.circleContainer}>
          <Animated.View style={[styles.circleContainerSvg, { transform: [{ scale: scaleAnim }] }]}>
            <Svg width={CIRCLE_SIZE + 20} height={CIRCLE_SIZE + 20} viewBox={`0 0 ${CIRCLE_SIZE + 20} ${CIRCLE_SIZE + 20}`}>
              <SvgCircle cx={(CIRCLE_SIZE + 20) / 2} cy={(CIRCLE_SIZE + 20) / 2} r={CIRCLE_SIZE / 2 + 2} stroke={hexToRgba(selectedChakra.color, 0.3)} strokeWidth="6" fill="transparent" strokeOpacity="0.4" />
              <SvgCircle cx={(CIRCLE_SIZE + 20) / 2} cy={(CIRCLE_SIZE + 20) / 2} r={CIRCLE_SIZE / 2 + 2} stroke={selectedChakra.color} strokeWidth="6" fill="transparent" strokeLinecap="round" strokeDasharray={Math.PI * CIRCLE_SIZE} strokeDashoffset={progressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -Math.PI * CIRCLE_SIZE] })} />
            </Svg>
            <Animated.View style={[styles.breathingCircle, { borderColor: selectedChakra.color, backgroundColor: hexToRgba(selectedChakra.color, 0.12), transform: [{ scale: phaseScaleAnim }] }]}>
              <Wind color={selectedChakra.color} size={CIRCLE_SIZE * 0.25} />
              <Animated.Text style={[styles.phaseText, { color: selectedChakra.color, transform: [{ scale: phaseScaleAnim }] }]}>
                {getPhaseDisplay()}
              </Animated.Text>
              {isActive && (
                <Text style={styles.timerText}>
                  {formatRemaining(remainingMs)}
                </Text>
              )}
            </Animated.View>
          </Animated.View>
        </View>

        <Text style={styles.instruction}>{instructions}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Activity color="white" size={24} />
            <Text style={styles.statValue}>{cycleCount}</Text>
            <Text style={styles.statLabel}>Cycles</Text>
          </View>
          <View style={styles.statCard}>
            <Clock color="white" size={24} />
            <Text style={styles.statValue}>{formatTime(sessionDuration)}</Text>
            <Text style={styles.statLabel}>Session</Text>
          </View>
          <View style={styles.statCard}>
            <Heart color="white" size={24} />
            <Text style={styles.statValue}>{pattern.map(p => (p.duration/1000).toFixed(1)+'s').join(' | ')}</Text>
            <Text style={styles.statLabel}>Phases</Text>
          </View>
        </View>

        <View style={styles.targetContainer}>
          <Text style={styles.targetLabel}>Session: {selectedDuration === 0 ? "∞" : selectedDuration}m ({targetCycles === null ? "∞" : targetCycles} cycles)</Text>
          <View style={styles.targetButtons}>
            {[5, 10, 15, 30, 0].map(dur => (
              <TouchableOpacity key={dur} style={[styles.targetBtn, selectedDuration === dur && styles.targetBtnSelected]} onPress={() => {
                setSelectedDuration(dur);
              }}>
                <Text style={styles.targetBtnText}>{dur === 0 ? '∞' : dur + "'"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={resetSession}>
            <RotateCcw color="white" size={28} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.playBtn, isActive && styles.pauseBtn]} onPress={handleToggle}>
            {isActive ? <Pause color="white" size={36} /> : <Play color="white" size={36} />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, hapticsEnabled && styles.hapticsActive]} onPress={() => setHapticsEnabled(!hapticsEnabled)}>
            <Text style={styles.hapticsText}>💪</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.benefitCard}>
          <Text style={styles.benefitTitle}>✨ {selectedChakra.name} Benefits</Text>
          <Text style={styles.benefitText}>{selectedChakra.subtitle}</Text>
          <Text style={styles.mantra}>Mantra: "{selectedChakra.mantra}"</Text>
        </View>
      </ScrollView>

      <Modal visible={showChakraModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowChakraModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Chakra</Text>
            <ScrollView style={styles.modalList}>
              {CHAKRAS.map(chakra => (
                <TouchableOpacity key={chakra.id} style={[styles.chakraOption, selectedChakra.id === chakra.id && styles.chakraOptionSelected]} onPress={() => {
                  setSelectedChakra(chakra);
                  resetSession();
                  setInstructions(`${chakra.name} selected`);
                  setShowChakraModal(false);
                }}>
                  <Text style={styles.chakraOptionName}>{chakra.name}</Text>
                  <Text style={styles.chakraOptionSub}>{chakra.subtitle}</Text>
                  <View style={[styles.chakraColorDot, { backgroundColor: chakra.color }]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowChakraModal(false)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  backText: { fontSize: 28, color: "white", fontWeight: "bold" },
  chakraSelector: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30, gap: 8 },
  chakraSelectorText: { color: "white", fontSize: 16, fontWeight: "600" },
  scrollContent: { alignItems: "center", paddingBottom: 40 },
  circleContainer: { marginVertical: 20, alignItems: "center", justifyContent: "center" },
  circleContainerSvg: { position: "relative" },
  breathingCircle: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, borderWidth: 4, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  phaseText: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 8, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  timerText: { fontSize: 32, fontWeight: "300", color: "white" },
  instruction: { fontSize: 16, color: "white", textAlign: "center", marginHorizontal: 30, marginTop: 20, fontStyle: "italic", backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 40 },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", width: width * 0.9, marginVertical: 30 },
  statCard: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 12, alignItems: "center", minWidth: 90 },
  statValue: { fontSize: 28, fontWeight: "bold", color: "white", marginVertical: 4 },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  targetContainer: { backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, marginVertical: 10, alignItems: "center" },
  targetLabel: { color: "white", fontSize: 14, marginBottom: 8 },
  targetButtons: { flexDirection: "row", gap: 15 },
  targetBtn: { backgroundColor: "rgba(255,255,255,0.3)", width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  targetBtnSelected: { backgroundColor: "rgba(255,255,255,0.6)" },
  targetBtnText: { fontSize: 24, fontWeight: "bold", color: "white" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 30, marginVertical: 30 },
  controlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FF6B9D", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 8 },
  pauseBtn: { backgroundColor: "#FF4757" },
  hapticsActive: { backgroundColor: "rgba(255,255,255,0.5)" },
  hapticsText: { fontSize: 28 },
  benefitCard: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 30, padding: 20, marginTop: 20, width: width * 0.9, alignItems: "center" },
  benefitTitle: { fontSize: 18, fontWeight: "bold", color: "white", marginBottom: 8 },
  benefitText: { fontSize: 14, color: "white", textAlign: "center" },
  mantra: { fontSize: 16, fontWeight: "600", color: "#FFEAA7", marginTop: 8, fontStyle: "italic" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#1e1e2f", borderRadius: 40, width: width * 0.9, maxHeight: "70%", padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: "bold", color: "white", textAlign: "center", marginBottom: 20 },
  modalList: { maxHeight: 400 },
  chakraOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)" },
  chakraOptionSelected: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, paddingHorizontal: 10 },
  chakraOptionName: { color: "white", fontSize: 16, fontWeight: "600" },
  chakraOptionSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  chakraColorDot: { width: 20, height: 20, borderRadius: 10 },
  closeModalBtn: { marginTop: 20, backgroundColor: "#FF6B9D", padding: 12, borderRadius: 30, alignItems: "center" },
  closeModalText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default ChakraBreathing;

