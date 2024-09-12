import { Logger } from "tslog";
import WebSocket from "ws";

import { readConfig } from "./config";

const config = readConfig();

const logger = new Logger({
  prettyLogTemplate: config.logTemplateStr,
  prettyLogTimeZone: "local",
});
const server = new WebSocket.Server({ port: config.listenPort });

// Trace
logger.settings.minLevel = config.logLevel;

const shouldForwardEvent = (event: any): boolean => {
  if (event["post_type"] !== "message") return true;
  if (event["message_type"] !== "group") return true;
  if (!config.filteredGroup.includes(event["group_id"])) return true;

  return false;
};

server.on("connection", (clientSocket) => {
  logger.info("Client connected");

  const serverSocket = new WebSocket(config.serverUrl);

  serverSocket.on("open", () => {
    logger.info("Connected to server");
  });

  serverSocket.on("message", (data) => {
    const data_str = data.toString();
    logger.trace("Incoming server message: ", data_str);
    const event = JSON.parse(data_str);

    // 过滤条件
    if (shouldForwardEvent(event)) {
      clientSocket.send(data);
    } else {
      logger.debug("Event filtered:", event);
    }
  });

  clientSocket.on("message", (data) => {
    logger.trace("Incoming client message: ", data.toString());
    serverSocket.send(data);
  });

  clientSocket.on("close", () => {
    logger.info("Client requested socket close");
    serverSocket.close();
  });

  serverSocket.on("close", () => {
    logger.info("Server requested socket close");
    clientSocket.close();
  });
});

logger.info(`WebSocket proxy server is running on ${config.listenPort}`);
