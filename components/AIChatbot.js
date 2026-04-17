import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Send,
  Bot,
  User,
  Sparkles,
  Compass,
} from "lucide-react-native";
import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import theme from "../styles/theme";
import logger from "../utils/logger";
import storage from "../utils/storage";

// ------------------------------
// 1. ADVANCED INTENT & KNOWLEDGE BASE
// ------------------------------
const INTENTS = [
  {
    name: "greeting",
    patterns: [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
      "sup",
      "yo",
    ],
    responses: [
      "Hello again, radiant soul! I've missed you. How is your energy today?",
      "Hey there! Welcome back to Moodverse. Ready to explore your inner world?",
      "Hi! I'm your AI companion. How can I support your journey today?",
    ],
    followUp: "ask_feeling",
  },
  {
    name: "feeling_sad",
    patterns: [
      "sad",
      "depressed",
      "down",
      "unhappy",
      "blue",
      "miserable",
      "lonely",
      "empty",
      "grief",
    ],
    sentiment: "negative",
    responses: [
      "I hear that heaviness in your heart. It's completely okay to feel this way. Would you like to try a Sacral Chakra breathing exercise together?",
      "Thank you for sharing your sadness with me. That takes courage. What do you think is the main source of this feeling?",
      "I'm here with you. Sadness can be a messenger. Let's sit with it for a moment. Shall I guide you through a gentle release meditation?",
    ],
    actions: ["suggest_sacral_breathing", "ask_reason"],
  },
  {
    name: "feeling_anxious",
    patterns: [
      "anxious",
      "anxiety",
      "stress",
      "stressed",
      "worried",
      "panic",
      "nervous",
      "overwhelm",
      "tense",
    ],
    sentiment: "negative",
    responses: [
      "I can feel your tension from here. Let's ground that energy. Would you like a 5-minute Root Chakra focus or a quick breathing bubble?",
      "Anxiety often lives in the future. Let's bring you back to the present. Place a hand on your heart. What do you hear right now?",
      "You're safe. Let's try the 4-7-8 breath: inhale 4, hold 7, exhale 8. I'll count with you. Ready?",
    ],
    actions: ["suggest_root_grounding", "suggest_breathing_478"],
  },
  {
    name: "feeling_angry",
    patterns: [
      "angry",
      "mad",
      "frustrated",
      "rage",
      "irritated",
      "annoyed",
      "bitter",
    ],
    sentiment: "negative",
    responses: [
      "Anger is fire energy. It can protect or burn. Let's channel it into your Solar Plexus with a power breath. Inhale strength, exhale release.",
      "I hear your frustration. It's valid. Would you like to vent more or try a physical release exercise?",
    ],
    actions: ["suggest_solar_release"],
  },
  {
    name: "feeling_happy",
    patterns: [
      "happy",
      "joy",
      "grateful",
      "blessed",
      "excited",
      "wonderful",
      "amazing",
      "good",
    ],
    sentiment: "positive",
    responses: [
      "Your joy lights up the room! Let's amplify it. What's one small win you had today?",
      "That's beautiful to hear. Would you like to do a Heart Chakra loving-kindness meditation to spread that joy?",
    ],
    actions: ["ask_gratitude"],
  },
  {
    name: "feeling_neutral",
    patterns: ["okay", "fine", "meh", "alright", "so so", "not bad", "neutral"],
    sentiment: "neutral",
    responses: [
      "Neutral is a peaceful starting point. Would you like to explore a chakra alignment or just chat?",
      "Sometimes the quietest days hold the deepest insights. What's one thing you're curious about right now?",
    ],
  },
  {
    name: "yoga_interest",
    patterns: [
      "yoga",
      "asana",
      "stretch",
      "sun salutation",
      "pose",
      "downward dog",
      "warrior",
    ],
    responses: [
      "Yoga unites breath and body. I can guide you through 'Morning Sun Salutations' (5 min) or 'Evening Hip Release' (8 min). Which would support you?",
      "Love that you're moving! Would you like a sequence for energy (Solar) or for calm (Lunar)?",
    ],
    actions: ["suggest_yoga_sequence"],
  },
  {
    name: "meditation_interest",
    patterns: [
      "meditate",
      "meditation",
      "mindfulness",
      "zen",
      "chant",
      "om",
      "quiet mind",
    ],
    responses: [
      "Meditation rewires the brain for peace. I have a 3-minute 'Breath Awareness' or a 10-minute 'Loving-Kindness' for Heart Chakra. Which calls you?",
      "Let's sit in stillness. Would you prefer a guided visualization or just a silent timer with bell?",
    ],
    actions: ["suggest_meditation"],
  },
  {
    name: "chakra_interest",
    patterns: [
      "chakra",
      "root",
      "sacral",
      "solar",
      "heart",
      "throat",
      "third eye",
      "crown",
      "energy center",
    ],
    responses: [
      "Each chakra holds wisdom. Tell me which one feels blocked or overactive? I can offer a specific crystal, color, or mudra.",
      "Let's scan your chakras. Close your eyes – which color do you feel drawn to: Red (Root), Orange (Sacral), Yellow (Solar), Green (Heart), Blue (Throat), Indigo (Third Eye), or Violet (Crown)?",
    ],
    actions: ["suggest_chakra_balance"],
  },
  {
    name: "gratitude",
    patterns: [
      "grateful for",
      "thankful",
      "i appreciate",
      "blessing",
      "gratitude",
    ],
    responses: [
      "Gratitude raises your vibration. I'll remember this. Would you like to add it to your Moodverse journal?",
      "That's a beautiful anchor. Keep it close today. Shall we do a 1-minute gratitude meditation?",
    ],
  },
  {
    name: "help",
    patterns: [
      "help",
      "what can you do",
      "guide",
      "suggest something",
      "ideas",
      "options",
    ],
    responses: [
      "I'm your holistic guide. I can: 💬 Chat about feelings 🧘 Suggest yoga/meditation 🔮 Balance chakras 🌬️ Breathing exercises 📝 Journal prompts 💪 Track your mood. Just tell me what you need.",
    ],
  },
  {
    name: "bye",
    patterns: ["bye", "goodbye", "see you", "exit", "quit", "later"],
    responses: [
      "Sending you light and love. Remember, you're never alone in Moodverse. Come back anytime.",
      "Take gentle care. I'll be here when you return. Until then, breathe deeply.",
    ],
    actions: ["save_conversation"],
  },
];

