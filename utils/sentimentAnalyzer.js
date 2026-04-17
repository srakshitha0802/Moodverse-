// utils/sentimentAnalysis.js - Advanced sentiment and emotion analyzer for MoodScanner

/**
 * Advanced sentiment analysis module with lexicon-based scoring,
 * negation handling, intensifier detection, emoticon/emoji support,
 * and multi-emotion probability mapping.
 *
 * @module sentimentAnalysis
 */

// ============================================================================
// LEXICONS
// ============================================================================

/**
 * Sentiment lexicon: maps words to a score between -5 (very negative) and +5 (very positive)
 * Based on AFINN-111 and extended with common emotional words.
 */
const SENTIMENT_LEXICON = {
  // Positive emotions
  happy: 3.0,
  joy: 4.0,
  joyful: 4.0,
  delighted: 4.5,
  pleased: 3.0,
  glad: 3.0,
  cheerful: 3.5,
  ecstatic: 5.0,
  euphoric: 5.0,
  content: 2.0,
  satisfied: 2.5,
  optimistic: 3.0,
  hopeful: 2.5,
  excited: 4.0,
  enthusiastic: 3.5,

  // Love & affection
  love: 4.5,
  adore: 4.5,
  like: 2.0,
  enjoy: 3.0,
  appreciate: 3.0,
  cherish: 4.0,
  caring: 3.0,
  affectionate: 3.5,
  fond: 2.5,
  passion: 3.5,

  // Positive descriptors
  good: 3.0,
  great: 4.0,
  excellent: 5.0,
  amazing: 4.5,
  wonderful: 4.5,
  fantastic: 4.5,
  awesome: 4.0,
  superb: 4.5,
  brilliant: 4.0,
  perfect: 4.5,
  nice: 2.5,
  fine: 2.0,
  lovely: 3.5,
  beautiful: 4.0,
  pretty: 2.0,
  cool: 2.5,
  incredible: 4.0,
  outstanding: 4.5,
  remarkable: 4.0,

  // Positive actions
  success: 3.5,
  win: 3.5,
  winner: 4.0,
  victory: 4.0,
  achieve: 3.0,
  accomplished: 3.5,
  celebrate: 4.0,
  laugh: 3.0,
  smile: 3.0,
  fun: 3.5,
  relaxing: 2.5,
  peace: 3.0,
  calm: 2.0,
  relief: 2.5,
  grateful: 3.5,
  thank: 2.0,
  thanks: 2.0,
  thankful: 3.0,

  // Negative emotions
  sad: -3.5,
  sadness: -3.5,
  unhappy: -3.0,
  depressed: -4.5,
  miserable: -4.5,
  gloomy: -3.5,
  hopeless: -4.0,
  despair: -4.5,
  grief: -4.5,
  sorrow: -4.0,
  upset: -3.0,
  hurt: -3.5,
  crying: -4.0,
  tear: -3.0,

  // Anger & frustration
  angry: -4.0,
  anger: -4.0,
  mad: -3.5,
  furious: -5.0,
  rage: -5.0,
  annoyed: -3.0,
  irritated: -3.0,
  frustrated: -3.5,
  bitter: -3.5,
  hate: -4.5,
  hatred: -4.5,
  disgust: -4.0,

  // Fear & anxiety
  fear: -4.0,
  scared: -4.0,
  afraid: -3.5,
  terrified: -5.0,
  anxious: -3.5,
  worry: -3.0,
  worried: -3.0,
  nervous: -3.0,
  panic: -4.5,
  stressed: -3.5,
  tense: -3.0,
  dread: -4.0,
  horrified: -4.5,

  // Negative descriptors
  bad: -3.5,
  worse: -4.0,
  worst: -5.0,
  poor: -3.0,
  awful: -4.0,
  terrible: -4.5,
  horrible: -4.5,
  nasty: -4.0,
  ugly: -3.0,
  crap: -4.0,
  shit: -4.5,
  damn: -3.0,
  sucks: -4.0,
  disappointing: -3.5,

  // Negative actions & states
  fail: -3.5,
  failed: -3.5,
  loss: -3.5,
  lose: -3.0,
  lost: -3.0,
  pain: -4.0,
  suffering: -4.5,
  cry: -4.0,
  lonely: -3.5,
  alone: -3.0,
  abandoned: -4.0,
  rejected: -3.5,
  jealous: -3.0,
  envy: -3.0,

  // Intensity modifiers (handled separately, but have base sentiment)
  very: 0,
  extremely: 0,
  incredibly: 0,
  quite: 0,
  slightly: 0,
  barely: 0,
  not: 0,
  never: 0,
  no: 0,
  none: 0,
};

