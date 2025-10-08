/**
 * Observability and logging system
 * Provides comprehensive logging, error tracking, and performance monitoring
 */

export interface LogEntry {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  category: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  operationId?: string;
  duration?: number;
  error?: Error;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  success: boolean;
  error?: string;
}

export interface ErrorReport {
  error: Error;
  context: {
    userId?: string;
    sessionId?: string;
    operationId?: string;
    userAgent?: string;
    url?: string;
    timestamp: Date;
  };
  stack?: string;
}

class ObservabilityManager {
  private logs: LogEntry[] = [];
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorReport[] = [];
  private maxLogs = 1000;
  private maxMetrics = 500;
  private maxErrors = 100;

  /**
   * Log a message with context
   */
  log(
    level: LogEntry["level"],
    category: string,
    message: string,
    data?: any,
    context?: {
      userId?: string;
      sessionId?: string;
      operationId?: string;
    }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      ...context,
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV === "development") {
      const logMethod =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : level === "info"
              ? console.info
              : console.log;

      logMethod(`[${category}] ${message}`, data || "");
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === "production") {
      this.sendToExternalLogger(entry);
    }
  }

  /**
   * Log debug information
   */
  debug(category: string, message: string, data?: any, context?: any): void {
    this.log("debug", category, message, data, context);
  }

  /**
   * Log informational message
   */
  info(category: string, message: string, data?: any, context?: any): void {
    this.log("info", category, message, data, context);
  }

  /**
   * Log warning message
   */
  warn(category: string, message: string, data?: any, context?: any): void {
    this.log("warn", category, message, data, context);
  }

  /**
   * Log error message
   */
  error(category: string, message: string, error?: Error, context?: any): void {
    this.log("error", category, message, { error: error?.message, stack: error?.stack }, context);
  }

  /**
   * Record performance metric
   */
  recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    context?: {
      userId?: string;
      error?: string;
    }
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      userId: context?.userId,
      success,
      error: context?.error,
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (duration > 1000) {
      this.warn("PERFORMANCE", `Slow operation: ${operation} took ${duration}ms`, {
        duration,
        operation,
      });
    }

    // Send to external monitoring in production
    if (process.env.NODE_ENV === "production") {
      this.sendToExternalMonitoring(metric);
    }
  }

  /**
   * Record error with full context
   */
  recordError(
    error: Error,
    context?: {
      userId?: string;
      sessionId?: string;
      operationId?: string;
    }
  ): void {
    const report: ErrorReport = {
      error,
      context: {
        ...context,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        timestamp: new Date(),
      },
      stack: error.stack,
    };

    this.errors.push(report);

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    this.error("ERROR_REPORT", error.message, error, context);

    // Send to external error tracking in production
    if (process.env.NODE_ENV === "production") {
      this.sendToExternalErrorTracking(report);
    }
  }

  /**
   * Get recent logs
   */
  getLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get recent metrics
   */
  getMetrics(limit: number = 100): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get recent errors
   */
  getErrors(limit: number = 50): ErrorReport[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageResponseTime: number;
    slowestOperations: Array<{ operation: string; duration: number; count: number }>;
    errorRate: number;
    totalOperations: number;
  } {
    const recentMetrics = this.metrics.slice(-100); // Last 100 operations

    if (recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        slowestOperations: [],
        errorRate: 0,
        totalOperations: 0,
      };
    }

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageResponseTime = totalDuration / recentMetrics.length;

    const failedOperations = recentMetrics.filter(m => !m.success).length;
    const errorRate = (failedOperations / recentMetrics.length) * 100;

    // Group by operation and find slowest
    const operationGroups = recentMetrics.reduce(
      (groups, metric) => {
        const key = metric.operation;
        if (!groups[key]) {
          groups[key] = { operation: key, totalDuration: 0, count: 0 };
        }
        groups[key].totalDuration += metric.duration;
        groups[key].count++;
        return groups;
      },
      {} as Record<string, { operation: string; totalDuration: number; count: number }>
    );

    const slowestOperations = Object.values(operationGroups)
      .map(group => ({
        operation: group.operation,
        duration: group.totalDuration / group.count,
        count: group.count,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    return {
      averageResponseTime,
      slowestOperations,
      errorRate,
      totalOperations: recentMetrics.length,
    };
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.logs = [];
    this.metrics = [];
    this.errors = [];
  }

  /**
   * Send log entry to external logging service
   */
  private async sendToExternalLogger(entry: LogEntry): Promise<void> {
    try {
      // In a real implementation, this would send to services like:
      // - LogRocket
      // - Sentry
      // - DataDog
      // - CloudWatch

      if (process.env.NEXT_PUBLIC_LOGGING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_LOGGING_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entry),
        });
      }
    } catch (error) {
      // Don't throw errors from logging
      console.warn("Failed to send log to external service:", error);
    }
  }

  /**
   * Send metric to external monitoring service
   */
  private async sendToExternalMonitoring(metric: PerformanceMetric): Promise<void> {
    try {
      if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metric),
        });
      }
    } catch (error) {
      console.warn("Failed to send metric to external service:", error);
    }
  }

  /**
   * Send error to external error tracking service
   */
  private async sendToExternalErrorTracking(report: ErrorReport): Promise<void> {
    try {
      if (process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(report),
        });
      }
    } catch (error) {
      console.warn("Failed to send error to external service:", error);
    }
  }
}

// Global observability manager instance
export const observability = new ObservabilityManager();

/**
 * Performance monitoring decorator
 */
export function monitorPerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = true;
      let error: string | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        const duration = Date.now() - startTime;
        observability.recordMetric(operationName, duration, success, { error });
      }
    };

    return descriptor;
  };
}

/**
 * Error handling decorator
 */
export function handleErrors(category: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        observability.recordError(error as Error, {
          operationId: `${target.constructor.name}.${propertyName}`,
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility function to measure operation performance
 */
export async function measurePerformance<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: { userId?: string }
): Promise<T> {
  const startTime = Date.now();
  let success = true;
  let error: string | undefined;

  try {
    const result = await operation();
    return result;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    observability.recordMetric(operationName, duration, success, { ...context, error });
  }
}

/**
 * Utility function to log SRS operations
 */
export function logSRSOperation(
  operation: string,
  data: any,
  context?: { userId?: string; sessionId?: string; operationId?: string }
): void {
  observability.info("SRS", operation, data, context);
}

/**
 * Utility function to log database operations
 */
export function logDatabaseOperation(
  operation: string,
  data: any,
  context?: { userId?: string; operationId?: string }
): void {
  observability.debug("DATABASE", operation, data, context);
}

/**
 * Utility function to log network operations
 */
export function logNetworkOperation(
  operation: string,
  data: any,
  context?: { userId?: string; operationId?: string }
): void {
  observability.debug("NETWORK", operation, data, context);
}

/**
 * Utility function to log user actions
 */
export function logUserAction(
  action: string,
  data: any,
  context?: { userId?: string; sessionId?: string }
): void {
  observability.info("USER_ACTION", action, data, context);
}

/**
 * Global error handler
 */
export function setupGlobalErrorHandling(): void {
  if (typeof window !== "undefined") {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", event => {
      observability.recordError(new Error(event.reason), {
        operationId: "unhandled-promise-rejection",
      });
    });

    // Handle JavaScript errors
    window.addEventListener("error", event => {
      observability.recordError(event.error || new Error(event.message), {
        operationId: "javascript-error",
      });
    });
  }
}

// Setup global error handling
setupGlobalErrorHandling();
