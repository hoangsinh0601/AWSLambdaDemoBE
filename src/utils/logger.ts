type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogContext {
  requestId?: string;
  orderId?: string;
  userId?: string;
  [key: string]: unknown;
}

const writeLog = (level: LogLevel, message: string, context?: LogContext) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ?? {}),
  };

  if (level === "ERROR") {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
};

export const logger = {
  info: (message: string, context?: LogContext) => writeLog("INFO", message, context),
  warn: (message: string, context?: LogContext) => writeLog("WARN", message, context),
  error: (message: string, context?: LogContext) => writeLog("ERROR", message, context),
};
