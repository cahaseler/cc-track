import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from './logger';

const logger = createLogger('autoflow_state');

export interface StopEvent {
  timestamp: string;
  messagePattern: string;
  toolName?: string;
}

export interface AutoApproval {
  timestamp: string;
  toolName: string;
  toolInput: unknown;
  decision: 'approved' | 'blocked';
  reason: string;
}

export interface LoopDetectionConfig {
  maxStopsInWindow: number;
  windowSeconds: number;
  maxSamePattern: number;
}

export interface SafetyRules {
  allowCriticalFileEdits: boolean;
  allowSystemPaths: boolean;
  allowNetworkRequests: boolean;
  allowDestructiveCommands: boolean;
  customSafeCommands: string[];
  customUnsafePatterns: string[];
}

export interface AutoflowConfig {
  loopDetection: LoopDetectionConfig;
  safetyRules: SafetyRules;
  maxDurationMinutes?: number;
}

export interface AutoflowState {
  active: boolean;
  activatedAt: string;
  sessionId: string;
  stopEvents: StopEvent[];
  autoApprovals: AutoApproval[];
  config: AutoflowConfig;
}

export const DEFAULT_SAFETY_RULES: SafetyRules = {
  allowCriticalFileEdits: false,
  allowSystemPaths: false,
  allowNetworkRequests: false,
  allowDestructiveCommands: false,
  customSafeCommands: [],
  customUnsafePatterns: [],
};

export const DEFAULT_LOOP_DETECTION: LoopDetectionConfig = {
  maxStopsInWindow: 3,
  windowSeconds: 30,
  maxSamePattern: 5,
};

export const DEFAULT_CONFIG: AutoflowConfig = {
  loopDetection: DEFAULT_LOOP_DETECTION,
  safetyRules: DEFAULT_SAFETY_RULES,
};

const DEFAULT_STATE: AutoflowState = {
  active: false,
  activatedAt: '',
  sessionId: '',
  stopEvents: [],
  autoApprovals: [],
  config: DEFAULT_CONFIG,
};

export class AutoflowStateManager {
  private stateFilePath: string;
  private ccTrackDir: string;

  constructor(private projectRoot: string) {
    this.ccTrackDir = join(projectRoot, '.cc-track');
    this.stateFilePath = join(this.ccTrackDir, '.autoflow-state.json');
  }

  /**
   * Check if autoflow mode is currently active
   */
  isActive(): boolean {
    const state = this.getState();
    return state.active;
  }

  /**
   * Activate autoflow mode
   */
  activate(sessionId: string): void {
    const state = this.getState();
    state.active = true;
    state.activatedAt = new Date().toISOString();
    state.sessionId = sessionId;
    state.stopEvents = [];
    state.autoApprovals = [];
    this.saveState(state);
    logger.info('Autoflow mode activated', { sessionId, activatedAt: state.activatedAt });
  }

  /**
   * Deactivate autoflow mode
   */
  deactivate(): void {
    const state = this.getState();
    const wasActive = state.active;
    state.active = false;
    this.saveState(state);
    if (wasActive) {
      logger.info('Autoflow mode deactivated', {
        duration: this.getDuration(),
        stopEvents: state.stopEvents.length,
        autoApprovals: state.autoApprovals.length,
      });
    }
  }

  /**
   * Get current autoflow state
   */
  getState(): AutoflowState {
    if (!existsSync(this.stateFilePath)) {
      return { ...DEFAULT_STATE };
    }

    try {
      const content = readFileSync(this.stateFilePath, 'utf-8');
      const state = JSON.parse(content) as AutoflowState;

      // Merge with defaults to handle config changes
      return {
        ...DEFAULT_STATE,
        ...state,
        config: {
          ...DEFAULT_CONFIG,
          ...state.config,
          loopDetection: {
            ...DEFAULT_LOOP_DETECTION,
            ...state.config?.loopDetection,
          },
          safetyRules: {
            ...DEFAULT_SAFETY_RULES,
            ...state.config?.safetyRules,
          },
        },
      };
    } catch (error) {
      logger.error('Failed to read autoflow state, using defaults', { error });
      return { ...DEFAULT_STATE };
    }
  }

