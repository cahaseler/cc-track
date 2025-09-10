import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getConfig } from './config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

interface LogConfig {
  enabled: boolean;
  level: keyof typeof LogLevel;
  retentionDays: number;
  prettyPrint: boolean;
}

class Logger {
  private source: string;
  private logDir: string;
  private config: LogConfig;
  private levelValue: number;

  constructor(source: string) {
    this.source = source;
    this.logDir = this.findLogDir();
    this.config = this.getLogConfig();
    this.levelValue = LogLevel[this.config.level] ?? LogLevel.INFO;

    // Ensure log directory exists
    if (this.config.enabled && !existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // Clean up old logs on initialization
    if (this.config.enabled) {
      this.cleanOldLogs();
    }
  }

  private findLogDir(): string {
    // Try to find .claude directory by checking current dir and parent dirs
    let currentPath = process.cwd();

    while (currentPath !== '/') {
      const claudeDir = join(currentPath, '.claude');
      if (existsSync(claudeDir)) {
        return join(claudeDir, 'logs');
      }
      // Move up one directory
      currentPath = join(currentPath, '..');
    }

    // Default to current working directory
    return join(process.cwd(), '.claude', 'logs');
  }

  private getLogConfig(): LogConfig {
    const config = getConfig();

    // Default logging config if not specified
    const defaultConfig: LogConfig = {
      enabled: true,
      level: 'INFO',
      retentionDays: 7,
      prettyPrint: false,
    };

    // @ts-expect-error - logging might not exist in config yet
    return config.logging || defaultConfig;
  }

  private cleanOldLogs(): void {
    try {
      const files = readdirSync(this.logDir);
      const now = Date.now();
      const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = join(this.logDir, file);
          const stats = statSync(filePath);

          if (now - stats.mtimeMs > retentionMs) {
            unlinkSync(filePath);
          }
        }
      }
    } catch (_error) {
      // Ignore cleanup errors
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return join(this.logDir, `${date}.jsonl`);
  }

  private writeLog(level: LogLevel, levelName: string, message: string, context?: Record<string, unknown>): void {
    if (!this.config.enabled || level > this.levelValue) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      source: this.source,
      message,
    };

    if (context) {
      // Extract error info if present
      if (context.error instanceof Error) {
        entry.error = context.error.message;
        entry.stack = context.error.stack;
        // Remove error from context to avoid circular reference
        const { error: _error, ...restContext } = context;
        if (Object.keys(restContext).length > 0) {
          entry.context = restContext;
        }
      } else {
        entry.context = context;
      }
    }

    try {
      const logFile = this.getLogFileName();
      const logLine = `${JSON.stringify(entry)}\n`;
      appendFileSync(logFile, logLine);

      // Also output to console in development or if pretty print is enabled
      if (this.config.prettyPrint || process.env.NODE_ENV === 'development') {
        this.prettyPrint(entry);
      }
    } catch (_error) {
      // Fail silently - logging should never break the application
    }
  }

  private prettyPrint(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.source}]`;
    const message = `${prefix} ${entry.message}`;

    // Use appropriate console method based on level
    switch (entry.level) {
      case 'ERROR':
        console.error(message);
        if (entry.stack) console.error(entry.stack);
        break;
      case 'WARN':
        console.error(message); // Use stderr for warnings too
        break;
      default:
        console.log(message);
    }

    if (entry.context) {
      console.log('Context:', JSON.stringify(entry.context, null, 2));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.writeLog(LogLevel.ERROR, 'ERROR', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.writeLog(LogLevel.WARN, 'WARN', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.writeLog(LogLevel.INFO, 'INFO', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.writeLog(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.writeLog(LogLevel.TRACE, 'TRACE', message, context);
  }

  // Convenience method for logging errors with stack traces
  exception(message: string, error: Error, context?: Record<string, unknown>): void {
    this.error(message, { ...context, error });
  }
}

// Factory function to create logger instances
export function createLogger(source: string): Logger {
  return new Logger(source);
}

// Re-export for convenience
export { Logger };
