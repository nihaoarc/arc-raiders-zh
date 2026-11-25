const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");

const trackerUrl = "https://arctracker.io/api/items";
const cosmeticsUrl = "https://arctracker.io/zh-CN/cosmetics";
const metaUrl = "https://metaforge.app/api/arc-raiders/items";
const cataloguePath = path.join(__dirname, "..", "data", "item-icons.json");
const imageRoot = path.resolve(process.env.ARC_RAIDERS_ICON_DIR || path.join(__dirname, "..", "data", "item-images"));
const imageHosts = new Set(["cdn.arctracker.io", "static.metaforge.app"]);

const cleanText = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const comparableName = (value) => (value ?? "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const comparableId = (value) => value.toLowerCase().replace(/-/g, "_");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "error" });
  if (!response.ok) throw new Error(new URL(url).host + " returned HTTP " + response.status);
  return response.json();
}

function verifyRows(rows, expected, source) {
  if (!Array.isArray(rows) || !Number.isInteger(expected) || expected <= 0 ||
      rows.length !== expected || rows.some((row) => !cleanText(row?.id)) ||
      new Set(rows.map(({ id }) => id)).size !== expected) {
    throw new Error(source + " returned an incomplete or duplicate item list.");
  }
}

async function readMetaForge() {
  const listUrl = (page) => metaUrl + "?limit=1000&page=" + page;
  const first = await fetchJson(listUrl(1));
  const { total, totalPages } = first.pagination ?? {};
  if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 20) {
    throw new Error("MetaForge pagination was unavailable.");
  }

  const rows = [...(first.data ?? [])];
  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchJson(listUrl(page));
    if (next.pagination?.total !== total) throw new Error("MetaForge changed while reading its pages.");
    rows.push(...(next.data ?? []));
  }
  verifyRows(rows, total, "MetaForge");
  return rows;
}

