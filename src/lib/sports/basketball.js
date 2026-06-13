export const basketball = {
  id: "basketball",
  label: "Basketball",
  icon: "🏀",
  gradient: "from-orange-400 to-amber-600",
  tagline: "Track points, rebounds, and conditioning for your basketball team.",
  // Reuses player_stats columns with basketball labels
  stats: [
    { key: "kills", label: "Points" },
    { key: "hits", label: "Field Goals" },
    { key: "blocks", label: "Blocks" },
    { key: "digs", label: "Rebounds" },
    { key: "aces", label: "Steals" },
  ],
  leaderboardColumns: ["kills", "digs", "aces", "assists", "blocks"],
  trendMetric: (row) => (row.kills || 0) + (row.aces || 0),
  positions: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  playersCardIcon: "🏀",
  scoreLabel: "Points",
  aiSportName: "basketball",
};
