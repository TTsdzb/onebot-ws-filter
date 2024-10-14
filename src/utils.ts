import { Logger } from "tslog";
import { LoggingConfig } from "./config";

export const getLogger = (
  name: string,
  config: LoggingConfig
): Logger<unknown> => {
  const logger = new Logger({
    name,
    prettyLogTemplate: config.logTemplateStr,
    prettyLogTimeZone: "local",
  });
  logger.settings.minLevel = config.logLevel;
  return logger;
};
