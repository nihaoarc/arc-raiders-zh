# ARC Tracker 接口与查询方法

按任务选已授权的 MCP、无需登录的公开目录或网页。MCP 与 REST 的授权、分页和字段各自独立。对动态内容记录数据时间，账号数据还要区分游戏读取、玩家手填和本次查询时间。 [开发者文档](https://arctracker.io/developers/docs) · [AI 连接器](https://arctracker.io/ai-connector) · [简中站索引](arc-tracker-site.md)

## 公开游戏资料

| 问题 | MCP 工具 | 网页或数据备用入口 |
| --- | --- | --- |
| 名称、武器阶级和 ID | `search` 按类别缩小，拿匹配的 ID 或 URL；外观用 `search_cosmetics` | 查简中详情或公开目录。搜索同名候选时用类型、图标、阶级及上下文消歧。 |
| 单件物品、取得方法和用途 | `get_item`，需图标时传 `picture: true` | 物品页和 `/api/items`。先核对实物类型与数量单位，再查来源和用途。 |
| 任务、工坊、项目、制作与强化 | `get_quest` 查目标与前置，`get_requirements` 查指定等级或阶段的完整成本 | 任务详情、工作台和项目页及公开目录。保留材料、研究点、特定类别的价值、进度条件与奖励的区别。 |
| 研究、武器特长与哨站 | `get_research` 查等级、点数、特长任务与增幅武器；`get_outposts` 查游戏房间和家具目录 | 研究页、武器家族物品页、哨站概览。本人的摆设看有权限的「我的哨站」。 |
| 地图、掉落与排期 | `get_map` 查地图；`get_map_events` 查一地服的排期，显式传 `region` | 互动地图与[小时事件查询](hourly-events.md)。北美服和北京时间分别指定。 |
| 试炼 | `get_trials` 查周目标、段位规则和赛季 | 试炼页核对赛季、周次、奖励及日期。 |
| 外观 | `search_cosmetics` 按类型、来源和可用状态筛选；`get_cosmetic` 查颜色、图片、解锁来源和时间 | 外观详情核对通行证、商人和促销。只有数据给出当前售价时才引用。 |
| ARC 机器、弹道、商人、技能节点、指南 | 技能节点可用 `search`。查某武器数据可用 `get_item`，核对 `mechanics.partial` | 按[栏目索引](arc-tracker-site.md)打开对应页。弹道模拟注明距离、阶级、配件、目标护盾及命中假设。 |

MCP 请求用 `language: "zh-CN"`，按返回的 `url` 或 `mapUrl` 引用详情。拿到的是有上限的结果时，按实际匹配数和截断标记判断能否说「全部」。`unconfirmed` 表示尚未确认。历史或暂停项目按查询时的状态说明，历史材料不计入当前缺口。游戏数值或状态出现冲突时复核客户端与 [Embark 补丁说明](https://arcraiders.com/news/tag/patch-notes)。

### 免登录的四个目录

基址是 `https://arctracker.io`。下列顶层字段经过实请求核对，记录列表可为数组或以 ID 为键的对象。用 ID 连接任务、配方和升级材料，中文名称取 `name["zh-CN"]`，缺译名时用英文并说明。目录版本及生成时间取响应字段，字段缺失时按未知处理。 [公开 API 文档](https://arctracker.io/developers/docs)

| 路径 | 列表字段 | 常用信息 |
| --- | --- | --- |
| `/api/items` | `items` | 物品 ID、译名、品质、重量、叠加、图标、配方、回收与拆解、武器升级和机制。 |
| `/api/quests` | `quests` | `id` 和网页 `slug`、商人、地图、目标结构、交付需求、奖励、前置与后续。 |
| `/api/hideout` | `hideoutModules` | 工作台的 `levels` 及各级 `requirementItemIds`。跨工作台、房间或任务条件用详情复核。 |
| `/api/projects` | `projects` | 项目状态、阶段 `phases`、材料与奖励。远征按文档支持的 `season` 参数查询。 |

这四个接口提供游戏资料。ARC Tracker 未在公开文档列出的专题优先用对应网页或已授权的 MCP。需要离线的基础目录做交叉核验时，可用站方维护的 [ARC 数据项目](https://github.com/RaidTheory/arcraiders-data)，核对数据提交时间和游戏版本。

在技能目录运行[公开目录查询脚本](../scripts/read-tracker-public.cjs)。脚本仅调用上述四个 GET 接口。精确匹配返回原始记录。模糊匹配或多个精确匹配返回候选及匹配数。省略名称只显示目录元数据。

```powershell
node scripts/read-tracker-public.cjs items "银匙套装"
node scripts/read-tracker-public.cjs quests cold-storage
node scripts/read-tracker-public.cjs hideout weapon_bench
node scripts/read-tracker-public.cjs projects the_guests_have_arrived_project
```

## 玩家数据与进度

按当前玩家授予的权限查询。公开查询遇到 `Insufficient scope` 时切换到相应公开来源。个人数据权限不足时说明缺少的类别，也可分析玩家提供的截图或记录。 [连接与同步](arc-tracker-setup.md)

| 需求 | 已授权时用什么 | 结果口径 |
| --- | --- | --- |
| 仓库、栏位与清仓 | `get_my_inventory` | 核对 `appStash`、`readFromGame.at`、分页和实例字段。清仓需要覆盖需求、制作目标、保有量及追踪项。 |
| 进度和缺口 | `get_my_progress`、`get_my_needs`、`get_my_tracking` | 分开已完成、所需和手动关注。核对库存来源，分配材料时同一份库存只算一次。 |
| 对局及武器表现 | `get_my_raids`、`get_my_weapon_stats` | 对局优先用新增明细 `itemsFound`。只有 `itemsOut` 时称「带出物品」。武器表现区分游戏轮次战斗统计和基于出战配装的撤离统计。 |
| 选下一张图 | `plan_next_raid` | 用地区与目标约束任务、材料及事件收益，结合掉落置信度、配装和撤离路线。 |
| 个人试炼和收藏 | `get_my_trials`、`get_my_cosmetics` | 读取时效、手工标记与游戏读入分开看。个人试炼进度无法推出实时排行。拥有外观本体与颜色是两项。 |

开发本地工具时，文档另列双密钥 REST 的 `/api/v2/user/` 接口。仅在用户授权给该应用时使用，按文档为每个端点选最小权限。用 `locale`、分页和标准响应包核对覆盖；MCP 用 `language` 和各工具自己的分页参数。密钥使用现有安全存放方式，技能文件里只记录流程。 [REST 与授权范围](https://arctracker.io/developers/docs)

用户明确要求修改 ARC Tracker 进度时，先确定 ID 与数值，使用 `preview_changes`，将实际会写入的行展示给用户确认。确认后只提交对应的 `apply_changes` 载荷。冲突时重新读进度并预览后续修改。查询、学习网站和掌握资料的任务只需读操作。
