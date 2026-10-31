// every ticker plays for one team; each team has a mascot (no company logos anywhere)
export type Team = { key: string; name: string; mascot: string; color: string; tickers: string[] };
export const TEAMS: Team[] = [
  { key: "bulls", name: "Big Bulls", mascot: "bull", color: "#3b5bff", tickers: ["AAPL", "AMZN", "GOOGL", "META", "MSFT", "TSLA", "BABA"] },
  { key: "chips", name: "Chip Bots", mascot: "chip", color: "#ff7a2f", tickers: ["NVDA", "AMD", "ASML", "INTC", "MU", "SNDK", "TSM"] },
  { key: "cloud", name: "Cloud Crew", mascot: "cloud", color: "#5cc8ff", tickers: ["CRWV", "NBIS", "ORCL", "PLTR", "DELL"] },
  { key: "quantum", name: "Quantum Orbs", mascot: "orb", color: "#9b5cff", tickers: ["IONQ", "RGTI"] },
  { key: "coin", name: "Coin Gang", mascot: "coin", color: "#ffc83d", tickers: ["COIN", "MSTR", "CRCL", "CLSK"] },
  { key: "space", name: "Rocket Club", mascot: "rocket", color: "#ff5a36", tickers: ["RKLB", "SPCX"] },
  { key: "apes", name: "Diamond Apes", mascot: "gorilla", color: "#c8e83a", tickers: ["GME"] },
  { key: "golems", name: "Gold Golems", mascot: "golem", color: "#e0a93b", tickers: ["SPY", "QQQ", "EWY", "GLD", "SLV", "USO", "USAR"] },
];
const BY_TICKER = new Map(TEAMS.flatMap((t) => t.tickers.map((s) => [s, t] as const)));
export const teamOf = (symbol: string | undefined): Team => (symbol && BY_TICKER.get(symbol)) || TEAMS[0];

// every listed ticker has its own mascot drawn from what the company makes (design/cut-tickers.mjs);
// a ticker listed later without art falls back to its team mascot
const ART = new Set("AAPL AMD AMZN ASML BABA CLSK COIN CRCL CRWV DELL EWY GLD GME GOOGL INTC IONQ META MSFT MSTR MU NBIS NVDA ORCL PLTR QQQ RGTI RKLB SLV SNDK SPCX SPY TSLA TSM USAR USO".split(" "));
export const mascotFor = (symbol: string | undefined) => (symbol && ART.has(symbol) ? `t/${symbol}` : teamOf(symbol).mascot);