function countNames(rows, getName) {
  const counts = new Map();
  for (const row of rows) {
    const name = comparableName(getName(row));
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

async function readCosmetics(locale) {
  const url = locale === "en" ? "https://arctracker.io/cosmetics" : cosmeticsUrl;
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "error" });
  if (!response.ok) throw new Error("ARC Tracker cosmetics returned HTTP " + response.status);
  const html = await response.text();
  const stream = [...html.matchAll(/<script(?: [^>]*)?>\s*self\.__next_f\.push\((\[[\s\S]*?\])\)\s*<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .filter((chunk) => chunk[0] === 1)
    .map((chunk) => chunk[1])
    .join("");
  const line = stream.split("\n").find((entry) =>
    entry.includes('"locale":' + JSON.stringify(locale)) && entry.includes('"cosmetics":['));
  if (!line) throw new Error("ARC Tracker cosmetics catalogue was not in its public page.");

  const stack = [JSON.parse(line.slice(line.indexOf(":") + 1))];
  while (stack.length) {
    const object = stack.pop();
    if (!object || typeof object !== "object") continue;
    if (object.locale === locale && Array.isArray(object.cosmetics)) {
      verifyRows(object.cosmetics, object.count, "ARC Tracker cosmetics " + locale);
      return object.cosmetics;
    }
    stack.push(...Object.values(object));
  }
  throw new Error("ARC Tracker cosmetics catalogue format changed.");
}

function indexCosmeticNames(enRows, zhRows) {
  const zhById = new Map(zhRows.map((row) => [row.id, row]));
  const byKindAndName = new Map();
  for (const en of enRows) {
    const zh = zhById.get(en.id);
    if (!zh || zh.kind !== en.kind || !cleanText(en.name) || !cleanText(zh.name)) continue;
    const key = en.kind + ":" + comparableName(en.name);
    byKindAndName.set(key, byKindAndName.has(key) ? null : { en, zh });
  }
  return byKindAndName;
}

const COSMETIC_KINDS = {
  Outfit: "outfit",
  "Face Style": "face-style",
  Backpack: "backpack",
  Hair: "hair",
  "Backpack Attachment": "backpack-attachment",
  "Backpack Charm": "backpack-charm",
  Emote: "emote",
  "Scrappy Outfit": "scrappy-outfit",
  "Scrappy Appearance": "scrappy-body",
  "Raider Tool": "raider-tool",
  Face: "face",
  "Facial Hair": "facial-hair",
};

function localizedCosmetic(item, names) {
  const cosmetic = item.cosmetic;
  if (!cosmetic || !cleanText(item.name)) return null;
  const kind = COSMETIC_KINDS[cosmetic.kind];
  if (kind) {
    const suffix = " (" + cosmetic.kind + ")";
    const name = item.name.endsWith(suffix) ? item.name.slice(0, -suffix.length) : item.name;
    const found = names.get(kind + ":" + comparableName(name));
    return found ? { nameZh: found.zh.name, nameZhSource: cosmeticsUrl } : null;
  }

  if (!["Outfit Color", "Option"].includes(cosmetic.kind)) return null;
  const parentKind = item.subcategory === "Backpack Color" ? "backpack" : "outfit";
  const parent = names.get(parentKind + ":" + comparableName(cosmetic.parentName));
  if (!parent) return null;
  const settingKey = cosmetic.kind === "Outfit Color" ? "color" : comparableName(cosmetic.slot);
  const setting = parent.en.settings?.find((entry) => comparableName(entry.key) === settingKey);
  const optionName = comparableName(cosmetic.optionName ?? item.name.split(" (")[0]);
  const options = setting?.options?.filter((entry) => comparableName(entry.name) === optionName);
  if (options?.length !== 1) return null;
  const zhSetting = parent.zh.settings?.find((entry) => entry.key === setting.key);
  const nameZh = cleanText(zhSetting?.options?.find((entry) => entry.key === options[0].key)?.name);
  return nameZh ? { nameZh, variantOfZh: parent.zh.name, nameZhSource: cosmeticsUrl } : null;
}

function buildRows(tracker, meta, cosmeticNames) {
  verifyRows(tracker.items, tracker.itemCount, "ARC Tracker");
  const rows = tracker.items.map((item) => ({
    source: "ARC Tracker",
    id: item.id,
    nameZh: cleanText(item.name?.["zh-CN"]),
    nameEn: cleanText(item.name?.en),
    type: cleanText(item.type),
    rarity: cleanText(item.rarity),
    iconUrl: cleanText(item.imageFilename),
  }));
  const trackerById = new Map(rows.map((row) => [comparableId(row.id), row]));
  const trackerNameCounts = countNames(rows, (row) => row.nameEn);
  const metaNameCounts = countNames(meta, (row) => row.name);
  const trackerByUniqueName = new Map(rows
    .filter(({ nameEn }) => nameEn && trackerNameCounts.get(comparableName(nameEn)) === 1)
    .map((row) => [comparableName(row.nameEn), row]));

  // A shared image or a Chinese homonym is not evidence that two items are identical.
  const directMatches = new Map();
  for (const item of meta) {
    const known = trackerById.get(comparableId(item.id));
    if (known?.nameEn && comparableName(known.nameEn) === comparableName(item.name)) {
      directMatches.set(item.id, known);
      known.metaForgeId = item.id;
    }
  }
  for (const item of meta) {
    const englishName = comparableName(item.name);
    const byName = metaNameCounts.get(englishName) === 1 && trackerByUniqueName.get(englishName);
    const known = directMatches.get(item.id) || (byName && !byName.metaForgeId ? byName : null);
    if (known) {
      known.metaForgeId = item.id;
      known.alternateIconUrl = cleanText(item.icon);
      if (!known.iconUrl) known.iconUrl = known.alternateIconUrl;
      continue;
    }
    const localized = localizedCosmetic(item, cosmeticNames);
    rows.push({
      source: "MetaForge",
      id: item.id,
      nameZh: null,
      nameEn: cleanText(item.name),
      type: cleanText(item.item_type),
      rarity: cleanText(item.rarity),
      iconUrl: cleanText(item.icon),
      ...localized,
    });
  }
  return rows;
}

function isImage(buffer) {
  const png = buffer.length >= 24 && buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  const webp = buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  const jpeg = buffer.length > 4 && buffer.subarray(0, 3).toString("hex") === "ffd8ff";
  return png || webp || jpeg;
}

async function mirrorImage(address) {
  const url = new URL(address);
  if (url.protocol !== "https:" || url.username || url.password || !imageHosts.has(url.hostname)) {
    throw new Error("Icon URL was outside the published CDNs.");
  }
  const extension = path.posix.extname(url.pathname).toLowerCase();
  if (![".png", ".webp", ".jpg", ".jpeg"].includes(extension)) {
    throw new Error(extension ? "Unknown icon format: " + extension : "The source icon URL has no image filename.");
  }

  const file = sha256(address).slice(0, 24) + extension;
  const destination = path.join(imageRoot, file);
  try {
    const cached = await fs.readFile(destination);
    if (!isImage(cached)) throw new Error("Existing local icon could not be verified: " + file);
    return { file, bytes: cached.length, sha256: sha256(cached) };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  let error;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12_000), redirect: "error" });
      if (!response.ok) {
        const failure = new Error("HTTP " + response.status);
        if (response.status === 404 || response.status === 403) throw Object.assign(failure, { noRetry: true });
        throw failure;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!isImage(bytes)) throw Object.assign(new Error("Failed image signature check."), { noRetry: true });
      try {
        await fs.writeFile(destination, bytes, { flag: "wx" });
      } catch (writeError) {
        if (writeError.code !== "EEXIST") throw writeError;
        const other = await fs.readFile(destination);
        if (!isImage(other)) throw new Error("Concurrent download did not leave a valid image.");
        return { file, bytes: other.length, sha256: sha256(other) };
      }
      return { file, bytes: bytes.length, sha256: sha256(bytes) };
    } catch (failure) {
      error = failure;
      if (failure.noRetry) break;
    }
  }
  throw error;
}

