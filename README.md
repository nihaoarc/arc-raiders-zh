# ARC Raiders 简中 Agent Skill

`arc-raiders-zh` 用简体中文查询《弧光猎人》的物品、材料、任务、研究、工坊、哨站、武器、试炼、外观及各服务器的地图事件。也能通过你授权的 ARC Tracker 查看个人仓库、进度和对局。 [ARC Tracker 栏目索引](arc-raiders-zh/references/arc-tracker-site.md)

## 分享给智能体

把下面这句话发给能读取网页的智能体，让它在当前对话中使用技能。 [直接读取 SKILL.md](https://raw.githubusercontent.com/nihaoarc/arc-raiders-zh/main/arc-raiders-zh/SKILL.md)

```text
请读取并学习这个 Skill，在本对话中用它处理 ARC Raiders 问题。需要详细资料时，打开文件里的引用链接。
https://raw.githubusercontent.com/nihaoarc/arc-raiders-zh/main/arc-raiders-zh/SKILL.md
```

## 安装到客户端

要在以后开启的对话里调用，把[完整技能目录](arc-raiders-zh/)装进支持 Agent Skills 的客户端。 [Agent Skills 格式](https://agentskills.io/specification)

在 Codex 中发送下面这句话，即可通过 GitHub 仓库安装。

```text
请用 $skill-installer 安装 https://github.com/nihaoarc/arc-raiders-zh/tree/main/arc-raiders-zh
```

手动安装到 Codex 时，把含有 `SKILL.md` 的整个 `arc-raiders-zh` 子目录放到用户技能目录 `$CODEX_HOME/skills`，默认是 `~/.codex/skills`。打开新对话并输入 `$arc-raiders-zh`。 [Codex 技能文档](https://developers.openai.com/codex/skills)

## 使用示例

- `$arc-raiders-zh 查北美服未来 6 小时的地图事件，按北京时间显示。`
- `$arc-raiders-zh 查银匙套装的用途和来源。引用掉落数据时标明置信度。`
- `$arc-raiders-zh 看我当前仓库里还有没有耐磨布料。`

公共数据可直接查询。个人问题需要在 ARC Tracker 连接器里授权对应读取权限。随附的公开目录和事件脚本支持 Node.js 20+，本地图标相似度工具另需 Python 3.11+ 和 Pillow。 [接口与查询方法](arc-raiders-zh/references/arc-tracker-api.md)

## 资料来源

地图轮换来自 [Embark 官方排期](https://arcraiders.com/map-conditions)。物品与进度查询使用 [ARC Tracker](https://arctracker.io/zh-CN)，物品图标对照也可用 [MetaForge](https://metaforge.app/arc-raiders) 的公开资料。具体来源和时效随查询结果提供。
