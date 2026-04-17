import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  Coins,
  CheckCircle2,
  Circle,
  Wind,
  Scan,
  Flower,
  Smile,
  Compass,
  Music,
  BookOpen,
  Gamepad2,
  MessageCircle,
  PenTool,
  TrendingUp,
  Brain,
  Activity,
  Award,
  Zap,
  Heart,
} from "lucide-react-native";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";

import useUserData from "../hooks/useUserData";
import theme from "../styles/theme";
import FAST_storage from "../utils/FAST_storage";

const { width } = Dimensions.get("window");

// Storage key removed - using centralized storage

// Helper: get today's date in YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().split("T")[0];

const DEFAULT_DASHBOARD_TODOS = [
  { id: "1", text: "Morning meditation", done: false },
  { id: "2", text: "Drink 3L water", done: false },
  { id: "3", text: "Journal for 5 min", done: false },
];

/** Normalize persisted stats so todos / logs are always safe arrays (fixes corrupt or legacy storage). */
function coerceTodos(rawTodos) {
  let list = rawTodos;
  if (!Array.isArray(list)) {
    if (list && typeof list === "object") {
      list = Object.values(list);
    } else {
      list = [];
    }
  }
  const mapped = list
    .map((t, i) => {
      if (!t || typeof t !== "object") return null;
      return {
        id: String(t.id != null ? t.id : `todo-${i}`),
        text: typeof t.text === "string" ? t.text : String(t.text ?? "Task"),
        done: Boolean(t.done),
      };
    })
    .filter(Boolean);
  return mapped.length > 0 ? mapped : [...DEFAULT_DASHBOARD_TODOS];
}

function normalizeDashboardData(raw, reduxUser) {
  const base = raw && typeof raw === "object" ? raw : {};
  const u = reduxUser?.user ?? {};

  const profile =
    base.profile && typeof base.profile === "object" ? { ...base.profile } : {};
  if (!profile.name || typeof profile.name !== "string") {
    profile.name = u.name || "Explorer";
  }
  if (!profile.joinDate) profile.joinDate = getTodayDate();

const safeLogs = Array.isArray(base.dailyLogs) ? base.dailyLogs : [];
  const dailyLogs = safeLogs
    .slice(-365)  // Limit to last year for perf
    .map((log) => {
      if (!log || typeof log !== "object") {
        return {
          date: getTodayDate(),
          moodScore: 0,
          completedTodosCount: 0,
          focusCompleted: false,
          featureInteractions: [],
        };
      }
      return {
        date: typeof log.date === "string" ? log.date : getTodayDate(),
        moodScore: Number(log.moodScore) || 0,
        completedTodosCount: Number(log.completedTodosCount) || 0,
        focusCompleted: Boolean(log.focusCompleted),
        featureInteractions: Array.isArray(log.featureInteractions)
          ? log.featureInteractions.slice(0, 50)  // Limit array length
          : [],
      };
    });

  const streakData =
    base.streakData && typeof base.streakData === "object"
      ? {
          currentStreak: Number(base.streakData.currentStreak) || 0,
          longestStreak: Number(base.streakData.longestStreak) || 0,
          lastActivityDate: base.streakData.lastActivityDate ?? null,
        }
      : { currentStreak: 0, longestStreak: 0, lastActivityDate: null };

  const pointsRaw = Number(base.points);
  const points = Number.isFinite(pointsRaw) ? pointsRaw : 120;

  return {
    profile,
    todos: coerceTodos(base.todos),
    focus: typeof base.focus === "string" ? base.focus : "Mindful breathing",
    points,
    streakData,
    dailyLogs,
    chakraSessions: Array.isArray(base.chakraSessions)
      ? base.chakraSessions
      : [],
    journalEntries: Number(base.journalEntries) || 0,
  };
}

function ensureTodayLog(data) {
  if (!data || typeof data !== "object") return data;
  const today = getTodayDate();
  const logs = Array.isArray(data.dailyLogs) ? [...data.dailyLogs] : [];
  if (!logs.some((log) => log && log.date === today)) {
    logs.push({
      date: today,
      moodScore: 0,
      completedTodosCount: 0,
      focusCompleted: false,
      featureInteractions: [],
    });
  }
  return { ...data, dailyLogs: logs };
}

// Helper: format date for display
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

// Helper: get last N days (including today)
const getLastNDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split("T")[0]);
  }
  return days;
};

