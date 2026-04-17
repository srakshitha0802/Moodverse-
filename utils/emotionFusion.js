// utils/emotionFusion.js - Advanced multi-modal emotion fusion
//
// This module provides state-of-the-art fusion techniques for combining
// emotion predictions from text, facial expression, and voice modalities.
// Features:
// - Multiple fusion strategies: weighted, product, Dempster-Shafer, adaptive weighted
// - Temporal smoothing (exponential moving average)
// - Dynamic weighting based on modality reliability / confidence
// - Consistency analysis between modalities
// - Graceful handling of missing modalities
// - Configurable emotion categories

/**
 * @typedef {Object} EmotionScores
 * @property {number} happy - Probability/score for happiness (0-1)
 * @property {number} sad - Score for sadness
 * @property {number} angry - Score for anger
 * @property {number} neutral - Score for neutral
 * @property {number} surprised - Score for surprise
 * @property {number} [fear] - Optional fear score
 * @property {number} [disgust] - Optional disgust score
 */

/**
 * @typedef {Object} ModalityResult
 * @property {EmotionScores} scores - Emotion scores
 * @property {number} [confidence] - Overall confidence of this modality (0-1)
 * @property {string} [source] - Source identifier (text/face/voice)
 */

/**
 * @typedef {Object} FusionOptions
 * @property {string} [method='weighted'] - Fusion method: 'weighted', 'product', 'dempsterShafer', 'adaptiveWeighted'
 * @property {Object<string, number>} [weights] - Initial weights per modality (e.g., {text:0.35, face:0.35, voice:0.3})
 * @property {boolean} [temporalSmoothing=false] - Apply exponential moving average over time
 * @property {number} [smoothingFactor=0.3] - EMA smoothing factor (0-1, lower = smoother)
 * @property {boolean} [dynamicWeights=false] - Adapt weights online based on prediction error (only for adaptiveWeighted)
 * @property {number} [learningRate=0.05] - Learning rate for adaptive weights
 * @property {string[]} [emotions] - Custom emotion labels (default: basic set)
 * @property {boolean} [returnConsistency=true] - Include inter-modality consistency score
 */

/**
 * Advanced emotion fusion engine supporting multiple strategies and stateful smoothing.
 */
class EmotionFusion {
  /**
   * Create a new fusion instance.
   * @param {FusionOptions} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      method: "weighted",
      weights: { text: 0.35, face: 0.35, voice: 0.3 },
      temporalSmoothing: false,
      smoothingFactor: 0.3,
      dynamicWeights: false,
      learningRate: 0.05,
      emotions: ["happy", "sad", "angry", "neutral", "surprised"],
      returnConsistency: true,
      ...options,
    };

    // Validate weights
    const total = Object.values(this.options.weights).reduce(
      (a, b) => a + b,
      0,
    );
    if (Math.abs(total - 1.0) > 1e-6) {
      console.warn("[EmotionFusion] Weights do not sum to 1, normalizing");
      const norm = 1.0 / total;
      for (const k in this.options.weights) {
        this.options.weights[k] *= norm;
      }
    }

    // State for temporal smoothing
    this.history = null; // last fused scores (for EMA)

    // State for adaptive weighting (stores recent prediction errors per modality)
    this.modalityErrors = { text: [], face: [], voice: [] };
    this.maxErrorHistory = 20;
  }

  /**
   * Normalize emotion scores to sum to 1.
   * @param {EmotionScores} scores
   * @returns {EmotionScores} Normalized copy
   */
  normalizeScores(scores) {
    const sum = Object.values(scores).reduce((a, b) => a + b, 0);
    if (sum === 0) {
      // Fallback: uniform distribution
      const uniform = 1.0 / this.options.emotions.length;
      const result = {};
      for (const e of this.options.emotions) {
        result[e] = uniform;
      }
      return result;
    }
    const result = {};
    for (const [k, v] of Object.entries(scores)) {
      result[k] = v / sum;
    }
    return result;
  }

  /**
   * Extract scores for configured emotions, fill missing with 0.
   * @param {Object} modalityResult - Can be raw scores object or ModalityResult
   * @returns {EmotionScores}
   */
  extractScores(modalityResult) {
    const scores = modalityResult.scores || modalityResult;
    const extracted = {};
    for (const emo of this.options.emotions) {
      extracted[emo] = typeof scores[emo] === "number" ? scores[emo] : 0;
    }
    return extracted;
  }

