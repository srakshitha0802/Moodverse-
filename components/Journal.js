import { LinearGradient } from "expo-linear-gradient";
import {
  PenTool,
  Plus,
  Save,
  Trash2,
  Edit3,
  Search,
  Filter,
  X,
  Smile,
  Meh,
  Frown,
  Heart,
  Zap,
  Calendar,
  Tag,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Share2,
  AlertTriangle,
} from "lucide-react-native";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Share,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";

import theme from "../styles/theme";
import {
  notifySuccess,
  impactMedium,
  notifyWarning,
} from "../utils/safeHaptics";
import storage from "../utils/storage";

const { width } = Dimensions.get("window");

// Mood options with icons and colors
const MOODS = [
  {
    id: "joyful",
    label: "Joyful",
    icon: Smile,
    color: "#FBBF24",
    bgColor: "rgba(251, 191, 36, 0.2)",
  },
  {
    id: "calm",
    label: "Calm",
    icon: Heart,
    color: "#34D399",
    bgColor: "rgba(52, 211, 153, 0.2)",
  },
  {
    id: "thoughtful",
    label: "Thoughtful",
    icon: PenTool,
    color: "#60A5FA",
    bgColor: "rgba(96, 165, 250, 0.2)",
  },
  {
    id: "melancholy",
    label: "Melancholy",
    icon: Meh,
    color: "#F87171",
    bgColor: "rgba(248, 113, 113, 0.2)",
  },
  {
    id: "energetic",
    label: "Energetic",
    icon: Zap,
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.2)",
  },
];

// Journal prompts for inspiration
const PROMPTS = [
  "What's one small win you had today?",
  "What are you grateful for right now?",
  "What emotion is most present for you?",
  "What's a challenge you're navigating?",
  "What would make today meaningful?",
  "What did you learn about yourself?",
  "What's a kind message you need to hear?",
  "What are you releasing or letting go of?",
];

// Helper to get random prompt
const getRandomPrompt = () =>
  PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

// Helper to format date
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Helper to get relative time
const getRelativeTime = (timestamp) => {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(timestamp);
};

// Mood icon component
const MoodIcon = ({ moodId, size = 24, active = false }) => {
  const mood = MOODS.find((m) => m.id === moodId);
  if (!mood) return <Smile size={size} color="#9CA3AF" />;
  const IconComponent = mood.icon;
  return <IconComponent size={size} color={active ? mood.color : "#9CA3AF"} />;
};

