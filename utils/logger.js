/**
 * Advanced Centralized Logger with multiple transports, log levels, child loggers,
 * structured logging, batching, redaction, sampling, and environment awareness.
 *
 * Supports: Console, Remote (HTTP), and custom transports.
 * Works in Node.js, browser, React Native (with limited file/async storage).
 *
 * @module logger
 */

// -----------------------------------------------------------------------------
// 1. Log Levels
// -----------------------------------------------------------------------------

/**
 * Numeric log levels for filtering.
 * @readonly
 * @enum {number}
 */
const LogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
  OFF: 6,
};

// Map level name to numeric value and vice versa
const levelNames = {
  [LogLevel.TRACE]: "TRACE",
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.FATAL]: "FATAL",
  [LogLevel.OFF]: "OFF",
};

const nameToLevel = Object.fromEntries(
  Object.entries(levelNames).map(([level, name]) => [
    name,
    parseInt(level, 10),
  ]),
);

// -----------------------------------------------------------------------------
// 2. Redaction of sensitive data
// -----------------------------------------------------------------------------

/**
 * Default patterns and keys to redact.
 * @type {Array<string|RegExp>}
 */
const DEFAULT_SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "ssn",
  "creditcard",
  "credit_card",
  "cvv",
];

/**
 * Recursively redact sensitive fields from an object.
 * @param {any} data - Input data
 * @param {Array<string|RegExp>} sensitiveKeys - Keys to redact
 * @returns {any} Redacted copy (does not mutate original)
 */
function redactSensitive(data, sensitiveKeys = DEFAULT_SENSITIVE_KEYS) {
  if (!data || typeof data !== "object") return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => redactSensitive(item, sensitiveKeys));
  }

  const result = { ...data };
  for (const key of Object.keys(result)) {
    const shouldRedact = sensitiveKeys.some((pattern) => {
      if (pattern instanceof RegExp) return pattern.test(key);
      return key.toLowerCase().includes(pattern.toLowerCase());
    });
    if (shouldRedact) {
      result[key] = "[REDACTED]";
    } else if (result[key] && typeof result[key] === "object") {
      result[key] = redactSensitive(result[key], sensitiveKeys);
    }
  }
  return result;
}

// -----------------------------------------------------------------------------
// 3. Transports
// -----------------------------------------------------------------------------

/**
 * Console transport - writes formatted logs to console.
 */
class ConsoleTransport {
  /**
   * @param {Object} options
   * @param {boolean} [options.useColors=true] - Enable ANSI colors (Node) or CSS (browser)
   * @param {boolean} [options.structured=false] - Print as JSON instead of formatted string
   */
  constructor(options = {}) {
    this.useColors = options.useColors !== false;
    this.structured = options.structured === true;
  }

  /**
   * Format log entry for console.
   * @param {LogEntry} entry
   * @returns {string|Object}
   */
  format(entry) {
    if (this.structured) {
      return entry;
    }

    const { timestamp, levelName, tag, message, data, error } = entry;
    const time = timestamp.toISOString();
    const meta = data ? ` ${JSON.stringify(data)}` : "";
    const err = error ? `\n${error.stack || error.message || error}` : "";

    if (
      this.useColors &&
      typeof process !== "undefined" &&
      process.stdout?.isTTY
    ) {
      // Node.js ANSI colors
      const colors = {
        TRACE: "\x1b[90m", // gray
        DEBUG: "\x1b[36m", // cyan
        INFO: "\x1b[32m", // green
        WARN: "\x1b[33m", // yellow
        ERROR: "\x1b[31m", // red
        FATAL: "\x1b[35m", // magenta
      };
      const reset = "\x1b[0m";
      const levelColor = colors[levelName] || reset;
      return `${time} ${levelColor}[${levelName}]${reset} [${tag}] ${message}${meta}${err}`;
    }

    // Plain or browser console
    return `${time} [${levelName}] [${tag}] ${message}${meta}${err}`;
  }

  /**
   * Write log entry to console.
   * @param {LogEntry} entry
   */
  log(entry) {
    const formatted = this.format(entry);
    const consoleMethod =
      entry.level >= LogLevel.ERROR
        ? "error"
        : entry.level >= LogLevel.WARN
          ? "warn"
          : entry.level >= LogLevel.INFO
            ? "info"
            : "log";
    if (typeof formatted === "object") {
      console[consoleMethod](formatted);
    } else {
      console[consoleMethod](formatted);
    }
  }

