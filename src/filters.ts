import { Logger } from "tslog";
import WebSocket, { WebSocketServer } from "ws";

import {
  BaseFilterConfig,
  ForwardWsFilterConfig,
  LoggingConfig,
  ReverseWsFilterConfig,
} from "./config";
import { getLogger } from "./utils";

const errorHandler = (logger: Logger<unknown>, side: string) => {
  return (err: Error) => {
    logger.error(`Encountered error on ${side}:`, err);
  };
};

export abstract class Filter {
  base_config: BaseFilterConfig;
  logger: Logger<unknown>;
  messageRegex: RegExp;

  constructor(config: BaseFilterConfig, logging_config: LoggingConfig) {
    this.base_config = config;
    this.logger = getLogger(config.name, logging_config);
    this.messageRegex = new RegExp(this.base_config.messageFilter.regex);
  }

  /**
   * Determine whether an event should pass the filter.
   *
   * If not, return `false`.
   * @param event Event need to be checked
   * @returns Whether the event should pass
   */
  protected filter(event: any): boolean {
    if (event["post_type"] !== "message") return true;
    if (this.base_config.messageFilter.mode === "blacklist") {
      if (this.messageRegex.test(event["raw_message"])) return false;
    } else if (this.base_config.messageFilter.mode === "whitelist") {
      if (!this.messageRegex.test(event["raw_message"])) return false;
    }

    if (event["message_type"] !== "group") return true;
    if (this.base_config.groupFilter.mode === "blacklist") {
      if (this.base_config.groupFilter.groups.includes(event["group_id"]))
        return false;
    } else if (this.base_config.groupFilter.mode === "whitelist") {
      if (!this.base_config.groupFilter.groups.includes(event["group_id"]))
        return false;
    }

    return true;
  }
}

export class ForwardWsFilter extends Filter {
  constructor(config: ForwardWsFilterConfig, logging_config: LoggingConfig) {
    super(config, logging_config);

    const server = new WebSocketServer({ port: config.forwardListenPort });
    server.on("error", errorHandler(this.logger, "client side"));

    server.on("connection", (clientSocket) => {
      this.logger.info("Client connected");

      const serverSocket = new WebSocket(config.forwardServerUrl);
      serverSocket.on("error", errorHandler(this.logger, "server side"));
      let serverConnEstablished = false;
      let messageQueue: string[] = [];

      serverSocket.on("open", () => {
        this.logger.info("Connected to server");

        messageQueue.forEach((data_str) => {
          serverSocket.send(data_str);
        });
        messageQueue = [];
        serverConnEstablished = true;
      });

      serverSocket.on("message", (data) => {
        const data_str = data.toString();
        this.logger.trace("Incoming server message: ", data_str);
        const event = JSON.parse(data_str);

        // 过滤条件
        if (this.filter(event)) {
          clientSocket.send(data_str);
        } else {
          this.logger.debug("Event filtered:", event);
        }
      });

      clientSocket.on("message", (data) => {
        const data_str = data.toString();
        this.logger.trace("Incoming client message: ", data_str);
        serverConnEstablished
          ? serverSocket.send(data_str)
          : messageQueue.push(data_str);
      });

      clientSocket.on("close", () => {
        this.logger.info("Client requested socket close");
        serverSocket.close();
      });

      serverSocket.on("close", () => {
        this.logger.info("Server requested socket close");
        clientSocket.close();
      });
    });

    this.logger.info(
      `Forward websocket proxy server is running on ${config.forwardListenPort}`,
    );
  }
}

export class ReverseWsFilter extends Filter {
  constructor(config: ReverseWsFilterConfig, logging_config: LoggingConfig) {
    super(config, logging_config);

    const server = new WebSocketServer({
      port: config.reverseListenPort,
      path: config.reverseListenPath,
    });
    server.on("error", errorHandler(this.logger, "client side"));

    server.on("connection", (clientSocket, request) => {
      this.logger.info("Client connected");

      const serverSocket = new WebSocket(config.reverseServerUrl, {
        headers: request.headers,
      });
      serverSocket.on("error", errorHandler(this.logger, "server side"));
      let serverConnEstablished = false;
      let messageQueue: string[] = [];

      serverSocket.on("open", () => {
        this.logger.info("Connected to server");

        messageQueue.forEach((data_str) => {
          serverSocket.send(data_str);
        });
        messageQueue = [];
        serverConnEstablished = true;
      });

      serverSocket.on("message", (data) => {
        const data_str = data.toString();
        this.logger.trace("Incoming server message: ", data_str);
        clientSocket.send(data_str);
      });

      clientSocket.on("message", (data) => {
        const data_str = data.toString();
        this.logger.trace("Incoming client message: ", data_str);
        const event = JSON.parse(data_str);

        // 过滤条件
        if (this.filter(event)) {
          serverConnEstablished
            ? serverSocket.send(data_str)
            : messageQueue.push(data_str);
        } else {
          this.logger.debug("Event filtered:", event);
        }
      });

      clientSocket.on("close", () => {
        this.logger.info("Client requested socket close");
        serverSocket.close();
      });

      serverSocket.on("close", () => {
        this.logger.info("Server requested socket close");
        clientSocket.close();
      });
    });

    this.logger.info(
      `Reverse websocket proxy server is running on ${config.reverseListenPort}${config.reverseListenPath}`,
    );
  }
}
