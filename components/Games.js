import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import {
  Gamepad2,
  RefreshCw,
  ChevronLeft,
  Heart,
  Star,
  Cloud,
  Moon,
  Sun,
  Wind,
  CheckCircle2,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Target,
  Clock,
  Award,
  Share2,
  Info,
  Plus,
  Minus,
  X,
  Play,
  Pause,
  Sparkles,
} from "lucide-react-native";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Vibration,
  Modal,
  Platform,
  PanResponder,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Animatable from "react-native-animatable";

import { theme } from "../styles/theme";
import {
  impactLight,
  impactHeavy,
  selectionAsync,
  notifySuccess,
} from "../utils/safeHaptics";

const { width, height } = Dimensions.get("window");
const IS_IOS = Platform.OS === "ios";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ------------------------------------------------------------
// 1. ADVANCED BREATH PACER (4-7-8) with Progress Ring & Countdown
// ------------------------------------------------------------
const useBreathingTimer = (isActive, onPhaseChange) => {
  const [phase, setPhase] = useState("inhale");
  const [timeLeft, setTimeLeft] = useState(4);
  const [cycles, setCycles] = useState(0);
  const phaseRef = useRef(phase);
  const intervalRef = useRef(null);
  const animationRef = useRef(null);
  const phaseTimes = { inhale: 4, hold: 7, exhale: 8 };

  const clearTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (animationRef.current) clearTimeout(animationRef.current);
  }, []);

  const runPhase = useCallback(
    (newPhase) => {
      setPhase(newPhase);
      phaseRef.current = newPhase;
      const duration = phaseTimes[newPhase];
      setTimeLeft(duration);
      onPhaseChange?.(newPhase, duration);

      // Countdown timer
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Phase completion timer
      animationRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        if (newPhase === "inhale") runPhase("hold");
        else if (newPhase === "hold") runPhase("exhale");
        else if (newPhase === "exhale") {
          setCycles((c) => c + 1);
          runPhase("inhale");
        }
      }, duration * 1000);
    },
    [onPhaseChange],
  );

  useEffect(() => {
    if (isActive) {
      clearTimer();
      runPhase("inhale");
    } else {
      clearTimer();
      setPhase("inhale");
      setTimeLeft(4);
    }
    return clearTimer;
  }, [isActive, runPhase, clearTimer]);

  return { phase, timeLeft, cycles };
};