  flush() {
    // Console transport has no buffer
    return Promise.resolve();
  }
}

/**
 * Remote transport - batches logs and sends via HTTP.
 */
class RemoteTransport {
  /**
   * @param {Object} options
   * @param {string} options.endpoint - URL to send logs
   * @param {number} [options.batchSize=10] - Max logs per batch
   * @param {number} [options.flushInterval=5000] - Milliseconds between flushes
   * @param {number} [options.retryCount=2] - Number of retries on failure
   * @param {Object} [options.headers={}] - Additional HTTP headers
   * @param {Function} [options.mapper] - Transform log entry before sending
   */
  constructor(options) {
    if (!options.endpoint) throw new Error("RemoteTransport requires endpoint");
    this.endpoint = options.endpoint;
    this.batchSize = options.batchSize || 10;
    this.flushInterval = options.flushInterval || 5000;
    this.retryCount = options.retryCount || 2;
    this.headers = { "Content-Type": "application/json", ...options.headers };
    this.mapper = options.mapper || ((entry) => entry);
    this.buffer = [];
    this.timer = null;
    this.pendingFlush = null;

    this.startTimer();
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  /**
   * Add log entry to buffer.
   * @param {LogEntry} entry
   */
  log(entry) {
    this.buffer.push(entry);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];

    // Avoid concurrent flushes
    if (this.pendingFlush) {
      await this.pendingFlush;
    }
    this.pendingFlush = this._send(batch);
    await this.pendingFlush;
    this.pendingFlush = null;
  }

  async _send(batch, attempt = 0) {
    const payload = batch.map(this.mapper);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ logs: payload }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      if (attempt < this.retryCount) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._send(batch, attempt + 1);
      }
      // Fallback to console error when remote fails
      console.error("[RemoteTransport] Failed to send logs after retries", err);
    }
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
    this.flush();
  }
}

/**
 * Memory transport - stores logs in array (useful for testing or debugging).
 */
class MemoryTransport {
  constructor() {
    this.logs = [];
  }

  log(entry) {
    this.logs.push(entry);
  }

  flush() {
    return Promise.resolve();
  }

  clear() {
    this.logs = [];
  }
}

// -----------------------------------------------------------------------------
// 4. Main Logger Class
// -----------------------------------------------------------------------------

/**
 * Structured log entry.
 * @typedef {Object} LogEntry
 * @property {Date} timestamp
 * @property {number} level
 * @property {string} levelName
 * @property {string} tag
 * @property {string} message
 * @property {any} [data]
 * @property {Error} [error]
 * @property {string} [sessionId]
 * @property {string} [userId]
 * @property {any} [extra]
 */

class Logger {
  /**
   * Create a logger instance.
   * @param {Object} options
   * @param {number} [options.level=LogLevel.INFO] - Minimum log level
   * @param {Array<Object>} [options.transports=[new ConsoleTransport()]] - Transport instances
   * @param {Object} [options.defaultMeta] - Global metadata attached to every log
   * @param {Array<string|RegExp>} [options.sensitiveKeys] - Override redaction keys
   * @param {Object} [options.sampling] - Sampling rules per level
   * @param {number} [options.sampling.ERROR=1] - 1 = log all, 0.1 = 10% of logs
   * @param {string} [options.prefix] - Tag prefix (for child loggers)
   */
  constructor(options = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.transports = options.transports ?? [new ConsoleTransport()];
    this.defaultMeta = options.defaultMeta ?? {};
    this.sensitiveKeys = options.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS;
    this.sampling = options.sampling ?? {};
    this.prefix = options.prefix ?? "";

    // Ensure all transports have flush method
    for (const transport of this.transports) {
      if (!transport.flush) transport.flush = () => Promise.resolve();
    }
  }

  /**
   * Determine if a log level should be sampled.
   * @param {number} level
   * @returns {boolean}
   */
  shouldSample(level) {
    const levelName = levelNames[level];
    const sampleRate = this.sampling[levelName];
    if (sampleRate === undefined || sampleRate >= 1) return true;
    if (sampleRate <= 0) return false;
    return Math.random() < sampleRate;
  }

  /**
   * Check if a given level is enabled.
   * @param {number} level
   * @returns {boolean}
   */
  isLevelEnabled(level) {
    return level >= this.level && this.shouldSample(level);
  }

