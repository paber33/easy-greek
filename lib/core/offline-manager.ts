/**
 * Offline detection and state management
 * Provides resilience for network operations and graceful degradation
 */

export interface OfflineState {
  isOnline: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
  reconnectAttempts: number;
  pendingOperations: PendingOperation[];
}

export interface PendingOperation {
  id: string;
  type: "rate_card" | "create_card" | "update_card" | "delete_card" | "session_log";
  data: any;
  timestamp: Date;
  retries: number;
  maxRetries: number;
}

export interface OfflineOptions {
  maxRetries?: number;
  retryDelay?: number;
  maxPendingOperations?: number;
  onStateChange?: (state: OfflineState) => void;
  onOperationQueued?: (operation: PendingOperation) => void;
  onOperationRetry?: (operation: PendingOperation) => void;
  onOperationFailed?: (operation: PendingOperation, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<OfflineOptions> = {
  maxRetries: 3,
  retryDelay: 5000,
  maxPendingOperations: 100,
  onStateChange: () => {},
  onOperationQueued: () => {},
  onOperationRetry: () => {},
  onOperationFailed: () => {},
};

/**
 * Offline manager for handling network state and queued operations
 */
export class OfflineManager {
  private state: OfflineState = {
    isOnline: navigator.onLine,
    lastOnline: navigator.onLine ? new Date() : null,
    lastOffline: !navigator.onLine ? new Date() : null,
    reconnectAttempts: 0,
    pendingOperations: [],
  };

  private options: Required<OfflineOptions>;
  private retryTimer: NodeJS.Timeout | null = null;
  private stateListeners: Set<(state: OfflineState) => void> = new Set();

  constructor(options: OfflineOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeEventListeners();
    this.startRetryTimer();
  }

  /**
   * Initialize network event listeners
   */
  private initializeEventListeners(): void {
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Also listen for visibility changes to detect when user comes back
    document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log("NETWORK_ONLINE: Connection restored");

    this.state = {
      ...this.state,
      isOnline: true,
      lastOnline: new Date(),
      reconnectAttempts: 0,
    };

    this.notifyStateChange();
    this.processPendingOperations();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log("NETWORK_OFFLINE: Connection lost");

    this.state = {
      ...this.state,
      isOnline: false,
      lastOffline: new Date(),
    };

    this.notifyStateChange();
  }

  /**
   * Handle visibility change (user returns to tab)
   */
  private handleVisibilityChange(): void {
    if (!document.hidden && this.state.isOnline) {
      // User returned to tab and we're online, process any pending operations
      this.processPendingOperations();
    }
  }

  /**
   * Get current offline state
   */
  getState(): OfflineState {
    return { ...this.state };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * Queue an operation for later execution
   */
  queueOperation(
    type: PendingOperation["type"],
    data: any,
    maxRetries: number = this.options.maxRetries
  ): string {
    if (this.state.pendingOperations.length >= this.options.maxPendingOperations) {
      // Remove oldest operation to make room
      this.state.pendingOperations.shift();
    }

    const operation: PendingOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
      retries: 0,
      maxRetries,
    };

    this.state.pendingOperations.push(operation);
    this.options.onOperationQueued(operation);
    this.notifyStateChange();

    console.log(`OFFLINE_QUEUE: Queued ${type} operation`, operation.id);

    return operation.id;
  }

  /**
   * Remove a specific operation from the queue
   */
  removeOperation(operationId: string): boolean {
    const index = this.state.pendingOperations.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.state.pendingOperations.splice(index, 1);
      this.notifyStateChange();
      return true;
    }
    return false;
  }

  /**
   * Clear all pending operations
   */
  clearPendingOperations(): void {
    this.state.pendingOperations = [];
    this.notifyStateChange();
  }

  /**
   * Process pending operations when back online
   */
  private async processPendingOperations(): Promise<void> {
    if (!this.state.isOnline || this.state.pendingOperations.length === 0) {
      return;
    }

    console.log(
      `OFFLINE_PROCESS: Processing ${this.state.pendingOperations.length} pending operations`
    );

    const operations = [...this.state.pendingOperations];
    const successfulOperations: string[] = [];
    const failedOperations: PendingOperation[] = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        successfulOperations.push(operation.id);
        console.log(`OFFLINE_SUCCESS: Operation ${operation.id} completed`);
      } catch (error) {
        operation.retries++;

        if (operation.retries >= operation.maxRetries) {
          failedOperations.push(operation);
          this.options.onOperationFailed(operation, error as Error);
          console.error(`OFFLINE_FAILED: Operation ${operation.id} failed permanently`, error);
        } else {
          this.options.onOperationRetry(operation);
          console.warn(
            `OFFLINE_RETRY: Operation ${operation.id} failed, will retry (${operation.retries}/${operation.maxRetries})`,
            error
          );
        }
      }
    }

