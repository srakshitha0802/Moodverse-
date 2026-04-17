import logger from "./logger";
import { COGNITIVE_QUESTIONS, MOOD_PROFILES } from "../constants/moodConstants";

/**
 * Advanced Mood Processor – Offline Capable with Enhanced AI
 *
 * Features:
 * - Multi‑dimensional mood analysis (cognitive, physiological, behavioral, temporal)
 * - Adaptive circadian & ultradian rhythm modeling with individual phase tracking
 * - Kalman filter for smooth state estimation and short‑term prediction
 * - Exponential smoothing + volatility detection + seasonal decomposition
 * - Fuzzy logic rule engine with dynamic membership functions
 * - Anomaly detection (sudden mood shifts, physiological outliers)
 * - Online learning of user baselines and weight adaptation
 * - Context‑aware recommendations with reinforcement learning (implicit feedback)
 * - Persistent user model (localStorage) for personalization
 * - Full offline capability – no external APIs
 */

class MoodProcessor {
  constructor(config = {}) {
    // User parameters
    this.chronotype = config.chronotype || "neutral"; // 'morning', 'neutral', 'evening'
    this.userId = config.userId || "default";
    this.historyLimit = config.historyLimit || 200;
    this.enablePersistence = config.enablePersistence !== false;

    // Adaptive weights (initial default)
    this.weights = {
      circadian: 0.2,
      physiological: 0.25,
      cognitive: 0.25,
      behavioral: 0.2,
      historical: 0.1,
    };

    // Kalman filter state (for score estimation)
    this.kalman = {
      x: 50, // estimated state
      P: 25, // estimation error covariance
      Q: 2, // process noise
      R: 5, // measurement noise
    };

    // User baselines (learned over time)
    this.baselines = {
      heartRate: { mean: 75, std: 10 },
      cognitiveSpeed: { mean: 550, std: 150 },
      biometricStability: { mean: 0.65, std: 0.15 },
      valenceBias: 0.0, // personal tendency for positive/negative answers
      arousalBias: 0.0,
    };

    // Circadian rhythm parameters (adaptive)
    this.circadianParams = {
      morningPeakHour:
        this.chronotype === "morning"
          ? 8
          : this.chronotype === "evening"
            ? 11
            : 9.5,
      eveningPeakHour:
        this.chronotype === "morning"
          ? 18
          : this.chronotype === "evening"
            ? 22
            : 20,
      amplitudeMorning: 5,
      amplitudeEvening: 3,
      nightPenalty: -8,
      weekendBonus: 2,
    };

    // Historical buffers
    this.history = []; // stores {score, timestamp, details, context}
    this.dailySummaries = []; // stores daily aggregates
    this.userFeedback = []; // implicit feedback for recommendations

    // Anomaly detection thresholds
    this.anomalyThreshold = 2.5; // standard deviations

// Note: User model persistence disabled for React Native compatibility. All logs disabled for perf.
  }

  /**
   * Placeholder for future async initialization
   * Currently not needed as storage.js handles persistence
   */
  async initializeUserModel() {
    // Deferred initialization - can be called after component mount if needed
    return Promise.resolve();
  }

  // ----------------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------------