/**
 * Emotion lexicon: maps words to primary emotion categories with intensity.
 * Categories: joy, sadness, anger, fear, surprise, disgust, neutral.
 */
const EMOTION_LEXICON = {
  // Joy
  happy: { joy: 0.8 },
  joy: { joy: 1.0 },
  joyful: { joy: 0.9 },
  delighted: { joy: 0.9 },
  pleased: { joy: 0.7 },
  glad: { joy: 0.7 },
  cheerful: { joy: 0.8 },
  ecstatic: { joy: 1.0 },
  euphoric: { joy: 1.0 },
  content: { joy: 0.6 },
  satisfied: { joy: 0.6 },
  optimistic: { joy: 0.7 },
  hopeful: { joy: 0.6 },
  excited: { joy: 0.8, surprise: 0.2 },
  love: { joy: 0.9 },
  adore: { joy: 0.9 },
  like: { joy: 0.5 },
  enjoy: { joy: 0.7 },
  appreciate: { joy: 0.6 },
  laugh: { joy: 0.7 },
  smile: { joy: 0.6 },
  fun: { joy: 0.7 },
  celebrate: { joy: 0.8 },
  grateful: { joy: 0.7 },
  good: { joy: 0.5 },
  great: { joy: 0.6 },
  excellent: { joy: 0.7 },
  amazing: { joy: 0.8 },
  wonderful: { joy: 0.8 },
  fantastic: { joy: 0.8 },
  awesome: { joy: 0.7 },

  // Sadness
  sad: { sadness: 0.8 },
  sadness: { sadness: 0.9 },
  unhappy: { sadness: 0.7 },
  depressed: { sadness: 1.0 },
  miserable: { sadness: 0.9 },
  gloomy: { sadness: 0.7 },
  hopeless: { sadness: 0.9 },
  despair: { sadness: 1.0 },
  grief: { sadness: 1.0 },
  sorrow: { sadness: 0.9 },
  upset: { sadness: 0.7 },
  hurt: { sadness: 0.7, anger: 0.2 },
  crying: { sadness: 0.9 },
  tear: { sadness: 0.6 },
  lonely: { sadness: 0.7 },
  alone: { sadness: 0.6 },
  abandoned: { sadness: 0.8 },
  rejected: { sadness: 0.7 },
  loss: { sadness: 0.8 },
  lost: { sadness: 0.6 },
  pain: { sadness: 0.6, anger: 0.2 },
  suffering: { sadness: 0.8 },
  bad: { sadness: 0.5 },
  terrible: { sadness: 0.7 },
  awful: { sadness: 0.7 },

  // Anger
  angry: { anger: 0.9 },
  anger: { anger: 1.0 },
  mad: { anger: 0.8 },
  furious: { anger: 1.0 },
  rage: { anger: 1.0 },
  annoyed: { anger: 0.6 },
  irritated: { anger: 0.6 },
  frustrated: { anger: 0.8 },
  bitter: { anger: 0.7 },
  hate: { anger: 0.9 },
  hatred: { anger: 0.9 },
  crap: { anger: 0.6 },
  sucks: { anger: 0.6 },
  disappointing: { anger: 0.5, sadness: 0.3 },
  fail: { anger: 0.5, sadness: 0.3 },
  jealous: { anger: 0.6, sadness: 0.2 },
  envy: { anger: 0.6 },

  // Fear
  fear: { fear: 1.0 },
  scared: { fear: 0.9 },
  afraid: { fear: 0.8 },
  terrified: { fear: 1.0 },
  anxious: { fear: 0.8 },
  worry: { fear: 0.7 },
  worried: { fear: 0.7 },
  nervous: { fear: 0.6 },
  panic: { fear: 0.9 },
  stressed: { fear: 0.7, anger: 0.2 },
  tense: { fear: 0.6 },
  dread: { fear: 0.8 },
  horrified: { fear: 0.9 },

  // Surprise
  surprise: { surprise: 0.8 },
  surprised: { surprise: 0.7 },
  shocking: { surprise: 0.8, fear: 0.2 },
  unexpected: { surprise: 0.7 },
  amazed: { surprise: 0.7, joy: 0.2 },
  astonishing: { surprise: 0.8 },
  wow: { surprise: 0.6, joy: 0.3 },
  oh: { surprise: 0.4 },

  // Disgust
  disgust: { disgust: 0.9 },
  disgusting: { disgust: 0.8 },
  repulsive: { disgust: 0.8 },
  gross: { disgust: 0.7 },
  sick: { disgust: 0.6 },
  horrible: { disgust: 0.5, sadness: 0.3 },
  nasty: { disgust: 0.6 },
};

