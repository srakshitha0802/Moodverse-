// ============================================================
// DEEP ADVANCED MOOD ANALYSIS CONSTANTS
// ============================================================
// Multi-dimensional mood modeling with valence, arousal, and presence
// Includes dynamic profiling, recommendation engines, and semantic mood mapping

// ------------------------------
// CORE DIMENSIONS
// ------------------------------

/**
 * Mood dimensions used across all profiles and questions.
 * @typedef {Object} MoodVector
 * @property {number} valence - Emotional tone: -1 (negative) to +1 (positive)
 * @property {number} arousal - Energy level: -1 (low/calm) to +1 (high/stimulated)
 * @property {number} presence - Mindfulness vs distraction: -1 (ruminating/dissociated) to +1 (fully present)
 */

export const MOOD_DIMENSIONS = {
  VALENCE: "valence",
  AROUSAL: "arousal",
  PRESENCE: "presence",
};

// ------------------------------
// ENHANCED COGNITIVE QUESTIONS
// ------------------------------
// Each option maps to a 3D vector (valence, arousal, presence)

export const COGNITIVE_QUESTIONS = [
  {
    id: "silence_feeling",
    text: "How does deep silence feel to you right now?",
    options: ["Unsettling", "Comforting", "Indifferent"],
    dimensions: {
      Unsettling: { valence: -0.6, arousal: 0.5, presence: -0.4 },
      Comforting: { valence: 0.7, arousal: -0.3, presence: 0.7 },
      Indifferent: { valence: 0.0, arousal: 0.0, presence: 0.1 },
    },
  },
  {
    id: "breath_quality",
    text: "Is your breath shallow or deep?",
    options: ["Shallow", "Moderate", "Deep"],
    dimensions: {
      Shallow: { valence: -0.4, arousal: 0.6, presence: -0.5 },
      Moderate: { valence: 0.2, arousal: 0.0, presence: 0.2 },
      Deep: { valence: 0.6, arousal: -0.5, presence: 0.8 },
    },
  },
  {
    id: "mental_noise",
    text: "Do you feel mental 'noise'?",
    options: ["Loud", "Quiet", "Silence"],
    dimensions: {
      Loud: { valence: -0.7, arousal: 0.8, presence: -0.7 },
      Quiet: { valence: 0.3, arousal: -0.2, presence: 0.4 },
      Silence: { valence: 0.8, arousal: -0.6, presence: 0.9 },
    },
  },
  {
    id: "physical_tension",
    text: "Your physical tension is currently:",
    options: ["High", "Neutral", "Low"],
    dimensions: {
      High: { valence: -0.5, arousal: 0.7, presence: -0.3 },
      Neutral: { valence: 0.2, arousal: 0.0, presence: 0.2 },
      Low: { valence: 0.6, arousal: -0.5, presence: 0.5 },
    },
  },
  {
    id: "energy_level",
    text: "Current energy level:",
    options: ["Drained", "Awake", "Vibrant"],
    dimensions: {
      Drained: { valence: -0.3, arousal: -0.6, presence: -0.2 },
      Awake: { valence: 0.4, arousal: 0.3, presence: 0.5 },
      Vibrant: { valence: 0.8, arousal: 0.7, presence: 0.6 },
    },
  },
  {
    id: "mind_state",
    text: "Your mind's current state:",
    options: ["Racing", "Wandering", "Focused"],
    dimensions: {
      Racing: { valence: -0.5, arousal: 0.8, presence: -0.8 },
      Wandering: { valence: 0.0, arousal: -0.1, presence: -0.3 },
      Focused: { valence: 0.7, arousal: 0.2, presence: 0.9 },
    },
  },
  {
    id: "self_connection",
    text: "Feeling of connection to yourself:",
    options: ["Disconnected", "Neutral", "Connected"],
    dimensions: {
      Disconnected: { valence: -0.6, arousal: -0.2, presence: -0.7 },
      Neutral: { valence: 0.1, arousal: 0.0, presence: 0.1 },
      Connected: { valence: 0.7, arousal: 0.1, presence: 0.8 },
    },
  },
];

// ------------------------------
// ADVANCED MOOD PROFILES
// ------------------------------
// Each profile includes centroid vector (valence, arousal, presence)
// and rich recommendations for holistic well-being.

