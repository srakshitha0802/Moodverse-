import React, { useState, useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, ChevronRight, ChevronLeft, Check } from "lucide-react-native";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import theme from "../styles/theme";
import { impactLight, impactMedium, notifySuccess } from "../utils/safeHaptics";
import storage from "../utils/storage";

const { width } = Dimensions.get("window");

// ========================
// 1. ADVANCED QUESTION SET
// ========================
const QUESTIONS = [
  {
    id: "emotionalState",
    title: "Emotional State",
    subtitle: "How have you been feeling most days?",
    icon: "😌",
    options: [
      { value: "happy", label: "Happy & Optimistic", emoji: "😊" },
      { value: "calm", label: "Calm & Peaceful", emoji: "😌" },
      { value: "anxious", label: "Anxious & Worried", emoji: "😟" },
      { value: "sad", label: "Sad & Down", emoji: "😔" },
      { value: "angry", label: "Irritable & Angry", emoji: "😤" },
      { value: "neutral", label: "Neutral", emoji: "😐" },
    ],
  },
  {
    id: "tensionFrequency",
    title: "Physical Tension",
    subtitle: "How often do you feel physical tension or discomfort?",
    icon: "💢",
    options: [
      { value: "rarely", label: "Rarely", emoji: "🌿" },
      { value: "sometimes", label: "Sometimes", emoji: "🌊" },
      { value: "often", label: "Often", emoji: "⚡" },
      { value: "always", label: "Almost Always", emoji: "🔥" },
    ],
  },
  {
    id: "painLocation",
    title: "Tension Areas",
    subtitle: "Where do you feel the most tension or pain?",
    icon: "📍",
    options: [
      { value: "head", label: "Head / Neck", emoji: "🧠" },
      { value: "shoulders", label: "Chest / Shoulders", emoji: "💪" },
      { value: "stomach", label: "Stomach / Core", emoji: "🌀" },
      { value: "back", label: "Lower Back / Pelvis", emoji: "🦴" },
      { value: "whole", label: "Whole Body", emoji: "🔴" },
    ],
  },
  {
    id: "primaryGoal",
    title: "Your Main Goal",
    subtitle: "What do you want to achieve with Moodverse?",
    icon: "🎯",
    options: [
      { value: "stress", label: "Reduce Stress", emoji: "🧘" },
      { value: "mood", label: "Improve Mood", emoji: "🌈" },
      { value: "sleep", label: "Better Sleep", emoji: "😴" },
      { value: "energy", label: "Increase Energy", emoji: "⚡" },
      { value: "balance", label: "Emotional Balance", emoji: "⚖️" },
    ],
  },
  {
    id: "energyLevel",
    title: "Energy Level",
    subtitle: "How is your energy right now?",
    icon: "🔋",
    options: [
      { value: "very_low", label: "Very Low", emoji: "🪫" },
      { value: "low", label: "Low", emoji: "🔋" },
      { value: "moderate", label: "Moderate", emoji: "🔋🔋" },
      { value: "high", label: "High", emoji: "🔋🔋🔋" },
      { value: "very_high", label: "Very High", emoji: "⚡⚡⚡" },
    ],
  },
];

