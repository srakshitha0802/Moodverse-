import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Smile,
  Book,
  Music,
  Eye,
  Play,
  Pause,
  Heart,
  Share2,
  Search,
  X,
  Volume2,
  VolumeX,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from "lucide-react-native";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useReducer,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import theme from "../styles/theme";
import {
  selectionAsync,
  impactLight,
  impactMedium,
  notifySuccess,
} from "../utils/safeHaptics";
import storage from "../utils/storage";

const { width, height } = Dimensions.get("window");

// ------------------------------
// 1. Bundled offline content (no network)
// ------------------------------
const LOCAL_MEMES = [
  {
    id: "m1",
    title: "Me: I'm fine. Inner voice: *Victorian orphan energy*",
    ups: 1200,
  },
  {
    id: "m2",
    title: "Brain: What if we worry about 2012 again? Me: Obviously.",
    ups: 950,
  },
  {
    id: "m3",
    title: "Therapy is expensive. A slow walk and deep breath are free.",
    ups: 2100,
  },
  {
    id: "m4",
    title:
      "My coping strategy is 40% water, 40% sleep, 20% pretending I planned it.",
    ups: 880,
  },
  {
    id: "m5",
    title: "If stress burned calories, I would be unstoppable.",
    ups: 3400,
  },
];

const LOCAL_BOOKS = [
  // 🧠 Inner Transformation & Self-Healing
  {
    key: "heal_life",
    title: "You Can Heal Your Life",
    author_name: "Louise Hay",
    first_publish_year: 1984,
    category: "emotional_healing",
    emotions: ["broken", "hurt", "trauma", "low_self_worth"],
    description:
      "Teaches how thoughts affect emotional + physical health and promotes self-love & forgiveness",
    benefits: ["Emotional healing", "Trauma recovery", "Self-worth building"],
    chapters: [
      {
        id: 1,
        title: "What I Believe",
        snippet: "Our thoughts create our reality...",
      },
      {
        id: 2,
        title: "About Resentment",
        snippet: "Resentment is the poison we drink...",
      },
      {
        id: 3,
        title: "Releasing Old Patterns",
        snippet: "We can change our thinking...",
      },
    ],
    audio_snippet: "I am willing to release all resistance...",
    reflection_prompt:
      "What limiting beliefs about yourself are you ready to let go of today?",
  },
  {
    key: "untethered_soul",
    title: "The Untethered Soul",
    author_name: "Michael A. Singer",
    first_publish_year: 2007,
    category: "spiritual_awakening",
    emotions: ["overthinking", "anxious", "stressed", "mental_chaos"],
    description: "Helps you detach from negative thoughts and calm inner chaos",
    benefits: ["Anxiety relief", "Mental clarity", "Inner peace"],
    chapters: [
      {
        id: 1,
        title: "The Voice Inside",
        snippet: "There is a voice in your head...",
      },
      {
        id: 2,
        title: "Living with Yourself",
        snippet: "You are not your thoughts...",
      },
      {
        id: 3,
        title: "Letting Go",
        snippet: "The secret to happiness is letting go...",
      },
    ],
    audio_snippet: "Watch the mind, don't get involved...",
    reflection_prompt:
      "What thoughts are you identifying with that aren't really you?",
  },
  {
    key: "becoming_supernatural",
    title: "Becoming Supernatural",
    author_name: "Joe Dispenza",
    first_publish_year: 2017,
    category: "transformation",
    emotions: ["stuck", "limited", "seeking_change"],
    description: "Combines science + spirituality for deep inner healing",
    benefits: ["Mindset transformation", "Energy work", "Quantum healing"],
    chapters: [
      {
        id: 1,
        title: "The Quantum You",
        snippet: "You are more than your body...",
      },
      {
        id: 2,
        title: "Breaking the Habit",
        snippet: "Your personality creates your reality...",
      },
      {
        id: 3,
        title: "The Generous Present",
        snippet: "The present moment is where creation happens...",
      },
    ],
    audio_snippet: "You are the creator of your reality...",
    reflection_prompt: "What version of yourself do you want to become today?",
  },

  // 🧘 Spiritual Awakening & Inner Peace
  {
    key: "inner_engineering",
    title: "Inner Engineering: A Yogi's Guide to Joy",
    author_name: "Sadhguru",
    first_publish_year: 2016,
    category: "spiritual_growth",
    emotions: ["lost", "seeking_purpose", "confused"],
    description: "Practical spiritual system for joy and balance",
    benefits: ["Structured spiritual growth", "Life purpose", "Inner joy"],
    chapters: [
      { id: 1, title: "The Body", snippet: "The body is the temple..." },
      {
        id: 2,
        title: "The Mind",
        snippet: "Your mind is your biggest asset...",
      },
      { id: 3, title: "The Energies", snippet: "Life is energy in motion..." },
    ],
    audio_snippet: "The only way out is in...",
    reflection_prompt: "What aspect of your life needs more balance right now?",
  },
  {
    key: "power_of_now",
    title: "The Power of Now",
    author_name: "Eckhart Tolle",
    first_publish_year: 1997,
    category: "mindfulness",
    emotions: ["stressed", "worried", "future_anxious", "past_regret"],
    description: "Focuses on living in the present moment",
    benefits: ["Stress relief", "Mindfulness", "Presence"],
    chapters: [
      {
        id: 1,
        title: "You Are Not Your Mind",
        snippet: "The beginning of freedom...",
      },
      { id: 2, title: "Consciousness", snippet: "The awakened state..." },
      {
        id: 3,
        title: "The Present Moment",
        snippet: "The key to spiritual awakening...",
      },
    ],
    audio_snippet: "Realize deeply that the present moment is all you have...",
    reflection_prompt: "What keeps you from being fully present right now?",
  },
  {
    key: "new_earth",
    title: "A New Earth",
    author_name: "Eckhart Tolle",
    first_publish_year: 2005,
    category: "spiritual_awakening",
    emotions: ["empty", "purposeless", "ego_driven"],
    description: "Helps dissolve ego and create a peaceful life",
    benefits: ["Ego dissolution", "Life purpose", "Inner peace"],
    chapters: [
      {
        id: 1,
        title: "The Flowering of Consciousness",
        snippet: "A new heaven and a new earth...",
      },
      { id: 2, title: "Ego", snippet: "The identification with form..." },
      {
        id: 3,
        title: "The Core of Ego",
        snippet: "The ego's need for conflict...",
      },
    ],
    audio_snippet: "Life is the dancer and you are the dance...",
    reflection_prompt: "How is your ego keeping you from true happiness?",
  },

  // 💖 Heart Healing & Emotional Depth
  {
    key: "seat_of_soul",
    title: "The Seat of the Soul",
    author_name: "Gary Zukav",
    first_publish_year: 1989,
    category: "emotional_depth",
    emotions: ["heartbroken", "emotionally_lost", "seeking_meaning"],
    description: "Aligns emotions with spiritual purpose",
    benefits: ["Emotional alignment", "Soul purpose", "Heart healing"],
    chapters: [
      { id: 1, title: "Evolution", snippet: "The evolution of the soul..." },
      { id: 2, title: "Reincarnation", snippet: "The journey of the soul..." },
      {
        id: 3,
        title: "Authentic Power",
        snippet: "Power that comes from within...",
      },
    ],
    audio_snippet: "Your soul is your compass...",
    reflection_prompt:
      "What is your heart trying to tell you that you're ignoring?",
  },
  {
    key: "art_of_happiness",
    title: "The Art of Happiness",
    author_name: "Dalai Lama",
    first_publish_year: 1998,
    category: "happiness",
    emotions: ["unhappy", "seeking_joy", "depressed"],
    description: "Combines spirituality + psychology for happiness",
    benefits: ["True happiness", "Compassion", "Mental peace"],
    chapters: [
      {
        id: 1,
        title: "The Right to Happiness",
        snippet: "The very purpose of life...",
      },
      {
        id: 2,
        title: "Human Warmth",
        snippet: "The importance of compassion...",
      },
      {
        id: 3,
        title: "Transforming Suffering",
        snippet: "Turning pain into growth...",
      },
    ],
    audio_snippet: "Happiness is determined more by one's state of mind...",
    reflection_prompt: "What truly brings you joy that isn't material?",
  },
  {
    key: "soul_mind_body",
    title: "Soul, Mind, Body Medicine",
    author_name: "Zhi Gang Sha",
    first_publish_year: 2006,
    category: "holistic_healing",
    emotions: ["physically_ill", "emotionally_drained", "spiritually_empty"],
    description: "Focuses on healing body, mind, and soul together",
    benefits: ["Holistic healing", "Energy medicine", "Soul connection"],
    chapters: [
      { id: 1, title: "Soul Over Matter", snippet: "The power of the soul..." },
      {
        id: 2,
        title: "Mind Body Soul",
        snippet: "The connection of all three...",
      },
      {
        id: 3,
        title: "Healing Power",
        snippet: "The ability to heal oneself...",
      },
    ],
    audio_snippet: "I have the power to heal myself...",
    reflection_prompt: "What part of you needs the most healing right now?",
  },

  // 🌌 Classic Spiritual Masterpieces
  {
    key: "autobiography_yogi",
    title: "Autobiography of a Yogi",
    author_name: "Paramahansa Yogananda",
    first_publish_year: 1946,
    category: "spiritual_classic",
    emotions: ["spiritually_curious", "seeking_wisdom", "divine_connection"],
    description: "Life-changing spiritual journey (very popular in India)",
    benefits: ["Spiritual wisdom", "Divine connection", "Yoga philosophy"],
    chapters: [
      {
        id: 1,
        title: "My Parents and Early Life",
        snippet: "The beginning of the journey...",
      },
      {
        id: 2,
        title: "Mother's Death and the Amulet",
        snippet: "Life's first great lesson...",
      },
      {
        id: 3,
        title: "The Saint with Two Bodies",
        snippet: "Meeting the masters...",
      },
    ],
    audio_snippet: "The soul is eternal...",
    reflection_prompt: "What spiritual experiences are you seeking?",
  },
  {
    key: "be_here_now",
    title: "Be Here Now",
    author_name: "Ram Dass",
    first_publish_year: 1971,
    category: "spiritual_classic",
    emotions: ["spiritually_awakening", "consciousness_expanding"],
    description: "Encourages presence and spiritual awareness",
    benefits: ["Presence", "Spiritual awareness", "Consciousness expansion"],
    chapters: [
      {
        id: 1,
        title: "Journey into Being",
        snippet: "The path of awakening...",
      },
      {
        id: 2,
        title: "From Bindu to Ojas",
        snippet: "The spiritual journey...",
      },
      { id: 3, title: "Cooking for God", snippet: "Service and devotion..." },
    ],
    audio_snippet: "The quieter you become, the more you can hear...",
    reflection_prompt: "How can you be more present in this moment?",
  },
  {
    key: "tao_te_ching",
    title: "Tao Te Ching",
    author_name: "Lao Tzu",
    first_publish_year: -600,
    category: "spiritual_wisdom",
    emotions: ["seeking_balance", "life_questions", "harmony"],
    description: "Deep poetic wisdom about life and balance",
    benefits: ["Life balance", "Ancient wisdom", "Inner harmony"],
    chapters: [
      {
        id: 1,
        title: "The Tao that can be told",
        snippet: "The mystery of existence...",
      },
      {
        id: 2,
        title: "Beauty and Goodness",
        snippet: "The nature of duality...",
      },
      { id: 3, title: "Without Action", snippet: "The power of non-action..." },
    ],
    audio_snippet: "The journey of a thousand miles begins with one step...",
    reflection_prompt: "What areas of your life need more flow and less force?",
  },
];