// Helper: calculate streak from daily logs (consecutive days with any activity)
  const calculateStreak = useCallback((dailyLogs) => {
    if (!Array.isArray(dailyLogs) || !dailyLogs.length) return 0;

    const today = getTodayDate();
    const logsMap = new Map(dailyLogs.slice(-90).map(log => [log.date, log])); // 90 days max

    let streak = 0;
    const currentDate = new Date(today);
    const MAX_ITERATIONS = 90; // Fast: 3 months max
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const log = logsMap.get(dateStr);
      const hasActivity = log && (
        log.completedTodosCount > 0 ||
        log.moodScore > 0 ||
        log.focusCompleted
      );

      if (hasActivity) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
      iterations++;
    }
    return streak;
  }, []);

// Helper: get mood trend (last 7 days)
const getMoodTrend = (dailyLogs) => {
  if (!Array.isArray(dailyLogs)) return [];
  const last7Days = getLastNDays(7);
  const logsMap = new Map(dailyLogs.map((log) => [log.date, log]));

  return last7Days.map((date) => ({
    date,
    mood: logsMap.get(date)?.moodScore || 0,
    displayDate: formatDate(date),
  }));
};

// Helper: get weekly completion rate
const getWeeklyCompletionRate = (todos, dailyLogs) => {
  const safeTodos = Array.isArray(todos) ? todos : [];
  const safeLogs = Array.isArray(dailyLogs) ? dailyLogs : [];
  const last7Days = getLastNDays(7);
  const logsMap = new Map(safeLogs.map((log) => [log.date, log]));
  const totalTodos = safeTodos.length;

  if (totalTodos === 0) return 0;

  let totalCompleted = 0;
  for (const date of last7Days) {
    totalCompleted += logsMap.get(date)?.completedTodosCount || 0;
  }

  return Math.round((totalCompleted / (totalTodos * 7)) * 100);
};

// Helper: get insight suggestions based on data
const getInsights = (dailyLogs, todos, focus) => {
  const insights = [];
  const safeTodos = Array.isArray(todos) ? todos : [];
  const safeLogs = Array.isArray(dailyLogs) ? dailyLogs : [];
  const last7Moods = getMoodTrend(safeLogs).filter((m) => m.mood > 0);
  const avgMood = last7Moods.length
    ? last7Moods.reduce((a, b) => a + b.mood, 0) / last7Moods.length
    : 0;

  // Mood insight
  if (avgMood < 3) {
    insights.push({
      icon: Heart,
      text: "Your mood has been low this week. Try Chakra Breathing to center yourself.",
      color: theme.colors.heart,
    });
  } else if (avgMood > 4) {
    insights.push({
      icon: Award,
      text: "Great emotional week! Your positivity is radiating.",
      color: theme.colors.success,
    });
  }

  // Todo completion insight
  const completionRate = getWeeklyCompletionRate(safeTodos, safeLogs);
  if (completionRate < 30) {
    insights.push({
      icon: Zap,
      text: "Small steps matter. Try completing just one task today.",
      color: theme.colors.solar,
    });
  } else if (completionRate > 70) {
    insights.push({
      icon: TrendingUp,
      text: "Excellent productivity! You're building powerful habits.",
      color: theme.colors.success,
    });
  }

  // Focus insight
  if (focus) {
    insights.push({
      icon: Brain,
      text: `Your focus: "${focus}". Break it into small wins.`,
      color: theme.colors.thirdEye,
    });
  }

  // Chakra suggestion
  insights.push({
    icon: Wind,
    text: "Balance your root chakra with grounding meditation today.",
    color: theme.colors.sacral,
  });

  return insights.slice(0, 3);
};

// Helper: get chakra balance score (based on feature usage)
const getChakraBalance = (dailyLogs) => {
  if (!Array.isArray(dailyLogs)) return 50;
  // Simulate chakra balance based on mood and activity
  const last7Moods = getMoodTrend(dailyLogs).filter((m) => m.mood > 0);
  const avgMood = last7Moods.length
    ? last7Moods.reduce((a, b) => a + b.mood, 0) / last7Moods.length
    : 3;
  const balance = Math.min(100, Math.max(20, Math.round(avgMood * 20)));
  return balance;
};

