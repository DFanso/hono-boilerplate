import { env, isDev, isTest } from "@/env";
import { pino } from "pino";

export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  base: { env: env.NODE_ENV },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token", "*.secret"],
    censor: "[REDACTED]",
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname,env",
        },
      }
    : undefined,
});

export type Logger = typeof logger;
