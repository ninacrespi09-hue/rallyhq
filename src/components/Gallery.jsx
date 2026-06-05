"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { canUploadMedia } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiFetch } from "@/hooks/use-api";

const MOMENTS = ["Serving", "Setting", "Hitting", "Digging"];
const TAB_META = {
  Serving: { icon: "🏐", gradient: "from-sky-400 to-blue-600" },
  Setting: { icon: "⭐", gradient: "from-blue-500 to-indigo-600" },
  Hitting: { icon: "💥", gradient: "from-cyan-500 to-blue-600" },
  Digging: { icon: "🏅", gradient: "from-blue-600 to-navy-800" },
};

export default function Gallery({ user, media, events }) {
  const [items, setItems] = useState(media);
  const [tab, setTab] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState("");
  const canUpload = canUploadMedia(user);

  const countsByMoment = useMemo(() => {
    const counts = {};
    for (const m of MOMENTS) counts[m] = 0;
    for (const item of items) {
      if (counts[item.category] !== undefined) counts[item.category]++;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(
    () => (tab ? items.filter((m) => m.category === tab) : []),
    [items, tab]
  );

  const likeMutation = useMutation({
    mutationFn: (id) => apiFetch(`/api/media/${id}/like`, { method: "POST" }),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, body }) =>
      apiFetch(`/api/media/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiFetch(`/api/media/${id}`, { method: "DELETE" }),
  });

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function patchItem(id, patch) {
    setItems((cur) => cur.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setLightbox((lb) => (lb && lb.id === id ? { ...lb, ...patch } : lb));
  }

  async function toggleLike(item) {
    const optimistic = { liked: item.liked ? 0 : 1, like_count: item.like_count + (item.liked ? -1 : 1) };
    patchItem(item.id, optimistic);
    try {
      const d = await likeMutation.mutateAsync(item.id);
      patchItem(item.id, { liked: d.liked ? 1 : 0, like_count: d.count });
    } catch {
      patchItem(item.id, { liked: item.liked, like_count: item.like_count });
    }
  }

  async function toggleFavorite(item) {
    const fav = item.favorite ? 0 : 1;
    patchItem(item.id, { favorite: fav });
    try {
      await patchMutation.mutateAsync({ id: item.id, body: { favorite: fav } });
    } catch {
      patchItem(item.id, { favorite: item.favorite });
    }
  }

  async function remove(item) {
    setItems((cur) => cur.filter((m) => m.id !== item.id));
    setLightbox(null);
    try {
      await deleteMutation.mutateAsync(item.id);
      flash("Photo removed");
    } catch {
      setItems((cur) => [...cur, item]);
    }
  }

  function onUploaded(newItem) {
    setItems((cur) => [newItem, ...cur]);
    setUploadOpen(false);
    flash("Photo added to the reel 🎉");
  }

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-6 text-white shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
              <CameraIcon className="h-5 w-5" /> Media Gallery
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Player Photos</h1>
            <p className="mt-1 text-sm text-white/85">
              The team's best game &amp; tournament moments. {items.length} shot
              {items.length === 1 ? "" : "s"}.
            </p>
          </div>
          {canUpload && (
            <Button
              onClick={() => setUploadOpen(true)}
              className="shrink-0 bg-white text-blue-700 shadow-sm hover:bg-blue-50"
            >
              <CameraIcon className="h-4 w-4" /> Upload
            </Button>
          )}
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {MOMENTS.map((m) => {
          const count = countsByMoment[m];
          const active = tab === m;
          const { icon, gradient } = TAB_META[m];
          return (
            <button
              key={m}
              onClick={() => setTab(m)}
              className={`group relative flex min-h-[150px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 text-white shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-glow sm:min-h-[170px] ${
                active ? "scale-[1.03] shadow-glow ring-4 ring-white/60" : "opacity-75 hover:opacity-100"
              }`}
            >
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl ring-1 ring-white/25 backdrop-blur-sm transition group-hover:scale-105">
                {icon}
              </div>
              <div className="relative">
                <div className="text-lg font-extrabold leading-tight sm:text-xl">{m}</div>
                <div className="mt-0.5 text-sm text-white/80">
                  {count} shot{count !== 1 ? "s" : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {!tab ? null : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-center text-sm text-navy-400">
              No {tab.toLowerCase()} shots yet.
              {canUpload ? (
                <>
                  {" "}
                  Tap <b className="text-navy-600">Upload</b> to add one!
                </>
              ) : (
                " Check back after the next game."
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [column-fill:_balance]">
            {filtered.map((m, i) => (
              <MediaCard
                key={m.id}
                m={m}
                index={i}
                onOpen={setLightbox}
                onLike={toggleLike}
                onFav={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      <Lightbox
        item={lightbox}
        open={!!lightbox}
        onOpenChange={(open) => !open && setLightbox(null)}
        canDelete={lightbox && (user.role === "coach" || lightbox.uploaded_by === user.id)}
        onLike={() => lightbox && toggleLike(lightbox)}
        onFav={() => lightbox && toggleFavorite(lightbox)}
        onDelete={() => lightbox && remove(lightbox)}
      />

      <Uploader
        user={user}
        events={events}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={onUploaded}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white shadow-glow md:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}

function MediaCard({ m, index, onOpen, onLike, onFav }) {
  return (
    <figure
      className="group animate-pop-in mb-3 break-inside-avoid"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <button
        onClick={() => onOpen(m)}
        className="relative block w-full aspect-square overflow-hidden rounded-full bg-blue-400/25 backdrop-blur-sm ring-0 transition duration-500 group-hover:scale-105 group-hover:bg-blue-400/35"
      >
        <img
          src={m.url}
          alt={m.caption || "Action shot"}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="h-full w-full object-cover opacity-80 mix-blend-multiply"
        />
        {m.favorite ? <span className="absolute right-3 top-3 text-lg drop-shadow">⭐</span> : null}
      </button>

      <figcaption className="px-2 pt-2">
        {m.caption && <p className="line-clamp-1 text-center text-xs font-medium text-navy-800">{m.caption}</p>}
        {m.event_title && <p className="text-center text-[11px] text-navy-400">{m.event_title}</p>}
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onLike(m); }}
            className="flex items-center gap-1 text-sm active:scale-90"
          >
            <span>{m.liked ? "❤️" : "🤍"}</span>
            <span className="text-xs font-semibold text-navy-600">{m.like_count}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onFav(m); }}
            className="text-base active:scale-90"
          >
            {m.favorite ? "⭐" : "☆"}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

function Lightbox({ item, open, onOpenChange, canDelete, onLike, onFav, onDelete }) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-0 bg-transparent p-3 shadow-none">
        <div className="relative flex max-h-[95vh] w-full flex-col">
          <img
            src={item.url}
            alt={item.caption || "Action shot"}
            decoding="async"
            className="mx-auto max-h-[78vh] w-auto rounded-2xl object-contain"
          />
          <Card className="mt-3">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                {item.caption && <h3 className="truncate font-bold text-navy-900">{item.caption}</h3>}
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-navy-400">
                  {item.category && item.category !== "Action" && (
                    <Badge className="bg-blue-50 text-blue-700">{item.category}</Badge>
                  )}
                  {item.event_title && <span>{item.event_title}</span>}
                  {item.uploader_name && <span>· by {item.uploader_name}</span>}
                </div>
              </div>
              <Button variant="ghost" onClick={onLike}>
                {item.liked ? "❤️" : "🤍"} {item.like_count}
              </Button>
              <Button variant="ghost" onClick={onFav}>
                {item.favorite ? "⭐" : "☆"}
              </Button>
              {canDelete && (
                <Button variant="soft" onClick={onDelete}>
                  🗑
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Uploader({ user, events, open, onOpenChange, onUploaded }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState("");
  const [ratio, setRatio] = useState(1);
  const [caption, setCaption] = useState("");
  const [moment, setMoment] = useState("Serving");
  const [eventId, setEventId] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async (fd) => {
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error || "Upload failed.");
        throw err;
      }
      return data;
    },
  });

  function onPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setRatio(img.naturalHeight / img.naturalWidth || 1);
    img.src = url;
  }

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Please choose a photo.");
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("caption", caption);
    fd.append("moment", moment);
    fd.append("favorite", String(favorite));
    fd.append("ratio", String(ratio));
    if (eventId) fd.append("event_id", eventId);

    try {
      const data = await uploadMutation.mutateAsync(fd);
      const ev = events.find((x) => String(x.id) === String(eventId));
      onUploaded({
        id: data.id,
        url: data.url,
        caption,
        category: moment,
        favorite: favorite ? 1 : 0,
        event_id: eventId ? Number(eventId) : null,
        event_title: ev?.title || null,
        event_type: ev?.type || null,
        uploaded_by: user.id,
        uploader_role: user.role,
        uploader_name: user.name,
        like_count: 0,
        liked: 0,
        ratio,
      });
    } catch (err) {
      setError(err.message || "Upload failed.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload action shot</DialogTitle>
          <DialogDescription>Game &amp; tournament highlights only 🏐</DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-600"
        >
          {preview ? (
            <img src={preview} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm font-medium">
              <CameraIcon className="h-7 w-7" /> Tap to choose a photo
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />

        <div className="space-y-3">
          <div>
            <Label>Caption</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="mt-1.5"
              placeholder="Cross-court kill on set point 🔥"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Moment</Label>
              <select
                value={moment}
                onChange={(e) => setMoment(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-sm"
              >
                {MOMENTS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Game / Tournament</Label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-sm"
              >
                <option value="">None</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            ⭐ Mark as favorite
          </label>
        </div>

        {error && <p className="text-sm text-blue-600">{error}</p>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} disabled={uploadMutation.isPending} className="flex-1">
            {uploadMutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CameraIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
