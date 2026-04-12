
const RANK_ORDER = ["war", "hr", "hits", "avg", "ops", "rbi", "sb", "r"];

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function descRank(players, field) {
  const sorted = [...players]
    .filter(p => p.current_season?.[field] !== null && p.current_season?.[field] !== undefined)
    .sort((a, b) => (b.current_season[field] ?? -Infinity) - (a.current_season[field] ?? -Infinity));

  const rankMap = new Map();
  let rank = 0;
  let lastValue = null;
  let seen = 0;

  for (const player of sorted) {
    seen += 1;
    const value = player.current_season[field];

    if (lastValue === null || value !== lastValue) {
      rank = seen;
      lastValue = value;
    }

    rankMap.set(player.player_id, rank);
  }

  return rankMap;
}

export function addLeaderRanks(players) {
  const rankFields = {
    war_rank: "war",
    hr_rank: "hr",
    hits_rank: "hits",
    avg_rank: "avg",
    ops_rank: "ops",
    rbi_rank: "rbi",
    sb_rank: "sb",
    r_rank: "r"
  };

  const maps = {};
  for (const [rankField, statField] of Object.entries(rankFields)) {
    maps[rankField] = descRank(players, statField);
  }

  return players.map(player => ({
    ...player,
    ranks: {
      war_rank: maps.war_rank.get(player.player_id) ?? null,
      hr_rank: maps.hr_rank.get(player.player_id) ?? null,
      hits_rank: maps.hits_rank.get(player.player_id) ?? null,
      avg_rank: maps.avg_rank.get(player.player_id) ?? null,
      ops_rank: maps.ops_rank.get(player.player_id) ?? null,
      rbi_rank: maps.rbi_rank.get(player.player_id) ?? null,
      sb_rank: maps.sb_rank.get(player.player_id) ?? null,
      r_rank: maps.r_rank.get(player.player_id) ?? null
    }
  }));
}

export function getPriorityFlags(player) {
  const rankMap = [
    { key: "war", label: "WAR", rank: player.ranks?.war_rank },
    { key: "hr", label: "home runs", rank: player.ranks?.hr_rank },
    { key: "hits", label: "hits", rank: player.ranks?.hits_rank },
    { key: "avg", label: "batting average", rank: player.ranks?.avg_rank },
    { key: "ops", label: "OPS", rank: player.ranks?.ops_rank },
    { key: "rbi", label: "RBI", rank: player.ranks?.rbi_rank },
    { key: "sb", label: "stolen bases", rank: player.ranks?.sb_rank },
    { key: "r", label: "runs", rank: player.ranks?.r_rank }
  ];

  return rankMap.filter(x => x.rank && x.rank <= 20).slice(0, 3);
}

export function rankOrder() {
  return [...RANK_ORDER];
}

export function safeNum(value) {
  return toNumber(value);
}
