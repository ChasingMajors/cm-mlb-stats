import fs from "fs/promises";
import { fetchAllActivePlayersWithStats } from "./fetch.js";
import { addLeaderRanks, safeNum } from "./rank.js";
import { buildPlayerSummaryRecord } from "./summary.js";

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

async function main() {
  const season = getCurrentSeasonYear();
  const rawPlayers = await fetchAllActivePlayersWithStats(season);

  const normalized = rawPlayers.map(row => playerFromMlbPerson(row, season));
  const ranked = addLeaderRanks(normalized);
  const summaries = ranked.map(buildPlayerSummaryRecord);

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
