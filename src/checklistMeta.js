const CHECKLIST_EXEC_URL = "https://script.google.com/macros/s/AKfycbxl2JnZGnEtmUes6UXjz6upyEd6tj20yMeX1X0bnseKo1ISaBHjWILVrp9ZyYqk-rpE_w/exec";

async function fetchJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
      "User-Agent": "cm-mlb-stats/1.0"
    },
    body: JSON.stringify(body || {})
  });

  if (!res.ok) {
    throw new Error(`Checklist meta fetch failed ${res.status}`);
  }

  return res.json();
}

export async function fetchChecklistMetaIndex(sport = "baseball") {
  const data = await fetchJson(CHECKLIST_EXEC_URL, {
    action: "player_meta_index",
    sport
  });

  return Array.isArray(data?.players) ? data.players : [];
}
