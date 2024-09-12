# Onebot Websocket 过滤器

[go-cqhttp](https://github.com/Mrs4s/go-cqhttp) 提供了一套[事件过滤机制](https://docs.go-cqhttp.org/guide/eventfilter.html)，可以在实现端过滤上报的事件。如今该项目已停止维护，而现有的 Onebot 实现基本都没有该功能。

尽管部分机器人框架（例如 [Koishi](https://koishi.chat)）自带类似的过滤机制，但大部分广泛使用的框架（例如 [Nonebot](https://nonebot.dev)）都没有好的方法供用户自己筛选事件。这导致 Bot 上的插件一经启用即全局生效，很难做到手动屏蔽某个群一类的操作。

本项目通过在实现端与适配器之间引入中间人的方式对 Onebot 的事件下发进行过滤。

目前仅支持正向 WebSocket、`/` 接口，且只有群聊消息黑名单功能。后续可能考虑适配 go-cqhttp 原有的事件过滤配置，或提供另一套完善的配置机制。

## 配置

请手动创建 `config.yml`：

```yaml
# 日志等级，默认为 3
# 0: silly, 1: trace, 2: debug, 3: info, 4: warn, 5: error, 6: fatal
logLevel: 3
# 过滤器监听的端口，用于接受适配器（Bot 框架）连接
listenPort: 8000
# Onebot 实现地址，也就是原先在 Bot 框架那里填的地址
serverUrl: "ws://127.0.0.1:8081"
# 群组黑名单，在该名单内的群聊的消息会被丢弃，填写群号
filteredGroup:
  - 123456
  - 456789
  - 789123
```

随后将适配器端所要连接的地址修改为过滤器监听的地址。例如，假设你设置的 `listenPort` 为 `8000` 且过滤器和 Bot 运行在**同一台电脑**，那么你应该填 `ws://127.0.0.1:8000`。

## 构建

```sh
yarn
yarn build
```

## 运行

```sh
yarn start
```