// Emotion-based book recommendations
const EMOTION_BOOK_MAP = {
  broken: ["heal_life", "seat_of_soul"],
  hurt: ["heal_life", "art_of_happiness"],
  trauma: ["heal_life", "soul_mind_body"],
  low_self_worth: ["heal_life", "art_of_happiness"],
  overthinking: ["untethered_soul", "power_of_now"],
  anxious: ["untethered_soul", "power_of_now"],
  stressed: ["power_of_now", "art_of_happiness"],
  mental_chaos: ["untethered_soul"],
  lost: ["inner_engineering", "new_earth"],
  seeking_purpose: ["inner_engineering", "seat_of_soul"],
  confused: ["inner_engineering", "tao_te_ching"],
  empty: ["new_earth", "seat_of_soul"],
  purposeless: ["new_earth", "autobiography_yogi"],
  ego_driven: ["new_earth", "be_here_now"],
  heartbroken: ["seat_of_soul", "heal_life"],
  emotionally_lost: ["seat_of_soul", "art_of_happiness"],
  seeking_meaning: ["seat_of_soul", "autobiography_yogi"],
  unhappy: ["art_of_happiness", "power_of_now"],
  seeking_joy: ["art_of_happiness", "inner_engineering"],
  depressed: ["art_of_happiness", "soul_mind_body"],
  physically_ill: ["soul_mind_body", "heal_life"],
  emotionally_drained: ["soul_mind_body", "untethered_soul"],
  spiritually_empty: ["soul_mind_body", "autobiography_yogi"],
  spiritually_curious: ["autobiography_yogi", "be_here_now"],
  seeking_wisdom: ["autobiography_yogi", "tao_te_ching"],
  divine_connection: ["autobiography_yogi", "inner_engineering"],
  spiritually_awakening: ["be_here_now", "new_earth"],
  consciousness_expanding: ["be_here_now", "becoming_supernatural"],
  seeking_balance: ["tao_te_ching", "inner_engineering"],
  life_questions: ["tao_te_ching", "seat_of_soul"],
  harmony: ["tao_te_ching", "power_of_now"],
  stuck: ["becoming_supernatural", "untethered_soul"],
  limited: ["becoming_supernatural", "new_earth"],
  seeking_change: ["becoming_supernatural", "inner_engineering"],
  worried: ["power_of_now", "art_of_happiness"],
  future_anxious: ["power_of_now", "tao_te_ching"],
  past_regret: ["power_of_now", "untethered_soul"],
};