async function mirrorImages(addresses) {
  let cursor = 0;
  let finished = 0;
  const results = new Map();
  await Promise.all(Array.from({ length: Math.min(4, addresses.length) }, async () => {
    while (cursor < addresses.length) {
      const address = addresses[cursor++];
      try {
        results.set(address, await mirrorImage(address));
      } catch (error) {
        results.set(address, { error: error.message });
      }
      finished++;
      if (finished % 250 === 0) console.error("已核对 " + finished + "/" + addresses.length + " 个图标地址");
    }
  }));
  return results;
}

async function refresh(downloadImages) {
  const [tracker, meta, cosmeticsEn, cosmeticsZh] = await Promise.all([
    fetchJson(trackerUrl), readMetaForge(), readCosmetics("en"), readCosmetics("zh-CN"),
  ]);
  const rows = buildRows(tracker, meta, indexCosmeticNames(cosmeticsEn, cosmeticsZh));
  await fs.mkdir(path.dirname(cataloguePath), { recursive: true });

  const addresses = [...new Set(rows.flatMap((row) => row.iconUrl ? [row.iconUrl] : []))];
  if (downloadImages) await fs.mkdir(imageRoot, { recursive: true });
  const images = downloadImages ? await mirrorImages(addresses) : new Map();
  for (const row of rows) {
    const image = images.get(row.iconUrl);
    if (image?.file) {
      row.iconFile = image.file;
      row.iconSha256 = image.sha256;
    } else if (downloadImages || !row.iconUrl) {
      row.iconError = image?.error ?? "Source did not provide an icon URL.";
    }
  }

  const count = {
    entries: rows.length,
    withChineseName: rows.filter((row) => row.nameZh).length,
    withLocalIcon: rows.filter((row) => row.iconFile).length,
    uniqueIconUrls: addresses.length,
    localImageFiles: [...images.values()].filter((image) => image.file).length,
    localImageBytes: [...images.values()].reduce((total, image) => total + (image.bytes ?? 0), 0),
  };
  const contents = {
    refreshedAt: new Date().toISOString(),
    sources: [
      { name: "ARC Tracker", url: trackerUrl, records: tracker.itemCount, generatedAt: tracker.generatedAt, version: tracker.version },
      { name: "MetaForge", url: metaUrl, records: meta.length },
      { name: "ARC Tracker cosmetics", url: cosmeticsUrl, records: cosmeticsZh.length },
    ],
    imageRoot,
    count,
    items: rows,
  };
  const temporaryPath = cataloguePath + "." + process.pid + ".tmp";
  await fs.writeFile(temporaryPath, JSON.stringify(contents, null, 2) + "\n", { flag: "wx" });
  await fs.rename(temporaryPath, cataloguePath);
  return { cataloguePath, imageRoot, count, failures: [...images].filter(([, image]) => image.error) };
}

async function loadCatalogue() {
  try {
    return JSON.parse(await fs.readFile(cataloguePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    throw new Error("请先用 item-icons.cjs refresh 建立图标索引。");
  }
}

function displayMatches(rows, catalogue) {
  const shown = rows.slice(0, 25).map((row) => ({
    ...row,
    iconPath: row.iconFile ? path.join(catalogue.imageRoot, row.iconFile) : null,
  }));
  return { matching: rows.length, returned: shown.length, items: shown };
}

async function run() {
  const [, , mode = "summary", ...args] = process.argv;
  const usage = "用法：item-icons.cjs summary | refresh [--images] | find <名称或 ID> | image <原图文件>";
  if (mode === "--help") return { usage };
  if (mode === "refresh" && !args.length) return refresh(false);
  if (mode === "refresh" && args.length === 1 && args[0] === "--images") return refresh(true);
  if (!["summary", "image", "find"].includes(mode)) throw new Error(usage);
  const catalogue = await loadCatalogue();
  const query = args.join(" ").trim();

  if (mode === "summary") {
    const { refreshedAt, sources, imageRoot: localImages, count } = catalogue;
    return { refreshedAt, sources, imageRoot: localImages, count };
  }
  if (mode === "image" && query) {
    const hash = sha256(await fs.readFile(query));
    return displayMatches(catalogue.items.filter((row) => row.iconSha256 === hash), catalogue);
  }
  if (mode === "find" && comparableName(query)) {
    const key = comparableName(query);
    const exact = [];
    const partial = [];
    for (const row of catalogue.items) {
      const names = [row.id, row.metaForgeId, row.nameZh, row.nameEn, row.type, row.iconUrl, row.alternateIconUrl, row.iconFile, row.variantOfZh].map(comparableName);
      if (names.includes(key)) exact.push(row);
      else if (names.some((name) => name.includes(key))) partial.push(row);
    }
    return displayMatches([...exact, ...partial], catalogue);
  }
  throw new Error(usage);
}

run().then((result) => {
  console.log(JSON.stringify(result, null, 2));
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
