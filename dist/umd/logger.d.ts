export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export declare class Logger {
    private level;
    setLogLevel(level: LogLevel): void;
    error(message: unknown, ...optionalParams: unknown[]): void;
    warn(message: unknown, ...optionalParams: unknown[]): void;
    info(message: unknown, ...optionalParams: unknown[]): void;
    debug(message: unknown, ...optionalParams: unknown[]): void;
    private shouldLog;
}