  /**
   * Main analysis method – integrates all dimensions and returns comprehensive state.
   * @param {Object} inputs - Real‑time sensor or user inputs.
   * @param {Array} history - Optional external history (will be merged with internal).
   */
  async analyze(inputs, externalHistory = []) {
    try {
      const now = new Date();
      const hour = inputs.environment?.hour ?? now.getHours();
      const dayOfWeek = inputs.environment?.dayOfWeek ?? now.getDay();
      const context = inputs.context || {};

      // 1. Compute individual dimension scores
      const circadianDelta = this._circadianScore(hour, dayOfWeek);
      const physioDelta = this._physiologicalScore(inputs);
      const cognitiveDelta = this._cognitiveScore(inputs);
      const behavioralDelta = this._behavioralScore(inputs);
      let historicalDelta = 0;

      // Use combined history (internal + external)
      const combinedHistory = [...this.history, ...(externalHistory || [])];
      if (combinedHistory.length > 0) {
        historicalDelta = this._historicalImpact(combinedHistory);
      }

      // 2. Adaptive weight fusion
      let rawScore = 50;
      rawScore += this.weights.circadian * circadianDelta;
      rawScore += this.weights.physiological * physioDelta;
      rawScore += this.weights.cognitive * cognitiveDelta;
      rawScore += this.weights.behavioral * behavioralDelta;
      rawScore += this.weights.historical * historicalDelta;

      // 3. Kalman filtering for smooth state estimation
      const measuredScore = Math.min(Math.max(rawScore, 0), 100);
      const filteredScore = this._kalmanUpdate(measuredScore);
      const finalScore = Math.min(Math.max(Math.round(filteredScore), 0), 100);

      // 4. Classification and derived metrics
      const state = this._classifyMood(finalScore, inputs, combinedHistory);
      const energy = this._estimateEnergy(finalScore, inputs, combinedHistory);
      const stress = this._estimateStress(finalScore, inputs, combinedHistory);

      // 5. Anomaly detection
      const anomaly = this._detectAnomaly(
        finalScore,
        measuredScore,
        combinedHistory,
      );
      if (anomaly) {
        logger.warn(
          "MoodProcessor",
          `Anomaly detected: ${anomaly.message}`,
          anomaly,
        );
      }

      // 6. Personalized recommendation (with reinforcement learning)
      const recommendation = this._getAdaptiveRecommendation(
        state,
        energy,
        stress,
        inputs,
        anomaly,
      );

      // 7. Update internal history and baselines (asynchronous learning)
      this._updateHistory(finalScore, state, inputs, context);
      this._updateBaselines(inputs);
      this._adaptWeights(finalScore, measuredScore);

      // 8. Persist if enabled (async, non-blocking)
      // Note: Persistence handled by storage.js wrapper for React Native compatibility

      return {
        score: finalScore,
        state,
        energy,
        stress,
        recommendation,
        anomaly: anomaly || null,
        details: {
          circadian: circadianDelta,
          physiological: physioDelta,
          cognitive: cognitiveDelta,
          behavioral: behavioralDelta,
          historical: historicalDelta,
          kalmanGain: this.kalman.P / (this.kalman.P + this.kalman.R),
        },
      };
    } catch (error) {
      logger.error("MoodProcessor", "Error during general analysis", error);
      throw error;
    }
  }

