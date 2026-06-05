"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";

export default function GroupChat({ user, initialRooms, roster }) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const scrollRef = useRef(null);

  const { data: roomsData, refetch: refreshRooms } = useApiQuery(["chats"], "/api/chats", {
    initialData: { rooms: initialRooms },
    refetchOnMount: false,
  });
  const rooms = roomsData?.rooms ?? initialRooms;

  const { data: messagesData } = useApiQuery(
    ["chats", activeId, "messages"],
    `/api/chats/${activeId}/messages`,
    { enabled: !!activeId, refetchInterval: 5000 }
  );
  const messages = messagesData?.messages ?? [];

  const { data: roomData } = useApiQuery(["chats", activeId], `/api/chats/${activeId}`, {
    enabled: !!activeId,
  });
  const members = roomData?.members ?? [];

  const sendMutation = useApiMutation({
    url: activeId ? `/api/chats/${activeId}/messages` : "/api/chats",
    method: "POST",
    invalidateKeys: activeId ? [["chats", activeId, "messages"], ["chats"]] : [["chats"]],
  });

  const activeRoom = rooms.find((r) => r.id === activeId);

  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, activeId]);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !activeId || sendMutation.isPending) return;
    setError("");
    setInput("");

    const optimistic = {
      id: `tmp-${Date.now()}`,
      user_id: user.id,
      author_name: user.name,
      body: text,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData(["chats", activeId, "messages"], (old) => ({
      messages: [...(old?.messages ?? []), optimistic],
    }));

    try {
      await sendMutation.mutateAsync({ body: text });
      await refreshRooms();
    } catch (err) {
      setError(err.message || "Could not send message.");
      queryClient.setQueryData(["chats", activeId, "messages"], (old) => ({
        messages: (old?.messages ?? []).filter((x) => x.id !== optimistic.id),
      }));
      setInput(text);
    }
  }

  function openRoom(id) {
    setActiveId(id);
    setError("");
  }

  function backToList() {
    setActiveId(null);
    setShowInvite(false);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
      <Card className={`flex flex-col ${activeId ? "hidden md:flex" : ""}`}>
        <CardContent className="flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold text-navy-900">Groups</h2>
            <Button size="sm" onClick={() => setShowNew(true)}>
              + New
            </Button>
          </div>
          {rooms.length === 0 ? (
            <p className="text-sm text-navy-400">No group chats yet. Create one and invite teammates.</p>
          ) : (
            <ScrollArea className="max-h-[420px]">
              <div className="space-y-1 pr-3">
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
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className={`flex min-h-[420px] flex-col overflow-hidden p-0 ${!activeId ? "hidden md:flex" : ""}`}>
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <span className="text-4xl">💬</span>
            <p className="mt-3 text-sm text-navy-500">Select a group or create a new chat.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-navy-100 px-4 py-3">
              <Button variant="ghost" size="sm" onClick={backToList} className="md:hidden">
                ←
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold text-navy-900">{activeRoom?.name}</h2>
                <p className="truncate text-xs text-navy-400">
                  {members.map((m) => m.name).join(", ") || `${activeRoom?.member_count || 0} members`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowInvite(true)}>
                Invite
              </Button>
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
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message…"
                maxLength={2000}
                disabled={sendMutation.isPending}
                className="min-h-[44px] flex-1 text-sm"
              />
              <Button type="submit" disabled={sendMutation.isPending || !input.trim()} className="shrink-0">
                Send
              </Button>
            </form>
            {error && <p className="px-4 pb-3 text-xs text-blue-700">{error}</p>}
          </>
        )}
      </Card>

      <CreateChatDialog
        open={showNew}
        onOpenChange={setShowNew}
        roster={roster.filter((p) => p.id !== user.id)}
        onCreated={(room) => {
          setShowNew(false);
          refreshRooms().then(() => openRoom(room.id));
        }}
      />

      <InviteDialog
        open={showInvite && !!activeId}
        onOpenChange={setShowInvite}
        roster={roster.filter((p) => !members.some((m) => m.id === p.id))}
        roomId={activeId}
        onInvited={() => {
          setShowInvite(false);
          refreshRooms();
          queryClient.invalidateQueries({ queryKey: ["chats", activeId] });
        }}
      />
    </div>
  );
}

function CreateChatDialog({ open, onOpenChange, roster, onCreated }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState("");

  const createMutation = useApiMutation({
    url: "/api/chats",
    method: "POST",
    invalidateKeys: [["chats"]],
  });

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
    setError("");
    try {
      const json = await createMutation.mutateAsync({ name: name.trim(), memberIds: [...selected] });
      onCreated(json.room || { id: json.roomId, name: name.trim() });
      setName("");
      setSelected(new Set());
    } catch (err) {
      setError(err.message || "Could not create chat.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Group name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
            placeholder="Setters crew, Game day…"
          />
        </div>
        <div className="mt-3">
          <Label>Invite people</Label>
          <ScrollArea className="mt-1.5 max-h-48 rounded-xl border border-navy-100 p-2">
            <div className="space-y-1 pr-3">
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
          </ScrollArea>
        </div>
        {error && <p className="text-sm text-blue-700">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} disabled={createMutation.isPending} className="flex-1">
            {createMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ open, onOpenChange, roster, roomId, onInvited }) {
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState("");

  const inviteMutation = useApiMutation({
    url: roomId ? `/api/chats/${roomId}/members` : "/api/chats",
    method: "POST",
    invalidateKeys: roomId ? [["chats", roomId], ["chats"]] : [["chats"]],
  });

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
    setError("");
    try {
      await inviteMutation.mutateAsync({ memberIds: [...selected] });
      setSelected(new Set());
      onInvited();
    } catch (err) {
      setError(err.message || "Could not invite.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to group</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-56 rounded-xl border border-navy-100 p-2">
          <div className="space-y-1 pr-3">
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
        </ScrollArea>
        {error && <p className="text-sm text-blue-700">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} disabled={inviteMutation.isPending || selected.size === 0} className="flex-1">
            {inviteMutation.isPending ? "Inviting…" : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