/**
 * Intensifier words that modify sentiment strength.
 * Maps word to multiplier (>1 amplifies, <1 diminishes).
 */
const INTENSIFIERS = {
  very: 1.5,
  extremely: 2.0,
  incredibly: 2.0,
  really: 1.4,
  so: 1.5,
  quite: 1.2,
  somewhat: 0.9,
  slightly: 0.7,
  barely: 0.5,
  hardly: 0.4,
  a_bit: 0.7,
  kind_of: 0.8,
  sort_of: 0.8,
  absolutely: 2.0,
  totally: 1.6,
  completely: 1.8,
  utterly: 1.9,
  exceptionally: 1.8,
  particularly: 1.3,
  especially: 1.3,
  rather: 1.2,
  pretty: 1.2,
  fairly: 1.1,
};

/**
 * Negation words that flip sentiment polarity.
 */
const NEGATIONS = new Set([
  "not",
  "never",
  "no",
  "none",
  "neither",
  "nor",
  "nobody",
  "nothing",
  "cannot",
  "can't",
  "won't",
  "shouldn't",
  "wouldn't",
  "couldn't",
  "don't",
  "doesn't",
  "didn't",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "hardly",
  "scarcely",
  "barely",
]);

/**
 * Emoji to sentiment mapping (common emojis).
 */
const EMOJI_SENTIMENT = {
  // Positive
  "😀": 2.5,
  "😃": 2.5,
  "😄": 2.5,
  "😁": 2.5,
  "😆": 3.0,
  "😅": 2.0,
  "😂": 3.0,
  "🤣": 3.0,
  "😊": 3.0,
  "😇": 3.0,
  "😍": 4.0,
  "🥰": 4.0,
  "😘": 3.5,
  "😗": 2.0,
  "😙": 2.5,
  "😚": 2.5,
  "🙂": 2.0,
  "🤗": 3.0,
  "🤩": 3.5,
  "😎": 2.5,
  "🥳": 3.5,
  "👍": 2.0,
  "❤️": 3.5,
  "💕": 3.5,
  "💖": 3.5,
  "💗": 3.5,
  "💓": 3.0,
  "💞": 3.5,
  "✨": 1.5,
  "⭐": 1.5,

  // Negative
  "😔": -2.5,
  "😕": -2.0,
  "😟": -2.5,
  "😞": -3.0,
  "😢": -3.5,
  "😭": -4.0,
  "😤": -3.0,
  "😠": -3.5,
  "😡": -4.0,
  "🤬": -4.5,
  "😩": -3.0,
  "😫": -3.0,
  "😖": -3.0,
  "😣": -2.5,
  "😥": -2.5,
  "😪": -2.0,
  "😓": -2.0,
  "😨": -3.0,
  "😰": -3.0,
  "😱": -3.5,
  "😦": -2.5,
  "😧": -2.5,
  "😮": -1.0,
  "😯": -1.0,
  "😐": -0.5,
  "😑": -0.5,
  "😶": -0.5,
  "🙁": -2.0,
  "☹️": -2.5,
  "👎": -2.0,
  "💔": -3.0,
};

/**
 * Emoji to emotion mapping (for emotion analysis).
 */
const EMOJI_EMOTION = {
  "😀": { joy: 0.6 },
  "😃": { joy: 0.7 },
  "😄": { joy: 0.7 },
  "😂": { joy: 0.8 },
  "🤣": { joy: 0.8 },
  "😊": { joy: 0.7 },
  "😍": { joy: 0.9 },
  "🥰": { joy: 0.9 },
  "😘": { joy: 0.7 },
  "😔": { sadness: 0.7 },
  "😢": { sadness: 0.8 },
  "😭": { sadness: 0.9 },
  "😤": { anger: 0.7 },
  "😠": { anger: 0.8 },
  "😡": { anger: 0.9 },
  "🤬": { anger: 0.9, disgust: 0.1 },
  "😨": { fear: 0.7 },
  "😰": { fear: 0.7 },
  "😱": { fear: 0.8 },
  "😮": { surprise: 0.7 },
  "😯": { surprise: 0.6 },
  "🤔": { neutral: 0.5 },
  "😐": { neutral: 0.6 },
};