  /**
   * Weighted average fusion.
   * @param {Object} modalityScores - { text: EmotionScores, face: EmotionScores, voice: EmotionScores }
   * @param {Object} weights - Current weights per modality
   * @returns {EmotionScores} Fused scores (unnormalized)
   */
  weightedFusion(modalityScores, weights) {
    const fused = {};
    for (const emo of this.options.emotions) {
      let sum = 0;
      for (const [mod, scores] of Object.entries(modalityScores)) {
        if (scores && weights[mod]) {
          sum += (scores[emo] || 0) * weights[mod];
        }
      }
      fused[emo] = sum;
    }
    return fused;
  }

  /**
   * Product fusion (assumes independence, then renormalizes).
   * @param {Object} modalityScores
   * @param {Object} weights - Not used directly but can modulate (exponentiate)
   * @returns {EmotionScores}
   */
  productFusion(modalityScores, weights) {
    const fused = {};
    for (const emo of this.options.emotions) {
      let product = 1.0;
      let weightSum = 0;
      for (const [mod, scores] of Object.entries(modalityScores)) {
        if (scores && weights[mod]) {
          const w = weights[mod];
          // Use weighted exponent: p^w to allow varying influence
          product *= Math.pow(Math.max(scores[emo] || 0, 1e-8), w);
          weightSum += w;
        }
      }
      // Normalize exponent effect
      fused[emo] = Math.pow(product, 1.0 / (weightSum || 1));
    }
    return fused;
  }

  /**
   * Dempster-Shafer fusion for each emotion as a hypothesis.
   * Treats each modality as providing evidence mass for each emotion.
   * Simple implementation: combine using orthogonal sum for each emotion independently
   * (approximation, but works for exclusive hypotheses).
   * @param {Object} modalityScores
   * @param {Object} weights - Used as discounting factor (reliability)
   * @returns {EmotionScores}
   */
  dempsterShaferFusion(modalityScores, weights) {
    // Initialize belief mass for each emotion from each modality
    const numEmotions = this.options.emotions.length;
    const fused = {};

    for (const emo of this.options.emotions) {
      let combinedBelief = 0;
      let combinedConflict = 1;

      for (const [mod, scores] of Object.entries(modalityScores)) {
        if (!scores || !weights[mod]) continue;
        const belief = (scores[emo] || 0) * weights[mod];
        const uncertainty = 1 - weights[mod]; // mass assigned to "unknown"
        // Simple orthogonal sum approximation: product of (belief + uncertainty)
        // then subtract the part where all are uncertain
        combinedBelief =
          combinedBelief * (belief + uncertainty) + belief * combinedConflict;
        combinedConflict = combinedConflict * uncertainty;
      }
      fused[emo] = combinedBelief / (1 - combinedConflict + 1e-8);
    }
    return fused;
  }

