const { parseArgs } = require('node:util');

const endpoints = new Map([
  ['items', { collection: 'items', count: 'itemCount' }],
  ['quests', { collection: 'quests', count: 'totalQuests' }],
  ['hideout', { collection: 'hideoutModules', count: 'totalModules' }],
  ['projects', { collection: 'projects', count: 'totalProjects' }],
]);

const usage = '用法：node read-tracker-public.cjs <items|quests|hideout|projects> ["名称、ID 或页面 slug"] [--limit 1-50] [--season 1,2]';
const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

function namesOf(row) {
  return typeof row.name === 'string' ? [row.name] : Object.values(row.name ?? {}).filter(name => typeof name === 'string');
}

function summary(row) {
  return { id: row.id, slug: row.slug, name: row.name?.['zh-CN'] ?? row.name?.en ?? namesOf(row)[0],
    en: row.name?.en, type: row.type, rarity: row.rarity, unconfirmed: row.unconfirmed };
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { help: { type: 'boolean' }, limit: { type: 'string', default: '12' }, season: { type: 'string' } },
  });
  if (values.help) return console.log(usage);
  const [type, query] = positionals;
  const endpoint = endpoints.get(type);
  const limit = Number(values.limit);
  if (!endpoint || positionals.length > 2 || !/^\d+$/.test(values.limit) || limit < 1 || limit > 50 ||
      (query !== undefined && !normalize(query)) ||
      (values.season !== undefined && (type !== 'projects' || !/^[1-9]\d*(,[1-9]\d*)*$/.test(values.season)))) {
    throw new Error(usage);
  }

  const url = new URL('/api/' + type, 'https://arctracker.io');
  if (values.season !== undefined) url.searchParams.set('season', values.season);
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
  if (!response.ok) throw new Error(`ARC Tracker 公开资料请求失败（HTTP ${response.status}）`);
  const data = await response.json();
  const collection = data[endpoint.collection];
  if (!collection || typeof collection !== 'object') throw new Error('ARC Tracker 返回的资料结构已变化');
  const rows = Array.isArray(collection) ? collection : Object.values(collection);
  if (rows.some(row => typeof row?.id !== 'string')) throw new Error('ARC Tracker 返回了缺少 ID 的资料');
  if (Number.isInteger(data[endpoint.count]) && data[endpoint.count] !== rows.length) {
    throw new Error('目录记录数和接口声明不一致');
  }

  const result = { source: url.href, version: data.version, generatedAt: data.generatedAt,
    lastUpdated: data.lastUpdated, records: rows.length };
  if (query !== undefined) {
    const key = normalize(query);
    const identifiers = row => [row.id, row.slug].filter(value => typeof value === 'string').map(normalize);
    const byId = rows.filter(row => identifiers(row).includes(key));
    const byName = rows.filter(row => namesOf(row).some(name => normalize(name) === key));
    const exact = byId.length ? byId : byName;
    const matches = exact.length ? exact : rows.filter(row =>
      identifiers(row).some(id => id.includes(key)) || namesOf(row).some(name => normalize(name).includes(key)));
    result.query = query;
    result.match = byId.length ? 'id' : byName.length ? 'name' : matches.length ? 'partial' : 'none';
    result.matches = matches.length;
    if (exact.length === 1) result.record = exact[0];
    else {
      result.candidates = matches.slice(0, limit).map(summary);
      result.truncated = matches.length > limit;
    }
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