// Features grid data
const FEATURES = [
  {
    id: "chakra",
    name: "Chakra Breathing",
    icon: Wind,
    color: theme.colors.heart,
  },
  { id: "mood", name: "Mood Scanner", icon: Scan, color: theme.colors.throat },
  {
    id: "yoga",
    name: "Yoga & Meditation",
    icon: Flower,
    color: theme.colors.sacral,
  },
  { id: "memes", name: "Daily Memes", icon: Smile, color: theme.colors.solar },
  { id: "vr", name: "VR Rooms", icon: Compass, color: theme.colors.crown },
  {
    id: "music",
    name: "Healing Music",
    icon: Music,
    color: theme.colors.thirdEye,
  },
  {
    id: "journal",
    name: "Daily Journal",
    icon: PenTool,
    color: theme.colors.primary,
  },
  {
    id: "books",
    name: "Spiritual Books",
    icon: BookOpen,
    color: theme.colors.secondary,
  },
  {
    id: "games",
    name: "Relaxing Games",
    icon: Gamepad2,
    color: theme.colors.success,
  },
];

export default function Dashboard() {
  const navigation = useNavigation();
  const { user } = useUserData();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [selectedMood, setSelectedMood] = useState(null);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data to storage whenever it changes
  useEffect(() => {
    if (data) {
      saveData();
    }
  }, [data]);

// Skeleton loads instantly, heavy compute async
  const SKELETON_DATA = {
    profile: { name: 'Sanctuary', joinDate: getTodayDate() },
    todos: DEFAULT_DASHBOARD_TODOS,
    focus: 'Loading your personalized plan...',
    points: 120,
    streakData: { currentStreak: 0, longestStreak: 0 },
    dailyLogs: [],
    chakraSessions: [],
    journalEntries: 0,
    ready: false, // Compute flag
  };

  // Show skeleton immediately
  useEffect(() => {
    setData(SKELETON_DATA);
    setLoading(false); // Unblock UI instantly
  }, []);

  // Background: FAST_storage + normalize after skeleton shows
  useEffect(() => {
    let cancelled = false;
    
    const computeData = async () => {
      try {
        const rawStats = await FAST_storage.getStats(); // <500ms w/ skeleton
        if (cancelled) return;
        
        const normalized = ensureTodayLog(normalizeDashboardData(rawStats, user));
        if (cancelled) return;
        
        setData(prev => ({ ...normalized, ready: true }));
      } catch (e) {
        console.warn('Dashboard compute fallback:', e);
        setData(prev => ({ ...SKELETON_DATA, ready: true }));
      }
    };
    
    computeData();
    
    return () => { cancelled = true; };
  }, [user]);

  const saveData = async () => {
    try {
      await FAST_storage.saveStats(data);
    } catch (error) {
      console.error("Failed to save dashboard data:", error);
    }
  };

  // Update daily log for today
  const updateTodayLog = useCallback(
    (updates) => {
      if (!data) return;
      const today = getTodayDate();
      const prevLogs = Array.isArray(data.dailyLogs) ? data.dailyLogs : [];
      const existingLogIndex = prevLogs.findIndex((log) => log.date === today);
      const updatedLogs = [...prevLogs];

      if (existingLogIndex >= 0) {
        updatedLogs[existingLogIndex] = {
          ...updatedLogs[existingLogIndex],
          ...updates,
        };
      } else {
        updatedLogs.push({
          date: today,
          moodScore: 0,
          completedTodosCount: 0,
          focusCompleted: false,
          featureInteractions: [],
          ...updates,
        });
      }

      // Recalculate streak after updating log
      const newStreak = calculateStreak(updatedLogs);
      const longestStreak = Math.max(newStreak, data.streakData.longestStreak);

      setData((prev) => ({
        ...prev,
        dailyLogs: updatedLogs,
        streakData: {
          currentStreak: newStreak,
          longestStreak,
          lastActivityDate: today,
        },
      }));
    },
    [data],
  );

  // Toggle todo completion
  const toggleTodo = useCallback(
    (todoId) => {
      if (!data) return;

      const prevTodos = Array.isArray(data.todos) ? data.todos : [];
      const updatedTodos = prevTodos.map((todo) =>
        todo.id === todoId ? { ...todo, done: !todo.done } : todo,
      );

      // Update today's completed todos count
      const completedCount = updatedTodos.filter((todo) => todo.done).length;
      updateTodayLog({ completedTodosCount: completedCount });

      // Award points for completing a todo
      const wasCompleted = prevTodos.find((t) => t.id === todoId)?.done;
      if (!wasCompleted && updatedTodos.find((t) => t.id === todoId)?.done) {
        setData((prev) => ({ ...prev, points: prev.points + 10 }));
      } else if (
        wasCompleted &&
        !updatedTodos.find((t) => t.id === todoId)?.done
      ) {
        setData((prev) => ({ ...prev, points: prev.points - 10 }));
      }

      setData((prev) => ({ ...prev, todos: updatedTodos }));
    },
    [data, updateTodayLog],
  );

  // Add new todo
  const addTodo = useCallback(() => {
    if (!newTodoText.trim()) return;
    const newTodo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      done: false,
    };
    setData((prev) => ({
      ...prev,
      todos: [...(Array.isArray(prev.todos) ? prev.todos : []), newTodo],
    }));
    setNewTodoText("");
  }, [newTodoText]);

  // Complete today's focus
  const completeFocus = useCallback(() => {
    if (!data) return;
    const logs = Array.isArray(data.dailyLogs) ? data.dailyLogs : [];
    const todayLog = logs.find((log) => log.date === getTodayDate());
    if (todayLog?.focusCompleted) {
      Alert.alert(
        "Already Completed",
        "You've already completed today's focus. Great job!",
      );
      return;
    }
    updateTodayLog({ focusCompleted: true });
    setData((prev) => ({ ...prev, points: prev.points + 25 }));
    Alert.alert("🎉 Amazing!", "Focus completed! +25 points");
  }, [data, updateTodayLog]);

  // Set mood for today
  const setMood = useCallback(
    (score) => {
      if (!data) return;
      updateTodayLog({ moodScore: score });
      setMoodModalVisible(false);
      setSelectedMood(null);
      Alert.alert(
        "Mood Recorded",
        "Thank you for checking in. Your awareness grows.",
      );
    },
    [data, updateTodayLog],
  );

  // Log chakra session
  const logChakraSession = useCallback(() => {
    setData((prev) => ({
      ...prev,
      chakraSessions: [
        ...(prev.chakraSessions || []),
        { date: getTodayDate(), type: "breathing" },
      ],
      points: prev.points + 15,
    }));
    Alert.alert("🧘‍♀️ Session Logged", "+15 points for your practice");
  }, [data]);

  // Log journal entry (simulated)
  const logJournalEntry = useCallback(() => {
    setData((prev) => ({
      ...prev,
      journalEntries: (prev.journalEntries || 0) + 1,
      points: prev.points + 20,
    }));
    Alert.alert("📝 Journal Entry", "Your words hold power. +20 points");
  }, [data]);

  // Memoized analytics