  /**
   * Adaptive weighted fusion: updates weights based on error between modality predictions
   * and the fused result. Requires history of previous fusions.
   * @param {Object} modalityScores
   * @param {Object} currentWeights
   * @param {EmotionScores} previousFused - Fused result from previous step (or initial)
   * @returns {{fused: EmotionScores, newWeights: Object}}
   */
  adaptiveWeightedFusion(modalityScores, currentWeights, previousFused) {
    // First, compute weighted fusion using current weights
    let fused = this.weightedFusion(modalityScores, currentWeights);
    fused = this.normalizeScores(fused);

    if (!previousFused) {
      return { fused, newWeights: { ...currentWeights } };
    }

    // Compute prediction error for each modality (KL divergence or MSE)
    const errors = {};
    for (const [mod, scores] of Object.entries(modalityScores)) {
      if (!scores) {
        errors[mod] = 0;
        continue;
      }
      // Mean squared error between modality scores and fused result
      let mse = 0;
      for (const emo of this.options.emotions) {
        const diff = (scores[emo] || 0) - fused[emo];
        mse += diff * diff;
      }
      errors[mod] = mse / this.options.emotions.length;
    }

    // Update stored errors
    for (const mod of Object.keys(currentWeights)) {
      if (!this.modalityErrors[mod]) this.modalityErrors[mod] = [];
      this.modalityErrors[mod].push(errors[mod] || 0);
      if (this.modalityErrors[mod].length > this.maxErrorHistory) {
        this.modalityErrors[mod].shift();
      }
    }

    // Compute average recent error per modality
    const avgError = {};
    for (const mod of Object.keys(currentWeights)) {
      const errs = this.modalityErrors[mod] || [];
      avgError[mod] = errs.length
        ? errs.reduce((a, b) => a + b, 0) / errs.length
        : 0;
    }

    // Update weights: lower weight to modalities with higher error
    const invError = {};
    let invSum = 0;
    for (const mod of Object.keys(currentWeights)) {
      // Avoid division by zero: if error near zero, give high weight
      const inv = 1.0 / (avgError[mod] + 0.01);
      invError[mod] = inv;
      invSum += inv;
    }
    const newWeights = {};
    for (const mod of Object.keys(currentWeights)) {
      newWeights[mod] = invError[mod] / invSum;
    }

    // Apply learning rate to smooth weight changes
    for (const mod of Object.keys(currentWeights)) {
      newWeights[mod] =
        (1 - this.options.learningRate) * currentWeights[mod] +
        this.options.learningRate * newWeights[mod];
    }

    return { fused, newWeights };
  }

  /**
   * Compute consistency between modalities using Jensen-Shannon divergence.
   * Lower divergence means higher consistency.
   * @param {Object} modalityScores
   * @returns {number} Consistency score (0 = inconsistent, 1 = perfectly consistent)
   */
  computeConsistency(modalityScores) {
    const available = Object.values(modalityScores).filter((m) => m !== null);
    if (available.length < 2) return 1.0;

    // Convert each to probability distribution
    const distributions = available.map((scores) => {
      const dist = [];
      for (const emo of this.options.emotions) {
        dist.push(scores[emo] || 0);
      }
      return dist;
    });

    // Compute average distribution
    const avg = new Array(this.options.emotions.length).fill(0);
    for (const dist of distributions) {
      for (let i = 0; i < dist.length; i++) {
        avg[i] += dist[i] / distributions.length;
      }
    }

    // Compute Jensen-Shannon divergence
    let jsd = 0;
    for (const dist of distributions) {
      let kl = 0;
      for (let i = 0; i < dist.length; i++) {
        const p = dist[i];
        const q = avg[i];
        if (p > 0 && q > 0) {
          kl += p * Math.log(p / q);
        } else if (p > 0) {
          kl += p * Math.log(p / 1e-8);
        }
      }
      jsd += kl;
    }
    jsd /= distributions.length;

    // Convert divergence to similarity (0-1, higher = more consistent)
    // Maximum possible JSD for uniform vs one-hot is log(2) ~0.693
    const maxJSD = Math.log(2);
    const consistency = Math.max(0, 1 - jsd / maxJSD);
    return consistency;
  }

  /**
   * Apply temporal smoothing (exponential moving average) to fused scores.
   * @param {EmotionScores} currentScores
   * @returns {EmotionScores}
   */
  applyTemporalSmoothing(currentScores) {
    if (!this.history) {
      this.history = { ...currentScores };
      return { ...currentScores };
    }
    const alpha = this.options.smoothingFactor;
    const smoothed = {};
    for (const emo of this.options.emotions) {
      smoothed[emo] =
        alpha * currentScores[emo] + (1 - alpha) * (this.history[emo] || 0);
    }
    this.history = smoothed;
    return smoothed;
  }

