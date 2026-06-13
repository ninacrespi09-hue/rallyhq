const fs = require("fs");
const { execSync } = require("child_process");

const pages = [
  "schedule",
  "stats",
  "players",
  "exercises",
  "checkin",
  "wellness-kit",
  "chat",
  "gallery",
  "ai-coach",
];

const header = `import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
`;

for (const route of pages) {
  let c = execSync(`git show 85ffc3f:src/app/${route}/page.js`, { encoding: "utf8" });
  c = c.replace(/import \{ getCurrentUser \} from "@\/lib\/auth";\n/, "");
  c = c.replace(/import \{ redirect \} from "next\/navigation";\n/, "");
  c = c.replace(
    /export default async function (\w+)(\([^)]*\))?/,
    "export default async function $1({ params, searchParams })"
  );
  c = c.replace(
    /const user = await getCurrentUser\(\);\s*\n\s*if \(!user\) redirect\("\/login"\);/,
    "const { sport } = await params;\n  const { user, teamId } = await getSportPageContext(sport);"
  );
  c = c.replace(/user\.team_id/g, "teamId");
  c = c.replace(/<NavShell user=\{user\}>/g, "<NavShell user={user} sport={sport}>");
  c = c.replace(/href="\/([^"]+)"/g, (m, p) =>
    p === "schedule/all" ? m : `href={sportPath(sport, "${p}")}`
  );
  c = c.replace(/href=\{`\/players\/\$\{([^}]+)\}`\}/g, "href={sportPath(sport, `players/${$1}`)}");
  c = c.replace(/href=\{`\/schedule\/\$\{([^}]+)\}`\}/g, "href={sportPath(sport, `schedule/${$1}`)}");

  let extra = "";
  if (route === "stats") {
    extra =
      'import { statsForSport } from "@/lib/statDefs";\nimport { getSportConfig } from "@/lib/sports";\n';
    c = c.replace("import { STATS, teamStatTotals", "import { teamStatTotals");
    c = c.replace(
      "blockParent(user);",
      "blockParent(user);\n\n  const STATS = statsForSport(sport);\n  const cfg = getSportConfig(sport);"
    );
    c = c.replace("volleyball stat sheet", "{cfg.label.toLowerCase()} stat sheet");
    c = c.replace(
      "Offensive output (Kills + Serve Aces + Blocks) per game",
      "{cfg.label} team output per game"
    );
  }

  fs.mkdirSync(`src/app/[sport]/${route}`, { recursive: true });
  fs.writeFileSync(`src/app/[sport]/${route}/page.js`, header + extra + c);
  console.log("wrote", route);
}