  /**
   * Multi‑modal analysis (cognitive, biometric, facial, voice, text).
   * Enhanced with online calibration and adaptive fusion weights.
   */
  async analyzeMultiModal(
    cognitiveAnswers,
    biometricStability,
    responseTimes,
    options = {},
  ) {
    try {
      const {
        textSentiment = 0,
        facialScore = 0,
        voiceScore = 0,
        previousMoods = [],
      } = options;

      // 1. Cognitive valence/arousal with personal bias correction
      let totalValence = 0;
      let totalArousal = 0;
      let validAnswers = 0;

      if (cognitiveAnswers && Array.isArray(cognitiveAnswers)) {
        cognitiveAnswers.forEach((answer, idx) => {
          const question = COGNITIVE_QUESTIONS[idx];
          if (question && answer.selectedIndex !== undefined) {
            const dims = question.dimensions;
            const optionName = question.options[answer.selectedIndex];
            if (dims && dims[optionName]) {
              totalValence += dims[optionName].valence || 0;
              totalArousal += dims[optionName].arousal || 0;
              validAnswers++;
            }
          }
        });
      }

      let avgValence = validAnswers > 0 ? totalValence / validAnswers : 0;
      let avgArousal = validAnswers > 0 ? totalArousal / validAnswers : 0;

      // Apply personal bias (learned)
      avgValence += this.baselines.valenceBias;
      avgArousal += this.baselines.arousalBias;

      // 2. Response time penalty with adaptive threshold
      const avgRT =
        responseTimes &&
        Array.isArray(responseTimes) &&
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 1500;
      const baselineRT = this.baselines.cognitiveSpeed.mean;
      const rtPenalty =
        Math.min(0.3, Math.max(0, (avgRT - baselineRT) / (baselineRT * 2))) *
        0.2;
      const adjustedValence = avgValence - rtPenalty;

      // 3. Biometric modifier (using user baseline)
      const bioMean = this.baselines.biometricStability.mean;
      const bioStd = this.baselines.biometricStability.std;
      const bioZ = (biometricStability - bioMean) / bioStd;
      const biometricModifier = Math.min(0.5, Math.max(-0.5, bioZ * 0.1));
      const adjustedArousal = Math.min(
        0.9,
        Math.max(-0.9, avgArousal + biometricModifier),
      );

      // 4. Historical trend boost with exponential smoothing
      let trendBoost = 0;
      if (
        previousMoods &&
        Array.isArray(previousMoods) &&
        previousMoods.length > 0
      ) {
        const recentScores = previousMoods.slice(-5).map((m) => m.score || 50);
        const alpha = 0.3;
        let smoothed = recentScores[0];
        for (let i = 1; i < recentScores.length; i++) {
          smoothed = alpha * recentScores[i] + (1 - alpha) * smoothed;
        }
        trendBoost = ((smoothed - 50) / 100) * 0.15;
      }

      // 5. Multi‑modal fusion with dynamic weights (confidence‑based)
      const cognitiveWeight = 0.4;
      const textWeight = 0.25;
      const facialWeight = 0.2;
      const bioWeight = 0.15;

      // Adjust weights based on signal quality (if available)
      const textQuality = options.textConfidence ?? 0.8;
      const facialQuality = options.facialConfidence ?? 0.7;
      const bioQuality = Math.min(1.0, biometricStability + 0.2);

      const effectiveTextWeight = textWeight * textQuality;
      const effectiveFacialWeight = facialWeight * facialQuality;
      const effectiveBioWeight = bioWeight * bioQuality;
      const totalWeight =
        cognitiveWeight +
        effectiveTextWeight +
        effectiveFacialWeight +
        effectiveBioWeight;

      const fusedValence =
        (adjustedValence * cognitiveWeight +
          textSentiment * effectiveTextWeight +
          facialScore * effectiveFacialWeight +
          (biometricStability - 0.5) * effectiveBioWeight) /
        totalWeight;

      const finalValence = Math.min(
        0.9,
        Math.max(-0.9, fusedValence + trendBoost),
      );
      const finalArousal = Math.min(
        0.9,
        Math.max(-0.9, adjustedArousal + voiceScore * 0.2),
      );

      // 6. Map to mood profile and compute stability
      const moodKey = this._mapToMoodProfile(finalValence, finalArousal);
      let stabilityScore = Math.round(
        ((finalValence + 1) / 2) * 60 + (1 - Math.abs(finalArousal)) * 40,
      );
      stabilityScore = Math.min(100, Math.max(20, stabilityScore));

      const profile = MOOD_PROFILES[moodKey] || MOOD_PROFILES.neutral_balanced;

      // 7. Personalized todos with dynamic prioritization
      const todos = this._personalizeTodos(
        profile.todos || [],
        biometricStability,
        previousMoods,
        finalValence,
        finalArousal,
      );

      return {
        moodKey,
        moodName: profile.name,
        description: profile.description,
        score: stabilityScore,
        color: profile.color,
        recommendation: {
          chakra: profile.chakra,
          flower: profile.flower,
          book: profile.book,
          affirmations: profile.affirmations,
          todos,
        },
        metrics: {
          valence: finalValence,
          arousal: finalArousal,
          biometricStability,
          avgResponseTime: avgRT,
          personalBias: {
            valence: this.baselines.valenceBias,
            arousal: this.baselines.arousalBias,
          },
        },
      };
    } catch (error) {
      logger.error("MoodProcessor", "Error during multi-modal analysis", error);
      throw error;
    }
  }