  /**
   * Main fusion method: combine emotion predictions from multiple modalities.
   * @param {ModalityResult|EmotionScores|null} textEmo - Text modality result
   * @param {ModalityResult|EmotionScores|null} faceEmo - Face modality result
   * @param {ModalityResult|EmotionScores|null} voiceEmo - Voice modality result
   * @param {FusionOptions} [overrideOptions] - Temporary options override
   * @returns {Object} Fused result with emotion, scores, confidence, consistency, sources
   */
  fuse(textEmo, faceEmo, voiceEmo, overrideOptions = {}) {
    // Merge options
    const opts = { ...this.options, ...overrideOptions };

    // Extract scores and optional confidence from each modality
    const modalities = { text: textEmo, face: faceEmo, voice: voiceEmo };
    const modalityScores = {};
    const modalityConfidence = {};

    for (const [mod, data] of Object.entries(modalities)) {
      if (data && (data.scores || data)) {
        const scores = this.extractScores(data);
        modalityScores[mod] = this.normalizeScores(scores);
        // Extract confidence if provided (default 0.8)
        modalityConfidence[mod] =
          data.confidence && typeof data.confidence === "number"
            ? Math.min(1, Math.max(0, data.confidence))
            : 0.8;
      } else {
        modalityScores[mod] = null;
        modalityConfidence[mod] = 0;
      }
    }

    // Determine effective weights: initial weights * modality confidence
    const weights = { ...opts.weights };
    for (const mod of Object.keys(weights)) {
      if (modalityConfidence[mod] !== undefined) {
        weights[mod] = weights[mod] * modalityConfidence[mod];
      }
    }
    // Renormalize
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (weightSum > 0) {
      for (const mod of Object.keys(weights)) {
        weights[mod] /= weightSum;
      }
    }

    // Select fusion method
    let fusedScores;
    let newWeights = null;
    const method = opts.method;

    switch (method) {
      case "product":
        fusedScores = this.productFusion(modalityScores, weights);
        break;
      case "dempsterShafer":
        fusedScores = this.dempsterShaferFusion(modalityScores, weights);
        break;
      case "adaptiveWeighted":
        const prevFused = this.history; // use last fused for error (if temporal smoothing on)
        const { fused, newWeights: updWeights } = this.adaptiveWeightedFusion(
          modalityScores,
          weights,
          prevFused,
        );
        fusedScores = fused;
        newWeights = updWeights;
        break;
      case "weighted":
      default:
        fusedScores = this.weightedFusion(modalityScores, weights);
        break;
    }

    // Normalize fused scores
    let normalized = this.normalizeScores(fusedScores);

    // Apply temporal smoothing if requested
    if (opts.temporalSmoothing) {
      normalized = this.applyTemporalSmoothing(normalized);
    } else {
      // Reset history if not smoothing
      this.history = null;
    }

    // Update adaptive weights if method is adaptiveWeighted and dynamicWeights enabled
    if (method === "adaptiveWeighted" && opts.dynamicWeights && newWeights) {
      this.options.weights = newWeights;
    }

    // Determine dominant emotion
    let maxEmo = this.options.emotions[0];
    let maxScore = normalized[maxEmo] || 0;
    for (const emo of this.options.emotions) {
      if ((normalized[emo] || 0) > maxScore) {
        maxScore = normalized[emo];
        maxEmo = emo;
      }
    }

    // Compute overall confidence: max score * (1 - entropy)
    let entropy = 0;
    for (const emo of this.options.emotions) {
      const p = normalized[emo] || 0;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxPossibleEntropy = Math.log2(this.options.emotions.length);
    const confidence = maxScore * (1 - entropy / maxPossibleEntropy);

    // Consistency metric
    let consistency = null;
    if (opts.returnConsistency) {
      consistency = this.computeConsistency(modalityScores);
    }

    // Prepare result
    const result = {
      emotion: maxEmo,
      scores: normalized,
      confidence: Math.min(1, Math.max(0, confidence)),
      sources: {
        text: modalityScores.text !== null,
        face: modalityScores.face !== null,
        voice: modalityScores.voice !== null,
      },
      method,
    };
    if (consistency !== null) result.consistency = consistency;
    if (opts.method === "adaptiveWeighted" && opts.dynamicWeights) {
      result.adaptiveWeights = this.options.weights;
    }

    return result;
  }

  /**
   * Reset internal state (history, error buffers).
   */
  reset() {
    this.history = null;
    this.modalityErrors = { text: [], face: [], voice: [] };
  }
}

// Convenience function for one-off fusion (stateless, default options)
export const fuseEmotions = (textEmo, faceEmo, voiceEmo, options = {}) => {
  const fusion = new EmotionFusion(options);
  return fusion.fuse(textEmo, faceEmo, voiceEmo);
};

// Export the class for stateful advanced usage
export { EmotionFusion };

// console.log("[emotionFusion] Advanced fusion module ready (weighted, product, Dempster-Shafer, adaptive, temporal smoothing)");  // Disabled for load perf
