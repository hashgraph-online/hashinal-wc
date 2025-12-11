const LEVEL_ORDER = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};
class Logger {
  constructor() {
    this.level = "info";
  }
  setLogLevel(level) {
    this.level = level;
  }
  error(message, ...optionalParams) {
    if (this.shouldLog("error")) {
      console.error(message, ...optionalParams);
    }
  }
  warn(message, ...optionalParams) {
    if (this.shouldLog("warn")) {
      console.warn(message, ...optionalParams);
    }
  }
  info(message, ...optionalParams) {
    if (this.shouldLog("info")) {
      console.info(message, ...optionalParams);
    }
  }
  debug(message, ...optionalParams) {
    if (this.shouldLog("debug")) {
      console.debug(message, ...optionalParams);
    }
  }
  shouldLog(level) {
    return LEVEL_ORDER[level] <= LEVEL_ORDER[this.level];
  }
}
export {
  Logger
};
//# sourceMappingURL=logger.js.map