// Helper: advanced keyword matching (weighted + synonyms)
const matchIntent = (text) => {
  const lower = text.toLowerCase();
  let bestIntent = null;
  let highestScore = 0;

  for (const intent of INTENTS) {
    let score = 0;
    for (const pattern of intent.patterns) {
      if (lower.includes(pattern)) {
        // Exact phrase match gives higher score
        score += pattern.split(" ").length > 1 ? 3 : 1;
      }
    }
    // Boost for negative sentiment patterns if sentiment negative
    if (
      intent.sentiment === "negative" &&
      /(sad|depress|anxious|stress|angry|hurt|pain)/i.test(lower)
    ) {
      score += 2;
    }
    if (score > highestScore) {
      highestScore = score;
      bestIntent = intent;
    }
  }
  // Fallback intent
  if (!bestIntent || highestScore === 0) {
    return {
      name: "general_chat",
      responses: [
        "I'm listening. Tell me more – I want to understand you better.",
        "That's interesting. Could you share a little more about that?",
        "I'm here to support you. Would you like to explore a breathing exercise or just continue our talk?",
      ],
    };
  }
  return bestIntent;
};

// Simple sentiment analysis (positive/negative/neutral)
const analyzeSentiment = (text) => {
  const posWords = [
    "happy",
    "joy",
    "grateful",
    "excited",
    "wonderful",
    "love",
    "blessed",
    "amazing",
    "good",
    "great",
  ];
  const negWords = [
    "sad",
    "depressed",
    "anxious",
    "stress",
    "angry",
    "hurt",
    "pain",
    "lonely",
    "tired",
    "awful",
    "bad",
  ];
  const lower = text.toLowerCase();
  let posScore = 0,
    negScore = 0;
  posWords.forEach((w) => {
    if (lower.includes(w)) posScore++;
  });
  negWords.forEach((w) => {
    if (lower.includes(w)) negScore++;
  });
  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
};

