import fs from "fs/promises";

const STANDINGS_URL = "https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=";
const TEAMS_URL = "https://statsapi.mlb.com/api/v1/teams?sportId=1&season=";
const PEOPLE_URL = "https://statsapi.mlb.com/api/v1/people/";
const STATS_HYDRATE = "stats(group=[hitting],type=[season,career],sportId=1)";

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "cm-mlb-stats/1.0"
    }
  });

  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${url}`);
  }

  return res.json();
}

function getCurrentSeasonYear() {
  return new Date().getFullYear();
}

export async function fetchAllMlbTeams(season = getCurrentSeasonYear()) {
  const data = await fetchJson(`${TEAMS_URL}${season}`);
  return Array.isArray(data.teams) ? data.teams : [];
}

export async function fetchActiveRosterForTeam(teamId, season = getCurrentSeasonYear()) {
  const url = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&season=${season}`;
  const data = await fetchJson(url);
  return Array.isArray(data.roster) ? data.roster : [];
}

export async function fetchPlayerWithStats(playerId) {
  const url = `${PEOPLE_URL}${playerId}?hydrate=${encodeURIComponent(STATS_HYDRATE)}`;
  const data = await fetchJson(url);
  return Array.isArray(data.people) && data.people.length ? data.people[0] : null;
}

export async function fetchAllActivePlayersWithStats(season = getCurrentSeasonYear()) {
  const teams = await fetchAllMlbTeams(season);

  const playerMap = new Map();

  for (const team of teams) {
    const roster = await fetchActiveRosterForTeam(team.id, season);

    for (const player of roster) {
      const id = player?.person?.id;
      const name = player?.person?.fullName;

      if (!id || !name) continue;
      if (!playerMap.has(id)) {
        playerMap.set(id, {
          player_id: String(id),
          player_name: name,
          team_id: String(team.id),
          team_name: team.name,
          team_abbr: team.abbreviation || team.teamName || ""
        });
      }
    }
  }

  const players = [...playerMap.values()];
  const out = [];

  for (const player of players) {
    const full = await fetchPlayerWithStats(player.player_id);
    if (!full) continue;

    out.push({
      ...player,
      mlb_person: full
    });
  }

  return out;
}

export async function writeRawSnapshot(filepath, data) {
  await fs.mkdir(new URL("../data/public/", import.meta.url), { recursive: true });
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf8");
}