// ========================
// 2. SMART PLAN GENERATION
// ========================
const generatePersonalisedPlan = (answers, userName) => {
  const { emotionalState, painLocation, primaryGoal, energyLevel } = answers;

  // Determine main chakra focus
  let chakraFocus = "Root Chakra (Stability)";
  let affirmation = "I am safe and grounded.";
  let meditationType = "Grounding breathwork";

  if (painLocation === "head") chakraFocus = "Third Eye Chakra (Clarity)";
  else if (painLocation === "shoulders")
    chakraFocus = "Heart Chakra (Compassion)";
  else if (painLocation === "stomach")
    chakraFocus = "Solar Plexus Chakra (Personal Power)";
  else if (painLocation === "back") chakraFocus = "Sacral Chakra (Creativity)";

  if (emotionalState === "anxious") {
    affirmation = "I release fear and embrace peace.";
    meditationType = "Calming ocean breath";
  } else if (emotionalState === "sad") {
    affirmation = "I allow myself to feel and heal.";
    meditationType = "Loving‑kindness meditation";
  } else if (emotionalState === "angry") {
    affirmation = "I transform anger into strength.";
    meditationType = "Fire breath (Kapalabhati)";
  }

  if (primaryGoal === "stress") {
    chakraFocus = "Crown Chakra (Connection)";
    meditationType = "Yoga Nidra for deep relaxation";
  } else if (primaryGoal === "energy") {
    chakraFocus = "Solar Plexus Chakra (Vitality)";
    meditationType = "Energizing Sun Salutation";
  }

  // Generate daily tasks based on answers
  const todos = [
    {
      id: 1,
      text: `🌅 Morning ritual: ${meditationType} (10 min)`,
      done: false,
      type: "meditation",
    },
    {
      id: 2,
      text: "📱 Check‑in with your mood using the app",
      done: false,
      type: "checkin",
    },
    {
      id: 3,
      text: `💪 ${painLocation === "shoulders" ? "Shoulder roll & chest opener" : "Gentle stretching"} (5 min)`,
      done: false,
      type: "movement",
    },
    {
      id: 4,
      text: `📖 Repeat your affirmation: “${affirmation}” (3 times)`,
      done: false,
      type: "affirmation",
    },
    {
      id: 5,
      text: `🌙 Evening wind‑down: Write one thing you are grateful for`,
      done: false,
      type: "journal",
    },
  ];

  // Add energy‑specific task
  if (energyLevel === "very_low" || energyLevel === "low") {
    todos.push({
      id: 6,
      text: "🛌 Restorative pose: Legs‑up‑the‑wall (8 min)",
      done: false,
      type: "rest",
    });
  } else if (energyLevel === "high" || energyLevel === "very_high") {
    todos.push({
      id: 6,
      text: "🏃‍♀️ Active grounding: 15 min walk outdoors",
      done: false,
      type: "movement",
    });
  }

  return {
    userName,
    answers,
    chakraFocus,
    affirmation,
    meditationType,
    todos: todos.slice(0, 6), // max 6 tasks
    welcomeMessage: `Hello ${userName}! Based on your answers, we’ll focus on ${chakraFocus.toLowerCase()}.`,
  };
};

// ========================
// 3. CUSTOM HOOK FOR PERSISTENCE
// ========================
const useOnboardingPersistence = () => {
  const [savedState, setSavedState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await storage.getItem("@Moodverse_Onboarding");
        if (raw) setSavedState(raw);
      } catch (error) {
        console.warn("[Onboarding] Failed to load onboarding state", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveState = async (state) => {
    try {
      await storage.setItem("@Moodverse_Onboarding", state);
      setSavedState(state);
    } catch (error) {
      console.warn("[Onboarding] Failed to save onboarding state", error);
    }
  };

  const clearState = async () => {
    try {
      await storage.removeItem("@Moodverse_Onboarding");
      setSavedState(null);
    } catch (error) {
      console.warn("[Onboarding] Failed to clear onboarding state", error);
    }
  };

  return { savedState, loading, saveState, clearState };
};

// ========================
// 4. REUSABLE COMPONENTS
// ========================
const ProgressBar = ({ progress }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress * width,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, width]);

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View style={[styles.progressFill, { width: animatedWidth }]} />
    </View>
  );
};

