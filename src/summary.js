import { getPriorityFlags } from "./rank.js";

function fmtAvg(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(3).replace(/^0/, ".");
}

function fmt1(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(1);
}

function fmt0(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n));
}

function buildCurrentSeasonSummary(player) {
  const flags = getPriorityFlags(player);

  if (!player.current_season || !player.current_season.has_stats) {
    return "";
  }

  if (flags.length) {
    const phrases = flags.map(flag => {
      if (flag.label === "WAR") return `${flag.rank}${ordinal(flag.rank)} in WAR`;
      if (flag.label === "OPS") return `${flag.rank}${ordinal(flag.rank)} in OPS`;
      return `${flag.rank}${ordinal(flag.rank)} in ${flag.label}`;
    });

    if (phrases.length === 1) {
      return `${player.player_name} is currently ${phrases[0]} this season.`;
    }
    if (phrases.length === 2) {
      return `${player.player_name} is currently ${phrases[0]} and ${phrases[1]} this season.`;
    }
    return `${player.player_name} is currently ${phrases[0]}, ${phrases[1]}, and ${phrases[2]} this season.`;
  }

  const cs = player.current_season;
  return `${player.player_name} is having a season highlighted by ${fmt0(cs.hr)} home runs, ${fmtAvg(cs.avg)} batting average, and ${fmt1(cs.war)} WAR.`;
}

function buildCareerSummary(player) {
  const c = player.career;
  if (!c || !c.has_stats) return "";

  return `${player.player_name} has produced ${fmt1(c.war)} career WAR with ${fmt0(c.hr)} home runs, ${fmt0(c.hits)} hits, and a ${fmtAvg(c.avg)} batting average.`;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function buildPlayerSummaryRecord(player) {
  const currentSeason = player.current_season?.has_stats
    ? {
        season: player.current_season.season,
        summary: buildCurrentSeasonSummary(player),
        stat_card: {
          WAR: fmt1(player.current_season.war),
          AB: fmt0(player.current_season.ab),
          H: fmt0(player.current_season.hits),
          HR: fmt0(player.current_season.hr),
          BA: fmtAvg(player.current_season.avg),
          R: fmt0(player.current_season.r),
          RBI: fmt0(player.current_season.rbi),
          SB: fmt0(player.current_season.sb),
          OBP: fmtAvg(player.current_season.obp),
          SLG: fmtAvg(player.current_season.slg),
          OPS: fmtAvg(player.current_season.ops),
          "OPS+": fmt0(player.current_season.ops_plus)
        }
      }
    : null;

  const career = player.career?.has_stats
    ? {
        summary: buildCareerSummary(player),
        stat_card: {
          WAR: fmt1(player.career.war),
          H: fmt0(player.career.hits),
          HR: fmt0(player.career.hr),
          BA: fmtAvg(player.career.avg),
          R: fmt0(player.career.r),
          RBI: fmt0(player.career.rbi),
          SB: fmt0(player.career.sb),
          OBP: fmtAvg(player.career.obp),
          SLG: fmtAvg(player.career.slg),
          OPS: fmtAvg(player.career.ops),
          "OPS+": fmt0(player.career.ops_plus)
        }
      }
    : null;

  return {
    player_id: player.player_id,
    player_name: player.player_name,
    team: player.team_abbr || player.team_name || "",
    current_season: currentSeason,
    career: career,
    checklist_years: [],
    rc_year: null
  };
}
