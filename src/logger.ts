export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class Logger {
  private level: LogLevel = 'info';

  public setLogLevel(level: LogLevel): void {
    this.level = level;
  }

  public error(message: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(message, ...optionalParams);
    }
  }

  public warn(message: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(message, ...optionalParams);
    }
  }

  public info(message: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(message, ...optionalParams);
    }
  }

  public debug(message: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(message, ...optionalParams);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] <= LEVEL_ORDER[this.level];
  }
}