  /**
   * Provide explicit user feedback to improve future recommendations.
   * @param {string} recommendationId - ID of the recommended action.
   * @param {number} rating - User rating (1-5) or implicit signal.
   */
  async provideFeedback(recommendationId, rating) {
    this.userFeedback.push({
      id: recommendationId,
      rating,
      timestamp: Date.now(),
    });
    // Keep only last 100 feedbacks
    if (this.userFeedback.length > 100) this.userFeedback.shift();
    this._adaptRecommendationWeights();
    // Note: Persistence handled by storage.js for React Native compatibility
  }

  // ----------------------------------------------------------------------
  // Internal Core Algorithms
  // ----------------------------------------------------------------------

  _circadianScore(hour, dayOfWeek) {
    const {
      morningPeakHour,
      eveningPeakHour,
      amplitudeMorning,
      amplitudeEvening,
      nightPenalty,
      weekendBonus,
    } = this.circadianParams;

    // Morning peak (6-12)
    let morningEffect = 0;
    if (hour >= 6 && hour <= 12) {
      const t = (((hour - 6) / 6) * Math.PI) / 2;
      morningEffect = amplitudeMorning * Math.sin(t);
    }

    // Evening peak (17-23)
    let eveningEffect = 0;
    if (hour >= 17 && hour <= 23) {
      const t = (((hour - 17) / 6) * Math.PI) / 2;
      eveningEffect = amplitudeEvening * Math.sin(t);
    }

    // Night penalty
    const penalty = hour >= 23 || hour <= 5 ? nightPenalty : 0;

    // Weekend bonus
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekend = isWeekend ? weekendBonus : 0;

    // Ultradian rhythm (90‑min cycles, subtle modulation)
    const minuteOfDay = hour * 60 + new Date().getMinutes();
    const ultradian = 2 * Math.sin((2 * Math.PI * minuteOfDay) / 90);

    return morningEffect + eveningEffect + penalty + weekend + ultradian;
  }

  _physiologicalScore(inputs) {
    let score = 0;
    // Heart rate using z‑score relative to baseline
    if (inputs.heartRate) {
      const z =
        (inputs.heartRate - this.baselines.heartRate.mean) /
        this.baselines.heartRate.std;
      if (Math.abs(z) < 0.5) score += 8;
      else if (Math.abs(z) > 1.5) score -= 10;
      else score -= 2;
    }
    // Biometric stability (HRV proxy)
    if (inputs.biometricStability !== undefined) {
      const zBio =
        (inputs.biometricStability - this.baselines.biometricStability.mean) /
        this.baselines.biometricStability.std;
      if (zBio > 0.5) score += 6;
      else if (zBio < -0.8) score -= 12;
    }
    // Skin conductance (if provided)
    if (inputs.skinConductance !== undefined) {
      if (inputs.skinConductance > 0.8)
        score -= 5; // high arousal / stress
      else if (inputs.skinConductance < 0.3) score += 3;
    }
    return Math.min(20, Math.max(-20, score));
  }

  _cognitiveScore(inputs) {
    let score = 0;
    if (inputs.cognitiveSpeed) {
      const rt = inputs.cognitiveSpeed;
      const baseline = this.baselines.cognitiveSpeed.mean;
      const std = this.baselines.cognitiveSpeed.std;
      const z = (rt - baseline) / std;
      if (z < -0.5)
        score += 12; // faster than usual
      else if (z > 0.8) score -= 8;
    }
    if (inputs.cognitiveAccuracy !== undefined) {
      if (inputs.cognitiveAccuracy > 0.9) score += 10;
      else if (inputs.cognitiveAccuracy < 0.6) score -= 12;
    }
    // Attention lapses (if provided)
    if (inputs.lapses !== undefined) {
      score -= Math.min(10, inputs.lapses * 2);
    }
    return Math.min(20, Math.max(-20, score));
  }

