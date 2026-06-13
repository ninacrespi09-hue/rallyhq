"use client";

import Link from "next/link";
import { SPORTS } from "@/lib/sports";

export default function SportPicker({ userName }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-sky-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-2xl">🏟️</span>
        <span className="text-2xl font-extrabold tracking-tight text-navy-900">RallyHQ</span>
      </div>

      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">
          Choose your sport
        </h1>
        <p className="mt-2 text-sm text-navy-600 sm:text-base">
          Hi {userName?.split(" ")[0] || "there"} — pick a sport hub or view every event together.
        </p>
      </div>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        {SPORTS.map((sport) => (
          <Link
            key={sport.id}
            href={`/${sport.id}`}
            className={`group flex min-h-[180px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${sport.gradient} p-5 text-white shadow-soft transition hover:-translate-y-1 hover:shadow-glow`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-3xl ring-1 ring-white/25 backdrop-blur-sm">
              {sport.icon}
            </div>
            <div>
              <div className="text-xl font-extrabold">{sport.label}</div>
              <div className="mt-1 text-xs text-white/80 sm:text-sm">{sport.tagline}</div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/schedule/all"
        className="mt-6 flex w-full max-w-2xl items-center justify-between rounded-2xl bg-white px-5 py-4 text-navy-800 shadow-soft ring-1 ring-blue-200/60 transition hover:shadow-glow"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗓️</span>
          <div className="text-left">
            <div className="font-bold">All Sports Schedule</div>
            <div className="text-sm text-navy-500">Every practice, game, and event in one place</div>
          </div>
        </div>
        <span className="text-xl text-navy-400">→</span>
      </Link>

      <p className="mt-8 text-center text-xs text-navy-400">RallyHQ · multi-sport team hub</p>
    </div>
  );
}