// ============================================================================
// TEXT PREPROCESSING
// ============================================================================

/**
 * Tokenizes text into words, handling punctuation and contractions.
 * @param {string} text - Input text
 * @returns {string[]} Array of cleaned tokens
 */
const tokenize = (text) => {
  // Convert to lowercase
  let processed = text.toLowerCase();

  // Handle common contractions
  processed = processed.replace(/n't/g, " not");
  processed = processed.replace(/'re/g, " are");
  processed = processed.replace(/'ve/g, " have");
  processed = processed.replace(/'ll/g, " will");
  processed = processed.replace(/'d/g, " would");
  processed = processed.replace(/'m/g, " am");
  processed = processed.replace(/won't/g, "will not");
  processed = processed.replace(/can't/g, "cannot");

  // Split on non-alphabetic characters (keep apostrophes in words like "don't" but we already expanded)
  const words = processed.split(/[^a-zA-ZÀ-ÿ']+/).filter((w) => w.length > 0);

  // Handle special cases like "a_bit" for intensifier detection
  return words;
};

/**
 * Extracts emojis from text.
 * @param {string} text - Input text
 * @returns {string[]} Array of emoji characters found
 */
const extractEmojis = (text) => {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;
  return text.match(emojiRegex) || [];
};

// ============================================================================
// CORE SENTIMENT ANALYSIS
// ============================================================================

/**
 * Analyzes sentiment score of text with context awareness (negations, intensifiers).
 * @param {string} text - Input text to analyze
 * @returns {number} Sentiment score from -1 (negative) to +1 (positive)
 */
export const analyzeSentiment = (text) => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return 0;
  }

  const tokens = tokenize(text);
  const emojis = extractEmojis(text);

  let totalScore = 0;
  let sentimentWordCount = 0;

  // Process tokens with sliding window for negation/intensifier context
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const baseScore = SENTIMENT_LEXICON[token] || 0;

    // Skip neutral words
    if (baseScore === 0) continue;

    let multiplier = 1.0;
    let negation = false;

    // Check preceding words for intensifiers and negations (window of 3)
    const start = Math.max(0, i - 3);
    for (let j = start; j < i; j++) {
      const prevToken = tokens[j];

      // Check for intensifier
      if (INTENSIFIERS[prevToken]) {
        multiplier *= INTENSIFIERS[prevToken];
      }

      // Check for negation
      if (NEGATIONS.has(prevToken)) {
        negation = !negation; // Toggle negation (double negative flips back)
      }
    }

    // Apply negation (flip sign)
    let adjustedScore = baseScore * multiplier;
    if (negation) {
      adjustedScore = -adjustedScore * 0.8; // Negation reduces magnitude slightly
    }

    totalScore += adjustedScore;
    sentimentWordCount++;
  }

  // Add emoji contributions
  for (const emoji of emojis) {
    const emojiScore = EMOJI_SENTIMENT[emoji] || 0;
    if (emojiScore !== 0) {
      totalScore += emojiScore;
      sentimentWordCount++;
    }
  }

  // Handle punctuation-based emphasis (exclamation marks amplify, question marks reduce)
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  if (exclamationCount > 0 && sentimentWordCount > 0) {
    totalScore *= 1 + Math.min(exclamationCount * 0.1, 0.5);
  }
  if (questionCount > 0 && sentimentWordCount > 0) {
    totalScore *= 1 - Math.min(questionCount * 0.05, 0.3);
  }

  // Normalize by number of sentiment-bearing items, with fallback
  if (sentimentWordCount === 0) return 0;

  // Normalize typical lexicon range (-5 to +5) to -1..1 and clamp
  let normalizedScore = totalScore / (sentimentWordCount * 5);
  normalizedScore = Math.max(-1, Math.min(1, normalizedScore));

  // Apply additional smoothing for very short texts
  if (sentimentWordCount === 1) {
    // Single sentiment word: slightly reduce extreme scores for nuance
    normalizedScore = normalizedScore * 0.9;
  }

  return Math.round(normalizedScore * 100) / 100; // Round to 2 decimals
};

// ============================================================================
// EMOTION ANALYSIS
// ============================================================================

/**
 * Analyzes emotional content of text, returning probability distribution over emotions.
 * @param {string} text - Input text to analyze
 * @returns {Object} Object mapping emotion names to probabilities (sum = 1)
 */
export const analyzeEmotions = (text) => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return {
      joy: 0.2,
      sadness: 0.2,
      anger: 0.1,
      fear: 0.1,
      surprise: 0.1,
      disgust: 0.1,
      neutral: 0.2,
    };
  }

  const tokens = tokenize(text);
  const emojis = extractEmojis(text);

  // Emotion accumulator
  const emotionScores = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    neutral: 0,
  };

  let emotionWordCount = 0;

  // Process tokens with context (negation flips emotion polarity for opposite categories)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const emotionMap = EMOTION_LEXICON[token];

    if (!emotionMap) continue;

    // Check for negation within window of 2
    let isNegated = false;
    const start = Math.max(0, i - 2);
    for (let j = start; j < i; j++) {
      if (NEGATIONS.has(tokens[j])) {
        isNegated = !isNegated;
      }
    }

    // Add emotion scores
    for (const [emotion, intensity] of Object.entries(emotionMap)) {
      const value = intensity;
      if (isNegated) {
        // Negation flips to opposite emotion (simplified: joy <-> sadness, anger <-> fear, etc.)
        const opposite = getOppositeEmotion(emotion);
        if (opposite) {
          emotionScores[opposite] += value * 0.7;
        } else {
          emotionScores[emotion] += value * 0.3; // reduced
        }
      } else {
        emotionScores[emotion] += value;
      }
      emotionWordCount++;
    }
  }

  // Add emoji contributions
  for (const emoji of emojis) {
    const emojiEmotion = EMOJI_EMOTION[emoji];
    if (emojiEmotion) {
      for (const [emotion, intensity] of Object.entries(emojiEmotion)) {
        emotionScores[emotion] += intensity;
        emotionWordCount++;
      }
    }
  }

  // Add neutral baseline based on text length (longer texts have more neutral potential)
  const neutralBaseline = Math.min(0.3, tokens.length / 100);
  emotionScores.neutral += neutralBaseline;

  // If no emotion words detected, return neutral-biased distribution
  if (emotionWordCount === 0) {
    return {
      joy: 0.1,
      sadness: 0.1,
      anger: 0.05,
      fear: 0.05,
      surprise: 0.05,
      disgust: 0.05,
      neutral: 0.6,
    };
  }

  // Normalize to probabilities
  const total = Object.values(emotionScores).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { neutral: 1.0 };
  }

  const probabilities = {};
  for (const [emotion, score] of Object.entries(emotionScores)) {
    probabilities[emotion] = Math.round((score / total) * 100) / 100;
  }

  // Ensure sum is exactly 1 (fix rounding issues)
  const sum = Object.values(probabilities).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.01) {
    probabilities.neutral += 1 - sum;
  }

  return probabilities;
};

/**
 * Returns the opposite emotion for negation handling.
 * @param {string} emotion - Emotion name
 * @returns {string|null} Opposite emotion or null
 */
const getOppositeEmotion = (emotion) => {
  const opposites = {
    joy: "sadness",
    sadness: "joy",
    anger: "fear",
    fear: "anger",
    surprise: "neutral",
    disgust: "neutral",
  };
  return opposites[emotion] || null;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Performs both sentiment and emotion analysis in one call.
 * @param {string} text - Input text
 * @returns {Object} Combined analysis result
 */
export const analyzeFull = (text) => {
  return {
    sentiment: analyzeSentiment(text),
    emotions: analyzeEmotions(text),
    timestamp: Date.now(),
  };
};

/**
 * Returns a human-readable sentiment label.
 * @param {number} score - Sentiment score from -1 to 1
 * @returns {string} Label: 'very_negative', 'negative', 'neutral', 'positive', 'very_positive'
 */
export const getSentimentLabel = (score) => {
  if (score <= -0.7) return "very_negative";
  if (score <= -0.2) return "negative";
  if (score < 0.2) return "neutral";
  if (score < 0.7) return "positive";
  return "very_positive";
};

/**
 * Returns the dominant emotion from emotion probabilities.
 * @param {Object} emotions - Emotion probabilities object
 * @returns {string} Dominant emotion name
 */
export const getDominantEmotion = (emotions) => {
  let maxEmotion = "neutral";
  let maxValue = -1;
  for (const [emotion, value] of Object.entries(emotions)) {
    if (value > maxValue) {
      maxValue = value;
      maxEmotion = emotion;
    }
  }
  return maxEmotion;
};

// ============================================================================
// INITIALIZATION LOG
// ============================================================================

// console.log("[sentimentAnalysis] Advanced sentiment and emotion analyzer loaded");
// console.log("[sentimentAnalysis] Features: lexicon-based scoring, negation/intensifier detection, emoji support, multi-emotion analysis");