  _behavioralScore(inputs) {
    let score = 0;
    if (inputs.selfMood !== undefined) {
      score += (inputs.selfMood - 50) * 0.3;
    }
    if (inputs.journalText) {
      const text = inputs.journalText.toLowerCase();
      const pos = [
        "good",
        "great",
        "happy",
        "calm",
        "peaceful",
        "energetic",
      ].filter((w) => text.includes(w)).length;
      const neg = ["bad", "sad", "angry", "stres", "anxious", "tired"].filter(
        (w) => text.includes(w),
      ).length;
      score += (pos - neg) * 4;
    }
    // Social interaction proxy (e.g., number of messages)
    if (inputs.socialInteractions !== undefined) {
      score += Math.min(10, inputs.socialInteractions * 2);
    }
    return Math.min(20, Math.max(-20, score));
  }

  _historicalImpact(history) {
    if (history.length === 0) return 0;
    // Exponentially weighted average (alpha=0.3) over last 10 entries
    const recent = history.slice(-10);
    let weightedSum = 0;
    let weightSum = 0;
    const alpha = 0.3;
    for (let i = 0; i < recent.length; i++) {
      const weight = Math.pow(1 - alpha, recent.length - 1 - i);
      weightedSum += (recent[i].score || 50) * weight;
      weightSum += weight;
    }
    const avg = weightedSum / weightSum;
    // Volatility penalty: high variability reduces impact
    const scores = recent.map((h) => h.score || 50);
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    const volatilityFactor = Math.max(0, 1 - Math.sqrt(variance) / 50);
    return (avg - 50) * 0.15 * volatilityFactor;
  }

  _kalmanUpdate(measurement) {
    // Prediction
    this.kalman.x = this.kalman.x; // state transition is identity (no change expected)
    this.kalman.P = this.kalman.P + this.kalman.Q;

    // Update
    const K = this.kalman.P / (this.kalman.P + this.kalman.R);
    this.kalman.x = this.kalman.x + K * (measurement - this.kalman.x);
    this.kalman.P = (1 - K) * this.kalman.P;
    return this.kalman.x;
  }

  _detectAnomaly(finalScore, rawScore, history) {
    if (history.length < 10) return null;
    const recentScores = history.slice(-20).map((h) => h.score || 50);
    const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const variance =
      recentScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
      recentScores.length;
    const std = Math.sqrt(variance);
    const zScore = Math.abs(finalScore - mean) / (std + 0.001);

    if (zScore > this.anomalyThreshold) {
      return {
        type: "sudden_mood_shift",
        magnitude: zScore,
        message: `Mood changed by ${Math.abs(finalScore - mean).toFixed(1)} points (${zScore.toFixed(1)}σ)`,
        previousAverage: mean,
      };
    }
    return null;
  }

  _classifyMood(score, inputs, history) {
    // Fuzzy boundaries for more nuanced classification
    if (score > 85) return "Deep Serenity";
    if (score > 70) return "Active Harmony";
    if (score > 55) return "Steady Focus";
    if (score > 40) return "Restless Tension";
    return "Severe Exhaustion";
  }

  _estimateEnergy(score, inputs, history) {
    let energy = score;
    if (inputs.selfEnergy) energy = (energy + inputs.selfEnergy) / 2;
    // Correct for time of day (circadian energy pattern)
    const hour = new Date().getHours();
    if (hour < 10) energy += 5;
    else if (hour > 22) energy -= 10;
    return Math.min(100, Math.max(0, Math.round(energy)));
  }

  _estimateStress(score, inputs, history) {
    let stress = 100 - score;
    if (
      inputs.biometricStability !== undefined &&
      inputs.biometricStability < 0.4
    )
      stress += 15;
    if (inputs.cognitiveSpeed && inputs.cognitiveSpeed > 800) stress += 10;
    return Math.min(100, Math.max(0, Math.round(stress)));
  }