const analytics = useMemo(() => {
    if (!data) return null;

    const safeTodos = Array.isArray(data.todos) ? data.todos : [];
    const safeDailyLogs = Array.isArray(data.dailyLogs) ? data.dailyLogs : [];

    const moodTrend = getMoodTrend(safeDailyLogs);
    const completionRate = getWeeklyCompletionRate(safeTodos, safeDailyLogs);
    const chakraBalance = getChakraBalance(safeDailyLogs);
    const insights = getInsights(safeDailyLogs, safeTodos, data.focus);
    const activeTodos = safeTodos.filter((t) => !t.done).length;
    const todayLog = safeDailyLogs.find((log) => log?.date === getTodayDate()) || {};
    const completedTodosToday = Number(todayLog.completedTodosCount) || 0;

    return {
      moodTrend,
      completionRate,
      chakraBalance,
      insights,
      activeTodos,
      completedTodosToday,
      totalTodos: safeTodos.length,
    };
  }, [data?.dailyLogs?.length, data?.todos?.length, data?.focus]);  // Stable deps

  // Unified navigation handler
  const handleNavigate = (featureId) => {
    const routeMap = {
      chakra: "Chakra",
      mood: "Mood",
      yoga: "Yoga",
      memes: "ReliefMemes",
      vr: "ReliefVR",
      music: "ReliefMusic",
      journal: "Journal",
      books: "ReliefBooks",
      games: "Games",
      ai_chat: "AI Chat",
    };
    const routeName = routeMap[featureId];
    if (routeName) {
      navigation.navigate(routeName);
    }
  };

  // No blocking loading - skeleton always shows
  if (!data) return null;

  const isSkeleton = !data.ready;
  const dailyLogsSafe = Array.isArray(data.dailyLogs) ? data.dailyLogs : [];
  const todosSafe = Array.isArray(data.todos) ? data.todos : [];
  const todayLog = dailyLogsSafe.find((log) => log.date === getTodayDate()) || {
    moodScore: 0,
    focusCompleted: false,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.colors.gradientCalm}
        style={styles.background}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome Back,</Text>
              <Text style={styles.userName}>{data.profile.name}</Text>
            </View>
            <View style={styles.stats}>
              <View style={styles.statChip}>
                <Flame
                  color={theme.colors.accent}
                  size={20}
                  fill={theme.colors.accent}
                />
                <Text style={styles.statText}>
                  {data.streakData.currentStreak} Day Streak
                </Text>
              </View>
              <View style={styles.statChip}>
                <Coins color={theme.colors.solar} size={20} />
                <Text style={styles.statText}>{data.points}</Text>
              </View>
            </View>
          </View>

          {/* Today's Focus Card */}
          <View style={[styles.focusCard, theme.glass]}>
            <View style={styles.focusHeader}>
              <Text style={styles.focusLabel}>Today's Focus</Text>
              {!todayLog.focusCompleted ? (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={completeFocus}
                >
                  <Text style={styles.completeButtonText}>Complete</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedBadge}>
                  <CheckCircle2 color={theme.colors.success} size={16} />
                  <Text style={styles.completedText}>Done</Text>
                </View>
              )}
            </View>
            <Text style={styles.focusTitle}>{data.focus}</Text>
            <Text style={styles.focusSub}>
              Personalized healing plan based on your history.
            </Text>
          </View>

          {/* Quick Mood Check-in */}
          <TouchableOpacity
            style={[styles.moodCard, theme.glass]}
            onPress={() => setMoodModalVisible(true)}
          >
            <View style={styles.moodCardContent}>
              <Heart color={theme.colors.heart} size={24} />
              <View>
                <Text style={styles.moodCardTitle}>
                  How are you feeling today?
                </Text>
                <Text style={styles.moodCardSub}>
                  {todayLog.moodScore > 0
                    ? `You rated: ${"❤️".repeat(todayLog.moodScore)}`
                    : "Tap to check in"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* To-Do List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Checklist</Text>
            {todosSafe.map((todo) => (
              <TouchableOpacity
                key={todo.id}
                style={[styles.todoItem, todo.done && styles.todoDone]}
                onPress={() => toggleTodo(todo.id)}
              >
                {todo.done ? (
                  <CheckCircle2 color={theme.colors.success} size={24} />
                ) : (
                  <Circle color={theme.colors.textSecondary} size={24} />
                )}
                <Text
                  style={[styles.todoText, todo.done && styles.todoTextDone]}
                >
                  {todo.text}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.addTodoContainer}>
              <TextInput
                style={styles.addTodoInput}
                placeholder="Add a new task..."
                placeholderTextColor={theme.colors.textSecondary + "80"}
                value={newTodoText}
                onChangeText={setNewTodoText}
                onSubmitEditing={addTodo}
              />
              <TouchableOpacity style={styles.addTodoButton} onPress={addTodo}>
                <Text style={styles.addTodoButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Analytics Dashboard */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deep Insights</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, theme.glass]}>
                <Activity color={theme.colors.throat} size={24} />
                <Text style={styles.statCardValue}>
                  {analytics.completionRate}%
                </Text>
                <Text style={styles.statCardLabel}>Weekly Progress</Text>
              </View>
              <View style={[styles.statCard, theme.glass]}>
                <Brain color={theme.colors.thirdEye} size={24} />
                <Text style={styles.statCardValue}>
                  {analytics.chakraBalance}%
                </Text>
                <Text style={styles.statCardLabel}>Chakra Balance</Text>
              </View>
              <View style={[styles.statCard, theme.glass]}>
                <Award color={theme.colors.solar} size={24} />
                <Text style={styles.statCardValue}>
                  {data.streakData.longestStreak}
                </Text>
                <Text style={styles.statCardLabel}>Best Streak</Text>
              </View>
            </View>

            {/* Mood Trend Chart */}
            <View style={[styles.chartCard, theme.glass]}>
              <Text style={styles.chartTitle}>Mood Timeline (7 Days)</Text>
              <View style={styles.moodBars}>
                {analytics.moodTrend.map((item, idx) => (
                  <View key={idx} style={styles.moodBarContainer}>
                    <View
                      style={[
                        styles.moodBar,
                        {
                          height: item.mood * 12,
                          backgroundColor:
                            theme.colors.heart + (item.mood > 0 ? "CC" : "40"),
                        },
                      ]}
                    />
                    <Text style={styles.moodBarLabel}>
                      {item.displayDate.split(" ")[0]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Insights Cards */}
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>Personalized Guidance</Text>
              {analytics.insights.map((insight, idx) => (
                <View key={idx} style={[styles.insightCard, theme.glass]}>
                  <insight.icon color={insight.color} size={20} />
                  <Text style={styles.insightText}>{insight.text}</Text>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={logChakraSession}
              >
                <Wind color={theme.colors.heart} size={20} />
                <Text style={styles.quickActionText}>Log Breathing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={logJournalEntry}
              >
                <PenTool color={theme.colors.primary} size={20} />
                <Text style={styles.quickActionText}>Journal Entry</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feature Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explore Moodverse</Text>
            <View style={styles.grid}>
              {FEATURES.map((feature) => (
                <TouchableOpacity
                  key={feature.id}
                  style={[styles.featureCard, theme.glass]}
                  onPress={() => handleNavigate(feature.id)}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: feature.color + "20" },
                    ]}
                  >
                    <feature.icon color={feature.color} size={28} />
                  </View>
                  <Text
                    style={
                      feature.id === "yoga"
                        ? { ...styles.featureName, fontSize: 11 }
                        : styles.featureName
                    }
                  >
                    {feature.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* AI Chat Floating Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => handleNavigate("ai_chat")}
        >
          <LinearGradient
            colors={["#6C63FF", "#4A00E0"]}
            style={styles.fabGradient}
          >
            <MessageCircle color="white" size={28} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Mood Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={moodModalVisible}
          onRequestClose={() => setMoodModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, theme.glass]}>
              <Text style={styles.modalTitle}>How are you feeling?</Text>
              <View style={styles.moodOptions}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <TouchableOpacity
                    key={score}
                    style={[
                      styles.moodOption,
                      selectedMood === score && styles.moodOptionSelected,
                    ]}
                    onPress={() => setSelectedMood(score)}
                  >
                    <Text style={styles.moodEmoji}>
                      {score === 1
                        ? "😢"
                        : score === 2
                          ? "😕"
                          : score === 3
                            ? "😐"
                            : score === 4
                              ? "🙂"
                              : "😄"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setMoodModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalConfirm,
                    !selectedMood && styles.modalConfirmDisabled,
                  ]}
                  onPress={() => selectedMood && setMood(selectedMood)}
                  disabled={!selectedMood}
                >
                  <Text style={styles.modalConfirmText}>Save Mood</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, paddingTop: 60 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: { color: theme.colors.text, marginTop: 16, fontSize: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  userName: { color: theme.colors.text, fontSize: 28, fontWeight: "800" },
  stats: { alignItems: "flex-end", gap: 8 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statText: { color: theme.colors.text, fontWeight: "700", fontSize: 14 },
  focusCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  focusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  focusLabel: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  completeButton: {
    backgroundColor: theme.colors.success + "30",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  completeButtonText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.success + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  completedText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: "600",
  },
  focusTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  focusSub: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  moodCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  moodCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moodCardTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "600" },
  moodCardSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 16,
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
    gap: 12,
  },
  todoDone: { opacity: 0.6 },
  todoText: { color: theme.colors.text, fontSize: 16, fontWeight: "500" },
  todoTextDone: { textDecorationLine: "line-through" },
  addTodoContainer: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  addTodoInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: theme.borderRadius.md,
    padding: 14,
    color: theme.colors.text,
    fontSize: 16,
  },
  addTodoButton: {
    backgroundColor: theme.colors.primary,
    width: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  addTodoButtonText: { color: "white", fontSize: 24, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
  },
  statCardValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 8,
  },
  statCardLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  chartCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  chartTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  moodBars: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 80,
  },
  moodBarContainer: {
    alignItems: "center",
    width: 30,
  },
  moodBar: {
    width: 24,
    borderRadius: 12,
    minHeight: 4,
  },
  moodBarLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 8,
  },
  insightsContainer: {
    marginBottom: theme.spacing.md,
  },
  insightsTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
    gap: 12,
  },
  insightText: {
    color: theme.colors.text,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  quickActionText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  featureCard: {
    width: (width - 48 - 12) / 2,
    padding: 20,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width - 48,
    padding: 24,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  moodOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 24,
  },
  moodOption: {
    padding: 12,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  moodOptionSelected: {
    backgroundColor: theme.colors.primary + "40",
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  moodEmoji: { fontSize: 32 },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  modalCancelText: { color: theme.colors.textSecondary, fontSize: 16 },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: { color: "white", fontSize: 16, fontWeight: "600" },
});
