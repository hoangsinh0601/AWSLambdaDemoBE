type LogLevel = "INFO" | "ERROR";

const writeLog = (level: LogLevel, message: string, metadata?: Record<string, unknown>) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(metadata ? { metadata } : {}),
  };

  console.log(JSON.stringify(payload));
};

export const logger = {
  info: (message: string, metadata?: Record<string, unknown>) => writeLog("INFO", message, metadata),
  error: (message: string, metadata?: Record<string, unknown>) => writeLog("ERROR", message, metadata),
};
