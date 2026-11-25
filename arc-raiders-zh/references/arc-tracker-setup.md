# ARC Tracker 连接与同步

ARC Tracker Link 将所绑定游戏账号的仓库、进度等同步到 ARC Tracker。悬浮窗应用另可从游戏画面识别数据。登录 ARC Tracker、连接游戏账号及授权 Codex 是各自独立的操作。 [ARC Tracker Link](https://arctracker.io/zh-CN/app) · [悬浮窗说明](https://arctracker.io/zh-CN/overlay)

## 游戏同步

1. 在登录后的设置中核对游戏链接、平台和上次同步。根据 ARC Tracker 页面与 Link 的说明完成首次绑定或续期。 [游戏账号设置](https://arctracker.io/settings#arc-raiders)
2. 用户明确要求从游戏刷新时，在设置或仓库页使用 `Sync now`。有冷却、登录过期或需要账号交互时按页面说明处理。 [仓库](https://arctracker.io/zh-CN/stash)
3. 操作完成后重新读取仓库，使用 `readFromGame.at` 核对游戏读取时间。时间没有推进时报告读取到的最近记录及状态。 [仓库读取](stash-reading.md)

## Codex 读取

- ARC Tracker 公布的 MCP 地址为 `https://mcp.arctracker.io/mcp`。需要个人进度、仓库或对局时，按 AI 连接器说明连接并由玩家授权所需权限。 [AI 连接器](https://arctracker.io/ai-connector)
- 如果 ARC Tracker 已经连接，按当前权限使用对应只读工具。权限不足时可以用公开资料回答通用问题，或按玩家提供的记录分析个人情况。 [接口与查询方法](arc-tracker-api.md)
