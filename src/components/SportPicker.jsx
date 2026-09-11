"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, LayoutGrid } from "lucide-react";
import { SPORTS } from "@/lib/sports";

/** Homepage sport cards — previous RallyHQ blue family (volleyball exact). */
const SPORT_CARD_GRADIENT = {
  volleyball: "from-sky-300 to-blue-500",
  basketball: "from-blue-300 to-blue-500",
  soccer: "from-sky-400 to-cyan-500",
};

export default function SportPicker({ userName }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-sky-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-500 text-white">
          <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="text-xl font-semibold tracking-tight text-navy-900">RallyHQ</span>
      </div>

      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-semibold text-navy-900 sm:text-4xl">Choose your sport</h1>
        <p className="mt-2 text-sm text-navy-600 sm:text-base">
          Hi {userName?.split(" ")[0] || "there"} — pick a sport hub or view every event together.
        </p>
      </div>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        {SPORTS.map((sport) => (
          <Link
            key={sport.id}
            href={`/${sport.id}`}
            className={`group flex min-h-[168px] flex-col justify-center overflow-hidden rounded-md bg-gradient-to-br ${SPORT_CARD_GRADIENT[sport.id] || "from-sky-300 to-blue-500"} p-5 text-white shadow-soft transition hover:shadow-glow`}
          >
            <div>
              <div className="text-lg font-semibold">{sport.label}</div>
              <div className="mt-1.5 text-xs leading-relaxed text-white/85 sm:text-sm">{sport.tagline}</div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/schedule/all"
        className="mt-5 flex w-full max-w-2xl items-center justify-between rounded-md bg-white/90 px-5 py-4 text-navy-800 shadow-soft ring-1 ring-blue-100/60 transition hover:shadow-glow"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="text-left">
            <div className="font-semibold">All Sports Schedule</div>
            <div className="text-sm text-navy-500">Every practice, game, and event in one place</div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-navy-400" />
      </Link>

      <p className="mt-8 text-center text-xs text-navy-400">RallyHQ · multi-sport team hub</p>
    </div>
  );
}