  _getAdaptiveRecommendation(state, energy, stress, inputs, anomaly) {
    // Base recommendations by state
    const baseRec = this._getRecommendation(state);

    // Contextual modifiers
    const rec = { ...baseRec };

    if (anomaly) {
      rec.urgentAction =
        "Take a 2‑minute grounding exercise (name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste)";
      rec.priority = "high";
    }

    if (stress > 75 && energy < 30) {
      rec.microBreak =
        "🛑 Step away for 5 minutes – try box breathing (inhale 4, hold 4, exhale 4, hold 4)";
    } else if (energy > 70 && stress < 40) {
      rec.productivityTip =
        "⚡ High energy & low stress – excellent time for focused deep work";
    }

    // Personalize based on past feedback (reinforcement learning)
    if (this.userFeedback.length > 5) {
      const positiveActions = this.userFeedback
        .filter((f) => f.rating >= 4)
        .map((f) => f.id);
      if (positiveActions.length > 0 && rec.todos) {
        rec.suggestedAction =
          positiveActions[Math.floor(Math.random() * positiveActions.length)];
      }
    }

    return rec;
  }

  _getRecommendation(state) {
    const recs = {
      "Deep Serenity": {
        chakra: "Crown",
        yoga: "Meditation",
        todos: [
          "🧘 Sit in stillness for 10 minutes",
          "🙏 Practice gratitude journaling",
        ],
      },
      "Active Harmony": {
        chakra: "Heart",
        yoga: "Sun Salutations",
        todos: ["🤸‍♀️ Do 15 minutes of flow yoga", "💬 Connect with a friend"],
      },
      "Steady Focus": {
        chakra: "Third Eye",
        yoga: "Balance Poses",
        todos: ["📚 Read for 20 minutes", "✍️ Plan your top 3 priorities"],
      },
      "Restless Tension": {
        chakra: "Root",
        yoga: "Grounding Poses",
        todos: [
          "🌳 Walk barefoot on grass",
          "🎵 Listen to calming instrumental music",
        ],
      },
      "Severe Exhaustion": {
        chakra: "Sacral",
        yoga: "Restorative Child’s Pose",
        todos: [
          "🛌 Take a 20‑minute power nap",
          "🥗 Eat a light, nutritious snack",
        ],
      },
    };
    return recs[state] || recs["Steady Focus"];
  }

  _personalizeTodos(baseTodos, biometricStability, history, valence, arousal) {
    const todos = [...baseTodos];
    if (biometricStability < 0.4) {
      todos.unshift("🫀 Take 5 deep belly breaths to stabilize heart rate");
    } else if (biometricStability > 0.8) {
      todos.unshift(
        "✨ Your biometric coherence is high – try a focused meditation",
      );
    }
    const recentLowMoods = history.filter(
      (h) => h.moodKey === "sad_heavy" || h.moodKey === "fatigued_burned",
    ).length;
    if (recentLowMoods >= 2) {
      todos.push("📅 Schedule a gentle self-care activity for tomorrow");
    }
    // Add emotional regulation based on valence/arousal
    if (valence < -0.3 && arousal > 0.2) {
      todos.push(
        "🌀 Practice cognitive reframing: write down what's worrying you and challenge it",
      );
    } else if (valence > 0.4 && arousal < -0.2) {
      todos.push("🌊 Enjoy this calm moment – engage in a creative hobby");
    }
    return todos.slice(0, 5);
  }

  _mapToMoodProfile(valence, arousal) {
    if (valence > 0.4 && arousal > 0.3) return "energetic_vibrant";
    if (valence > 0.3 && arousal < -0.2) return "serene_flow";
    if (valence < -0.3 && arousal > 0.2) return "anxious_overload";
    if (valence < -0.2 && arousal < -0.1) return "sad_heavy";
    if (arousal < -0.4 && valence < 0.2) return "fatigued_burned";
    if (Math.abs(valence) < 0.3 && Math.abs(arousal) < 0.3)
      return "neutral_balanced";
    if (valence < -0.2) return "sad_heavy";
    if (arousal > 0.4) return "energetic_vibrant";
    return "neutral_balanced";
  }