// AI Chapter Suggestion System
const suggestChapters = (bookKey, userEmotion) => {
  const book = LOCAL_BOOKS.find((b) => b.key === bookKey);
  if (!book) return [];

  // AI-like chapter prioritization based on emotion
  const chapterPriority = {
    broken: [1, 2, 3], // Start with healing chapters
    anxious: [2, 3, 1], // Focus on calming chapters
    lost: [1, 3, 2], // Start with foundational chapters
    seeking_purpose: [3, 1, 2], // Focus on purpose chapters
    default: [1, 2, 3], // Default order
  };

  const priority = chapterPriority[userEmotion] || chapterPriority["default"];
  return priority.map((index) => book.chapters[index - 1]).filter(Boolean);
};

// ------------------------------
// 2. Local memes (bundled list — no fetch)
// ------------------------------
const useLocalMemes = () => {
  const [memes] = useState(LOCAL_MEMES);
  const [refreshing, setRefreshing] = useState(false);
  const fetchMemes = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 250);
  }, []);
  return {
    memes,
    loading: false,
    refreshing,
    fetchMemes,
    setRefreshing: () => setRefreshing(true),
  };
};

// ------------------------------
// 3. Reducer for Favorites & Recent
// ------------------------------
const favoritesReducer = (state, action) => {
  switch (action.type) {
    case "TOGGLE_BOOK_FAV":
      const bookExists = state.favBooks.some((b) => b.key === action.book.key);
      return {
        ...state,
        favBooks: bookExists
          ? state.favBooks.filter((b) => b.key !== action.book.key)
          : [...state.favBooks, action.book],
      };
    case "TOGGLE_MEME_FAV":
      const memeExists = state.favMemes.some((m) => m.id === action.meme.id);
      return {
        ...state,
        favMemes: memeExists
          ? state.favMemes.filter((m) => m.id !== action.meme.id)
          : [...state.favMemes, action.meme],
      };
    case "SET_FAVORITES":
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

// ------------------------------
// 4. Sub-components (Advanced)
// ------------------------------
const MemesSection = () => {
  const { memes, loading, refreshing, fetchMemes, setRefreshing } =
    useLocalMemes();
  const [favorites, dispatch] = useReducer(favoritesReducer, {
    favBooks: [],
    favMemes: [],
  });
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);
  const loadFavorites = async () => {
    const stored = await storage.getReliefData("favorite_memes");
    if (stored)
      dispatch({ type: "SET_FAVORITES", payload: { favMemes: stored } });
  };
  const persistFavMemes = (newFavs) => {
    storage.saveReliefData("favorite_memes", newFavs);
  };

  const toggleFavorite = (meme) => {
    void selectionAsync();
    const newFavs = favorites.favMemes.some((m) => m.id === meme.id)
      ? favorites.favMemes.filter((m) => m.id !== meme.id)
      : [...favorites.favMemes, meme];
    dispatch({ type: "TOGGLE_MEME_FAV", meme });
    persistFavMemes(newFavs);
  };

  const shareMeme = async (meme) => {
    try {
      await Share.share({
        message: meme.title || meme.text,
        title: "Check out this meme!",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const displayMemes = showOnlyFavs ? favorites.favMemes : memes;
  const onRefresh = () => {
    setRefreshing();
    fetchMemes();
  };

  if (loading && !refreshing)
    return (
      <ActivityIndicator size="large" color="white" style={{ marginTop: 50 }} />
    );
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolHeader}>
        <TouchableOpacity
          onPress={() => setShowOnlyFavs(!showOnlyFavs)}
          style={styles.filterButton}
        >
          <Heart
            color={showOnlyFavs ? theme.colors.error : "white"}
            size={20}
          />
          <Text style={styles.filterText}>
            {showOnlyFavs ? "Favorites" : "All"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRefresh} style={styles.filterButton}>
          <RefreshCw color="white" size={20} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={displayMemes}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={({ item }) => (
          <LinearGradient
            colors={["#FFD70020", "#FF6B6B20"]}
            style={styles.memeCard}
          >
            <Smile color="#FFD700" size={48} style={{ marginBottom: 24 }} />
            <Text style={styles.memeText}>{item.title || item.text}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => toggleFavorite(item)}>
                <Heart
                  color={
                    favorites.favMemes.some((m) => m.id === item.id)
                      ? theme.colors.error
                      : "white"
                  }
                  fill={
                    favorites.favMemes.some((m) => m.id === item.id)
                      ? theme.colors.error
                      : "transparent"
                  }
                  size={24}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => shareMeme(item)}>
                <Share2 color="white" size={24} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
        pagingEnabled
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      />
    </View>
  );
};

const BooksSection = () => {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedEmotion, setSelectedEmotion] = useState("");
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);
  const [dailyBook, setDailyBook] = useState(null);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioText, setAudioText] = useState("");
  const [reflectionAnswer, setReflectionAnswer] = useState("");
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [favorites, dispatch] = useReducer(favoritesReducer, {
    favBooks: [],
    favMemes: [],
  });

  // Emotions list for picker
  const emotions = [
    { key: "broken", label: "💔 Broken/Hurt", color: "#FF6B6B" },
    { key: "anxious", label: "😰 Anxious/Overthinking", color: "#4ECDC4" },
    { key: "lost", label: "🧭 Lost/Confused", color: "#45B7D1" },
    { key: "empty", label: "🌫️ Empty/Purposeless", color: "#96CEB4" },
    { key: "unhappy", label: "😢 Unhappy/Depressed", color: "#DDA0DD" },
    { key: "stressed", label: "😤 Stressed/Overwhelmed", color: "#FFB347" },
    { key: "heartbroken", label: "💔 Heartbroken", color: "#FF6B9D" },
    {
      key: "spiritually_curious",
      label: "🔮 Spiritually Curious",
      color: "#C9B1FF",
    },
    { key: "seeking_balance", label: "⚖️ Seeking Balance", color: "#8FD14F" },
  ];

  useEffect(() => {
    loadFavBooks();
    initializeDailyBook();
  }, []);

  const loadFavBooks = async () => {
    const stored = await storage.getReliefData("favorite_books");
    if (stored)
      dispatch({ type: "SET_FAVORITES", payload: { favBooks: stored } });
  };
  const persistFavBooks = (newFavs) => {
    storage.saveReliefData("favorite_books", newFavs);
  };

  // Set daily book based on mood
  const initializeDailyBook = async () => {
    const today = new Date().toDateString();
    const storedDate = await storage.getReliefData("daily_book_date");
    const storedBook = await storage.getReliefData("daily_book");

    if (storedDate === today && storedBook) {
      setDailyBook(storedBook);
    } else {
      const randomBook =
        LOCAL_BOOKS[Math.floor(Math.random() * LOCAL_BOOKS.length)];
      setDailyBook(randomBook);
      await storage.saveReliefData("daily_book_date", today);
      await storage.saveReliefData("daily_book", randomBook);
    }
  };

  const searchBooks = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const q = query.trim().toLowerCase();
      const formatted = LOCAL_BOOKS.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author_name.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q),
      );
      setBooks(formatted);
    } finally {
      setLoading(false);
    }
  };

  const getEmotionBasedRecommendations = () => {
    if (!selectedEmotion) return [];
    const bookKeys = EMOTION_BOOK_MAP[selectedEmotion] || [];
    return LOCAL_BOOKS.filter((book) => bookKeys.includes(book.key));
  };

  const toggleFavorite = (book) => {
    void selectionAsync();
    const newFavs = favorites.favBooks.some((b) => b.key === book.key)
      ? favorites.favBooks.filter((b) => b.key !== book.key)
      : [...favorites.favBooks, book];
    dispatch({ type: "TOGGLE_BOOK_FAV", book });
    persistFavBooks(newFavs);
  };

  const playAudioSnippet = (book) => {
    setAudioText(book.audio_snippet);
    setShowAudioModal(true);
    impactLight();
  };

  const openReflection = (book) => {
    setSelectedBook(book);
    setShowReflectionModal(true);
    impactMedium();
  };

  const saveReflection = async () => {
    if (selectedBook && reflectionAnswer.trim()) {
      const reflection = {
        bookKey: selectedBook.key,
        bookTitle: selectedBook.title,
        question: selectedBook.reflection_prompt,
        answer: reflectionAnswer.trim(),
        date: new Date().toISOString(),
      };

      // Save reflection to storage (async)
      const existingReflections = (await storage.getReliefData("reflections")) || [];
      existingReflections.push(reflection);
      await storage.saveReliefData("reflections", existingReflections);

      setShowReflectionModal(false);
      setReflectionAnswer("");
      notifySuccess();
    }
  };

  const renderBook = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedBook(item)}
      style={[styles.bookCard, theme.glass]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author_name}</Text>
        <Text style={styles.bookCategory}>
          {item.category.replace("_", " ").toUpperCase()}
        </Text>
        <View style={styles.benefitsContainer}>
          {item.benefits.slice(0, 2).map((benefit, index) => (
            <Text key={index} style={styles.benefitTag}>
              • {benefit}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.bookActions}>
        <TouchableOpacity
          onPress={() => playAudioSnippet(item)}
          style={styles.audioButton}
        >
          <Volume2 color={theme.colors.primary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openReflection(item)}
          style={styles.reflectionButton}
        >
          <Book color={theme.colors.secondary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleFavorite(item)}>
          <Heart
            color={
              favorites.favBooks.some((b) => b.key === item.key)
                ? theme.colors.error
                : "white"
            }
            fill={
              favorites.favBooks.some((b) => b.key === item.key)
                ? theme.colors.error
                : "transparent"
            }
            size={22}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Daily Book Feature */}
      {dailyBook && (
        <View style={[styles.dailyBookCard, theme.glass]}>
          <Text style={styles.dailyBookLabel}>
            📖 Book of the Day for Your Mood
          </Text>
          <Text style={styles.dailyBookTitle}>{dailyBook.title}</Text>
          <Text style={styles.dailyBookAuthor}>{dailyBook.author_name}</Text>
          <TouchableOpacity
            onPress={() => setSelectedBook(dailyBook)}
            style={styles.readDailyButton}
          >
            <Text style={styles.readDailyButtonText}>Read Today's Pick</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Emotion-Based Recommendations */}
      <View style={styles.emotionSection}>
        <Text style={styles.sectionTitle}>🎭 How are you feeling today?</Text>
        <TouchableOpacity
          onPress={() => setShowEmotionPicker(true)}
          style={[
            styles.emotionSelector,
            selectedEmotion && styles.emotionSelectorSelected,
          ]}
        >
          <Text style={styles.emotionSelectorText}>
            {selectedEmotion
              ? emotions.find((e) => e.key === selectedEmotion)?.label
              : "Select your emotion"}
          </Text>
          <ChevronRight color="white" size={16} />
        </TouchableOpacity>

        {selectedEmotion && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>
              Recommended for you:
            </Text>
            {getEmotionBasedRecommendations().map((book) => (
              <TouchableOpacity
                key={book.key}
                onPress={() => setSelectedBook(book)}
                style={[styles.recommendationCard, theme.glass]}
              >
                <Text style={styles.recommendationTitle}>{book.title}</Text>
                <Text style={styles.recommendationReason}>
                  Perfect for: {book.emotions.join(", ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search color="white" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search spiritual books, authors, topics..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchBooks}
        />
        {query !== "" && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <X color="white" size={20} />
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="white"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.key}
          renderItem={renderBook}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Search titles or authors in the bundled catalog.
            </Text>
          }
        />
      )}
      <Modal visible={!!selectedBook} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={theme.colors.gradientCalm}
            style={styles.modalContent}
          >
            <TouchableOpacity
              onPress={() => setSelectedBook(null)}
              style={styles.closeModal}
            >
              <X color="white" size={24} />
            </TouchableOpacity>
            {selectedBook && (
              <>
                <Book
                  color={theme.colors.primary}
                  size={64}
                  style={{ marginBottom: 20 }}
                />
                <Text style={styles.modalTitle}>{selectedBook.title}</Text>
                <Text style={styles.modalAuthor}>
                  by {selectedBook.author_name}
                </Text>
                <Text style={styles.modalYear}>
                  First published: {selectedBook.first_publish_year || "N/A"}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedBook.description}
                </Text>

                {/* AI Chapter Suggestions */}
                <View style={styles.chaptersContainer}>
                  <Text style={styles.chaptersTitle}>
                    🧠 AI-Suggested Chapters for You:
                  </Text>
                  {suggestChapters(selectedBook.key, selectedEmotion).map(
                    (chapter, index) => (
                      <View
                        key={chapter.id}
                        style={[styles.chapterCard, theme.glass]}
                      >
                        <Text style={styles.chapterTitle}>{chapter.title}</Text>
                        <Text style={styles.chapterSnippet}>
                          {chapter.snippet}
                        </Text>
                      </View>
                    ),
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => playAudioSnippet(selectedBook)}
                    style={styles.modalActionButton}
                  >
                    <Volume2 color="white" size={20} />
                    <Text style={styles.modalActionText}>Audio Snippet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openReflection(selectedBook)}
                    style={styles.modalActionButton}
                  >
                    <Book color="white" size={20} />
                    <Text style={styles.modalActionText}>Reflect</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.favButton}
                    onPress={() => toggleFavorite(selectedBook)}
                  >
                    <Heart color="white" size={24} />
                    <Text style={styles.favButtonText}>
                      {favorites.favBooks.some(
                        (b) => b.key === selectedBook.key,
                      )
                        ? "Remove from Favorites"
                        : "Add to Favorites"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </LinearGradient>
        </View>
      </Modal>

      {/* Emotion Picker Modal */}
      <Modal visible={showEmotionPicker} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.emotionPickerContent, theme.glass]}>
            <Text style={styles.emotionPickerTitle}>How are you feeling?</Text>
            {emotions.map((emotion) => (
              <TouchableOpacity
                key={emotion.key}
                onPress={() => {
                  setSelectedEmotion(emotion.key);
                  setShowEmotionPicker(false);
                  impactLight();
                }}
                style={[styles.emotionOption, { borderColor: emotion.color }]}
              >
                <Text style={styles.emotionOptionLabel}>{emotion.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowEmotionPicker(false)}
              style={styles.cancelEmotionButton}
            >
              <Text style={styles.cancelEmotionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Audio Snippet Modal */}
      <Modal visible={showAudioModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.audioModalContent, theme.glass]}>
            <TouchableOpacity
              onPress={() => setShowAudioModal(false)}
              style={styles.closeModal}
            >
              <X color="white" size={24} />
            </TouchableOpacity>
            <Volume2
              color={theme.colors.primary}
              size={48}
              style={{ marginBottom: 20 }}
            />
            <Text style={styles.audioTitle}>🎧 Healing Audio Snippet</Text>
            <Text style={styles.audioText}>"{audioText}"</Text>
            <Text style={styles.audioNote}>
              Close your eyes and breathe deeply while reading this...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Reflection Modal */}
      <Modal visible={showReflectionModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.reflectionModalContent, theme.glass]}>
            <TouchableOpacity
              onPress={() => setShowReflectionModal(false)}
              style={styles.closeModal}
            >
              <X color="white" size={24} />
            </TouchableOpacity>
            <Book
              color={theme.colors.primary}
              size={48}
              style={{ marginBottom: 20 }}
            />
            <Text style={styles.reflectionTitle}>✍️ Reflection Time</Text>
            {selectedBook && (
              <>
                <Text style={styles.reflectionQuestion}>
                  {selectedBook.reflection_prompt}
                </Text>
                <TextInput
                  style={styles.reflectionInput}
                  multiline
                  placeholder="Take a moment to reflect..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={reflectionAnswer}
                  onChangeText={setReflectionAnswer}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  onPress={saveReflection}
                  style={styles.saveReflectionButton}
                >
                  <Text style={styles.saveReflectionText}>Save Reflection</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const VRSection = () => {
  const VR_SANCTUARIES = [
    {
      id: 1,
      name: "Cosmic Nebula",
      color: ["#0f0c29", "#302b63", "#24243e"],
      description: "Drift through stars",
    },
    {
      id: 2,
      name: "Emerald Forest",
      color: ["#134e5e", "#71b280"],
      description: "Healing nature sounds",
    },
    {
      id: 3,
      name: "Golden Shore",
      color: ["#f83600", "#f9d423"],
      description: "Ocean waves at sunset",
    },
  ];
  const [selected, setSelected] = useState(null);
  return (
    <View style={{ flex: 1, padding: 20 }}>
      {VR_SANCTUARIES.map((vr) => (
        <TouchableOpacity
          key={vr.id}
          onPress={() => setSelected(vr)}
          style={{ marginBottom: 15 }}
        >
          <LinearGradient colors={vr.color} style={styles.vrCard}>
            <Text style={styles.vrName}>{vr.name}</Text>
            <Eye color="white" size={24} />
          </LinearGradient>
        </TouchableOpacity>
      ))}
      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={selected?.color || ["#000000", "#1a1a1a"]}
            style={styles.vrModal}
          >
            <Text style={styles.vrModalTitle}>{selected?.name}</Text>
            <Text style={styles.vrModalDesc}>{selected?.description}</Text>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.exitButtonText}>Exit Sanctuary</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
};

const BREATH_PHASES = ["Inhale", "Hold", "Exhale", "Rest"];

const ToolsHubSection = () => {
  const navigation = useNavigation();
  const items = [
    {
      route: "ReliefMemes",
      label: "Mindful memes",
      sub: "Offline humor & quotes",
      Icon: Smile,
      colors: ["#FFD70035", "#FF6B6B35"],
    },
    {
      route: "ReliefBooks",
      label: "Book ideas",
      sub: "Curated offline list",
      Icon: Book,
      colors: ["#667eea55", "#764ba255"],
    },
    {
      route: "ReliefVR",
      label: "Visual calm",
      sub: "Color sanctuaries",
      Icon: Eye,
      colors: ["#0f0c2933", "#302b6333"],
    },
    {
      route: "ReliefMusic",
      label: "Healing Music",
      sub: "6 therapeutic breathing patterns",
      Icon: Music,
      colors: ["#134e5e44", "#71b28044"],
    },
  ];
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
    >
      <Text style={styles.hubSubtitle}>
        Everything here works without internet.
      </Text>
      {items.map((item) => {
        const Icon = item.Icon;
        return (
          <TouchableOpacity
            key={item.route}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(item.route)}
            style={{ marginBottom: 14 }}
          >
            <LinearGradient colors={item.colors} style={styles.hubCard}>
              <Icon color={theme.colors.primary} size={32} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.hubCardTitle}>{item.label}</Text>
                <Text style={styles.hubCardSub}>{item.sub}</Text>
              </View>
              <ChevronRight color="rgba(255,255,255,0.85)" size={22} />
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// Advanced Healing Music Data
const HEALING_TRACKS = [
  {
    id: "breathing_478",
    name: "4-7-8 Breathing",
    description: "Calming pattern for anxiety relief",
    phases: [
      {
        name: "Inhale",
        duration: 4000,
        color: "#4CAF50",
        frequency: 174,
        waveType: "sine",
      },
      {
        name: "Hold",
        duration: 7000,
        color: "#2196F3",
        frequency: 285,
        waveType: "triangle",
      },
      {
        name: "Exhale",
        duration: 8000,
        color: "#FF9800",
        frequency: 396,
        waveType: "sawtooth",
      },
      {
        name: "Rest",
        duration: 4000,
        color: "#9C27B0",
        frequency: 528,
        waveType: "sine",
      },
    ],
    benefits: ["Reduces anxiety", "Calms nervous system", "Improves focus"],
    mood: "anxious",
    ambientSound: "rain",
  },
  {
    id: "box_breathing",
    name: "Box Breathing",
    description: "Balance and clarity",
    phases: [
      {
        name: "Inhale",
        duration: 4000,
        color: "#4CAF50",
        frequency: 256,
        waveType: "sine",
      },
      {
        name: "Hold",
        duration: 4000,
        color: "#2196F3",
        frequency: 396,
        waveType: "triangle",
      },
      {
        name: "Exhale",
        duration: 4000,
        color: "#FF9800",
        frequency: 528,
        waveType: "sawtooth",
      },
      {
        name: "Hold",
        duration: 4000,
        color: "#9C27B0",
        frequency: 639,
        waveType: "sine",
      },
    ],
    benefits: ["Improves focus", "Reduces stress", "Enhances clarity"],
    mood: "stressed",
    ambientSound: "ocean",
  },
  {
    id: "deep_relaxation",
    name: "Deep Relaxation",
    description: "Complete stress release",
    phases: [
      {
        name: "Inhale",
        duration: 6000,
        color: "#4CAF50",
        frequency: 174,
        waveType: "sine",
      },
      {
        name: "Hold",
        duration: 6000,
        color: "#2196F3",
        frequency: 285,
        waveType: "triangle",
      },
      {
        name: "Exhale",
        duration: 8000,
        color: "#FF9800",
        frequency: 396,
        waveType: "sawtooth",
      },
      {
        name: "Rest",
        duration: 8000,
        color: "#9C27B0",
        frequency: 528,
        waveType: "sine",
      },
    ],
    benefits: ["Deep relaxation", "Stress relief", "Better sleep"],
    mood: "overwhelmed",
    ambientSound: "forest",
  },
  {
    id: "energy_boost",
    name: "Energy Awakening",
    description: "Revitalize and energize",
    phases: [
      {
        name: "Inhale",
        duration: 2000,
        color: "#4CAF50",
        frequency: 528,
        waveType: "sine",
      },
      {
        name: "Hold",
        duration: 2000,
        color: "#2196F3",
        frequency: 639,
        waveType: "triangle",
      },
      {
        name: "Exhale",
        duration: 2000,
        color: "#FF9800",
        frequency: 741,
        waveType: "sawtooth",
      },
      {
        name: "Rest",
        duration: 2000,
        color: "#9C27B0",
        frequency: 852,
        waveType: "sine",
      },
    ],
    benefits: ["Energy boost", "Mental clarity", "Alertness"],
    mood: "tired",
    ambientSound: "birds",
  },
  {
    id: "meditation_prep",
    name: "Meditation Prep",
    description: "Prepare for deep meditation",
    phases: [
      {
        name: "Inhale",
        duration: 5000,
        color: "#4CAF50",
        frequency: 256,
        waveType: "sine",
      },
      {
        name: "Hold",
        duration: 5000,
        color: "#2196F3",
        frequency: 396,
        waveType: "triangle",
      },
      {
        name: "Exhale",
        duration: 5000,
        color: "#FF9800",
        frequency: 528,
        waveType: "sawtooth",
      },
      {
        name: "Rest",
        duration: 5000,
        color: "#9C27B0",
        frequency: 639,
        waveType: "sine",
      },
    ],
    benefits: ["Meditation ready", "Mind calm", "Body relaxed"],
    mood: "seeking_calm",
    ambientSound: "bells",
  },
  {
    id: "sleep_preparation",
    name: "Sleep Preparation",
    description: "Wind down for better sleep",
    phases: [
      {
        name: "Inhale",
        duration: 8000,
        color: "#4CAF50",
        frequency: 174,
        waveType: "sine",
      },
      {
        name: "Hold",
        duration: 4000,
        color: "#2196F3",
        frequency: 285,
        waveType: "triangle",
      },
      {
        name: "Exhale",
        duration: 8000,
        color: "#FF9800",
        frequency: 396,
        waveType: "sawtooth",
      },
      {
        name: "Rest",
        duration: 10000,
        color: "#9C27B0",
        frequency: 528,
        waveType: "sine",
      },
    ],
    benefits: ["Sleep quality", "Body relaxation", "Mind calm"],
    mood: "sleep_difficulty",
    ambientSound: "crickets",
  },
];

// Healing Sound Generator (Offline, No Internet Required)
class HealingSoundGenerator {
  constructor() {
    this.audioContext = null;
    this.currentOscillator = null;
    this.ambientGainNode = null;
  }

  async init() {
    try {
      // Create audio context for web
      if (typeof window !== "undefined" && window.AudioContext) {
        this.audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();
        this.ambientGainNode = this.audioContext.createGain();
        this.ambientGainNode.connect(this.audioContext.destination);
        this.ambientGainNode.gain.value = 0;
      }
    } catch (error) {
      console.log("Audio context not available, using fallback");
    }
  }

  // Generate healing frequency (Solfeggio frequencies)
  playHealingFrequency(frequency, duration, waveType = "sine") {
    if (!this.audioContext) return;

    try {
      // Stop previous sound
      if (this.currentOscillator) {
        this.currentOscillator.stop();
        this.currentOscillator = null;
      }

      // Create oscillator
      this.currentOscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Configure oscillator
      this.currentOscillator.type = waveType;
      this.currentOscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime,
      );

      // Create envelope for smooth fade in/out
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.1,
        this.audioContext.currentTime + 0.1,
      );
      gainNode.gain.linearRampToValueAtTime(
        0.1,
        this.audioContext.currentTime + duration / 1000 - 0.1,
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + duration / 1000,
      );

      // Connect nodes
      this.currentOscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start and stop
      this.currentOscillator.start(this.audioContext.currentTime);
      this.currentOscillator.stop(
        this.audioContext.currentTime + duration / 1000,
      );

      // Cleanup
      setTimeout(() => {
        this.currentOscillator = null;
      }, duration);
    } catch (error) {
      console.log("Error playing frequency:", error);
    }
  }

  // Stop current sound
  stop() {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
        this.currentOscillator = null;
      } catch (error) {
        console.log("Error stopping sound:", error);
      }
    }
  }

  // Set volume
  setVolume(value) {
    if (this.ambientGainNode) {
      this.ambientGainNode.gain.setValueAtTime(
        value,
        this.audioContext.currentTime,
      );
    }
  }
}

// Create global sound generator
const soundGenerator = new HealingSoundGenerator();

const REMOTE_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

const MusicSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(HEALING_TRACKS[0]);
  const [sound, setSound] = useState(null);
  const [volume, setVolume] = useState(0.8);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const animatedSpin = useRef(new Animated.Value(0)).current;
  const spinLoopRef = useRef(null);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const togglePlayPause = async () => {
    try {
      if (!sound) {
        setIsBuffering(true);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: REMOTE_MUSIC_URL },
          { shouldPlay: true, volume }
        );
        
        if (!status.isLoaded) {
          throw new Error("Failed to load sound asset");
        }
        
        setSound(newSound);
        setIsPlaying(true);
        setIsBuffering(false);
        startSpinning();

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (!isSliding) {
              setPosition(status.positionMillis);
            }
            setDuration(status.durationMillis || 0);
            if (status.didJustFinish) {
              setIsPlaying(false);
              stopSpinning();
              setPosition(0);
            }
          } else if (status.error) {
            console.error(`Audio Update Error: ${status.error}`);
            setIsPlaying(false);
            stopSpinning();
          }
        });
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          stopSpinning();
        } else {
          await sound.playAsync();
          setIsPlaying(true);
          startSpinning();
        }
      }
      void impactMedium();
    } catch (error) {
      console.error("Playback error:", error);
      setIsBuffering(false);
      setIsPlaying(false);
      stopSpinning();
      alert("Could not load tracking. Please check your connection.");
    }
  };

  const startSpinning = () => {
    if (!spinLoopRef.current) {
      spinLoopRef.current = Animated.loop(
        Animated.timing(animatedSpin, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinLoopRef.current.start();
    }
  };

  const stopSpinning = () => {
    if (spinLoopRef.current) {
      spinLoopRef.current.stop();
      spinLoopRef.current = null;
    }
  };

  useEffect(() => {
    if (sound) {
      sound.setVolumeAsync(volume);
    }
  }, [volume, sound]);

  const handleSliderRelease = async (event) => {
    setIsSliding(false);
    if (!sound) return;
    const layoutWidth = width - 80; 
    const locX = event.nativeEvent.locationX;
    const progress = Math.max(0, Math.min(1, locX / layoutWidth));
    const newPosition = progress * duration;
    setPosition(newPosition);
    await sound.setPositionAsync(newPosition);
  };

  const handleSliderMove = (event) => {
    setIsSliding(true);
    const layoutWidth = width - 80;
    const locX = event.nativeEvent.locationX;
    const progress = Math.max(0, Math.min(1, locX / layoutWidth));
    setPosition(progress * duration);
  };

  const selectTrack = async (track) => {
    setCurrentTrack(track);
    setShowTrackSelector(false);
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      stopSpinning();
      setPosition(0);
    }
    void impactLight();
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const spin = animatedSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.musicMain}>
      <View style={styles.musicHeader}>
        <TouchableOpacity onPress={() => setShowTrackSelector(true)} style={styles.trackSelector}>
          <Text style={styles.currentTrackName}>{currentTrack.name}</Text>
          <ChevronRight color="white" size={16} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsButton}>
          <Volume2 color="white" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.musicDiskContainer}>
        <Animated.View style={[styles.musicDisk, { transform: [{ rotate: spin }], borderColor: currentTrack.phases[0].color, borderWidth: 3 }]}>
          <Music color={currentTrack.phases[0].color} size={80} />
        </Animated.View>
        <View style={styles.phaseIndicator}>
          <Text style={[styles.phaseText, { color: currentTrack.phases[0].color }]}>
            {isPlaying ? "Playing..." : "Ready"}
          </Text>
          {isBuffering && <Text style={styles.frequencyText}>Buffering audio...</Text>}
        </View>
      </View>

      <Text style={styles.trackDescription}>{currentTrack.description}</Text>

      <View style={{ width: width - 80, marginVertical: 20 }}>
        <View 
          style={{ width: '100%', height: 40, justifyContent: 'center' }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleSliderMove}
          onResponderMove={handleSliderMove}
          onResponderRelease={handleSliderRelease}
        >
          <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
            <View style={{ height: 6, backgroundColor: theme.colors.primary, borderRadius: 3, width: `${duration ? (position / duration) * 100 : 0}%` }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: 'white' }}>{formatTime(position)}</Text>
          <Text style={{ color: 'white' }}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controlRow}>
        <TouchableOpacity onPress={() => {}} style={styles.skipButton} disabled>
          <RefreshCw color="white" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
          {isPlaying ? <Pause color="white" size={40} /> : <Play color="white" size={40} fill="white" />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {}} style={styles.skipButton} disabled>
          <RefreshCw color="white" size={20} style={{ transform: [{ rotate: "180deg" }] }} />
        </TouchableOpacity>
      </View>

      <Modal visible={showTrackSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.trackSelectorModal, theme.glass]}>
            <TouchableOpacity onPress={() => setShowTrackSelector(false)} style={styles.closeModal}>
              <X color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choose Healing Track</Text>
            {HEALING_TRACKS.map((track) => (
              <TouchableOpacity key={track.id} onPress={() => selectTrack(track)} style={[styles.trackOption, currentTrack.id === track.id && styles.trackOptionSelected]}>
                <View style={styles.trackOptionInfo}>
                  <Text style={styles.trackOptionName}>{track.name}</Text>
                  <Text style={styles.trackOptionDesc}>{track.description}</Text>
                </View>
                {currentTrack.id === track.id && (
                  <View style={styles.selectedIndicator}>
                    <CheckCircle2 color={theme.colors.primary} size={20} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showSettings} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsModal, theme.glass]}>
            <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeModal}>
              <X color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sound Settings</Text>

            <View style={styles.volumeControl}>
              <Text style={styles.volumeLabel}>Volume</Text>
              <View style={styles.volumeSlider}>
                <TouchableOpacity onPress={() => setVolume(Math.max(0, volume - 0.1))}>
                  <VolumeX color="white" size={20} />
                </TouchableOpacity>
                <View style={styles.volumeBar}>
                  <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
                </View>
                <TouchableOpacity onPress={() => setVolume(Math.min(1, volume + 0.1))}>
                  <Volume2 color="white" size={20} />
                </TouchableOpacity>
              </View>
              <Text style={styles.volumeValue}>{Math.round(volume * 100)}%</Text>
            </View>

            <View style={styles.settingsInfo}>
              <Text style={styles.settingsInfoText}>🎵 Playing high quality relaxation music</Text>
              <Text style={styles.settingsInfoText}>💡 Adjust volume for the perfect ambiance.</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ------------------------------
// 5. Main Component
// ------------------------------
export default function ReliefTools({ type, onBack }) {
  const renderContent = () => {
    switch (type) {
      case "tools":
        return <ToolsHubSection />;
      case "memes":
        return <MemesSection />;
      case "books":
        return <BooksSection />;
      case "vr":
        return <VRSection />;
      case "music":
        return <MusicSection />;
      default:
        return <ToolsHubSection />;
    }
  };

  const headerLabel = (type || "tools").toUpperCase();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.colors.gradientCalm}
        style={styles.background}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            {typeof onBack === "function" ? (
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <ChevronLeft color="white" size={28} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}
            <Text style={styles.headerTitle}>{headerLabel}</Text>
            <View style={{ width: 28 }} />
          </View>
          {renderContent()}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ------------------------------
// 6. Enhanced Styles
// ------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
  },
  backButton: { padding: 4 },
  hubSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  hubCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  hubCardTitle: { color: "white", fontSize: 17, fontWeight: "700" },
  hubCardSub: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 },
  phaseLabel: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  memeCard: {
    width: width - 40,
    marginHorizontal: 20,
    height: 420,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  memeText: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 32,
    marginVertical: 20,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
    marginTop: 24,
  },
  bookCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bookTitle: { color: "white", fontSize: 16, fontWeight: "700" },
  bookAuthor: { color: theme.colors.textSecondary, fontSize: 13 },
  vrCard: {
    height: 120,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  vrName: { color: "white", fontSize: 22, fontWeight: "700" },
  musicMain: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  musicDisk: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  trackName: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  trackSub: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginBottom: 32,
  },
  musicButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    marginHorizontal: 12,
    justifyContent: "center",
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressKnob: {
    position: "absolute",
    width: "100%",
    height: 20,
    backgroundColor: "transparent",
  },
  timeText: { color: "white", fontSize: 12, width: 45 },
  controlRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  iconButton: { padding: 12 },
  volumeSliderContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    width: "100%",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 30,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: "white",
    paddingVertical: 12,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 12,
  },
  filterText: { color: "white", marginLeft: 6, fontWeight: "500" },
  toolHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  emptyText: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    width: width * 0.9,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalAuthor: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginBottom: 4,
  },
  modalYear: { color: theme.colors.textSecondary, marginBottom: 20 },
  favButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 12,
  },
  favButtonText: { color: "white", marginLeft: 8, fontWeight: "600" },
  closeModal: { position: "absolute", top: 16, right: 16, zIndex: 10 },
  vrModal: {
    width: width * 0.9,
    height: height * 0.6,
    borderRadius: 40,
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  vrModalTitle: {
    color: "white",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 16,
  },
  vrModalDesc: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
  },
  exitButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 40,
  },
  exitButtonText: { color: "white", fontWeight: "600" },

  // Enhanced Book Features
  bookCategory: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
  },
  benefitsContainer: { marginTop: 8 },
  benefitTag: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  bookActions: { flexDirection: "column", alignItems: "center" },
  audioButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  reflectionButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 16,
  },

  // Daily Book Feature
  dailyBookCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  dailyBookLabel: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  dailyBookTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  dailyBookAuthor: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  readDailyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  readDailyButtonText: { color: "white", fontWeight: "600" },

  // Emotion-Based Recommendations
  emotionSection: { marginBottom: 20 },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  emotionSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  emotionSelectorSelected: { backgroundColor: theme.colors.primary },
  emotionSelectorText: { color: "white", fontSize: 16 },
  recommendationsContainer: { marginTop: 12 },
  recommendationsTitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  recommendationCard: { padding: 12, borderRadius: 12, marginBottom: 8 },
  recommendationTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  recommendationReason: { color: theme.colors.textSecondary, fontSize: 12 },

  // Enhanced Modal
  modalDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  chaptersContainer: { width: "100%", marginBottom: 20 },
  chaptersTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  chapterCard: { padding: 12, borderRadius: 12, marginBottom: 8 },
  chapterTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  chapterSnippet: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 12,
  },
  modalActionButton: { alignItems: "center", marginBottom: 4 },
  modalActionText: { color: "white", fontSize: 12, fontWeight: "600" },

  // Emotion Picker Modal
  emotionPickerContent: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  emotionPickerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  emotionOption: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
    alignItems: "center",
  },
  emotionOptionLabel: { color: "white", fontSize: 16, fontWeight: "600" },
  cancelEmotionButton: { marginTop: 12 },
  cancelEmotionText: { color: theme.colors.textSecondary, fontSize: 16 },

  // Audio Modal
  audioModalContent: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  audioTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  audioText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
    lineHeight: 24,
  },
  audioNote: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Reflection Modal
  reflectionModalContent: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  reflectionTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  reflectionQuestion: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  reflectionInput: {
    width: "100%",
    height: 120,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
    color: "white",
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  saveReflectionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  saveReflectionText: { color: "white", fontWeight: "700" },

  // Advanced Healing Music Styles
  musicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  trackSelector: { flexDirection: "row", alignItems: "center" },
  currentTrackName: { color: "white", fontSize: 18, fontWeight: "600" },
  settingsButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 20,
  },
  musicDiskContainer: {
    alignItems: "center",
    marginBottom: 30,
    position: "relative",
  },
  phaseIndicator: { position: "absolute", bottom: -40, alignItems: "center" },
  phaseText: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  phaseTimer: { fontSize: 14, color: theme.colors.textSecondary },
  frequencyText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  trackDescription: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  sessionTimer: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  musicBenefitsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 24,
  },
  musicBenefitTag: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  musicBenefitText: { fontSize: 12, color: "white" },
  playButton: {
    backgroundColor: theme.colors.primary,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  // Track Selector Modal
  trackSelectorModal: {
    width: width * 0.9,
    borderRadius: 24,
    padding: 24,
    maxHeight: height * 0.7,
  },
  trackOption: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  trackOptionSelected: { backgroundColor: "rgba(255,255,255,0.1)" },
  trackOptionInfo: { flex: 1 },
  trackOptionName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  trackOptionDesc: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  trackOptionBenefits: {},
  trackOptionBenefit: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  selectedIndicator: { padding: 8 },

  // Settings Modal
  settingsModal: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  volumeControl: { width: "100%", marginBottom: 24 },
  volumeLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  volumeSlider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  volumeBar: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    marginHorizontal: 12,
  },
  volumeFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  volumeValue: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    minWidth: 40,
  },
  settingsInfo: {},
  settingsInfoText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
});