const OptionButton = ({ option, isSelected, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true })
    ]).start(() => {
      impactLight();
      onPress();
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.optionButton, isSelected && styles.optionSelected]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
      >
        <View style={styles.optionLeft}>
          <Text style={styles.optionEmoji}>{option.emoji}</Text>
          <Text style={styles.optionText}>{option.label}</Text>
        </View>
        {isSelected && <Check color={theme.colors.success} size={22} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================
// 5. MAIN ONBOARDING SCREEN
// ========================
export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0); // 0 = name, 1..N = questions
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState({});
  const { savedState, loading, saveState, clearState } =
    useOnboardingPersistence();
  const scrollRef = useRef(null);

  // Restore saved state on mount
  useEffect(() => {
    if (savedState && !loading) {
      if (savedState.name) setName(savedState.name);
      if (savedState.answers) setAnswers(savedState.answers);
      if (savedState.step !== undefined) setStep(savedState.step);
    }
  }, [savedState, loading]);

  // Persist any state change
  useEffect(() => {
    if (!loading) {
      saveState({ name, answers, step });
    }
  }, [name, answers, step, loading]);

  const handleAnswer = (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // Move to next step
    if (step < QUESTIONS.length) {
      setStep(step + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      finishOnboarding(newAnswers);
    }
  };

  const finishOnboarding = async (finalAnswers) => {
    void notifySuccess();
    const plan = generatePersonalisedPlan(finalAnswers, name);

    // Save generated plan to dashboard stats
    try {
      const existingStats = await storage.getStats();
      const today = new Date().toISOString().split("T")[0];
      await storage.saveStats({
        ...existingStats,
        profile: { name: plan.userName, joinDate: today },
        focus: plan.chakraFocus,
        todos: plan.todos.map((t) => ({
          id: String(t.id),
          text: t.text,
          done: t.done,
        })),
      });
    } catch (e) {
      console.error("[Onboarding] Failed to save initial stats", e);
    }

    await clearState(); // clear stored onboarding data
    onComplete("free");
  };
  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
      void impactLight();
    }
  };

  const handleNameSubmit = () => {
    if (name.trim().length > 0) {
      void impactMedium();
      setStep(1);
    }
  };

  const totalSteps = QUESTIONS.length + 1; // +1 for name screen
  const currentProgress = step / totalSteps;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Preparing your space...</Text>
      </View>
    );
  }

  // ------------------- NAME SCREEN -------------------
  if (step === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={theme.colors.gradientCalm}
          style={styles.background}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              ref={scrollRef}
            >
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Heart
                    color={theme.colors.success}
                    size={48}
                    fill={theme.colors.success}
                  />
                </View>
                <Text style={styles.title}>Welcome to{"\n"}Moodverse</Text>
                <Text style={styles.subtitle}>
                  A sacred space for your mental, emotional, and physical
                  well‑being.
                </Text>
              </View>

              <View style={styles.nameInputContainer}>
                <Text style={styles.inputLabel}>What should we call you?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleNameSubmit}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !name.trim() && styles.buttonDisabled,
                ]}
                onPress={handleNameSubmit}
                disabled={!name.trim()}
              >
                <Text style={styles.buttonText}>Begin Assessment</Text>
                <ChevronRight color="white" size={20} />
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ------------------- QUESTIONS SCREENS -------------------
  const currentIndex = step - 1;
  const currentQuestion = QUESTIONS[currentIndex];
  const selectedValue = answers[currentQuestion.id];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={theme.colors.gradientCalm}
        style={styles.background}
      >
        <View style={styles.questionHeader}>
          <ProgressBar progress={currentProgress} />
          <View style={styles.stepRow}>
            {step > 1 && (
              <TouchableOpacity onPress={goBack} style={styles.backButton}>
                <ChevronLeft color={theme.colors.text} size={24} />
              </TouchableOpacity>
            )}
            <Text style={styles.stepIndicator}>
              {step} / {totalSteps}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.questionScroll}
          showsVerticalScrollIndicator={false}
          ref={scrollRef}
        >
          <View style={styles.questionCard}>
            <Text style={styles.questionIcon}>{currentQuestion.icon}</Text>
            <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
            <Text style={styles.questionSubtitle}>
              {currentQuestion.subtitle}
            </Text>

            <View style={styles.optionsGrid}>
              {currentQuestion.options.map((option, idx) => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={selectedValue === option.value}
                  onPress={() => handleAnswer(currentQuestion.id, option.value)}
                  index={idx}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ========================
// 6. STYLES (DEEPLY POLISHED)
// ========================
const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.xxl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: "80%",
  },
  nameInputContainer: {
    width: "100%",
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 18,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  questionHeader: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    marginBottom: theme.spacing.md,
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.success,
    borderRadius: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  stepIndicator: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  questionScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  questionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 32,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  questionIcon: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  questionSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  optionsGrid: {
    width: "100%",
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  optionSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: theme.colors.success,
    borderWidth: 1.5,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
});
