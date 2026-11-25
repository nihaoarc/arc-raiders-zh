const { parseArgs } = require("node:util");

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const OFFICIAL_PAGES = [
  "https://arcraiders.com/map-conditions",
  "https://arcraiders.com/en/map-conditions",
];
const REGIONS = {
  "north-america": ["North America", "北美"],
  europe: ["Europe", "欧洲"],
  brazil: ["South America", "南美"],
  "east-asia": ["Asia", "亚洲"],
  oceania: ["Oceania", "大洋洲"],
};
const MAPS = {
  "Buried City": "掩埋废城",
  "Dam Battlegrounds": "大坝战场",
  "Pendola Pass": "彭多拉山口",
  "Riven Tides": "裂潮镇",
  Spaceport: "太空港",
  "The Spaceport": "太空港",
  "Stella Montis": "星辰山",
  "The Blue Gate": "蓝门",
};
const CONDITIONS = {
  "Close Scrutiny": "严密排查",
  "Electromagnetic Storm": "电磁风暴",
  Hurricane: "飓风",
  "Launch Tower Loot": "发射塔上的战利品",
  "Locked Gate": "上锁的大门",
  "Uncovered Caches": "暴露的奇袭者箱",
  "ARC Frigate": "ARC“护卫者”",
  "Bird City": "鸟城",
  "Cold Snap": "寒潮",
  Harvester: "收割者",
  "Hidden Bunker": "隐藏地堡",
  "Husk Graveyard": "机械坟场",
  "Lush Blooms": "收获季节",
  Matriarch: "族母",
  "Night Raid": "夜间奇袭",
  Redirection: "航向重定向",
};

const USAGE = `用法
  node read-map-events.cjs [now | next] [--region REGION] [--tz TIME_ZONE]
  node read-map-events.cjs at YYYY-MM-DDTHH[:00] [--region REGION] [--tz TIME_ZONE]
  node read-map-events.cjs range FROM TO [--region REGION] [--tz TIME_ZONE]
  node read-map-events.cjs range HOURS [--region REGION] [--tz TIME_ZONE]

默认 now、Asia（亚洲）、Asia/Shanghai（北京时间）。
REGION 可用 Embark 页面上的地区名称、地区键或 all。
FROM 和 TO 使用与 at 一致的整点格式，结束时间不计入。`;

function dateFormatter(timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  });
}

function localParts(formatter, timestamp) {
  return Object.fromEntries(formatter.formatToParts(timestamp).map(({ type, value }) => [type, value]));
}

