import fs from "fs/promises";
import { fetchAllActivePlayersWithStats } from "./fetch.js";
import { addLeaderRanks, safeNum } from "./rank.js";
import { buildPlayerSummaryRecord } from "./summary.js";
import { fetchChecklistMetaIndex } from "./checklistMeta.js";

function getCurrentSeasonYear() {
  return new Date().getFullYear();
}

function findStatSplit(person, typeName) {
  const stats = person?.stats || [];
  return stats.find(s =>
    normalize(s?.type?.displayName) === normalize(typeName) &&
    normalize(s?.group?.displayName) === "hitting"
  ) || null;
}

function normalize(text) {
  return String(text || "").toLowerCase().trim();
}

function parseHittingSplit(split, season) {
  const stat = split?.splits?.[0]?.stat || null;
  if (!stat) {
    return {
      season,
      has_stats: false
    };
  }

  return {
    season,
    has_stats: true,
    games: safeNum(stat.gamesPlayed),
    ab: safeNum(stat.atBats),
    hits: safeNum(stat.hits),
    hr: safeNum(stat.homeRuns),
    avg: safeNum(stat.avg),
    r: safeNum(stat.runs),
    rbi: safeNum(stat.rbi),
    sb: safeNum(stat.stolenBases),
    obp: safeNum(stat.obp),
    slg: safeNum(stat.slg),
    ops: safeNum(stat.ops),
    ops_plus: safeNum(stat.opsPlus),
    war: safeNum(stat.war) ?? null
  };
}

function playerFromMlbPerson(row, season) {
  const person = row.mlb_person;
  const seasonSplit = findStatSplit(person, "season");
  const careerSplit = findStatSplit(person, "career");

  return {
    player_id: row.player_id,
    player_name: row.player_name,
    team_id: row.team_id,
    team_name: row.team_name,
    team_abbr: row.team_abbr,
    current_season: parseHittingSplit(seasonSplit, season),
    career: parseHittingSplit(careerSplit, "career")
  };
}

function normalizePlayerKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeChecklistMetaIntoSummary(summary, metaMap) {
  const key = normalizePlayerKey(summary.player_name);
  const meta = metaMap.get(key);

  if (!meta) {
    return {
      ...summary,
      checklist_years: [],
      rc_year: null
    };
  }

  const years = Array.isArray(meta.checklist_years) ? meta.checklist_years : [];
  const rcYear = meta.rc_year || null;

  const enrichedYears = years
    .map(year => ({
      year,
      label: rcYear === year ? `${year} (RC)` : String(year),
      is_rc_year: rcYear === year
    }))
    .sort((a, b) => {
      if (a.is_rc_year && !b.is_rc_year) return -1;
      if (!a.is_rc_year && b.is_rc_year) return 1;
      return b.year - a.year;
    });

  return {
    ...summary,
    checklist_years: enrichedYears,
    rc_year: rcYear
  };
}

async function main() {
  const season = getCurrentSeasonYear();

  const [rawPlayers, checklistMeta] = await Promise.all([
    fetchAllActivePlayersWithStats(season),
    fetchChecklistMetaIndex("baseball")
  ]);

  const metaMap = new Map(
    checklistMeta.map(p => [normalizePlayerKey(p.player_name), p])
  );

  const normalized = rawPlayers.map(row => playerFromMlbPerson(row, season));
  const ranked = addLeaderRanks(normalized);
  const summaries = ranked
    .map(buildPlayerSummaryRecord)
    .map(summary => mergeChecklistMetaIntoSummary(summary, metaMap));

  await fs.mkdir("data/public", { recursive: true });
  await fs.writeFile(
    "data/public/player_summaries.json",
    JSON.stringify(
      {
        updated_at: new Date().toISOString(),
        season,
        players: summaries
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Built ${summaries.length} player summaries for ${season}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
