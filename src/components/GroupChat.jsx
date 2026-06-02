"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function GroupChat({ user, initialRooms, roster }) {
  const [rooms, setRooms] = useState(initialRooms);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const scrollRef = useRef(null);

  const activeRoom = rooms.find((r) => r.id === activeId);

  const loadMessages = useCallback(async (roomId) => {
    const res = await fetch(`/api/chats/${roomId}/messages`);
    const json = await res.json();
    if (res.ok) setMessages(json.messages || []);
  }, []);

  const loadRoomMeta = useCallback(async (roomId) => {
    const res = await fetch(`/api/chats/${roomId}`);
    const json = await res.json();
    if (res.ok) setMembers(json.members || []);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    loadRoomMeta(activeId);
    const timer = setInterval(() => loadMessages(activeId), 5000);
    return () => clearInterval(timer);
  }, [activeId, loadMessages, loadRoomMeta]);

  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, activeId]);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    setError("");
    setInput("");

    const optimistic = {
      id: `tmp-${Date.now()}`,
      user_id: user.id,
      author_name: user.name,
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    const res = await fetch(`/api/chats/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(json.error || "Could not send message.");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(text);
      return;
    }
    await loadMessages(activeId);
    refreshRooms();
  }

  async function refreshRooms() {
    const res = await fetch("/api/chats");
    const json = await res.json();
    if (res.ok) setRooms(json.rooms || []);
  }

  function openRoom(id) {
    setActiveId(id);
    setError("");
  }

  function backToList() {
    setActiveId(null);
    setMessages([]);
    setMembers([]);
    setShowInvite(false);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
      {/* Room list */}
      <section className={`card flex flex-col ${activeId ? "hidden md:flex" : ""}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold text-navy-900">Groups</h2>
          <button onClick={() => setShowNew(true)} className="btn-primary px-3 py-1.5 text-xs">
            + New
          </button>
        </div>
        {rooms.length === 0 ? (
          <p className="text-sm text-navy-400">No group chats yet. Create one and invite teammates.</p>
        ) : (
          <div className="max-h-[420px] space-y-1 overflow-y-auto">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => openRoom(r.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-navy-50 ${
                  activeId === r.id ? "bg-brand-50 ring-1 ring-brand-200" : ""
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {r.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-navy-800">{r.name}</div>
                  <div className="truncate text-xs text-navy-400">
                    {r.last_body || `${r.member_count} member${r.member_count === 1 ? "" : "s"}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Conversation */}
      <section className={`card flex min-h-[420px] flex-col overflow-hidden p-0 ${!activeId ? "hidden md:flex" : ""}`}>
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <span className="text-4xl">💬</span>
            <p className="mt-3 text-sm text-navy-500">Select a group or create a new chat.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-navy-100 px-4 py-3">
              <button onClick={backToList} className="btn-ghost px-2 py-1 text-sm md:hidden">
                ←
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold text-navy-900">{activeRoom?.name}</h2>
                <p className="truncate text-xs text-navy-400">
                  {members.map((m) => m.name).join(", ") || `${activeRoom?.member_count || 0} members`}
                </p>
              </div>
              <button onClick={() => setShowInvite(true)} className="btn-ghost px-2 py-1 text-xs">
                Invite
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-navy-400">No messages yet. Say hi!</p>
              )}
              {messages.map((m) => {
                const mine = m.user_id === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                      {!mine && (
                        <span className="mb-0.5 px-1 text-[10px] font-semibold text-navy-400">{m.author_name}</span>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          mine
                            ? "bg-brand-600 text-white"
                            : "bg-navy-50 text-navy-800 ring-1 ring-navy-100"
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-navy-100 p-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message…"
                maxLength={2000}
                disabled={sending}
                className="input min-h-[44px] flex-1 text-sm"
              />
              <button type="submit" disabled={sending || !input.trim()} className="btn-primary shrink-0 px-4 py-2.5 text-sm">
                Send
              </button>
            </form>
            {error && <p className="px-4 pb-3 text-xs text-blue-700">{error}</p>}
          </>
        )}
      </section>

      {showNew && (
        <CreateChatModal
          roster={roster.filter((p) => p.id !== user.id)}
          onClose={() => setShowNew(false)}
          onCreated={(room) => {
            setShowNew(false);
            refreshRooms().then(() => openRoom(room.id));
          }}
        />
      )}

      {showInvite && activeId && (
        <InviteModal
          roster={roster.filter((p) => !members.some((m) => m.id === p.id))}
          roomId={activeId}
          onClose={() => setShowInvite(false)}
          onInvited={(updatedMembers) => {
            setMembers(updatedMembers);
            setShowInvite(false);
            refreshRooms();
            loadRoomMeta(activeId);
          }}
        />
      )}
    </div>
  );
}

function CreateChatModal({ roster, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!name.trim()) return setError("Enter a group name.");
    setSaving(true);
    setError("");
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), memberIds: [...selected] }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setError(json.error || "Could not create chat.");
    onCreated(json.room || { id: json.roomId, name: name.trim() });
  }

  return (
    <Modal title="New group chat" onClose={onClose}>
      <div>
        <label className="label">Group name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Setters crew, Game day…" />
      </div>
      <div className="mt-3">
        <label className="label">Invite people</label>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-navy-100 p-2">
          {roster.length === 0 && <p className="text-sm text-navy-400">No teammates to invite.</p>}
          {roster.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-navy-50">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 rounded accent-brand-600"
              />
              <span className="text-sm font-medium text-navy-700">{p.name}</span>
              <span className="ml-auto text-xs capitalize text-navy-400">{p.role}</span>
            </label>
          ))}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-blue-700">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="btn-ghost flex-1">
          Cancel
        </button>
        <button onClick={submit} disabled={saving} className="btn-primary flex-1">
          {saving ? "Creating…" : "Create"}
        </button>
      </div>
    </Modal>
  );
}

function InviteModal({ roster, roomId, onClose, onInvited }) {
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return setError("Pick at least one person.");
    setSaving(true);
    setError("");
    const res = await fetch(`/api/chats/${roomId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: [...selected] }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setError(json.error || "Could not invite.");
    onInvited(json.members || []);
  }

  return (
    <Modal title="Invite to group" onClose={onClose}>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-navy-100 p-2">
        {roster.length === 0 && <p className="text-sm text-navy-400">Everyone on the team is already here.</p>}
        {roster.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-navy-50">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            <span className="text-sm font-medium text-navy-700">{p.name}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-blue-700">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="btn-ghost flex-1">
          Cancel
        </button>
        <button onClick={submit} disabled={saving || selected.size === 0} className="btn-primary flex-1">
          {saving ? "Inviting…" : "Invite"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
