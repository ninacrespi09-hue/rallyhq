"use client";

import {
  Activity,
  Backpack,
  BarChart3,
  Bot,
  Calendar,
  CalendarDays,
  Camera,
  ClipboardList,
  Dumbbell,
  Home,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  Target,
  Users,
  CircleDot,
} from "lucide-react";

const NAV_BY_PATH = [
  { match: (p) => p.endsWith("/schedule/all") || p === "/schedule/all", Icon: CalendarDays },
  { match: (p) => /\/schedule(\/|$)/.test(p) || p === "/schedule", Icon: Calendar },
  { match: (p) => /\/players(\/|$)/.test(p) || p === "/players" || p === "/team", Icon: Users },
  { match: (p) => /\/exercises(\/|$)/.test(p) || p === "/exercises", Icon: Dumbbell },
  { match: (p) => /\/ai-coach(\/|$)/.test(p) || p === "/ai-coach" || p === "/ai" || p === "/insights", Icon: Bot },
  { match: (p) => /\/stats(\/|$)/.test(p) || p === "/stats", Icon: BarChart3 },
  { match: (p) => /\/gallery(\/|$)/.test(p) || p === "/gallery", Icon: Camera },
  { match: (p) => /\/checkin(\/|$)/.test(p) || p === "/checkin", Icon: Activity },
  { match: (p) => /\/wellness-kit(\/|$)/.test(p) || p === "/wellness-kit", Icon: Backpack },
  { match: (p) => /\/chat(\/|$)/.test(p) || p === "/chat", Icon: MessageSquare },
  { match: (p) => /\/announcements(\/|$)/.test(p) || p === "/announcements", Icon: Megaphone },
  { match: (p) => /\/profile(\/|$)/.test(p) || p === "/profile", Icon: Users },
];

export function NavIcon({ href, className = "h-4 w-4" }) {
  const path = (href || "/").split("?")[0];
  if (path === "/" || /^\/(volleyball|basketball|soccer)\/?$/.test(path)) {
    return <Home className={className} strokeWidth={1.75} />;
  }
  for (const { match, Icon } of NAV_BY_PATH) {
    if (match(path)) return <Icon className={className} strokeWidth={1.75} />;
  }
  return <LayoutGrid className={className} strokeWidth={1.75} />;
}

export function SportGlyph({ sport, className = "h-5 w-5" }) {
  if (sport === "basketball") return <CircleDot className={className} strokeWidth={1.75} />;
  if (sport === "soccer") return <Target className={className} strokeWidth={1.75} />;
  if (sport === "volleyball") return <Activity className={className} strokeWidth={1.75} />;
  return <LayoutGrid className={className} strokeWidth={1.75} />;
}

export function FeatureIcon({ name, className = "h-5 w-5" }) {
  const map = {
    schedule: Calendar,
    stats: BarChart3,
    players: Users,
    wellness: Activity,
    kit: Backpack,
    exercises: Dumbbell,
    chat: MessageSquare,
    gallery: Camera,
    ai: Bot,
    announcements: Megaphone,
    checkin: ClipboardList,
    brand: LayoutGrid,
  };
  const Icon = map[name] || LayoutGrid;
  return <Icon className={className} strokeWidth={1.75} />;
}