const BreathPacer = ({ onBack }) => {
  const [isActive, setIsActive] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { phase, timeLeft, cycles } = useBreathingTimer(
    isActive,
    (newPhase, duration) => {
      void impactLight();
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
  );

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  const phaseConfig = {
    inhale: {
      text: "Breathe In",
      color: "#4CAF50",
      instruction: "Fill your belly with peace",
    },
    hold: {
      text: "Hold",
      color: "#FF9800",
      instruction: "Embrace the stillness",
    },
    exhale: {
      text: "Breathe Out",
      color: "#2196F3",
      instruction: "Release all tension",
    },
  };

  const circleSize = width * 0.5;
  const progress =
    timeLeft / (phase === "inhale" ? 4 : phase === "hold" ? 7 : 8);

  return (
    <SafeAreaView style={styles.gameContainer}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>🧘 Breath Pacer Pro</Text>
        <TouchableOpacity
          onPress={() => setShowGuide(!showGuide)}
          style={styles.infoBtn}
        >
          <Info color="white" size={24} />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={showGuide} animationType="fade">
        <View style={styles.modalOverlay}>
          <Animatable.View animation="bounceIn" style={styles.modalContent}>
            <Text style={styles.modalTitle}>4-7-8 Breathing Technique</Text>
            <Text style={styles.modalText}>
              • Inhale quietly through nose (4 sec)
            </Text>
            <Text style={styles.modalText}>• Hold breath (7 sec)</Text>
            <Text style={styles.modalText}>• Exhale through mouth (8 sec)</Text>
            <Text style={styles.modalText}>• Repeat for 4-8 cycles</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowGuide(false)}
            >
              <Text style={styles.modalButtonText}>Got it!</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>

      <View style={styles.gameCenter}>
        <Animated.View
          style={[
            styles.breathCircleContainer,
            {
              transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
          ]}
        >
          <LinearGradient
            colors={[
              phaseConfig[phase].color + "40",
              phaseConfig[phase].color + "80",
            ]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Animated.View
            style={[
              styles.progressRing,
              {
                width: circleSize + 10,
                height: circleSize + 10,
                borderRadius: (circleSize + 10) / 2,
                borderWidth: 6,
                borderColor: phaseConfig[phase].color,
                opacity: 0.6,
                transform: [{ scale: progress }],
              },
            ]}
          />
          <Text style={styles.phaseMainText}>{phaseConfig[phase].text}</Text>
          <Text style={styles.countdownText}>{timeLeft}s</Text>
        </Animated.View>

        <Animatable.Text
          animation="fadeInUp"
          delay={300}
          style={styles.instructionText}
        >
          {phaseConfig[phase].instruction}
        </Animatable.Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Cycles</Text>
            <Text style={styles.statValue}>{cycles}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Recommended</Text>
            <Text style={styles.statValue}>4-8</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, isActive && styles.stopBtn]}
          onPress={() => {
            void notifySuccess();
            setIsActive(!isActive);
          }}
        >
          <Text style={styles.actionBtnText}>
            {isActive ? "STOP SESSION" : "START BREATHING"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 2. ADVANCED ZEN MEMORY MATCH with Timer, Moves & Best Score
// ------------------------------------------------------------
const CARD_PAIRS = [Heart, Star, Cloud, Moon, Sun, Wind];
const generateDeck = () => {
  const deck = [...CARD_PAIRS, ...CARD_PAIRS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((Icon, idx) => ({
    id: idx,
    Icon,
    isFlipped: false,
    isMatched: false,
    flipAnim: new Animated.Value(0),
  }));
};

const MemoryMatch = ({ onBack }) => {
  const [cards, setCards] = useState(() => generateDeck());
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [bestScore, setBestScore] = useState(null);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const timerRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    loadBestScore();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (matches === CARD_PAIRS.length && !isGameComplete) {
      setIsGameComplete(true);
      if (timerRef.current) clearInterval(timerRef.current);
      void notifySuccess();
      saveBestScore();
    }
  }, [matches, isGameComplete]);

  const loadBestScore = async () => {
    try {
      const saved = await AsyncStorage.getItem("memoryMatchBest");
      if (saved) setBestScore(JSON.parse(saved));
    } catch (error) {}
  };

  const saveBestScore = async () => {
    const currentScore = { moves, time: timeElapsed };
    if (
      !bestScore ||
      moves < bestScore.moves ||
      (moves === bestScore.moves && timeElapsed < bestScore.time)
    ) {
      setBestScore(currentScore);
      await AsyncStorage.setItem(
        "memoryMatchBest",
        JSON.stringify(currentScore),
      );
    }
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
  }, []);

  const flipCard = (index) => {
    if (isProcessingRef.current) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (flippedIndices.length === 0) startTimer();
    if (flippedIndices.length >= 2) return;

    void selectionAsync();
    setMoves((m) => m + 1);

    // Flip animation
    Animated.spring(cards[index].flipAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      isProcessingRef.current = true;
      const [idx1, idx2] = newFlipped;
      if (newCards[idx1].Icon === newCards[idx2].Icon) {
        setTimeout(() => {
          void notifySuccess();
          const matchedCards = [...newCards];
          matchedCards[idx1].isMatched = true;
          matchedCards[idx2].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setMatches((m) => m + 1);
          isProcessingRef.current = false;
        }, 400);
      } else {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(newCards[idx1].flipAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(newCards[idx2].flipAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
          const resetCards = [...newCards];
          resetCards[idx1].isFlipped = false;
          resetCards[idx2].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
          isProcessingRef.current = false;
        }, 800);
      }
    }
  };

  const resetGame = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (timerRef.current) clearInterval(timerRef.current);
    setCards(generateDeck());
    setFlippedIndices([]);
    setMatches(0);
    setMoves(0);
    setTimeElapsed(0);
    setIsGameComplete(false);
    isProcessingRef.current = false;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.gameContainer}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>🎴 Zen Memory</Text>
        <TouchableOpacity onPress={resetGame}>
          <RefreshCw color="white" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statBadge}>
          <Trophy size={16} color={theme.colors.primary} />
          <Text style={styles.statBadgeText}>Moves: {moves}</Text>
        </View>
        <View style={styles.statBadge}>
          <Clock size={16} color={theme.colors.primary} />
          <Text style={styles.statBadgeText}>{formatTime(timeElapsed)}</Text>
        </View>
        {bestScore && (
          <View style={styles.statBadge}>
            <Award size={16} color="#FFD700" />
            <Text style={styles.statBadgeText}>Best: {bestScore.moves}</Text>
          </View>
        )}
      </View>

      <View style={styles.gameCenter}>
        {isGameComplete && (
          <Animatable.View animation="zoomIn" style={styles.winOverlay}>
            <CheckCircle2 color={theme.colors.success} size={80} />
            <Text style={styles.winTitle}>Mindful Victory!</Text>
            <Text style={styles.winSubtitle}>
              Completed in {moves} moves • {formatTime(timeElapsed)}
            </Text>
            <TouchableOpacity style={styles.playAgainBtn} onPress={resetGame}>
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
          </Animatable.View>
        )}

        <View style={styles.grid}>
          {cards.map((card, index) => {
            const rotateY = card.flipAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "180deg"],
            });
            const opacity = card.flipAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 0.3, 1],
            });
            return (
              <TouchableOpacity
                key={card.id}
                onPress={() => flipCard(index)}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.card,
                    (card.isFlipped || card.isMatched) && styles.cardFlipped,
                    { transform: [{ rotateY }], opacity },
                  ]}
                >
                  {card.isFlipped || card.isMatched ? (
                    <card.Icon color={theme.colors.primary} size={36} />
                  ) : (
                    <View style={styles.cardBack} />
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 3. NEW GAME: FOCUS POINTS (Reaction & Accuracy Training)
// ------------------------------------------------------------
const FocusPoints = ({ onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const [targetVisible, setTargetVisible] = useState(false);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [highScore, setHighScore] = useState(0);
  const targetSize = 70;
  const timeoutRef = useRef(null);
  const gameTimerRef = useRef(null);
  const targetAppearTime = useRef(null);

  useEffect(() => {
    loadHighScore();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, []);

  const loadHighScore = async () => {
    try {
      const saved = await AsyncStorage.getItem("focusPointsHighScore");
      if (saved) setHighScore(parseInt(saved));
    } catch (error) {}
  };

  const saveHighScore = async (newScore) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      await AsyncStorage.setItem("focusPointsHighScore", newScore.toString());
      void notifySuccess();
    }
  };

  const getRandomPosition = () => {
    const maxX = width - targetSize - 40;
    const maxY = height - targetSize - 200;
    return {
      x: Math.random() * maxX + 20,
      y: Math.random() * maxY + 100,
    };
  };

  const spawnTarget = () => {
    setTargetPosition(getRandomPosition());
    setTargetVisible(true);
    targetAppearTime.current = Date.now();

    // Auto-hide after 1.5 seconds (miss)
    timeoutRef.current = setTimeout(() => {
      if (targetVisible) {
        setTargetVisible(false);
        void impactHeavy();
        setTimeout(spawnTarget, 300);
      }
    }, 1500);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setReactionTimes([]);
    setIsPlaying(true);
    setTargetVisible(false);

    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => spawnTarget(), 500);
  };

  const endGame = () => {
    setIsPlaying(false);
    setTargetVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    saveHighScore(score);
    const avgReaction =
      reactionTimes.length > 0
        ? Math.round(
            reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length,
          )
        : 0;
    if (avgReaction > 0) {
      void notifySuccess();
    }
  };

  const handleTargetPress = () => {
    if (!isPlaying || !targetVisible) return;

    const reactionTime = Date.now() - targetAppearTime.current;
    setReactionTimes((prev) => [...prev, reactionTime]);
    setScore((prev) => prev + 1);
    setTargetVisible(false);
    void impactLight();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTimeout(() => spawnTarget(), 200);
  };

  const avgReaction =
    reactionTimes.length > 0
      ? Math.round(
          reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length,
        )
      : 0;

  return (
    <SafeAreaView style={styles.gameContainer}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>🎯 Focus Points</Text>
        <View style={{ width: 28 }} />
      </View>

      {!isPlaying ? (
        <View style={styles.gameCenter}>
          <Animatable.View animation="fadeInUp" style={styles.startCard}>
            <Zap size={60} color={theme.colors.primary} />
            <Text style={styles.startTitle}>Train Your Focus</Text>
            <Text style={styles.startDesc}>
              Tap the glowing orb as fast as you can!
            </Text>
            <Text style={styles.startDesc}>
              30 seconds • Miss penalty • Track reaction time
            </Text>

            <View style={styles.scorePreview}>
              <View style={styles.previewItem}>
                <Trophy size={20} color="#FFD700" />
                <Text style={styles.previewText}>High Score: {highScore}</Text>
              </View>
              {avgReaction > 0 && (
                <View style={styles.previewItem}>
                  <Target size={20} color={theme.colors.primary} />
                  <Text style={styles.previewText}>Avg: {avgReaction}ms</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.startGameBtn} onPress={startGame}>
              <Text style={styles.startGameText}>START GAME</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      ) : (
        <>
          <View style={styles.gameStats}>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>Score: {score}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>Time: {timeLeft}s</Text>
            </View>
          </View>

          {targetVisible && (
            <TouchableOpacity
              style={[
                styles.targetOrb,
                {
                  left: targetPosition.x,
                  top: targetPosition.y,
                  width: targetSize,
                  height: targetSize,
                  borderRadius: targetSize / 2,
                },
              ]}
              onPress={handleTargetPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#ff6b6b", "#feca57", "#48dbfb"]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Animatable.View
                animation="pulse"
                easing="ease-out"
                iterationCount="infinite"
                style={styles.targetInner}
              >
                <Target color="white" size={30} />
              </Animatable.View>
            </TouchableOpacity>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 4. MEDITATION TIMER GAME
// ------------------------------------------------------------
const MeditationTimer = ({ onBack }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(300);

  const durations = [
    { label: "3 min", value: 180 },
    { label: "5 min", value: 300 },
    { label: "10 min", value: 600 },
    { label: "15 min", value: 900 },
  ];

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      notifySuccess();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    setIsRunning(true);
    setTimeLeft(selectedDuration);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(selectedDuration);
  };

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Mindful Moments</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.gameContent}>
        <View style={styles.meditationCircle}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>

        <View style={styles.durationButtons}>
          {durations.map((duration) => (
            <TouchableOpacity
              key={duration.value}
              style={[
                styles.durationButton,
                selectedDuration === duration.value &&
                  styles.durationButtonSelected,
              ]}
              onPress={() => {
                setSelectedDuration(duration.value);
                setTimeLeft(duration.value);
                setIsRunning(false);
              }}
            >
              <Text
                style={[
                  styles.durationButtonText,
                  selectedDuration === duration.value &&
                    styles.durationButtonTextSelected,
                ]}
              >
                {duration.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.timerControls}>
          {!isRunning ? (
            <TouchableOpacity style={styles.startButton} onPress={startTimer}>
              <Play color="white" size={24} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.pauseButton} onPress={pauseTimer}>
              <Pause color="white" size={24} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.resetButton} onPress={resetTimer}>
            <RefreshCw color={theme.colors.text} size={20} />
          </TouchableOpacity>
        </View>

        <Text style={styles.meditationTip}>
          Find a comfortable position, close your eyes, and focus on your
          breath.
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 5. GRATITUDE GARDEN GAME
// ------------------------------------------------------------
const GratitudeGarden = ({ onBack }) => {
  const [gratitudeItems, setGratitudeItems] = useState([]);
  const [currentText, setCurrentText] = useState("");
  const [showInput, setShowInput] = useState(false);

  const gratitudePrompts = [
    "What made you smile today?",
    "What are you thankful for right now?",
    "Who made your day better?",
    "What's something beautiful you noticed?",
    "What's a small victory you achieved?",
  ];

  const addGratitudeItem = () => {
    if (currentText.trim()) {
      const newItem = {
        id: Date.now(),
        text: currentText.trim(),
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
      };
      setGratitudeItems([newItem, ...gratitudeItems]);
      setCurrentText("");
      setShowInput(false);
      impactLight();
    }
  };

  const removeItem = (id) => {
    setGratitudeItems(gratitudeItems.filter((item) => item.id !== id));
  };

  const randomPrompt =
    gratitudePrompts[Math.floor(Math.random() * gratitudePrompts.length)];

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Gratitude Garden</Text>
        <TouchableOpacity onPress={() => setShowInput(true)}>
          <Plus color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.gameContent}>
        <View style={styles.gardenStats}>
          <Text style={styles.gardenCount}>
            {gratitudeItems.length} Seeds Planted
          </Text>
        </View>

        {gratitudeItems.length === 0 ? (
          <View style={styles.emptyGarden}>
            <Text style={styles.emptyGardenText}>Your garden is empty</Text>
            <Text style={styles.emptyGardenSubtext}>
              Start planting seeds of gratitude
            </Text>
            <TouchableOpacity
              style={styles.plantFirstSeed}
              onPress={() => setShowInput(true)}
            >
              <Text style={styles.plantFirstSeedText}>
                Plant Your First Seed
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.gratitudeList}
            showsVerticalScrollIndicator={false}
          >
            {gratitudeItems.map((item) => (
              <Animatable.View
                key={item.id}
                animation="fadeInUp"
                duration={500}
                style={styles.gratitudeItem}
              >
                <Text style={styles.gratitudeText}>{item.text}</Text>
                <Text style={styles.gratitudeDate}>{item.date}</Text>
                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  style={styles.removeItem}
                >
                  <X color={theme.colors.error} size={16} />
                </TouchableOpacity>
              </Animatable.View>
            ))}
          </ScrollView>
        )}

        {showInput && (
          <Modal transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, theme.glass]}>
                <Text style={styles.promptTitle}>{randomPrompt}</Text>
                <TextInput
                  style={styles.gratitudeInput}
                  multiline
                  placeholder="Express your gratitude..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={currentText}
                  onChangeText={setCurrentText}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowInput(false);
                      setCurrentText("");
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.plantButton}
                    onPress={addGratitudeItem}
                  >
                    <Text style={styles.plantButtonText}>Plant Seed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 6. AFFIRMATION CARDS GAME
// ------------------------------------------------------------
const AffirmationCards = ({ onBack }) => {
  const [currentCard, setCurrentCard] = useState(null);
  const [likedCards, setLikedCards] = useState([]);
  const [isFlipped, setIsFlipped] = useState(false);

  const affirmations = [
    "I am worthy of love and respect",
    "I choose to focus on what I can control",
    "I am capable of handling whatever comes",
    "I deserve peace and happiness",
    "I am growing and learning every day",
    "I trust my intuition and wisdom",
    "I am enough exactly as I am",
    "I choose to see the good in myself",
    "My feelings are valid and important",
    "I am proud of how far I've come",
  ];

  const drawNewCard = () => {
    const availableCards = affirmations.filter(
      (aff) => !likedCards.includes(aff),
    );
    const randomCard =
      availableCards.length > 0
        ? availableCards[Math.floor(Math.random() * availableCards.length)]
        : affirmations[Math.floor(Math.random() * affirmations.length)];

    setCurrentCard(randomCard);
    setIsFlipped(false);
    setTimeout(() => setIsFlipped(true), 100);
    impactLight();
  };

  const likeCard = () => {
    if (currentCard && !likedCards.includes(currentCard)) {
      setLikedCards([...likedCards, currentCard]);
      notifySuccess();
    }
  };

  useEffect(() => {
    drawNewCard();
  }, []);

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Daily Affirmations</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.gameContent}>
        <View style={styles.likedCount}>
          <Heart color={theme.colors.error} size={16} />
          <Text style={styles.likedCountText}>{likedCards.length} Saved</Text>
        </View>

        {currentCard && (
          <Animatable.View
            animation={isFlipped ? "flipInY" : "fadeIn"}
            duration={800}
            style={styles.affirmationCard}
          >
            <View style={styles.cardFront}>
              <Sparkles color={theme.colors.primary} size={32} />
              <Text style={styles.affirmationText}>{currentCard}</Text>
            </View>
          </Animatable.View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.likeButton} onPress={likeCard}>
            <Heart
              color={
                likedCards.includes(currentCard)
                  ? theme.colors.error
                  : theme.colors.text
              }
              size={24}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextCardButton} onPress={drawNewCard}>
            <RefreshCw color="white" size={20} />
          </TouchableOpacity>
        </View>

        <Text style={styles.affirmationTip}>
          Take a deep breath and repeat this affirmation to yourself.
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 7. STRESS RELIEF EXERCISES
// ------------------------------------------------------------
const StressReliefExercises = ({ onBack }) => {
  const [currentExercise, setCurrentExercise] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const exercises = [
    {
      id: "breathe",
      name: "Box Breathing",
      duration: 120,
      instructions: "Breathe in for 4s, hold for 4s, out for 4s, hold for 4s",
      steps: ["Inhale 4s", "Hold 4s", "Exhale 4s", "Hold 4s"],
      stepTime: 4,
    },
    {
      id: "progressive",
      name: "Progressive Relaxation",
      duration: 180,
      instructions: "Tense and relax each muscle group",
      steps: ["Tense", "Relax"],
      stepTime: 5,
    },
    {
      id: "grounding",
      name: "5-4-3-2-1 Grounding",
      duration: 60,
      instructions:
        "Notice: 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste",
      steps: [
        "5 things you see",
        "4 things you feel",
        "3 things you hear",
        "2 things you smell",
        "1 thing you taste",
      ],
      stepTime: 12,
    },
  ];

  const startExercise = (exercise) => {
    setCurrentExercise(exercise);
    setTimeLeft(exercise.duration);
    setIsRunning(true);
  };

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      notifySuccess();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Stress Relief</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.gameContent}>
        {currentExercise ? (
          <View style={styles.exerciseActive}>
            <Text style={styles.exerciseName}>{currentExercise.name}</Text>
            <Text style={styles.exerciseTimer}>{formatTime(timeLeft)}</Text>
            <Text style={styles.exerciseInstructions}>
              {currentExercise.instructions}
            </Text>

            <TouchableOpacity
              style={[
                styles.exerciseButton,
                isRunning && styles.exerciseButtonActive,
              ]}
              onPress={() => setIsRunning(!isRunning)}
            >
              <Text style={styles.exerciseButtonText}>
                {isRunning ? "Pause" : "Resume"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopExerciseButton}
              onPress={() => {
                setCurrentExercise(null);
                setIsRunning(false);
              }}
            >
              <Text style={styles.stopExerciseButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.exerciseList}>
            {exercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={[styles.exerciseCard, theme.glass]}
                onPress={() => startExercise(exercise)}
              >
                <Text style={styles.exerciseCardName}>{exercise.name}</Text>
                <Text style={styles.exerciseCardDuration}>
                  {Math.floor(exercise.duration / 60)} min
                </Text>
                <Text style={styles.exerciseCardDesc}>
                  {exercise.instructions}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 8. SLEEP TIMER
// ------------------------------------------------------------
const SleepTimer = ({ onBack }) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(600);

  const sleepDurations = [
    { label: "5 min", value: 300 },
    { label: "10 min", value: 600 },
    { label: "15 min", value: 900 },
    { label: "20 min", value: 1200 },
    { label: "30 min", value: 1800 },
  ];

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // In a real app, this would trigger sleep sounds or notifications
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    setIsRunning(true);
    setTimeLeft(selectedDuration);
  };

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Sleep Timer</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.gameContent}>
        <Moon color={theme.colors.primary} size={80} style={styles.sleepIcon} />

        <Text style={styles.sleepTitle}>Wind Down for Better Sleep</Text>

        <View style={styles.sleepTimerCircle}>
          <Text style={styles.sleepTimerText}>{formatTime(timeLeft)}</Text>
        </View>

        <View style={styles.sleepDurations}>
          {sleepDurations.map((duration) => (
            <TouchableOpacity
              key={duration.value}
              style={[
                styles.sleepDurationButton,
                selectedDuration === duration.value &&
                  styles.sleepDurationButtonSelected,
              ]}
              onPress={() => {
                setSelectedDuration(duration.value);
                setTimeLeft(duration.value);
                setIsRunning(false);
              }}
            >
              <Text
                style={[
                  styles.sleepDurationButtonText,
                  selectedDuration === duration.value &&
                    styles.sleepDurationButtonTextSelected,
                ]}
              >
                {duration.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.sleepStartButton,
            isRunning && styles.sleepStartButtonActive,
          ]}
          onPress={isRunning ? () => setIsRunning(false) : startTimer}
        >
          <Text style={styles.sleepStartButtonText}>
            {isRunning ? "Stop" : "Start Timer"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sleepTip}>
          Set a timer to help you wind down before sleep. Find a comfortable
          position and let go.
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 9. WATER REMINDER
// ------------------------------------------------------------
const WaterReminder = ({ onBack }) => {
  const [dailyGoal, setDailyGoal] = useState(8); // 8 glasses default
  const [currentIntake, setCurrentIntake] = useState(0);
  const [reminderInterval, setReminderInterval] = useState(60); // minutes
  const [lastDrink, setLastDrink] = useState(null);

  const addWater = () => {
    setCurrentIntake(currentIntake + 1);
    setLastDrink(new Date());
    impactLight();
  };

  const removeWater = () => {
    if (currentIntake > 0) {
      setCurrentIntake(currentIntake - 1);
    }
  };

  const resetDaily = () => {
    setCurrentIntake(0);
    setLastDrink(null);
  };

  const progress = (currentIntake / dailyGoal) * 100;

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Hydration Helper</Text>
        <TouchableOpacity onPress={resetDaily}>
          <RefreshCw color={theme.colors.text} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.gameContent}>
        <View style={styles.waterProgress}>
          <Text style={styles.waterProgressText}>
            {currentIntake} / {dailyGoal} glasses
          </Text>
          <View style={styles.waterProgressBar}>
            <View
              style={[
                styles.waterProgressFill,
                { width: `${Math.min(progress, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.waterProgressPercent}>
            {Math.round(progress)}%
          </Text>
        </View>

        <View style={styles.waterControls}>
          <TouchableOpacity
            style={styles.waterRemoveButton}
            onPress={removeWater}
          >
            <Minus color={theme.colors.text} size={24} />
          </TouchableOpacity>

          <View style={styles.waterGlass}>
            <Text style={styles.waterGlassText}>{currentIntake}</Text>
          </View>

          <TouchableOpacity style={styles.waterAddButton} onPress={addWater}>
            <Plus color="white" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.waterSettings}>
          <Text style={styles.settingsTitle}>Daily Goal</Text>
          <View style={styles.goalButtons}>
            {[6, 8, 10, 12].map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.goalButton,
                  dailyGoal === goal && styles.goalButtonSelected,
                ]}
                onPress={() => setDailyGoal(goal)}
              >
                <Text
                  style={[
                    styles.goalButtonText,
                    dailyGoal === goal && styles.goalButtonTextSelected,
                  ]}
                >
                  {goal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {lastDrink && (
          <Text style={styles.lastDrinkText}>
            Last drink: {lastDrink.toLocaleTimeString()}
          </Text>
        )}

        <Text style={styles.waterTip}>
          Stay hydrated! Aim for {dailyGoal} glasses of water throughout the
          day.
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// 10. MOOD TRACKER GAME
// ------------------------------------------------------------
const MoodTrackerGame = ({ onBack }) => {
  const [currentMood, setCurrentMood] = useState("");
  const [moodNote, setMoodNote] = useState("");
  const [moodHistory, setMoodHistory] = useState([]);
  const [showInput, setShowInput] = useState(false);

  const moods = [
    { emoji: "😊", name: "Happy", color: "#FFD700" },
    { emoji: "😌", name: "Calm", color: "#87CEEB" },
    { emoji: "😔", name: "Sad", color: "#708090" },
    { emoji: "😤", name: "Frustrated", color: "#FF6347" },
    { emoji: "😰", name: "Anxious", color: "#DDA0DD" },
    { emoji: "😴", name: "Tired", color: "#B0C4DE" },
    { emoji: "🤗", name: "Excited", color: "#FF69B4" },
    { emoji: "😐", name: "Neutral", color: "#D3D3D3" },
  ];

  const saveMoodEntry = () => {
    if (currentMood) {
      const entry = {
        id: Date.now(),
        mood: currentMood,
        note: moodNote,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
      };
      setMoodHistory([entry, ...moodHistory]);
      setCurrentMood("");
      setMoodNote("");
      setShowInput(false);
      notifySuccess();
    }
  };

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Mood Tracker</Text>
        <TouchableOpacity onPress={() => setShowInput(true)}>
          <Plus color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.gameContent}>
        {moodHistory.length === 0 ? (
          <View style={styles.emptyMoodState}>
            <Text style={styles.emptyMoodText}>Start tracking your mood</Text>
            <TouchableOpacity
              style={styles.startTrackingButton}
              onPress={() => setShowInput(true)}
            >
              <Text style={styles.startTrackingButtonText}>
                How are you feeling?
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.moodHistoryList}
            showsVerticalScrollIndicator={false}
          >
            {moodHistory.map((entry) => {
              const moodData = moods.find((m) => m.name === entry.mood);
              return (
                <Animatable.View
                  key={entry.id}
                  animation="fadeInUp"
                  duration={500}
                  style={[styles.moodEntry, theme.glass]}
                >
                  <Text style={styles.moodEmoji}>{moodData?.emoji}</Text>
                  <View style={styles.moodDetails}>
                    <Text style={styles.moodName}>{entry.mood}</Text>
                    <Text style={styles.moodTime}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </Text>
                    {entry.note && (
                      <Text style={styles.moodNoteText}>{entry.note}</Text>
                    )}
                  </View>
                </Animatable.View>
              );
            })}
          </ScrollView>
        )}

        {showInput && (
          <Modal transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, theme.glass]}>
                <Text style={styles.modalTitle}>How are you feeling?</Text>

                <View style={styles.moodSelection}>
                  {moods.map((mood) => (
                    <TouchableOpacity
                      key={mood.name}
                      style={[
                        styles.moodOption,
                        currentMood === mood.name && styles.moodOptionSelected,
                      ]}
                      onPress={() => setCurrentMood(mood.name)}
                    >
                      <Text style={styles.moodOptionEmoji}>{mood.emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.moodNoteInput}
                  multiline
                  placeholder="Add a note (optional)..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={moodNote}
                  onChangeText={setMoodNote}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowInput(false);
                      setCurrentMood("");
                      setMoodNote("");
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      !currentMood && styles.saveButtonDisabled,
                    ]}
                    onPress={saveMoodEntry}
                    disabled={!currentMood}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------------------------
// MAIN GAMES COMPONENT
// ------------------------------------------------------------
const Games = ({ navigation }) => {
  const [activeGame, setActiveGame] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(null);

  useEffect(() => {
    if (soundEnabled) {
      // Optional: Load background music or sound effects
    }
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, [soundEnabled]);

  const games = [
    {
      id: "breathe",
      name: "Breath Pacer Pro",
      desc: "Advanced 4-7-8 breathing with visual guide",
      icon: "🧘",
      color: "#4CAF50",
    },
    {
      id: "memory",
      name: "Zen Memory",
      desc: "Match pairs, beat your best time",
      icon: "🎴",
      color: "#9C27B0",
    },
    {
      id: "focus",
      name: "Focus Points",
      desc: "Reaction training & accuracy game",
      icon: "🎯",
      color: "#FF5722",
    },
    {
      id: "meditation",
      name: "Mindful Moments",
      desc: "Guided meditation with timer",
      icon: "🧘‍♀️",
      color: "#2196F3",
    },
    {
      id: "gratitude",
      name: "Gratitude Garden",
      desc: "Plant seeds of thankfulness daily",
      icon: "🌱",
      color: "#8BC34A",
    },
    {
      id: "moodtracker",
      name: "Mood Tracker",
      desc: "Track your emotional journey",
      icon: "😊",
      color: "#FF9800",
    },
    {
      id: "affirmations",
      name: "Daily Affirmations",
      desc: "Positive self-talk practice",
      icon: "✨",
      color: "#E91E63",
    },
    {
      id: "stressrelief",
      name: "Stress Relief",
      desc: "Quick tension release exercises",
      icon: "😌",
      color: "#00BCD4",
    },
    {
      id: "sleeptimer",
      name: "Sleep Timer",
      desc: "Wind down for better sleep",
      icon: "🌙",
      color: "#3F51B5",
    },
    {
      id: "waterreminder",
      name: "Hydration Helper",
      desc: "Stay hydrated with reminders",
      icon: "💧",
      color: "#009688",
    },
  ];

  const renderActiveGame = () => {
    switch (activeGame) {
      case "breathe":
        return <BreathPacer onBack={() => setActiveGame(null)} />;
      case "memory":
        return <MemoryMatch onBack={() => setActiveGame(null)} />;
      case "focus":
        return <FocusPoints onBack={() => setActiveGame(null)} />;
      case "meditation":
        return <MeditationTimer onBack={() => setActiveGame(null)} />;
      case "gratitude":
        return <GratitudeGarden onBack={() => setActiveGame(null)} />;
      case "moodtracker":
        return <MoodTrackerGame onBack={() => setActiveGame(null)} />;
      case "affirmations":
        return <AffirmationCards onBack={() => setActiveGame(null)} />;
      case "stressrelief":
        return <StressReliefExercises onBack={() => setActiveGame(null)} />;
      case "sleeptimer":
        return <SleepTimer onBack={() => setActiveGame(null)} />;
      case "waterreminder":
        return <WaterReminder onBack={() => setActiveGame(null)} />;
      default:
        return null;
    }
  };

  if (activeGame) {
    return renderActiveGame();
  }

  return (
    <LinearGradient
      colors={theme.colors.gradientCalm}
      style={styles.mainContainer}
    >
      {navigation?.canGoBack && navigation.canGoBack() && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.navBack}
        >
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
      )}

      <Animatable.View animation="fadeInDown" style={styles.headerSection}>
        <Text style={styles.mainTitle}>🎮 Mindful Playground</Text>
        <Text style={styles.mainSubtitle}>
          Therapeutic games for mental wellness
        </Text>
      </Animatable.View>

      <Animatable.View
        animation="fadeInUp"
        delay={200}
        style={styles.gamesList}
      >
        {games.map((game, idx) => (
          <TouchableOpacity
            key={game.id}
            style={[
              styles.gameCard,
              { borderLeftColor: game.color, borderLeftWidth: 4 },
            ]}
            onPress={() => {
              void impactLight();
              setActiveGame(game.id);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.gameIconContainer,
                { backgroundColor: game.color + "20" },
              ]}
            >
              <Text style={styles.gameIconEmoji}>{game.icon}</Text>
            </View>
            <View style={styles.gameDetails}>
              <Text style={styles.gameNameText}>{game.name}</Text>
              <Text style={styles.gameDescText}>{game.desc}</Text>
            </View>
            <Gamepad2 color={theme.colors.primary} size={24} />
          </TouchableOpacity>
        ))}
      </Animatable.View>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          🎵 Play with sound for best experience
        </Text>
      </View>
    </LinearGradient>
  );
};

// ------------------------------------------------------------
// ENHANCED STYLESHEET
// ------------------------------------------------------------
const styles = StyleSheet.create({
  // Main Container
  mainContainer: { flex: 1, padding: 24, paddingTop: 60 },
  navBack: { position: "absolute", top: 50, left: 20, zIndex: 10 },
  headerSection: { marginTop: 40, marginBottom: 30 },
  mainTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
  },
  mainSubtitle: { fontSize: 16, color: theme.colors.textSecondary },
  gamesList: { flex: 1, gap: 16 },

  // Game Cards
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(10px)",
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  gameIconContainer: { padding: 12, borderRadius: 20 },
  gameIconEmoji: { fontSize: 40 },
  gameDetails: { flex: 1 },
  gameNameText: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
  },
  gameDescText: { fontSize: 13, color: theme.colors.textSecondary },
  footerNote: { paddingVertical: 20, alignItems: "center" },
  footerText: { color: theme.colors.textSecondary, fontSize: 12 },

  // Common Game Styles
  gameContainer: { flex: 1 },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  gameTitle: { fontSize: 22, fontWeight: "700", color: "white" },
  infoBtn: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  gameCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  // Breath Pacer Styles
  breathCircleContainer: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 30,
  },
  progressRing: {
    position: "absolute",
    borderWidth: 6,
    borderColor: "transparent",
  },
  phaseMainText: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    zIndex: 10,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: "900",
    color: "white",
    marginTop: 10,
    zIndex: 10,
  },
  instructionText: {
    fontSize: 18,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 40,
    textAlign: "center",
  },
  statsContainer: { flexDirection: "row", gap: 30, marginBottom: 50 },
  statBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statLabel: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  statValue: { color: "white", fontSize: 28, fontWeight: "700" },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  stopBtn: { backgroundColor: "#FF5252" },
  actionBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },

  // Memory Match Styles
  statsBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 6,
  },
  statBadgeText: { color: "white", fontSize: 14, fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    padding: 10,
    maxWidth: width - 40,
  },
  card: {
    width: width * 0.2,
    height: width * 0.2,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.05)",
    backfaceVisibility: "hidden",
  },
  cardFlipped: { backgroundColor: "white", borderColor: theme.colors.primary },
  cardBack: {
    width: "40%",
    height: "40%",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  winOverlay: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    zIndex: 20,
    width: width * 0.8,
  },
  winTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.success,
    marginTop: 16,
  },
  winSubtitle: { fontSize: 16, color: "white", marginTop: 8, marginBottom: 24 },
  playAgainBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 40,
  },
  playAgainText: { color: "white", fontWeight: "700" },

  // Focus Points Styles
  startCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 40,
    padding: 30,
    alignItems: "center",
    width: width * 0.85,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    marginTop: 16,
  },
  startDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 8,
  },
  scorePreview: {
    flexDirection: "row",
    gap: 20,
    marginTop: 24,
    marginBottom: 30,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
  },
  previewText: { color: "white", fontSize: 14, fontWeight: "600" },
  startGameBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 40,
    marginTop: 10,
  },
  startGameText: { color: "white", fontWeight: "800", fontSize: 16 },
  gameStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    marginTop: 20,
  },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  statPillText: { color: "white", fontSize: 18, fontWeight: "700" },
  targetOrb: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  targetInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1e1e2e",
    borderRadius: 30,
    padding: 30,
    width: width * 0.8,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 40,
    marginTop: 20,
  },
  modalButtonText: { color: "white", fontWeight: "700" },

  // Meditation Timer Styles
  meditationCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  timerText: { fontSize: 48, fontWeight: "800", color: "white" },
  durationButtons: { flexDirection: "row", gap: 10, marginBottom: 30 },
  durationButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  durationButtonSelected: { backgroundColor: theme.colors.primary },
  durationButtonText: { color: "white", fontSize: 14, fontWeight: "600" },
  durationButtonTextSelected: { color: "white" },
  timerControls: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: theme.colors.success,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  pauseButton: {
    backgroundColor: theme.colors.warning,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  meditationTip: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
  },

  // Gratitude Garden Styles
  gardenStats: { alignItems: "center", marginBottom: 20 },
  gardenCount: { fontSize: 18, fontWeight: "600", color: theme.colors.primary },
  emptyGarden: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyGardenText: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginBottom: 10,
  },
  emptyGardenSubtext: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 30,
  },
  plantFirstSeed: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
  },
  plantFirstSeedText: { color: "white", fontWeight: "700" },
  gratitudeList: { flex: 1 },
  gratitudeItem: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    position: "relative",
  },
  gratitudeText: { fontSize: 16, color: "white", marginBottom: 8 },
  gratitudeDate: { fontSize: 12, color: theme.colors.textSecondary },
  removeItem: { position: "absolute", top: 10, right: 10 },
  promptTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 20,
    textAlign: "center",
  },
  gratitudeInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 15,
    color: "white",
    minHeight: 100,
    textAlignVertical: "top",
    width: "100%",
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  cancelButtonText: { color: "white", fontWeight: "600" },
  plantButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  plantButtonText: { color: "white", fontWeight: "700" },

  // Affirmation Cards Styles
  likedCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  likedCountText: { color: theme.colors.textSecondary, fontSize: 14 },
  affirmationCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    marginBottom: 30,
  },
  cardFront: { alignItems: "center" },
  affirmationText: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginTop: 20,
  },
  cardActions: { flexDirection: "row", gap: 20, alignItems: "center" },
  likeButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  nextCardButton: {
    backgroundColor: theme.colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  affirmationTip: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 20,
  },

  // Stress Relief Styles
  exerciseActive: { flex: 1, justifyContent: "center", alignItems: "center" },
  exerciseName: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    marginBottom: 20,
  },
  exerciseTimer: {
    fontSize: 48,
    fontWeight: "800",
    color: theme.colors.primary,
    marginBottom: 20,
  },
  exerciseInstructions: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  exerciseButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 20,
  },
  exerciseButtonActive: { backgroundColor: theme.colors.warning },
  exerciseButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  stopExerciseButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  stopExerciseButtonText: { color: "white", fontWeight: "600" },
  exerciseList: { flex: 1, gap: 16 },
  exerciseCard: { padding: 20, borderRadius: 16, marginBottom: 16 },
  exerciseCardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  exerciseCardDuration: {
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  exerciseCardDesc: { fontSize: 14, color: theme.colors.textSecondary },

  // Sleep Timer Styles
  sleepIcon: { alignSelf: "center", marginBottom: 20 },
  sleepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
    marginBottom: 30,
  },
  sleepTimerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  sleepTimerText: { fontSize: 42, fontWeight: "800", color: "white" },
  sleepDurations: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 30,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  sleepDurationButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  sleepDurationButtonSelected: { backgroundColor: theme.colors.primary },
  sleepDurationButtonText: { color: "white", fontSize: 14, fontWeight: "600" },
  sleepDurationButtonTextSelected: { color: "white" },
  sleepStartButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 20,
  },
  sleepStartButtonActive: { backgroundColor: theme.colors.warning },
  sleepStartButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  sleepTip: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
  },

  // Water Reminder Styles
  waterProgress: { alignItems: "center", marginBottom: 30 },
  waterProgressText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 10,
  },
  waterProgressBar: {
    width: "80%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    marginBottom: 10,
  },
  waterProgressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  waterProgressPercent: { fontSize: 16, color: theme.colors.textSecondary },
  waterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 30,
  },
  waterRemoveButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  waterGlass: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  waterGlassText: { fontSize: 24, fontWeight: "800", color: "white" },
  waterAddButton: {
    backgroundColor: theme.colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  waterSettings: { alignItems: "center", marginBottom: 20 },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  goalButtons: { flexDirection: "row", gap: 10 },
  goalButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  goalButtonSelected: { backgroundColor: theme.colors.primary },
  goalButtonText: { color: "white", fontWeight: "600" },
  goalButtonTextSelected: { color: "white" },
  lastDrinkText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  waterTip: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
  },

  // Mood Tracker Styles
  emptyMoodState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyMoodText: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginBottom: 10,
  },
  startTrackingButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
  },
  startTrackingButtonText: { color: "white", fontWeight: "700" },
  moodHistoryList: { flex: 1 },
  moodEntry: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  moodEmoji: { fontSize: 32, marginRight: 16 },
  moodDetails: { flex: 1 },
  moodName: { fontSize: 16, fontWeight: "700", color: "white" },
  moodTime: { fontSize: 12, color: theme.colors.textSecondary },
  moodNoteText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  moodSelection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  moodOption: {
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  moodOptionSelected: { backgroundColor: theme.colors.primary },
  moodOptionEmoji: { fontSize: 24 },
  moodNoteInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 15,
    color: "white",
    minHeight: 80,
    textAlignVertical: "top",
    width: "100%",
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
  },
  saveButtonDisabled: { backgroundColor: "rgba(255,255,255,0.1)" },
  saveButtonText: { color: "white", fontWeight: "700" },
});

export default Games;
