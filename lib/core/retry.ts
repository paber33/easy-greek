/**
 * Universal retry mechanism with exponential backoff
 * Provides resilience for network operations and database transactions
 */

export interface RetryOptions {
  retries?: number;
  backoff?: "linear" | "exponential" | "fixed";
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  timeout?: number;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  backoff: "exponential",
  baseDelay: 1000,
  maxDelay: 10000,
  jitter: true,
  timeout: 8000,
  onRetry: () => {},
};

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  let delay: number;

  switch (options.backoff) {
    case "linear":
      delay = options.baseDelay * attempt;
      break;
    case "exponential":
      delay = options.baseDelay * Math.pow(2, attempt - 1);
      break;
    case "fixed":
    default:
      delay = options.baseDelay;
      break;
  }

  // Apply jitter to prevent thundering herd
  if (options.jitter) {
    const jitterAmount = delay * 0.1; // ±10% jitter
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }

  // Cap at max delay
  return Math.min(delay, options.maxDelay);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error): boolean {
  // Network errors
  if (error.name === "NetworkError" || error.message.includes("network")) {
    return true;
  }

  // Timeout errors
  if (error.name === "TimeoutError" || error.message.includes("timeout")) {
    return true;
  }

  // Supabase specific errors
  if (
    error.message.includes("connection") ||
    error.message.includes("ECONNRESET") ||
    error.message.includes("ETIMEDOUT")
  ) {
    return true;
  }

  // Database constraint violations that might be temporary
  if (
    error.message.includes("deadlock") ||
    error.message.includes("lock timeout") ||
    error.message.includes("serialization failure")
  ) {
    return true;
  }

  // Rate limiting
  if (error.message.includes("rate limit") || error.message.includes("429")) {
    return true;
  }

  return false;
}

/**
 * Execute function with retry logic
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.retries + 1; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${opts.timeout}ms`));
        }, opts.timeout);
      });

      // Race between function and timeout
      const result = await Promise.race([fn(), timeoutPromise]);

      return {
        success: true,
        data: result,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt > opts.retries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(lastError)) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      opts.onRetry(lastError, attempt, delay);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: opts.retries + 1,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Retry decorator for class methods
 */
export function retry(options: RetryOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetries(() => method.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Specialized retry for database operations
 */
export async function withDatabaseRetries<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const dbOptions: RetryOptions = {
    retries: 5,
    backoff: "exponential",
    baseDelay: 500,
    maxDelay: 5000,
    jitter: true,
    timeout: 10000,
    onRetry: (error, attempt, delay) => {
      console.warn(`Database operation failed (attempt ${attempt}):`, error.message);
      console.log(`Retrying in ${delay}ms...`);
    },
    ...options,
  };

  const result = await withRetries(fn, dbOptions);

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

/**
 * Specialized retry for network operations
 */
export async function withNetworkRetries<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const networkOptions: RetryOptions = {
    retries: 3,
    backoff: "exponential",
    baseDelay: 1000,
    maxDelay: 8000,
    jitter: true,
    timeout: 8000,
    onRetry: (error, attempt, delay) => {
      console.warn(`Network operation failed (attempt ${attempt}):`, error.message);
      console.log(`Retrying in ${delay}ms...`);
    },
    ...options,
  };

  const result = await withRetries(fn, networkOptions);

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Global circuit breaker instance for database operations
export const databaseCircuitBreaker = new CircuitBreaker(5, 60000, 30000);

// Global circuit breaker instance for network operations
export const networkCircuitBreaker = new CircuitBreaker(3, 30000, 15000);