// ------------------------------
// 2. CONTEXT MANAGER (stateful memory)
// ------------------------------
class ConversationContext {
  constructor() {
    this.lastIntent = null;
    this.userMood = null;
    this.userName = null;
    this.conversationStage = "idle"; // idle, followUp, action
    this.pendingAction = null;
    this.conversationHistory = []; // store last 10 messages
    this.moodTrend = []; // track moods over time
  }

  update(message, intent, sentiment) {
    this.conversationHistory.push({
      message,
      intent: intent.name,
      sentiment,
      timestamp: Date.now(),
    });
    if (this.conversationHistory.length > 20) this.conversationHistory.shift();
    if (sentiment !== "neutral") {
      this.moodTrend.push(sentiment);
      if (this.moodTrend.length > 10) this.moodTrend.shift();
    }
    this.lastIntent = intent;
    if (intent.name.startsWith("feeling_")) {
      this.userMood = intent.name.replace("feeling_", "");
    }
  }

  clear() {
    this.lastIntent = null;
    this.userMood = null;
    this.conversationStage = "idle";
    this.pendingAction = null;
  }
}

// ------------------------------
// 3. RESPONSE GENERATOR with actions & follow-ups
// ------------------------------
const generateResponse = (intent, context, userMessage) => {
  // Select random response from intent
  const responses = intent.responses || ["I'm here. Tell me more."];
  let reply = responses[Math.floor(Math.random() * responses.length)];

  // Personalized if we have user name
  if (context.userName && reply.includes("again")) {
    reply = reply.replace("again", `again, ${context.userName}`);
  }

  // Append mood insight if available and relevant
  if (context.userMood && intent.name === "greeting") {
    reply += ` I remember you've been feeling ${context.userMood} lately. How is that evolving?`;
  }

  // Handle actions embedded
  let actionPerformed = null;
  if (intent.actions && intent.actions.length > 0) {
    actionPerformed = intent.actions[0];
    // store pending action for next turn
    context.pendingAction = actionPerformed;
    context.conversationStage = "action";
  }

  // Add follow-up question if needed
  if (intent.followUp) {
    context.conversationStage = "followUp";
  }

  return { reply, action: actionPerformed };
};

// Action handlers (return additional suggestions or perform internal logic)
const handleAction = (action, context) => {
  switch (action) {
    case "suggest_sacral_breathing":
      return "🧡 **Sacral Chakra Breath**: Sit comfortably, inhale for 4 counts, hold for 2, exhale for 6. Visualize orange light in your lower belly. Repeat 5 times. Would you like me to guide you step by step?";
    case "suggest_root_grounding":
      return "🌱 **Root Chakra Grounding**: Stand or sit, press feet firmly. Inhale 'I am safe', exhale tension. Imagine red roots growing into earth. Do this for 2 minutes. Shall I set a timer?";
    case "suggest_breathing_478":
      return "🌬️ **4-7-8 Calming Breath**: Inhale 4 sec → hold 7 → exhale 8. Repeat 4 cycles. I'll count with you if you say 'start'.";
    case "suggest_solar_release":
      return "🔥 **Solar Plexus Power Breath**: Place hands on belly. Inhale strength, exhale 'HA' sound loudly. Do 3 times. Release anger into the earth.";
    case "ask_reason":
      return "What do you think triggered this feeling? You can share as much or as little as you like.";
    case "ask_gratitude":
      return "✨ What's one thing you're grateful for today? Naming it amplifies joy.";
    case "suggest_yoga_sequence":
      return "🧘 **Morning Sun Salutations**: 3 rounds of Surya Namaskar (5 min). Or try **Evening Hip Release**: Pigeon pose + supine twist. Which one?";
    case "suggest_meditation":
      return "🧠 **Guided Meditation**: Close eyes. Bring attention to breath. Imagine a golden light at heart center. Breathe love in, breathe peace out. Want a 3-min timer?";
    case "suggest_chakra_balance":
      return "🌈 **Chakra Balance**: Sit upright. Visualize each chakra color spinning from root to crown. Repeat 'I am grounded, creative, powerful, loving, expressive, intuitive, connected.'";
    case "save_conversation":
      // handled separately
      return null;
    default:
      return null;
  }
};

