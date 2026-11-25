# 术语与资料来源

## 常见译名和别称

| 英文 | 简中首选 |
| --- | --- |
| Redirection | 航向重定向 |
| Husk Graveyard | 机械坟场 |
| Stella Montis | 星辰山 |

社区站可能显示其他简中用词。优先按玩家当前客户端核对，并用英文原名消歧。 [ArcWiki 事件词条](https://www.arcwiki.top/event/) · [奇袭者笔记地图](https://arc.isoox.cn/maps/)

## 常用地图和事件

| 英文 | 简中参考 |
| --- | --- |
| Dam Battlegrounds / Dam | 大坝战场 |
| Buried City | 掩埋废城 |
| The Spaceport / Spaceport | 太空港 |
| The Blue Gate / Blue Gate | 蓝门 |
| Riven Tides | 裂潮镇 |
| Pendola Pass | 彭多拉山口 |
| ARC Frigate | ARC“护卫者” |
| Cold Snap | 寒潮 |
| Lush Blooms | 收获季节 |
| Harvester | 收割者 |
| Bird City | 鸟城 |
| Matriarch | 族母 |
| Night Raid | 夜间奇袭 |
| Close Scrutiny | 严密排查 |
| Electromagnetic Storm | 电磁风暴 |
| Hidden Bunker | 隐藏地堡 |
| Hurricane | 飓风 |
| Launch Tower Loot | 发射塔上的战利品 |
| Locked Gate | 上锁的大门 |
| Uncovered Caches | 暴露的奇袭者箱 |

表内叫法用于中文沟通，适用版本看客户端。来源为[奇袭者笔记地图](https://arc.isoox.cn/maps/)和[ArcWiki 事件词条](https://www.arcwiki.top/event/)。枪名、材料、任务和小地名用对应中文词条查具体对象。碰到两个近义译名时用英文原名、图标、类别或物品 ID 消歧。

## 按问题选来源

- 国际服版本与机制用 [Embark 补丁说明](https://arcraiders.com/news/tag/patch-notes)、[热修复](https://arcraiders.com/news/tag/hotfix)和[游戏帮助中心](https://id.embark.games/arc-raiders/support/section/becoming-a-raider)。国服用[腾讯《弧光猎人》](https://arc.qq.com/)和[官方 TapTap 公告](https://www.taptap.cn/app/754064/topic?type=official)。
- 轮换时间用[官方地图条件页](https://arcraiders.com/map-conditions)、[Speranza 分区 UTC 表](https://speranza.to/en/map-rotations/schedule)和 [RaiderBuddy 事件页](https://raiderbuddy.com/events)。官方页面的显示时间可随浏览器时区变化。如果网页读取工具看不到所选地区，可核对同一公开页面的事件数据，按 conditionName、mapDisplayName 和 regionTimestamps 里的地区键（北美为 north-america）读取 Unix 毫秒起止。用地图、事件和起止时间去重，确认数据覆盖查询日期。RaiderBuddy 同一页面上有本地时间界面和专门标明 UTC 的分区表。Speranza 的该表列各项目下一次开始，单用该表可能漏掉之后重复的事件。社区站可能转载同一份上游数据。
- 简中物品、强化、任务、工作台和点位用[奇袭者笔记](https://arc.isoox.cn/)，英文资料用 [Embark 支持的社区 Wiki](https://arcraiders.wiki/)、[MetaForge 互动地图](https://metaforge.app/arc-raiders/map)和 [RaiderBuddy 技能树](https://raiderbuddy.com/skill-tree)。查具体点位可打开[星辰山中文地图](https://arc.isoox.cn/map/stella-montis/)或同站对应地图。互动图无法读取时，用 [ARC Tracker 简中区域页](https://arctracker.io/zh-CN/maps/stella-montis)对照区域名，用 [RaidersData 点位表](https://raidersdata.com/maps/stella-montis/)定位地标和出口。检查词条或补丁的版本，测试期资料仅适用于对应测试。

## MetaForge 公开数据

从 [metaforge-arc-raiders 原 Skill](https://github.com/Ven0m0/arc-raiders-autoscrapper/tree/main/.claude/skills/metaforge-arc-raiders)取用只读查询思路，当前端点、请求参数及返回结构以 [MetaForge 文档](https://metaforge.app/arc-raiders/api)和实际响应为准。

- `GET https://metaforge.app/api/arc-raiders/items` 可分页，按需要加入 `includeComponents=true`。期望查的物品用确切名称或 ID 核对，`name` 参数可能返回无关条目。用物品网页查一个目标通常更快。`/quests`、`/arcs`、`/traders` 可核对相应数据。区分战利品价值、商人买入价与玩家出售价值。
- `GET https://metaforge.app/api/arc-raiders/events-schedule` 的 `startTime`、`endTime` 为 Unix 毫秒。检查返回的 `region` 和 `cachedAt`，当前测试中单加 `?region=na` 仍返回欧洲。需要北美等其他区时确认响应确有对应区，或用明确分区的页面。旧 `/event-timers` 已弃用。
- 当前文档的地图数据端点是 `/api/game-map-data`。优先直接用互动地图定位。公开 API 的内容是社区维护的游戏数据。若要分析自己的仓库，使用玩家提供的资料或已明确授权的读入来源。