function formatTime(formatter, timestamp) {
  const parts = localParts(formatter, timestamp);
  const offset = parts.timeZoneName === "GMT" ? "+00:00" : parts.timeZoneName.slice(3);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}${offset}`;
}

function parseHour(input, formatter) {
  const match = /^(\d{4}-\d{2}-\d{2})[T ]([01]\d|2[0-3])(?::00)?(Z|[+-]\d{2}:\d{2})?$/i.exec(input);
  if (!match) throw new Error(`请输入有效整点，格式如 2026-11-24T18:00。收到 ${input}。`);

  const [, date, hour, offset] = match;
  const wallClock = `${date}T${hour}:00`;
  const asUtc = Date.parse(`${wallClock}Z`);
  if (!Number.isFinite(asUtc) || !new Date(asUtc).toISOString().startsWith(wallClock)) {
    throw new Error(`日期无效。收到 ${input}。`);
  }
  if (offset) {
    const timestamp = Date.parse(`${wallClock}${offset}`);
    if (!Number.isFinite(timestamp)) throw new Error(`时间偏移无效。收到 ${input}。`);
    return timestamp;
  }

  const offsets = new Set([-48, 0, 48].map((hours) => {
    const part = localParts(formatter, asUtc + hours * HOUR).timeZoneName;
    return part === "GMT" ? "+00:00" : part.slice(3);
  }));
  const candidates = [...offsets]
    .map((zoneOffset) => Date.parse(`${wallClock}${zoneOffset}`))
    .filter((timestamp) => formatTime(formatter, timestamp).startsWith(wallClock));
  if (candidates.length !== 1) {
    throw new Error(`当地整点不存在或有两个对应时刻。请提供明确的 UTC 偏移。收到 ${input}。`);
  }
  return candidates[0];
}

function findClockHour(formatter, timestamp, direction) {
  let candidate = Math.floor(timestamp / MINUTE) * MINUTE;
  if (direction > 0) candidate += MINUTE;
  for (let minute = 0; minute <= 180; minute += 1) {
    if (localParts(formatter, candidate).minute === "00") return candidate;
    candidate += direction * MINUTE;
  }
  throw new Error("无法确定这个时区的整点。");
}

function parseCommand(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      region: { type: "string", default: "east-asia" },
      tz: { type: "string", default: "Asia/Shanghai" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) return { help: true };

  const regionInput = values.region.trim().toLowerCase();
  const region = Object.keys(REGIONS).find((key) =>
    [key, ...REGIONS[key].map((name) => name.toLowerCase())].includes(regionInput),
  );
  const regions = regionInput === "all" ? Object.keys(REGIONS) : [region];
  if (regions.includes(undefined)) throw new Error(`未知服务器地区 ${values.region}。`);

  const formatter = dateFormatter(values.tz);
  const [mode = "now", ...argumentsForMode] = positionals;
  const [first, second] = argumentsForMode;
  const command = { mode, formatter, regions, timeZone: values.tz };
  if (["now", "next"].includes(mode) && argumentsForMode.length === 0) return command;
  if (mode === "at" && argumentsForMode.length === 1) {
    return { ...command, start: parseHour(first, formatter) };
  }
  if (mode === "range" && argumentsForMode.length === 1 && /^\d+$/.test(first)) {
    const hours = Number(first);
    if (hours >= 1 && hours <= 168) return { ...command, hours };
    throw new Error("小时数须为 1 到 168 的整数。官方实时排期通常只覆盖未来约 24 小时。");
  }
  if (mode === "range" && argumentsForMode.length === 2) {
    const start = parseHour(first, formatter);
    const end = parseHour(second, formatter);
    if (end <= start || end - start > 168 * HOUR) {
      throw new Error("范围结束须晚于开始，单次最多显示 168 小时。");
    }
    return { ...command, start, end };
  }
  throw new Error("查询方式或参数数量有误。");
}

function findSchedule(value) {
  if (typeof value !== "object" || value === null) return undefined;
  if (Array.isArray(value.liveEntries) && Number.isSafeInteger(value.serverNow)) return value;
  for (const child of Object.values(value)) {
    const schedule = findSchedule(child);
    if (schedule) return schedule;
  }
  return undefined;
}

function parseOfficialPage(html) {
  // The page serializes the same structured schedule used by its region selector.
  const chunks = [...html.matchAll(/<script(?:\s[^>]*)?>\s*self\.__next_f\.push\((.*?)\);?\s*<\/script>/gs)]
    .map((match) => JSON.parse(match[1])[1])
    .filter((chunk) => typeof chunk === "string");
  for (const row of chunks.join("").split("\n")) {
    if (!row.includes('"liveEntries":') || !row.includes('"serverNow":')) continue;
    const schedule = findSchedule(JSON.parse(row.slice(row.indexOf(":") + 1)));
    if (schedule?.liveEntries.length && Number.isSafeInteger(schedule.lookAheadMs) && schedule.lookAheadMs > 0) {
      return schedule;
    }
  }
  throw new Error("官方页面未提供可识别的结构化排期。");
}

async function fetchSchedule() {
  const errors = [];
  for (const page of OFFICIAL_PAGES) {
    try {
      const response = await fetch(page, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const schedule = parseOfficialPage(await response.text());
      const checkedAt = Date.now();
      const age = checkedAt - schedule.serverNow;
      if (age > 5 * MINUTE || age < -2 * MINUTE) {
        throw new Error(`官方快照时间 ${new Date(schedule.serverNow).toISOString()} 与查询时钟相差过大。`);
      }
      return { ...schedule, source: response.url, checkedAt };
    } catch (error) {
      errors.push(`${page} (${error.message})`);
    }
  }
  throw new Error(`无法核实 Embark 官方实时排期。${errors.join("；")}`);
}

function regionalSchedule(schedule, region) {
  if (region !== "europe" && !schedule.liveEntries.some((row) => Array.isArray(row.regionTimestamps?.[region]))) {
    throw new Error("官方快照缺少可验证的地区时间表。");
  }
  const entries = new Map();
  for (const row of schedule.liveEntries) {
    const { conditionName, mapDisplayName } = row;
    // Embark uses the base time when an entry has no regional override.
    const interval = row.regionTimestamps?.[region] ?? [row.startTimestamp, row.endTimestamp];
    if (typeof conditionName !== "string" || typeof mapDisplayName !== "string" ||
        !conditionName || !mapDisplayName || !Array.isArray(interval) || interval.length !== 2 ||
        !interval.every(Number.isSafeInteger) || interval[0] >= interval[1]) {
      throw new Error("官方快照缺少可验证的地区事件字段。");
    }
    const [start, end] = interval;
    const key = JSON.stringify([mapDisplayName, conditionName, start, end]);
    entries.set(key, { conditionName, mapDisplayName, start, end });
  }
  return [...entries.values()].sort((a, b) =>
    a.start - b.start || a.mapDisplayName.localeCompare(b.mapDisplayName) || a.conditionName.localeCompare(b.conditionName),
  );
}

function windowsFor(command, checkedAt) {
  const { mode, formatter, hours } = command;
  if (mode === "now") return [{ start: checkedAt, end: checkedAt }];
  if (mode === "next") {
    const start = findClockHour(formatter, checkedAt, 1);
    return [{ start, end: start + HOUR }];
  }
  if (mode === "at") return [{ start: command.start, end: command.start + HOUR }];

  const start = command.start ?? findClockHour(formatter, checkedAt, -1);
  const end = command.end ?? start + hours * HOUR;
  const windows = [];
  for (let hour = start; hour < end; hour += HOUR) {
    windows.push({ start: hour, end: Math.min(hour + HOUR, end) });
  }
  return windows;
}

function coverageOf(events, horizon) {
  const intervals = [];
  for (const { start, end } of events) {
    const availableEnd = Math.min(end, horizon);
    if (start >= availableEnd) break;
    const previous = intervals.at(-1);
    if (previous && start <= previous.end) {
      previous.end = Math.max(previous.end, availableEnd);
    } else {
      intervals.push({ start, end: availableEnd });
    }
  }
  return intervals;
}

function resultFor(window, intervals, schedule, horizon, formatter) {
  const { start, end } = window;
  const pointInTime = start === end;
  const matches = pointInTime
    ? (entry) => entry.start <= start && start < entry.end
    : (entry) => entry.start < end && start < entry.end;
  const fullyCovered = intervals.some((interval) => matches(interval) && interval.start <= start && interval.end >= end);
  if (!intervals.some(matches)) return { coverage: "unknown" };

  const events = schedule.filter((event) => event.start < horizon && matches(event)).map((event) => ({
    map: MAPS[event.mapDisplayName] ?? event.mapDisplayName,
    mapEn: event.mapDisplayName,
    event: CONDITIONS[event.conditionName] ?? event.conditionName,
    eventEn: event.conditionName,
    start: formatTime(formatter, event.start),
    end: formatTime(formatter, event.end),
    ...(pointInTime ? {} : { continuing: event.start < start }),
  }));
  return { coverage: fullyCovered ? "covered" : "partial", events };
}

async function main() {
  let command;
  try {
    command = parseCommand(process.argv.slice(2));
  } catch (error) {
    console.error(error.message + "\n\n" + USAGE);
    process.exitCode = 2;
    return;
  }
  if (command.help) {
    console.log(USAGE);
    return;
  }

  const { mode, formatter, regions, timeZone } = command;
  const schedule = await fetchSchedule();
  const horizon = schedule.serverNow + schedule.lookAheadMs;
  const windows = windowsFor(command, schedule.checkedAt);
  const local = (time) => formatTime(formatter, time);
  let incomplete = false;
  const results = regions.map((key) => {
    const [regionEn, region] = REGIONS[key];
    const label = { region, regionEn, regionKey: key };
    try {
      const events = regionalSchedule(schedule, key);
      const coverage = coverageOf(events, horizon);
      const queries = windows.map((window) => {
        const result = resultFor(window, coverage, events, horizon, formatter);
        if (result.coverage !== "covered") incomplete = true;
        const time = mode === "now" ? { at: local(window.start) } : { start: local(window.start), end: local(window.end) };
        return { ...time, ...result };
      });
      return {
        ...label,
        coverage: coverage.map(({ start, end }) => ({ start: local(start), end: local(end) })),
        queries,
      };
    } catch (error) {
      incomplete = true;
      return { ...label, coverage: [], error: error.message };
    }
  });
  console.log(JSON.stringify({
    source: schedule.source,
    snapshotAtUtc: new Date(schedule.serverNow).toISOString(),
    queriedAtUtc: new Date(schedule.checkedAt).toISOString(),
    timeZone,
    mode,
    results,
  }, null, 2));
  if (incomplete) {
    console.error("官方快照无法核实全部目标时段。请查看 coverage 字段或查对应地区的游戏大厅。");
    process.exitCode = 3;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