export const MOOD_PROFILES = {
  serene_flow: {
    id: "serene_flow",
    name: "Serene Flow",
    description: "Balanced, present, and at ease",
    centroid: { valence: 0.7, arousal: -0.4, presence: 0.8 },
    color: "#06D6A0",
    chakra: "Anahata (Heart) - Open and loving",
    flower: "Lotus",
    book: "The Art of Stillness by Pico Iyer",
    affirmations: [
      "I am exactly where I need to be",
      "My breath anchors me in peace",
    ],
    todos: [
      "Practice 10 minutes of mindful walking",
      "Journal three things you're grateful for",
      "Do a loving-kindness meditation",
      "Stretch for 5 minutes",
    ],
    musicGenre: "Ambient / Classical",
    crystals: ["Rose Quartz", "Green Aventurine"],
    aromatherapy: "Lavender, Frankincense",
    yogaPose: "Savasana (Corpse Pose) or Sukhasana",
  },
  anxious_overload: {
    id: "anxious_overload",
    name: "Anxious Overload",
    description: "Racing thoughts, tension, restlessness",
    centroid: { valence: -0.5, arousal: 0.7, presence: -0.6 },
    color: "#EF4444",
    chakra: "Manipura (Solar Plexus) - Overactive",
    flower: "Chamomile",
    book: "Unwinding Anxiety by Judson Brewer",
    affirmations: ["This feeling is temporary", "I can return to my breath"],
    todos: [
      "Try 4-7-8 breathing for 2 minutes",
      "List your worries and circle what you can control",
      "Do a body scan meditation",
      "Go for a short walk without phone",
    ],
    musicGenre: "Binaural Beats (Theta waves), Lo-fi",
    crystals: ["Amethyst", "Lepidolite"],
    aromatherapy: "Chamomile, Bergamot",
    yogaPose: "Balasana (Child's Pose)",
  },
  energetic_vibrant: {
    id: "energetic_vibrant",
    name: "Energetic & Vibrant",
    description: "High vitality, motivated, inspired",
    centroid: { valence: 0.8, arousal: 0.7, presence: 0.5 },
    color: "#FF9F1C",
    chakra: "Svadhisthana (Sacral) - Flowing",
    flower: "Sunflower",
    book: "Big Magic by Elizabeth Gilbert",
    affirmations: ["My energy creates my reality", "I embrace action with joy"],
    todos: [
      "Channel energy into a creative project",
      "Do a high-intensity workout (15 min)",
      "Plan your most important task for tomorrow",
      "Call a friend to share ideas",
    ],
    musicGenre: "Upbeat / Electronic / Dance",
    crystals: ["Carnelian", "Citrine"],
    aromatherapy: "Sweet Orange, Peppermint",
    yogaPose: "Surya Namaskar (Sun Salutations)",
  },
  fatigued_burned: {
    id: "fatigued_burned",
    name: "Fatigued & Burned",
    description: "Low energy, mental fog, exhaustion",
    centroid: { valence: -0.4, arousal: -0.7, presence: -0.3 },
    color: "#6B7280",
    chakra: "Muladhara (Root) - Depleted",
    flower: "Lavender",
    book: "Rest by Alex Soojung-Kim Pang",
    affirmations: ["Rest is productive", "I honor my need for recovery"],
    todos: [
      "Take a 20-minute power nap",
      "Drink a full glass of water with lemon",
      "Do nothing for 10 minutes (no screens)",
      "Eat a nourishing snack",
    ],
    musicGenre: "Soft Piano, Nature Sounds",
    crystals: ["Hematite", "Red Jasper"],
    aromatherapy: "Vetiver, Basil",
    yogaPose: "Viparita Karani (Legs-up-the-wall)",
  },
  sad_heavy: {
    id: "sad_heavy",
    name: "Sad & Heavy",
    description: "Low mood, lethargy, emotional weight",
    centroid: { valence: -0.7, arousal: -0.4, presence: -0.4 },
    color: "#8B5CF6",
    chakra: "Vishuddha (Throat) - Blocked",
    flower: "Rose",
    book: "Reasons to Stay Alive by Matt Haig",
    affirmations: [
      "I allow myself to feel without judgment",
      "Better days are coming",
    ],
    todos: [
      "Listen to one uplifting song",
      "Write down one small win today",
      "Call or text someone you trust",
      "Step outside for 2 minutes of sunlight",
    ],
    musicGenre: "Acoustic / Gentle Folk",
    crystals: ["Rhodochrosite", "Moonstone"],
    aromatherapy: "Rose, Clary Sage",
    yogaPose: "Uttanasana (Forward Fold)",
  },
  neutral_balanced: {
    id: "neutral_balanced",
    name: "Neutral Balanced",
    description: "Even-keeled, adaptable, present",
    centroid: { valence: 0.2, arousal: 0.0, presence: 0.3 },
    color: "#A0AEC0",
    chakra: "Ajna (Third Eye) - Clear",
    flower: "Jasmine",
    book: "Wherever You Go, There You Are by Jon Kabat-Zinn",
    affirmations: ["I am grounded in this moment", "I flow with ease"],
    todos: [
      "Try a new mindful eating exercise",
      "Declutter one small space",
      "Do a 5-minute breath awareness",
      "Set an intention for tomorrow",
    ],
    musicGenre: "Jazz / Instrumental",
    crystals: ["Clear Quartz", "Selenite"],
    aromatherapy: "Jasmine, Sandalwood",
    yogaPose: "Tadasana (Mountain Pose)",
  },
  creative_flow: {
    id: "creative_flow",
    name: "Creative Flow",
    description: "Inspired, imaginative, in the zone",
    centroid: { valence: 0.7, arousal: 0.4, presence: 0.9 },
    color: "#F72585",
    chakra: "Svadhisthana + Vishuddha (Sacral + Throat)",
    flower: "Orchid",
    book: "The Artist's Way by Julia Cameron",
    affirmations: ["Creativity flows through me", "I trust my inner voice"],
    todos: [
      "Brain dump ideas for 10 minutes",
      "Doodle or sketch something abstract",
      "Try a new recipe or craft",
      "Write a short poem",
    ],
    musicGenre: "Cinematic / Indie / Trip-hop",
    crystals: ["Opal", "Labradorite"],
    aromatherapy: "Ylang Ylang, Rosemary",
    yogaPose: "Natrajasana (Dancer's Pose)",
  },
  socially_connected: {
    id: "socially_connected",
    name: "Socially Connected",
    description: "Warm, engaged, sense of belonging",
    centroid: { valence: 0.8, arousal: 0.3, presence: 0.6 },
    color: "#4CC9F0",
    chakra: "Anahata + Vishuddha (Heart + Throat)",
    flower: "Daisy",
    book: "The Art of Gathering by Priya Parker",
    affirmations: ["I am seen and heard", "Connection is my birthright"],
    todos: [
      "Send a voice note to a loved one",
      "Join a community event (online/offline)",
      "Practice active listening with someone",
      "Share a meal without distractions",
    ],
    musicGenre: "Soul / Funk / World",
    crystals: ["Blue Lace Agate", "Amazonite"],
    aromatherapy: "Geranium, Mandarin",
    yogaPose: "Anahata mudra (Heart seal)",
  },
  hopeful_sunrise: {
    id: "hopeful_sunrise",
    name: "Hopeful Sunrise",
    description: "Optimistic, forward-looking, light",
    centroid: { valence: 0.9, arousal: 0.2, presence: 0.4 },
    color: "#FFD166",
    chakra: "Ajna + Sahasrara (Third Eye + Crown)",
    flower: "Dandelion",
    book: "Optimism: The Biology of Hope by Lionel Tiger",
    affirmations: [
      "The future is bright with possibility",
      "I welcome new beginnings",
    ],
    todos: [
      "Write down one goal for the next month",
      "Watch the sunrise or sunset",
      "Make a vision board collage",
      "Plan a small adventure",
    ],
    musicGenre: "Ambient / Uplifting Electronica",
    crystals: ["Sunstone", "Yellow Calcite"],
    aromatherapy: "Grapefruit, Lemon Balm",
    yogaPose: "Ustrasana (Camel Pose) for heart opening",
  },
};

