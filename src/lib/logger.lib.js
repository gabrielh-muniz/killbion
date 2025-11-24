import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

function winstonLogger() {
  return winston.createLogger({
    level: "info",
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
    transports: [
      new winston.transports.Console({
        format: combine(colorize(), logFormat),
      }),
    ],
  });
}

export const logger = winstonLogger();