// ------------------------------
// 4. MAIN COMPONENT
// ------------------------------
export default function AIChatbot({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [context] = useState(() => new ConversationContext());
  const scrollViewRef = useRef();
  const [quickReplies, setQuickReplies] = useState([]);

  // Load conversation history and context from centralized storage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedMessages = await storage.getChatHistory();
        const storedContext = await storage.getChatContext();

        if (storedMessages && storedMessages.length > 0) {
          setMessages(storedMessages);
        } else {
          // Welcome message
          setMessages([
            {
              id: Date.now(),
              text: "✨ I'm your advanced Moodverse AI. I remember our talks, track your moods, and offer personalized chakra/yoga/breath guidance. How are you feeling today? ✨",
              isUser: false,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        if (storedContext) {
          Object.assign(context, storedContext);
        }
      } catch (err) {
        logger.error("AIChatbot", "Error loading history", err);
      }
    };
    loadHistory();
  }, []);

  // Save messages and context to centralized storage whenever updated
  useEffect(() => {
    const persistData = async () => {
      try {
        await storage.saveChatHistory(messages);
        await storage.saveChatContext(context);
      } catch (err) {
        logger.error("AIChatbot", "Error saving data", err);
      }
    };
    if (messages.length > 0) {
      persistData();
    }
  }, [messages]);

  const addMessage = (text, isUser, actionData = null) => {
    const newMsg = {
      id: Date.now() + Math.random(),
      text,
      isUser,
      timestamp: new Date(),
      action: actionData,
    };
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  };

  const processUserInput = async (userText) => {
    if (!userText.trim()) return;
    addMessage(userText, true);
    setInput("");
    setIsTyping(true);

    // Simulate processing delay
    await new Promise((resolve) =>
      setTimeout(resolve, 600 + Math.random() * 500),
    );

    // 1. Sentiment + intent matching
    const sentiment = analyzeSentiment(userText);
    const matchedIntent = matchIntent(userText);
    context.update(userText, matchedIntent, sentiment);

    // 2. Generate base response
    let { reply } = generateResponse(matchedIntent, context, userText);

    // 3. Handle any pending action from previous turn (if user replied to action)
    if (context.conversationStage === "action" && context.pendingAction) {
      const actionReply = handleAction(context.pendingAction, context);
      if (actionReply) {
        reply = actionReply + "\n\n" + reply;
      }
      context.pendingAction = null;
      context.conversationStage = "idle";
    }

    // 4. Add dynamic suggestions based on mood
    if (context.userMood === "anxious" && !reply.includes("grounding")) {
      reply +=
        " 🌿 Would you like a quick grounding technique? Just say 'ground me'.";
    } else if (context.userMood === "sad" && !reply.includes("Sacral")) {
      reply +=
        " 💧 I can guide you through a Sacral Chakra flow to ease sadness. Say 'sacral breath' anytime.";
    }

    // 5. Check if we should ask follow-up
    if (matchedIntent.followUp === "ask_feeling") {
      reply += " What emotion is most present for you right now?";
    }

    // 6. Generate quick reply buttons (smart suggestions)
    let newQuickReplies = [];
    if (matchedIntent.name === "feeling_anxious") {
      newQuickReplies = ["Ground me", "4-7-8 breath", "Talk more"];
    } else if (matchedIntent.name === "feeling_sad") {
      newQuickReplies = ["Sacral breath", "Journal prompt", "Vent"];
    } else if (matchedIntent.name === "greeting") {
      newQuickReplies = ["I'm stressed", "I'm happy", "Show me yoga"];
    } else {
      newQuickReplies = ["Help", "Meditation", "Gratitude", "Chakras"];
    }
    setQuickReplies(newQuickReplies.slice(0, 4));

    addMessage(reply, false);
    setIsTyping(false);
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    processUserInput(input);
  };

  const handleQuickReply = (replyText) => {
    setInput(replyText);
    processUserInput(replyText);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.colors.gradientCalm || ["#1a1a2e", "#16213e"]}
        style={styles.background}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <ChevronLeft color="white" size={28} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Sparkles color="#FFD966" size={18} />
              <Text style={styles.headerTitle}>Moodverse AI</Text>
              <Compass color="#6C63FF" size={18} />
            </View>
            <View style={{ width: 28 }} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              ref={scrollViewRef}
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
              contentContainerStyle={styles.chatArea}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    msg.isUser ? styles.userRow : styles.botRow,
                  ]}
                >
                  {!msg.isUser && (
                    <View style={styles.avatarBot}>
                      <Bot color="white" size={16} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      msg.isUser ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.isUser ? styles.userText : styles.botText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                    <Text style={styles.timestamp}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                  {msg.isUser && (
                    <View style={styles.avatarUser}>
                      <User color="white" size={16} />
                    </View>
                  )}
                </View>
              ))}
              {isTyping && (
                <View style={[styles.messageRow, styles.botRow]}>
                  <View style={styles.avatarBot}>
                    <Bot color="white" size={16} />
                  </View>
                  <View
                    style={[
                      styles.bubble,
                      styles.botBubble,
                      styles.typingBubble,
                    ]}
                  >
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.messageText,
                        styles.botText,
                        { marginLeft: 8 },
                      ]}
                    >
                      AI is reflecting...
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick replies row */}
            {quickReplies.length > 0 && !isTyping && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickRepliesContainer}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
              >
                {quickReplies.map((qr, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickReplyChip}
                    onPress={() => handleQuickReply(qr)}
                  >
                    <Text style={styles.quickReplyText}>{qr}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type your message..."
                placeholderTextColor={theme.colors.textSecondary || "#aaa"}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={300}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!input.trim() || isTyping) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!input.trim() || isTyping}
              >
                <Send color="white" size={20} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ------------------------------
// 5. STYLES (enhanced)
// ------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing?.lg || 20,
    paddingTop: Platform.OS === "android" ? 20 : 10,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  backButton: { padding: 4 },
  chatArea: {
    padding: theme.spacing?.lg || 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: "88%",
    alignItems: "flex-end",
  },
  userRow: { alignSelf: "flex-end", justifyContent: "flex-end" },
  botRow: { alignSelf: "flex-start", justifyContent: "flex-start" },
  avatarBot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors?.primary || "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarUser: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors?.secondary || "#FF6584",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  bubble: {
    padding: 12,
    borderRadius: 22,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: theme.colors?.primary || "#6C63FF",
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderBottomLeftRadius: 6,
    backdropFilter: Platform.OS === "web" ? "blur(4px)" : undefined,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: "white" },
  botText: { color: "#f0f0f0" },
  timestamp: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    padding: theme.spacing?.md || 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors?.primary || "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: { opacity: 0.5 },
  quickRepliesContainer: {
    maxHeight: 50,
    marginBottom: 8,
    paddingVertical: 6,
  },
  quickReplyChip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  quickReplyText: { color: "white", fontSize: 14, fontWeight: "500" },
});
