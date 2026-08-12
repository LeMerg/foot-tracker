// Table de correspondance id équipe balldontlie -> logo, générée une fois
// (voir README pour comment la régénérer si une franchise déménage/change de nom).
// Source des logos : CDN public ESPN (a.espncdn.com/i/teamlogos/nba/500/{slug}.png).
// ATTENTION : 2 slugs ne suivent pas l'abréviation balldontlie en minuscule
// (vérifié manuellement) — Pelicans (NOP) -> 'no', Jazz (UTA) -> 'utah'.
// balldontlie ne fournit aucun logo sur le plan gratuit, d'où cette table.
export const NBA_TEAMS: Record<number, { name: string; abbreviation: string; crest: string }> = {
  "1": {
    "name": "Hawks",
    "abbreviation": "ATL",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/atl.png"
  },
  "2": {
    "name": "Celtics",
    "abbreviation": "BOS",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/bos.png"
  },
  "3": {
    "name": "Nets",
    "abbreviation": "BKN",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/bkn.png"
  },
  "4": {
    "name": "Hornets",
    "abbreviation": "CHA",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/cha.png"
  },
  "5": {
    "name": "Bulls",
    "abbreviation": "CHI",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/chi.png"
  },
  "6": {
    "name": "Cavaliers",
    "abbreviation": "CLE",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/cle.png"
  },
  "7": {
    "name": "Mavericks",
    "abbreviation": "DAL",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/dal.png"
  },
  "8": {
    "name": "Nuggets",
    "abbreviation": "DEN",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/den.png"
  },
  "9": {
    "name": "Pistons",
    "abbreviation": "DET",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/det.png"
  },
  "10": {
    "name": "Warriors",
    "abbreviation": "GSW",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/gsw.png"
  },
  "11": {
    "name": "Rockets",
    "abbreviation": "HOU",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/hou.png"
  },
  "12": {
    "name": "Pacers",
    "abbreviation": "IND",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/ind.png"
  },
  "13": {
    "name": "Clippers",
    "abbreviation": "LAC",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/lac.png"
  },
  "14": {
    "name": "Lakers",
    "abbreviation": "LAL",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/lal.png"
  },
  "15": {
    "name": "Grizzlies",
    "abbreviation": "MEM",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/mem.png"
  },
  "16": {
    "name": "Heat",
    "abbreviation": "MIA",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/mia.png"
  },
  "17": {
    "name": "Bucks",
    "abbreviation": "MIL",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/mil.png"
  },
  "18": {
    "name": "Timberwolves",
    "abbreviation": "MIN",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/min.png"
  },
  "19": {
    "name": "Pelicans",
    "abbreviation": "NOP",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/no.png"
  },
  "20": {
    "name": "Knicks",
    "abbreviation": "NYK",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/nyk.png"
  },
  "21": {
    "name": "Thunder",
    "abbreviation": "OKC",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/okc.png"
  },
  "22": {
    "name": "Magic",
    "abbreviation": "ORL",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/orl.png"
  },
  "23": {
    "name": "76ers",
    "abbreviation": "PHI",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/phi.png"
  },
  "24": {
    "name": "Suns",
    "abbreviation": "PHX",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/phx.png"
  },
  "25": {
    "name": "Trail Blazers",
    "abbreviation": "POR",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/por.png"
  },
  "26": {
    "name": "Kings",
    "abbreviation": "SAC",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/sac.png"
  },
  "27": {
    "name": "Spurs",
    "abbreviation": "SAS",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/sas.png"
  },
  "28": {
    "name": "Raptors",
    "abbreviation": "TOR",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/tor.png"
  },
  "29": {
    "name": "Jazz",
    "abbreviation": "UTA",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/utah.png"
  },
  "30": {
    "name": "Wizards",
    "abbreviation": "WAS",
    "crest": "https://a.espncdn.com/i/teamlogos/nba/500/was.png"
  }
}
