import { redirect } from "next/navigation";

// The roster now lives at /players (clean cards + leaderboard + profiles).
export default function TeamRedirect() {
  redirect("/players");
}