// ------------------------------
// MOOD CENTROID LOOKUP & SIMILARITY CONFIG
// ------------------------------

export const PROFILE_CENTROIDS = Object.values(MOOD_PROFILES).map(
  (profile) => ({
    id: profile.id,
    centroid: profile.centroid,
  }),
);

export const ADVANCED_CONFIG = {
  similarityMetric: "cosine", // 'cosine' or 'euclidean'
  useWeightedQuestions: true, // weight questions by confidence or relevance
  normalizationRange: { min: -1, max: 1 },
  defaultMoodId: "neutral_balanced",
  presenceImportance: 1.2, // multiplier for presence dimension (higher = more mindfulness weight)
};

// ------------------------------
// HELPER FUNCTIONS (Advanced mood analysis)
// ------------------------------

/**
 * Compute average mood vector from selected answers.
 * @param {Array<{selectedOption: string, questionId: string}>} answers - Array of user selections
 * @returns {MoodVector} Average vector {valence, arousal, presence}
 */
export function computeMoodVector(answers) {
  const sum = { valence: 0, arousal: 0, presence: 0 };
  let count = 0;

  for (const ans of answers) {
    const question = COGNITIVE_QUESTIONS.find((q) => q.id === ans.questionId);
    if (!question) continue;
    const dims = question.dimensions[ans.selectedOption];
    if (dims) {
      sum.valence += dims.valence;
      sum.arousal += dims.arousal;
      sum.presence += dims.presence;
      count++;
    }
  }

  if (count === 0) return { valence: 0, arousal: 0, presence: 0 };
  return {
    valence: sum.valence / count,
    arousal: sum.arousal / count,
    presence: sum.presence / count,
  };
}

