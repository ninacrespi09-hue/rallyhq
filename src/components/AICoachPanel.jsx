"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApiMutation } from "@/hooks/use-api";

function InsightSections({ insight }) {
  if (!insight) {
    return (
      <p className="text-sm text-navy-400">
        No analysis yet. Tap <b className="text-navy-600">Generate my AI coach</b> below.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-white/40 shadow-none ring-1 ring-blue-200/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <h3 className="font-bold text-navy-900">Overview</h3>
            <Badge
              variant="secondary"
              className={`ml-auto ${insight.source === "claude" ? "bg-violet-100 text-violet-700" : "bg-navy-50 text-navy-500"}`}
            >
              {insight.source === "claude" ? "✦ Claude" : "AI coach"}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-navy-700">{insight.summary}</p>
        </CardContent>
      </Card>

      <Section title="💪 Strengths" items={insight.strengths} empty="Still gathering data…" tone="emerald" />
      <Section title="🎯 Areas to work on" items={insight.weaknesses} empty="Nothing flagged yet." tone="amber" />

      {insight.habitImpact && (
        <Card className="border-0 bg-sky-50/80 shadow-none ring-1 ring-sky-200/60">
          <CardContent className="p-4">
            <h3 className="font-bold text-navy-900">🩺 How your habits affect your game</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-700">{insight.habitImpact}</p>
          </CardContent>
        </Card>
      )}

      <Section title="📈 How to improve" items={insight.improvements} empty="Check back after more check-ins and games." tone="brand" />
    </div>
  );
}

function Section({ title, items, empty, tone }) {
  const ring =
    tone === "emerald" ? "ring-emerald-200/60" : tone === "amber" ? "ring-amber-200/60" : "ring-brand-200/60";
  return (
    <Card className={`border-0 bg-white/40 shadow-none ring-1 ${ring}`}>
      <CardContent className="p-4">
        <h3 className="font-bold text-navy-900">{title}</h3>
        {items?.length ? (
          <ul className="mt-2 space-y-1.5 text-sm text-navy-700">
            {items.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand-500">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-navy-400">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PlayerVolleyballChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState("");
  const scrollRef = useRef(null);

  const chatMutation = useApiMutation({
    url: "/api/ai-coach/chat",
    method: "POST",
  });

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || chatMutation.isPending) return;

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setChatError("");

    try {
      const json = await chatMutation.mutateAsync({ message: text, history: messages });
      setMessages([...nextMessages, { role: "assistant", content: json.reply }]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (err) {
      setChatError(err.message || "Something went wrong. Try again.");
      setMessages(messages);
    }
  }

  return (
    <Card className="overflow-hidden p-0 ring-1 ring-brand-200/50">
      <div className="border-b border-blue-200/40 px-4 py-3">
        <h3 className="font-bold text-navy-900">Ask your AI coach</h3>
        <p className="text-xs text-navy-500">Volleyball questions only — skills, position, recovery, and improvement.</p>
      </div>

      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-56 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-white/60 text-navy-800 ring-1 ring-blue-200/50"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/60 px-3 py-2 text-sm text-navy-500 ring-1 ring-blue-200/50">
                Thinking…
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-blue-200/40 bg-white/30 p-3">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about serving, digging, your position…"
          maxLength={500}
          disabled={chatMutation.isPending}
          className="min-h-[44px] flex-1 text-sm"
        />
        <Button type="submit" disabled={chatMutation.isPending || !input.trim()} className="shrink-0">
          Send
        </Button>
      </form>

      {chatError && <p className="px-4 pb-3 text-xs text-blue-700">{chatError}</p>}
    </Card>
  );
}

export default function AICoachPanel({ role, initialPlayer, initialPlayers }) {
  const [playerData, setPlayerData] = useState(initialPlayer);
  const [coachPlayers, setCoachPlayers] = useState(initialPlayers || []);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(initialPlayers?.[0]?.id ?? null);
  const [loadingId, setLoadingId] = useState(null);

  const generateMutation = useApiMutation({
    url: "/api/ai-coach",
    method: "POST",
  });

  async function generateAll() {
    setError("");
    try {
      const json = await generateMutation.mutateAsync({});
      if (json.role === "player") {
        setPlayerData(json.player);
      } else {
        setCoachPlayers((prev) =>
          prev.map((p) => {
            const u = json.updated?.find((x) => x.playerId === p.id);
            return u ? { ...p, insight: u.insight } : p;
          })
        );
      }
    } catch (err) {
      setError(err.message || "Could not generate insights.");
    }
  }

  async function generateOne(playerId) {
    setLoadingId(playerId);
    setError("");
    try {
      const json = await generateMutation.mutateAsync({ playerId });
      const u = json.updated?.[0];
      if (u) {
        setCoachPlayers((prev) => prev.map((p) => (p.id === u.playerId ? { ...p, insight: u.insight } : p)));
        setOpenId(u.playerId);
      }
    } catch (err) {
      setError(err.message || "Could not generate.");
    } finally {
      setLoadingId(null);
    }
  }

  if (role === "player") {
    return (
      <div className="space-y-4">
        <Card className="border-l-4 border-brand-500">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-navy-800 text-2xl">
              🤖
            </span>
            <div>
              <h2 className="font-bold text-navy-900">Your AI Coach</h2>
              <p className="text-sm text-navy-500">Private insights based on your stats, check-ins, and training.</p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={generateAll} disabled={generateMutation.isPending}>
          {generateMutation.isPending
            ? "Analyzing your data…"
            : playerData?.insight
              ? "Refresh my AI coach"
              : "Generate my AI coach"}
        </Button>

        {error && <p className="text-sm text-blue-700">{error}</p>}

        <InsightSections insight={playerData?.insight} />

        <PlayerVolleyballChat />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-brand-500">
        <CardContent className="flex items-center gap-3 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-navy-800 text-2xl">
            🤖
          </span>
          <div>
            <h2 className="font-bold text-navy-900">Team AI Coach</h2>
            <p className="text-sm text-navy-500">Insights for every player — strengths, habits, and how to improve.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={generateAll} disabled={generateMutation.isPending}>
        {generateMutation.isPending ? "Analyzing all players…" : "Generate all player insights"}
      </Button>

      {error && <p className="text-sm text-blue-700">{error}</p>}

      <div className="space-y-2">
        {coachPlayers.map((p) => (
          <Card key={p.id} className="overflow-hidden p-0">
            <button
              type="button"
              onClick={() => setOpenId(openId === p.id ? null : p.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/20"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {p.name.split(" ")[0][0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-navy-900">{p.name}</div>
                <div className="text-xs text-navy-500">{p.position || "Player"}</div>
              </div>
              <span className="text-navy-400">{openId === p.id ? "▾" : "▸"}</span>
            </button>

            {openId === p.id && (
              <div className="border-t border-blue-200/40 px-5 pb-5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => generateOne(p.id)}
                  disabled={loadingId === p.id}
                  className="mb-4 text-xs"
                >
                  {loadingId === p.id ? "Analyzing…" : "Refresh this player"}
                </Button>
                <InsightSections insight={p.insight} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