const Journal = ({ onBack }) => {
  // State
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState(null);

  // New entry form
  const [newEntryText, setNewEntryText] = useState("");
  const [newEntryMood, setNewEntryMood] = useState("joyful");
  const [newEntryTags, setNewEntryTags] = useState("");

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editText, setEditText] = useState("");
  const [editMood, setEditMood] = useState("");
  const [editTags, setEditTags] = useState("");

  // Stats and prompts
  const [currentPrompt, setCurrentPrompt] = useState(getRandomPrompt());
  const [showStats, setShowStats] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load entries from storage
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const stored = await storage.getItem("@journal_entries", {
        defaultValue: [],
      });
      // Migrate old entries to have mood and tags
      const migrated = stored.map((entry) => ({
        ...entry,
        mood: entry.mood || "joyful",
        tags: entry.tags || [],
        timestamp:
          entry.timestamp || new Date(entry.date).getTime() || Date.now(),
      }));
      // Sort by timestamp descending (newest first)
      migrated.sort((a, b) => b.timestamp - a.timestamp);
      setEntries(migrated);
    } catch (err) {
      console.warn("[Journal] Failed to load entries", err);
    } finally {
      setLoading(false);
    }
  };

  const saveEntries = async (updatedEntries) => {
    try {
      await storage.setItem("@journal_entries", updatedEntries);
      setEntries(updatedEntries);
    } catch (err) {
      console.warn("[Journal] Failed to save entries", err);
      Alert.alert("Error", "Failed to save your journal entry");
    }
  };

  // Add new entry
  const addEntry = async () => {
    if (!newEntryText.trim()) {
      Alert.alert("Empty Entry", "Please write something before saving.");
      return;
    }

    void notifySuccess();

    const tagsArray = newEntryTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    const newEntry = {
      id: Date.now(),
      text: newEntryText.trim(),
      mood: newEntryMood,
      tags: tagsArray,
      timestamp: Date.now(),
      date: formatDate(Date.now()),
    };

    const updated = [newEntry, ...entries];
    await saveEntries(updated);

    // Reset form
    setNewEntryText("");
    setNewEntryTags("");
    setNewEntryMood("joyful");
  };

  // Delete entry
  const deleteEntry = (entryId) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            void impactMedium();
            const updated = entries.filter((e) => e.id !== entryId);
            await saveEntries(updated);
          },
        },
      ],
    );
  };

  // Open edit modal
  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setEditText(entry.text);
    setEditMood(entry.mood);
    setEditTags(entry.tags.join(", "));
    setEditModalVisible(true);
  };

  // Save edited entry
  const saveEdit = async () => {
    if (!editText.trim()) {
      Alert.alert("Empty Entry", "Entry cannot be empty.");
      return;
    }

    const tagsArray = editTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    const updatedEntries = entries.map((entry) =>
      entry.id === editingEntry.id
        ? {
            ...entry,
            text: editText.trim(),
            mood: editMood,
            tags: tagsArray,
          }
        : entry,
    );

    await saveEntries(updatedEntries);
    setEditModalVisible(false);
    setEditingEntry(null);
    void notifySuccess();
  };

  // Export entries as JSON
  const exportEntries = async () => {
    try {
      setExporting(true);
      const exportData = {
        exportDate: new Date().toISOString(),
        totalEntries: entries.length,
        entries: entries.map(({ id, text, mood, tags, timestamp, date }) => ({
          id,
          text,
          mood,
          tags,
          timestamp,
          date,
        })),
      };
      const jsonString = JSON.stringify(exportData, null, 2);
      await Share.share({
        title: "My Journal Export",
        message: jsonString,
      });
    } catch (err) {
      Alert.alert("Export Failed", "Could not export your journal entries.");
    } finally {
      setExporting(false);
    }
  };

  // Clear all entries
  const clearAllEntries = () => {
    Alert.alert(
      "Clear All Entries",
      "This will permanently delete all your journal entries. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            void notifyWarning();
            await saveEntries([]);
          },
        },
      ],
    );
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.text.toLowerCase().includes(query) ||
          entry.tags.some((tag) => tag.includes(query)),
      );
    }

    // Mood filter
    if (selectedMoodFilter) {
      filtered = filtered.filter((entry) => entry.mood === selectedMoodFilter);
    }

    // Tag filter
    if (selectedTagFilter) {
      filtered = filtered.filter((entry) =>
        entry.tags.includes(selectedTagFilter),
      );
    }

    return filtered;
  }, [entries, searchQuery, selectedMoodFilter, selectedTagFilter]);

  // Get all unique tags from entries
  const allTags = useMemo(() => {
    const tagsSet = new Set();
    entries.forEach((entry) => {
      entry.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [entries]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = entries.length;
    const moodCounts = {};
    MOODS.forEach((mood) => {
      moodCounts[mood.id] = 0;
    });
    entries.forEach((entry) => {
      if (moodCounts[entry.mood] !== undefined) moodCounts[entry.mood]++;
    });

    // Calculate streak (consecutive days with entries)
    let streak = 0;
    if (entries.length > 0) {
      const timestamps = entries.map((e) => e.timestamp).sort((a, b) => b - a);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      const currentDate = new Date(timestamps[0]);
      currentDate.setHours(0, 0, 0, 0);

      // Check if most recent entry is today or yesterday
      const mostRecent = new Date(timestamps[0]);
      mostRecent.setHours(0, 0, 0, 0);
      const dayDiff = Math.floor(
        (todayTimestamp - mostRecent.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dayDiff <= 1) {
        streak = 1;
        for (let i = 1; i < timestamps.length; i++) {
          const prevDate = new Date(timestamps[i - 1]);
          const currDate = new Date(timestamps[i]);
          prevDate.setHours(0, 0, 0, 0);
          currDate.setHours(0, 0, 0, 0);
          const diff =
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) streak++;
          else break;
        }
      }
    }

    return { total, moodCounts, streak };
  }, [entries]);

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMoodFilter(null);
    setSelectedTagFilter(null);
  };

  // Use prompt in new entry
  const usePrompt = () => {
    setNewEntryText(currentPrompt);
    setCurrentPrompt(getRandomPrompt());
  };

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.gradientCalm}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading your sanctuary...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.colors.gradientCalm} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📓 Sacred Journal</Text>
          <Text style={styles.subtitle}>
            Your space for reflection & growth
          </Text>
        </View>

        {/* Stats Bar */}
        <TouchableOpacity
          style={styles.statsBar}
          onPress={() => setShowStats(!showStats)}
          activeOpacity={0.8}
        >
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <BarChart3 size={20} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statLabel}>Insights</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Stats */}
        {showStats && (
          <View style={styles.expandedStats}>
            <Text style={styles.expandedStatsTitle}>Mood Distribution</Text>
            <View style={styles.moodStatsGrid}>
              {MOODS.map((mood) => (
                <View key={mood.id} style={styles.moodStatItem}>
                  <MoodIcon moodId={mood.id} size={20} active />
                  <Text style={styles.moodStatCount}>
                    {stats.moodCounts[mood.id] || 0}
                  </Text>
                  <Text style={styles.moodStatLabel}>{mood.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Prompt Card */}
        <View style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <Lightbulb size={20} color="#FBBF24" />
            <Text style={styles.promptTitle}>Daily Prompt</Text>
            <TouchableOpacity
              onPress={() => setCurrentPrompt(getRandomPrompt())}
              style={styles.promptRefresh}
            >
              <RefreshCw size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.promptText}>{currentPrompt}</Text>
          <TouchableOpacity style={styles.promptButton} onPress={usePrompt}>
            <Text style={styles.promptButtonText}>Use this prompt</Text>
          </TouchableOpacity>
        </View>

        {/* New Entry Section */}
        <View style={styles.newEntrySection}>
          <Text style={styles.sectionTitle}>Write Your Entry</Text>

          {/* Mood Selector */}
          <View style={styles.moodSelector}>
            <Text style={styles.moodSelectorLabel}>How are you feeling?</Text>
            <View style={styles.moodIcons}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodOption,
                    newEntryMood === mood.id && {
                      backgroundColor: mood.bgColor,
                      borderColor: mood.color,
                    },
                  ]}
                  onPress={() => setNewEntryMood(mood.id)}
                >
                  <MoodIcon
                    moodId={mood.id}
                    size={28}
                    active={newEntryMood === mood.id}
                  />
                  <Text
                    style={[
                      styles.moodLabel,
                      newEntryMood === mood.id && { color: mood.color },
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind today? Write freely..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            value={newEntryText}
            onChangeText={setNewEntryText}
          />

          {/* Tags Input */}
          <View style={styles.tagsInputContainer}>
            <Tag size={18} color="rgba(255,255,255,0.6)" />
            <TextInput
              style={styles.tagsInput}
              placeholder="Tags (comma separated: gratitude, growth, etc.)"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={newEntryTags}
              onChangeText={setNewEntryTags}
            />
          </View>

          {/* Add Button */}
          <TouchableOpacity style={styles.addButton} onPress={addEntry}>
            <Plus size={20} color="white" />
            <Text style={styles.addButtonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Search size={18} color="rgba(255,255,255,0.6)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search entries or tags..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Chips */}
          {(selectedMoodFilter || selectedTagFilter || searchQuery) && (
            <View style={styles.activeFilters}>
              <Text style={styles.activeFiltersLabel}>Active filters:</Text>
              {selectedMoodFilter && (
                <TouchableOpacity
                  style={styles.filterChip}
                  onPress={() => setSelectedMoodFilter(null)}
                >
                  <Text style={styles.filterChipText}>
                    Mood:{" "}
                    {MOODS.find((m) => m.id === selectedMoodFilter)?.label}
                  </Text>
                  <X size={14} color="white" />
                </TouchableOpacity>
              )}
              {selectedTagFilter && (
                <TouchableOpacity
                  style={styles.filterChip}
                  onPress={() => setSelectedTagFilter(null)}
                >
                  <Text style={styles.filterChipText}>
                    Tag: {selectedTagFilter}
                  </Text>
                  <X size={14} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Mood Filter Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.moodFilterRow}
          >
            <TouchableOpacity
              style={[
                styles.moodFilterChip,
                !selectedMoodFilter && styles.moodFilterChipActive,
              ]}
              onPress={() => setSelectedMoodFilter(null)}
            >
              <Text style={styles.moodFilterChipText}>All</Text>
            </TouchableOpacity>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodFilterChip,
                  selectedMoodFilter === mood.id && styles.moodFilterChipActive,
                ]}
                onPress={() =>
                  setSelectedMoodFilter(
                    selectedMoodFilter === mood.id ? null : mood.id,
                  )
                }
              >
                <MoodIcon
                  moodId={mood.id}
                  size={14}
                  active={selectedMoodFilter === mood.id}
                />
                <Text style={styles.moodFilterChipText}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tag Filter Row */}
          {allTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagFilterRow}
            >
              {allTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagFilterChip,
                    selectedTagFilter === tag && styles.tagFilterChipActive,
                  ]}
                  onPress={() =>
                    setSelectedTagFilter(selectedTagFilter === tag ? null : tag)
                  }
                >
                  <Text style={styles.tagFilterChipText}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Entries List */}
        <View style={styles.entriesSection}>
          <View style={styles.entriesHeader}>
            <Text style={styles.sectionTitle}>
              Your Entries{" "}
              {filteredEntries.length !== entries.length &&
                `(${filteredEntries.length} of ${entries.length})`}
            </Text>
            <View style={styles.entriesActions}>
              <TouchableOpacity
                onPress={exportEntries}
                style={styles.entriesActionButton}
              >
                <Share2 size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
              {entries.length > 0 && (
                <TouchableOpacity
                  onPress={clearAllEntries}
                  style={styles.entriesActionButton}
                >
                  <AlertTriangle size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <PenTool size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyStateText}>
                {entries.length === 0
                  ? "Start your journaling journey by writing your first entry above."
                  : "No entries match your filters. Try adjusting your search."}
              </Text>
            </View>
          ) : (
            filteredEntries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryDateContainer}>
                    <Calendar size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.entryDate}>
                      {formatDate(entry.timestamp)}
                    </Text>
                    <Text style={styles.entryRelative}>
                      {getRelativeTime(entry.timestamp)}
                    </Text>
                  </View>
                  <View style={styles.entryActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(entry)}
                      style={styles.entryAction}
                    >
                      <Edit3 size={16} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteEntry(entry.id)}
                      style={styles.entryAction}
                    >
                      <Trash2 size={16} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.entryMeta}>
                  <View
                    style={[
                      styles.entryMoodBadge,
                      {
                        backgroundColor: MOODS.find((m) => m.id === entry.mood)
                          ?.bgColor,
                      },
                    ]}
                  >
                    <MoodIcon moodId={entry.mood} size={14} active />
                    <Text
                      style={[
                        styles.entryMoodText,
                        {
                          color: MOODS.find((m) => m.id === entry.mood)?.color,
                        },
                      ]}
                    >
                      {MOODS.find((m) => m.id === entry.mood)?.label}
                    </Text>
                  </View>
                  {entry.tags.length > 0 && (
                    <View style={styles.entryTags}>
                      {entry.tags.slice(0, 3).map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => setSelectedTagFilter(tag)}
                          style={styles.entryTag}
                        >
                          <Text style={styles.entryTagText}>#{tag}</Text>
                        </TouchableOpacity>
                      ))}
                      {entry.tags.length > 3 && (
                        <Text style={styles.entryTagMore}>
                          +{entry.tags.length - 3}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <Text style={styles.entryText} numberOfLines={4}>
                  {entry.text}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Entry</Text>

            <Text style={styles.modalLabel}>How are you feeling?</Text>
            <View style={styles.modalMoodRow}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.modalMoodOption,
                    editMood === mood.id && { backgroundColor: mood.bgColor },
                  ]}
                  onPress={() => setEditMood(mood.id)}
                >
                  <MoodIcon
                    moodId={mood.id}
                    size={24}
                    active={editMood === mood.id}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Entry</Text>
            <TextInput
              style={styles.modalTextInput}
              multiline
              value={editText}
              onChangeText={setEditText}
              placeholder="Write your thoughts..."
              placeholderTextColor="rgba(255,255,255,0.4)"
            />

            <Text style={styles.modalLabel}>Tags (comma separated)</Text>
            <TextInput
              style={styles.modalTagsInput}
              value={editTags}
              onChangeText={setEditTags}
              placeholder="gratitude, growth, reflection"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveEdit}
              >
                <Save size={18} color="white" />
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {exporting && (
        <View style={styles.exportOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.exportText}>Preparing export...</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 12,
    fontSize: 16,
    opacity: 0.8,
  },
  header: {
    marginTop: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
  },
  statsBar: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  expandedStats: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  expandedStatsTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  moodStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  moodStatItem: {
    alignItems: "center",
    width: "20%",
    marginBottom: 12,
  },
  moodStatCount: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  moodStatLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
  },
  promptCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  promptTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  promptRefresh: {
    padding: 4,
  },
  promptText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontStyle: "italic",
    lineHeight: 24,
    marginBottom: 12,
  },
  promptButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  promptButtonText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "500",
  },
  newEntrySection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 16,
  },
  moodSelector: {
    marginBottom: 16,
  },
  moodSelectorLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 12,
  },
  moodIcons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moodOption: {
    alignItems: "center",
    padding: 8,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "transparent",
  },
  moodLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 16,
    minHeight: 120,
    color: "white",
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  tagsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  tagsInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: "white",
    fontSize: 14,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: 30,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  filterSection: {
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 30,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: "white",
    fontSize: 15,
  },
  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  activeFiltersLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  filterChipText: {
    color: "white",
    fontSize: 12,
  },
  clearFiltersButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  moodFilterRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  moodFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  moodFilterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  moodFilterChipText: {
    color: "white",
    fontSize: 13,
  },
  tagFilterRow: {
    flexDirection: "row",
  },
  tagFilterChip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  tagFilterChipActive: {
    backgroundColor: "rgba(96, 165, 250, 0.3)",
    borderWidth: 1,
    borderColor: "#60A5FA",
  },
  tagFilterChipText: {
    color: "white",
    fontSize: 13,
  },
  entriesSection: {
    flex: 1,
  },
  entriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  entriesActions: {
    flexDirection: "row",
    gap: 12,
  },
  entriesActionButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateText: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    fontSize: 14,
    paddingHorizontal: 32,
  },
  entryCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  entryDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  entryDate: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  entryRelative: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
  entryActions: {
    flexDirection: "row",
    gap: 12,
  },
  entryAction: {
    padding: 4,
  },
  entryMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  entryMoodBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  entryMoodText: {
    fontSize: 11,
    fontWeight: "500",
  },
  entryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  entryTag: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  entryTagText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
  },
  entryTagMore: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
  },
  entryText: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1F2937",
    borderRadius: 28,
    padding: 24,
    width: width - 40,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    marginBottom: 20,
    textAlign: "center",
  },
  modalLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 12,
  },
  modalMoodRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  modalMoodOption: {
    padding: 10,
    borderRadius: 40,
  },
  modalTextInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
    color: "white",
    fontSize: 15,
    textAlignVertical: "top",
  },
  modalTagsInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  modalSaveText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  exportOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  exportText: {
    color: "white",
    marginTop: 12,
    fontSize: 14,
  },
});

export default Journal;