/**
 * Compute cosine similarity between two mood vectors.
 * @param {MoodVector} a
 * @param {MoodVector} b
 * @returns {number} similarity between -1 and 1
 */
export function cosineSimilarity(a, b) {
  const dot =
    a.valence * b.valence + a.arousal * b.arousal + a.presence * b.presence;
  const magA = Math.hypot(a.valence, a.arousal, a.presence);
  const magB = Math.hypot(b.valence, b.arousal, b.presence);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Find best matching mood profile for a given mood vector.
 * @param {MoodVector} userVector
 * @returns {Object} The closest mood profile object
 */
export function findClosestMoodProfile(userVector) {
  let bestProfile = null;
  let bestScore = -Infinity;

  for (const profile of Object.values(MOOD_PROFILES)) {
    const similarity = cosineSimilarity(userVector, profile.centroid);
    const score = similarity;
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }
  return bestProfile || MOOD_PROFILES[ADVANCED_CONFIG.defaultMoodId];
}

/**
 * Get personalized recommendations based on answers or direct vector.
 * @param {Array|MoodVector} answersOrVector - Either answers array or precomputed vector
 * @returns {Object} Mood profile with recommendations
 */
export function getPersonalizedRecommendations(answersOrVector) {
  let vector;
  if (Array.isArray(answersOrVector)) {
    vector = computeMoodVector(answersOrVector);
  } else {
    vector = answersOrVector;
  }
  const profile = findClosestMoodProfile(vector);
  return {
    profile,
    vector,
    similarity: cosineSimilarity(vector, profile.centroid),
  };
}

/**
 * Weighted mood adjustment for external context (time of day, weather, etc.)
 * @param {MoodVector} baseVector
 * @param {Object} context - e.g., { hour: 14, weather: 'rainy' }
 * @returns {MoodVector} Adjusted vector
 */
export function applyContextAdjustments(baseVector, context = {}) {
  let { valence, arousal, presence } = baseVector;
  const hour =
    context.hour !== undefined ? context.hour : new Date().getHours();

  // Morning boost (6-9 AM) tends to increase arousal slightly
  if (hour >= 6 && hour <= 9) {
    arousal = Math.min(1, arousal + 0.1);
    valence = Math.min(1, valence + 0.05);
  }
  // Late night (22-5) decreases arousal
  if (hour >= 22 || hour <= 5) {
    arousal = Math.max(-1, arousal - 0.2);
    presence = Math.max(-1, presence - 0.1);
  }

  if (context.weather === "rainy") {
    valence = Math.max(-1, valence - 0.1);
    presence = Math.max(-1, presence - 0.05);
  } else if (context.weather === "sunny") {
    valence = Math.min(1, valence + 0.1);
    arousal = Math.min(1, arousal + 0.05);
  }

  return { valence, arousal, presence };
}

// ------------------------------
// EXPORT ALL ADVANCED CONSTANTS & FUNCTIONS
// ------------------------------