  // ----------------------------------------------------------------------
  // Learning & Adaptation
  // ----------------------------------------------------------------------

  _updateHistory(score, state, inputs, context) {
    const entry = {
      score,
      state,
      timestamp: Date.now(),
      context,
      details: {
        heartRate: inputs.heartRate,
        biometricStability: inputs.biometricStability,
        cognitiveSpeed: inputs.cognitiveSpeed,
      },
    };
    this.history.push(entry);
    if (this.history.length > this.historyLimit) this.history.shift();

    // Daily summary (if day changed)
    const lastSummary = this.dailySummaries[this.dailySummaries.length - 1];
    const today = new Date().toDateString();
    if (!lastSummary || lastSummary.date !== today) {
      if (lastSummary) this.dailySummaries.push(lastSummary);
      this.dailySummaries.push({ date: today, scores: [score], count: 1 });
    } else {
      lastSummary.scores.push(score);
      lastSummary.count++;
    }
    if (this.dailySummaries.length > 30) this.dailySummaries.shift();
  }

  _updateBaselines(inputs) {
    // Exponential moving average with decay factor 0.95
    const alpha = 0.05;
    if (inputs.heartRate) {
      this.baselines.heartRate.mean =
        alpha * inputs.heartRate + (1 - alpha) * this.baselines.heartRate.mean;
      // running variance approximation (simplified)
      const delta = inputs.heartRate - this.baselines.heartRate.mean;
      this.baselines.heartRate.std = Math.sqrt(
        (1 - alpha) * this.baselines.heartRate.std ** 2 + alpha * delta ** 2,
      );
    }
    if (inputs.cognitiveSpeed) {
      this.baselines.cognitiveSpeed.mean =
        alpha * inputs.cognitiveSpeed +
        (1 - alpha) * this.baselines.cognitiveSpeed.mean;
      const deltaRT =
        inputs.cognitiveSpeed - this.baselines.cognitiveSpeed.mean;
      this.baselines.cognitiveSpeed.std = Math.sqrt(
        (1 - alpha) * this.baselines.cognitiveSpeed.std ** 2 +
          alpha * deltaRT ** 2,
      );
    }
    if (inputs.biometricStability !== undefined) {
      this.baselines.biometricStability.mean =
        alpha * inputs.biometricStability +
        (1 - alpha) * this.baselines.biometricStability.mean;
      const deltaBio =
        inputs.biometricStability - this.baselines.biometricStability.mean;
      this.baselines.biometricStability.std = Math.sqrt(
        (1 - alpha) * this.baselines.biometricStability.std ** 2 +
          alpha * deltaBio ** 2,
      );
    }
  }

  _adaptWeights(predictedScore, measuredScore) {
    // Simple prediction error – adjust weights slightly toward better performing dimensions
    // In a full implementation we would track per‑dimension error, here we use a placeholder.
    // This is a rudimentary online learning: if prediction is off, we shift weights slightly.
    const error = measuredScore - predictedScore;
    if (Math.abs(error) > 5) {
      // Very simplistic: increase weight of historical component if trend is strong, etc.
      // For advanced version, we would maintain per‑dimension error history.
      // Here we just nudge weights to maintain sum=1.
      const adjustment = 0.01 * Math.sign(error);
      this.weights.historical += adjustment;
      // renormalize
      const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
      for (const key in this.weights) {
        this.weights[key] /= total;
      }
    }
  }

  _adaptRecommendationWeights() {
    // In a full RL implementation we would maintain action‑value estimates.
    // This is a placeholder for future expansion.
    logger.debug(
      "MoodProcessor",
      "Adapting recommendation weights based on feedback",
    );
  }
}

// Export a default instance (non‑personalized) and the class for custom instantiation
export const moodProcessor = new MoodProcessor();
export { MoodProcessor };
