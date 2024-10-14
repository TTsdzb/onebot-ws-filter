import { Logger } from "tslog";
import WebSocket from "ws";

import {
  BaseFilterConfig,
  ForwardWsFilterConfig,
  LoggingConfig,
  ReverseWsFilterConfig,
} from "./config";
import { getLogger } from "./utils";

export abstract class Filter {
  base_config: BaseFilterConfig;
  logger: Logger<unknown>;

  constructor(config: BaseFilterConfig, logging_config: LoggingConfig) {
    this.base_config = config;
    this.logger = getLogger(config.name, logging_config);
  }

  protected filter(event: any): boolean {
    if (event["post_type"] !== "message") return true;
    if (event["message_type"] !== "group") return true;
    if (!this.base_config.filteredGroup.includes(event["group_id"]))
      return true;

    return false;
  }
}

export class ForwardWsFilter extends Filter {
  constructor(config: ForwardWsFilterConfig, logging_config: LoggingConfig) {
    super(config, logging_config);

    const server = new WebSocket.Server({ port: config.forwardListenPort });

    server.on("connection", (clientSocket) => {
      this.logger.info("Client connected");

      const serverSocket = new WebSocket(config.forwardServerUrl);

      serverSocket.on("open", () => {
        this.logger.info("Connected to server");
      });

      serverSocket.on("message", (data) => {
        const data_str = data.toString();
        this.logger.trace("Incoming server message: ", data_str);
        const event = JSON.parse(data_str);

        // 过滤条件
        if (this.filter(event)) {
          clientSocket.send(data);
        } else {
          this.logger.debug("Event filtered:", event);
        }
      });

      clientSocket.on("message", (data) => {
        this.logger.trace("Incoming client message: ", data.toString());
        serverSocket.send(data);
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
      `Forward websocket proxy server is running on ${config.forwardListenPort}`
    );
  }
}

export class ReverseWsFilter extends Filter {
  constructor(config: ReverseWsFilterConfig, logging_config: LoggingConfig) {
    super(config, logging_config);

    const server = new WebSocket.Server({
      port: config.reverseListenPort,
      path: config.reverseListenPath,
    });

    server.on("connection", (clientSocket, request) => {
      this.logger.info("Client connected");

      const serverSocket = new WebSocket(config.reverseServerUrl, {
        headers: request.headers,
      });

      serverSocket.on("open", () => {
        this.logger.info("Connected to server");
      });

      serverSocket.on("message", (data) => {
        this.logger.trace("Incoming server message: ", data.toString());
        clientSocket.send(data);
      });

      clientSocket.on("message", (data) => {
        const data_str = data.toString();
        this.logger.trace("Incoming client message: ", data_str);
        const event = JSON.parse(data_str);

        // 过滤条件
        if (this.filter(event)) {
          serverSocket.send(data);
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
      `Reverse websocket proxy server is running on ${config.reverseListenPort}${config.reverseListenPath}`
    );
  }
}
