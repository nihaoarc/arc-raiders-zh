# 各地区的每小时地图事件

按玩家所选游戏服务器查排期。脚本默认查询国际服亚洲，用北京时间显示。地区和时区可分别指定。 [Embark 官方地图条件](https://arcraiders.com/map-conditions)

## 查当前、下一小时或全天的时段

使用 [地图事件查询脚本](../scripts/read-map-events.cjs)，每次即时读取官方排期。以下命令应从技能目录运行。

```powershell
node scripts/read-map-events.cjs now
node scripts/read-map-events.cjs next
node scripts/read-map-events.cjs range 6
node scripts/read-map-events.cjs range 6 --region north-america
node scripts/read-map-events.cjs next --region all
```

- `now` 查此刻已开始且未结束的活动。`next` 查下一整点开始的一小时。`at` 查指定整点的一小时。`range 6` 从当前整点起列出六个小时，也可传起止整点，比如 `range 2026-11-24T18:00 2026-11-25T00:00`。结束整点不计入。
- `--region all` 同时查北美、欧洲、南美、亚洲和大洋洲。也可传明确的地区键 `north-america`、`europe`、`brazil`、`east-asia`、`oceania`。别用 IP 或网页的默认区覆盖用户的常用地区。`--tz` 指定其他时区，例如 `America/Los_Angeles`。
- 按查询时段分组，显示对应服务器、地图、事件的简中名和英文名，以及真实起止时间。跨天写清日期。标注窗口开始前已经启动的延续活动。问「刷啥」时从当前事件里挑适合单排 PVE 搜刮的一项。

## 把覆盖范围和事件列表一起看

脚本使用官方地区选择器同页的 `regionTimestamps` Unix 毫秒区间，并核对 `serverNow` 和 `lookAheadMs`。官方快照通常到未来约 24 小时。`coverage` 的值为 `unknown` 或 `partial` 时只报告查证到的部分。退出码 3 表示有未覆盖的时间，已核实区段仍在 JSON 里。

若官方脚本无法读取，优先核对对应游戏大厅，或用明确显示地区与时间的 [RaiderBuddy 事件页](https://raiderbuddy.com/events)或 [Speranza 分区 UTC 表](https://speranza.to/en/map-rotations/schedule)查证。Speranza 的每项目下一次开始可能跳过更晚的重复事件。输出时说明来源和覆盖时间。
