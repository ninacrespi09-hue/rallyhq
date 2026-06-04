"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BabyPetSprite from "@/components/pets/BabyPetSprite";
import { PET_EARN_HINTS, RALLY_PETS } from "@/lib/rallyPetDefs";

const BASE_BUBBLE = 140;
const MARGIN = 12;

function defaultPosition(bubble) {
  if (typeof window === "undefined") return { x: MARGIN, y: MARGIN };
  return {
    x: Math.max(MARGIN, window.innerWidth - bubble - MARGIN),
    y: MARGIN,
  };
}

function clampPosition(x, y, bubble) {
  if (typeof window === "undefined") return { x, y };
  const maxX = window.innerWidth - bubble - MARGIN;
  const maxY = window.innerHeight - bubble - MARGIN;
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY),
  };
}

function applyPet(data, setters) {
  if (data.animal) setters.setAnimal(data.animal);
  if (data.level != null) setters.setLevel(data.level);
  if (data.stageLabel) setters.setStageLabel(data.stageLabel);
  if (data.scale != null) setters.setScale(data.scale);
  if (data.mood) setters.setMood(data.mood);
  if (data.moodLabel) setters.setMoodLabel(data.moodLabel);
  if (data.xp != null) setters.setXp(data.xp);
  if (data.xpPct != null) setters.setXpPct(data.xpPct);
  if (data.xpCurrent != null) setters.setXpCurrent(data.xpCurrent);
  if (data.xpNeeded != null) setters.setXpNeeded(data.xpNeeded);
  if (data.maxLevel != null) setters.setMaxLevel(data.maxLevel);
}

/** Floating draggable pet overlay — does not affect page layout. */
export default function RallyPetFloating() {
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [animal, setAnimal] = useState("dog");
  const [level, setLevel] = useState(1);
  const [stageLabel, setStageLabel] = useState("Tiny");
  const [scale, setScale] = useState(0.88);
  const [mood, setMood] = useState("okay");
  const [moodLabel, setMoodLabel] = useState("Okay");
  const [xp, setXp] = useState(0);
  const [xpPct, setXpPct] = useState(0);
  const [xpCurrent, setXpCurrent] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(50);
  const [maxLevel, setMaxLevel] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const bubble = Math.round(BASE_BUBBLE * scale);
  const spriteSize = bubble;
  const sad = mood === "sad";
  const setters = {
    setAnimal,
    setLevel,
    setStageLabel,
    setScale,
    setMood,
    setMoodLabel,
    setXp,
    setXpPct,
    setXpCurrent,
    setXpNeeded,
    setMaxLevel,
  };

  const loadPet = useCallback(() => {
    return fetch("/api/rally-pet")
      .then((r) => r.json())
      .then((data) => {
        applyPet(data, setters);
        if (data.posX != null && data.posY != null) {
          const b = Math.round(BASE_BUBBLE * (data.scale ?? 1));
          setPos(clampPosition(data.posX, data.posY, b));
        } else {
          const b = Math.round(BASE_BUBBLE * (data.scale ?? 0.88));
          setPos(defaultPosition(b));
        }
        return data;
      });
  }, []);

  useEffect(() => {
    loadPet()
      .catch(() => setPos(defaultPosition(BASE_BUBBLE)))
      .finally(() => setReady(true));
  }, [loadPet]);

  useEffect(() => {
    function onResize() {
      setPos((p) => clampPosition(p.x, p.y, bubble));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bubble]);

  const savePosition = useCallback((x, y) => {
    fetch("/api/rally-pet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posX: x, posY: y }),
    }).catch(() => {});
  }, []);

  const chooseAnimal = useCallback((pet) => {
    setAnimal(pet.id);
    fetch("/api/rally-pet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animal: pet.id }),
    })
      .then((r) => r.json())
      .then((data) => applyPet(data, setters))
      .catch(() => {});
  }, []);

  function onPointerDown(e) {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
    rootRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    setPos(clampPosition(d.originX + dx, d.originY + dy, bubble));
  }

  function onPointerUp(e) {
    const d = dragRef.current;
    dragRef.current = null;
    rootRef.current?.releasePointerCapture(e.pointerId);
    setDragging(false);
    if (!d) return;
    if (d.moved) {
      const next = clampPosition(
        d.originX + (e.clientX - d.startX),
        d.originY + (e.clientY - d.startY),
        bubble
      );
      setPos(next);
      savePosition(next.x, next.y);
      return;
    }
    setPanelOpen((open) => !open);
    if (!panelOpen) loadPet().catch(() => {});
  }

  if (!ready) return null;

  const moodColor = mood === "happy" ? "#059669" : mood === "sad" ? "#64748b" : "#2563eb";

  return (
    <>
      <div
        ref={rootRef}
        role="img"
        aria-label="RallyPet companion"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 60,
          width: bubble,
          height: bubble,
          display: "grid",
          placeItems: "center",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
          opacity: sad ? 0.55 : 1,
          background: "transparent",
          overflow: "visible",
          transition: dragging ? "none" : "width 0.2s, height 0.2s, opacity 0.2s, filter 0.2s",
        }}
      >
        <BabyPetSprite id={animal} size={spriteSize} level={level} sad={sad} />
        <span
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            minWidth: 20,
            height: 20,
            padding: "0 5px",
            borderRadius: 999,
            background: "#0d1730",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
          }}
        >
          {level}
        </span>
      </div>

      {panelOpen && (
        <div
          style={{
            position: "fixed",
            left: Math.min(pos.x, typeof window !== "undefined" ? window.innerWidth - 240 : pos.x),
            top: pos.y + bubble + 8,
            zIndex: 61,
            width: 228,
            padding: 12,
            borderRadius: 16,
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 8px 24px rgba(13,23,48,0.16), 0 0 0 1px rgba(13,23,48,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#f0f9ff",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <BabyPetSprite id={animal} size={44} level={level} sad={sad} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0d1730" }}>
                Level {level} · {stageLabel}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: moodColor }}>{moodLabel}</div>
            </div>
          </div>

          {!maxLevel && (
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 4,
                }}
              >
                <span>{xp} XP</span>
                <span>
                  {xpCurrent}/{xpNeeded}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${xpPct}%`,
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                  }}
                />
              </div>
            </div>
          )}

          {maxLevel && (
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#059669" }}>
              Max level reached — {xp} XP total
            </p>
          )}

          <p
            style={{
              margin: "0 0 6px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Earn points
          </p>
          <ul style={{ margin: "0 0 10px", padding: 0, listStyle: "none" }}>
            {PET_EARN_HINTS.map((h) => (
              <li
                key={h.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "#334155",
                  marginBottom: 3,
                }}
              >
                <span>{h.label}</span>
                <span style={{ fontWeight: 700, color: "#2563eb" }}>+{h.points}</span>
              </li>
            ))}
          </ul>

          <p
            style={{
              margin: "0 0 6px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Change pet
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {RALLY_PETS.map((pet) => (
              <button
                key={pet.id}
                type="button"
                title={pet.label}
                onClick={() => chooseAnimal(pet)}
                style={{
                  height: 46,
                  width: 46,
                  borderRadius: 10,
                  border: pet.id === animal ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  background: pet.id === animal ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <BabyPetSprite id={pet.id} size={44} level={1} />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