    // Remove successful operations
    this.state.pendingOperations = this.state.pendingOperations.filter(
      op => !successfulOperations.includes(op.id)
    );

    // Remove permanently failed operations
    this.state.pendingOperations = this.state.pendingOperations.filter(
      op => !failedOperations.some(failed => failed.id === op.id)
    );

    this.notifyStateChange();
  }

  /**
   * Execute a specific operation
   */
  private async executeOperation(operation: PendingOperation): Promise<void> {
    // This would be implemented with actual operation handlers
    // For now, we'll simulate the operation execution
    switch (operation.type) {
      case "rate_card":
        await this.executeRateCard(operation.data);
        break;
      case "create_card":
        await this.executeCreateCard(operation.data);
        break;
      case "update_card":
        await this.executeUpdateCard(operation.data);
        break;
      case "delete_card":
        await this.executeDeleteCard(operation.data);
        break;
      case "session_log":
        await this.executeSessionLog(operation.data);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Execute rate card operation
   */
  private async executeRateCard(data: any): Promise<void> {
    // This would call the actual rate card function
    // For now, we'll simulate it
    console.log("Executing rate card operation:", data);
    // await enhancedCardsRepository.rateCard(data.userId, data.cardId, data.rating, data.options);
  }

  /**
   * Execute create card operation
   */
  private async executeCreateCard(data: any): Promise<void> {
    console.log("Executing create card operation:", data);
    // await enhancedCardsRepository.create(data.userId, data.card);
  }

  /**
   * Execute update card operation
   */
  private async executeUpdateCard(data: any): Promise<void> {
    console.log("Executing update card operation:", data);
    // await enhancedCardsRepository.update(data.userId, data.cardId, data.updates, data.expectedUpdatedAt);
  }

  /**
   * Execute delete card operation
   */
  private async executeDeleteCard(data: any): Promise<void> {
    console.log("Executing delete card operation:", data);
    // await enhancedCardsRepository.remove(data.userId, data.cardId);
  }

  /**
   * Execute session log operation
   */
  private async executeSessionLog(data: any): Promise<void> {
    console.log("Executing session log operation:", data);
    // await enhancedLogsRepository.appendSessionLog(data.userId, data.log);
  }

  /**
   * Start retry timer for processing pending operations
   */
  private startRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }

    this.retryTimer = setInterval(() => {
      if (this.state.isOnline && this.state.pendingOperations.length > 0) {
        this.processPendingOperations();
      }
    }, this.options.retryDelay);
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    this.options.onStateChange(this.state);
    this.stateListeners.forEach(listener => listener(this.state));
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: OfflineState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));
    document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this));

    this.stateListeners.clear();
  }
}

// Global offline manager instance
export const offlineManager = new OfflineManager({
  onStateChange: state => {
    console.log("OFFLINE_STATE_CHANGE:", state);
  },
  onOperationQueued: operation => {
    console.log("OFFLINE_OPERATION_QUEUED:", operation.type, operation.id);
  },
  onOperationRetry: operation => {
    console.log("OFFLINE_OPERATION_RETRY:", operation.type, operation.id, operation.retries);
  },
  onOperationFailed: (operation, error) => {
    console.error("OFFLINE_OPERATION_FAILED:", operation.type, operation.id, error.message);
  },
});

/**
 * Hook for React components to use offline state
 */
export function useOfflineState() {
  const [state, setState] = React.useState(offlineManager.getState());

  React.useEffect(() => {
    const unsubscribe = offlineManager.addStateListener(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Utility function to execute operations with offline support
 */
export async function executeWithOfflineSupport<T>(
  operation: () => Promise<T>,
  type: PendingOperation["type"],
  data: any
): Promise<T> {
  if (offlineManager.isOnline()) {
    try {
      return await operation();
    } catch (error) {
      // If operation fails and we're online, queue it for retry
      if (error instanceof Error && isRetryableError(error)) {
        const operationId = offlineManager.queueOperation(type, data);
        throw new Error(`Operation failed and queued for retry: ${operationId}`);
      }
      throw error;
    }
  } else {
    // Queue operation for later execution
    const operationId = offlineManager.queueOperation(type, data);
    throw new Error(`Offline: Operation queued for later execution: ${operationId}`);
  }
}

/**
 * Check if error is retryable (same logic as in retry.ts)
 */
function isRetryableError(error: Error): boolean {
  if (error.name === "NetworkError" || error.message.includes("network")) {
    return true;
  }

  if (error.name === "TimeoutError" || error.message.includes("timeout")) {
    return true;
  }

  if (
    error.message.includes("connection") ||
    error.message.includes("ECONNRESET") ||
    error.message.includes("ETIMEDOUT")
  ) {
    return true;
  }

  return false;
}

// Import React for the hook (this would be in a separate file in a real implementation)
import * as React from "react";