  /**
   * Create a child logger with additional default metadata and tag prefix.
   * @param {Object} options
   * @param {string} [options.tag] - Extra tag suffix
   * @param {Object} [options.defaultMeta] - Additional metadata
   * @param {number} [options.level] - Override log level for child
   * @returns {Logger}
   */
  child(options = {}) {
    const newPrefix = this.prefix
      ? options.tag
        ? `${this.prefix}:${options.tag}`
        : this.prefix
      : options.tag || "";
    return new Logger({
      level: options.level ?? this.level,
      transports: this.transports,
      defaultMeta: { ...this.defaultMeta, ...options.defaultMeta },
      sensitiveKeys: this.sensitiveKeys,
      sampling: this.sampling,
      prefix: newPrefix,
    });
  }

  /**
   * Core logging method.
   * @param {number} level
   * @param {string} tag
   * @param {string} message
   * @param {any} [data]
   * @param {Error} [error]
   */
  log(level, tag, message, data, error) {
    if (!this.isLevelEnabled(level)) return;

    // Build full tag with prefix
    const fullTag = this.prefix ? `${this.prefix}:${tag}` : tag;

    // Prepare metadata
    let meta = { ...this.defaultMeta, ...data };
    if (meta) meta = redactSensitive(meta, this.sensitiveKeys);

    // Build log entry
    const entry = {
      timestamp: new Date(),
      level,
      levelName: levelNames[level],
      tag: fullTag,
      message,
      data: meta,
      error: error
        ? error instanceof Error
          ? error
          : new Error(String(error))
        : undefined,
      // Optionally attach global context (can be set via setGlobalContext)
      ...(this.constructor.globalContext || {}),
    };

    // Send to all transports (synchronous, but transports may batch asynchronously)
    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (err) {
        // Prevent logger from crashing the app
        console.error("[Logger] Transport error", err);
      }
    }
  }

  // Convenience methods
  trace(tag, message, data) {
    this.log(LogLevel.TRACE, tag, message, data);
  }

  debug(tag, message, data) {
    this.log(LogLevel.DEBUG, tag, message, data);
  }

  info(tag, message, data) {
    this.log(LogLevel.INFO, tag, message, data);
  }

  warn(tag, message, data) {
    this.log(LogLevel.WARN, tag, message, data);
  }

  error(tag, message, error, data) {
    this.log(LogLevel.ERROR, tag, message, data, error);
  }

  fatal(tag, message, error, data) {
    this.log(LogLevel.FATAL, tag, message, data, error);
  }

  /**
   * Flush all transports (wait for batched logs).
   * @returns {Promise<void>}
   */
  async flush() {
    await Promise.all(this.transports.map((t) => t.flush()));
  }

  /**
   * Set global context that will be attached to every log entry.
   * @param {Object} context - e.g., { sessionId, userId, appVersion }
   */
  static setGlobalContext(context) {
    Logger.globalContext = { ...Logger.globalContext, ...context };
  }

  /**
   * Clear global context.
   */
  static clearGlobalContext() {
    Logger.globalContext = {};
  }
}

// Initialize static property
Logger.globalContext = {};

// -----------------------------------------------------------------------------
// 5. Default Singleton Instance
// -----------------------------------------------------------------------------

// Detect environment (React Native, browser, Node)
const isProduction =
  typeof process !== "undefined"
    ? process.env.NODE_ENV === "production"
    : typeof __DEV__ !== "undefined"
      ? !__DEV__
      : false;

// Configure default transports based on environment
const defaultTransports = [
  new ConsoleTransport({ structured: false, useColors: !isProduction }),
];

// In production, optionally add remote transport if LOGGER_ENDPOINT is set
if (
  isProduction &&
  typeof process !== "undefined" &&
  process.env.LOGGER_ENDPOINT
) {
  defaultTransports.push(
    new RemoteTransport({
      endpoint: process.env.LOGGER_ENDPOINT,
      batchSize: 20,
    }),
  );
}

const defaultLogger = new Logger({
  level: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
  transports: defaultTransports,
  defaultMeta: { environment: isProduction ? "production" : "development" },
});

// -----------------------------------------------------------------------------
// 6. Exports
// -----------------------------------------------------------------------------

export {
  Logger,
  LogLevel,
  ConsoleTransport,
  RemoteTransport,
  MemoryTransport,
  defaultLogger,
};
export default defaultLogger;