  /**
   * Save state to file
   */
  private saveState(state: AutoflowState): void {
    try {
      // Ensure .cc-track directory exists
      if (!existsSync(this.ccTrackDir)) {
        mkdirSync(this.ccTrackDir, { recursive: true });
      }

      writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save autoflow state', { error });
      throw error;
    }
  }

  /**
   * Record a stop event for loop detection
   */
  recordStopEvent(event: StopEvent): void {
    const state = this.getState();
    state.stopEvents.push(event);

    // Keep only recent events (last 100)
    if (state.stopEvents.length > 100) {
      state.stopEvents = state.stopEvents.slice(-100);
    }

    this.saveState(state);
    logger.debug('Stop event recorded', { event });
  }

  /**
   * Record an auto-approval decision
   */
  recordApproval(approval: AutoApproval): void {
    const state = this.getState();
    state.autoApprovals.push(approval);

    // Keep only recent approvals (last 200)
    if (state.autoApprovals.length > 200) {
      state.autoApprovals = state.autoApprovals.slice(-200);
    }

    this.saveState(state);
    logger.debug('Auto-approval recorded', {
      toolName: approval.toolName,
      decision: approval.decision,
      reason: approval.reason,
    });
  }

  /**
   * Detect if we're in an infinite loop
   */
  detectInfiniteLoop(): boolean {
    const state = this.getState();
    const config = state.config.loopDetection;
    const events = state.stopEvents;

    if (events.length < config.maxStopsInWindow) {
      return false;
    }

    // Check 1: Too many stops in time window
    const windowStart = Date.now() - config.windowSeconds * 1000;
    const recentStops = events.filter((e) => new Date(e.timestamp).getTime() > windowStart);

    if (recentStops.length >= config.maxStopsInWindow) {
      logger.warn('Loop detected: too many stops in time window', {
        stops: recentStops.length,
        window: config.windowSeconds,
        threshold: config.maxStopsInWindow,
      });
      return true;
    }

    // Check 2: Repeated message patterns
    const lastN = events.slice(-config.maxSamePattern);
    const patterns = lastN.map((e) => e.messagePattern);
    const uniquePatterns = new Set(patterns);

    if (uniquePatterns.size === 1 && lastN.length >= config.maxSamePattern) {
      logger.warn('Loop detected: repeated message pattern', {
        pattern: patterns[0],
        count: lastN.length,
        threshold: config.maxSamePattern,
      });
      return true;
    }

    return false;
  }

  /**
   * Get autoflow configuration
   */
  getConfig(): AutoflowConfig {
    return this.getState().config;
  }

  /**
   * Update autoflow configuration
   */
  updateConfig(updates: Partial<AutoflowConfig>): void {
    const state = this.getState();
    state.config = {
      ...state.config,
      ...updates,
      loopDetection: {
        ...state.config.loopDetection,
        ...(updates.loopDetection || {}),
      },
      safetyRules: {
        ...state.config.safetyRules,
        ...(updates.safetyRules || {}),
      },
    };
    this.saveState(state);
    logger.info('Autoflow config updated', { updates });
  }

  /**
   * Get approval history
   */
  getApprovalHistory(): AutoApproval[] {
    return this.getState().autoApprovals;
  }

  /**
   * Get stop event history
   */
  getStopEventHistory(): StopEvent[] {
    return this.getState().stopEvents;
  }

  /**
   * Get duration of current/last autoflow session in seconds
   */
  getDuration(): number {
    const state = this.getState();
    if (!state.activatedAt) {
      return 0;
    }

    const startTime = new Date(state.activatedAt).getTime();
    const endTime = Date.now();
    return Math.floor((endTime - startTime) / 1000);
  }

  /**
   * Get formatted duration string (e.g., "2m 34s")
   */
  getFormattedDuration(): string {
    const totalSeconds = this.getDuration();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Clear all state (useful for testing)
   */
  clear(): void {
    this.saveState({ ...DEFAULT_STATE });
    logger.debug('Autoflow state cleared');
  }
}

/**
 * Create a simple hash of a message for pattern detection
 */
export function hashMessage(message: string): string {
  // Take first 100 chars, normalize whitespace, lowercase
  return message.slice(0, 100).toLowerCase().replace(/\s+/g, ' ').trim();
}
