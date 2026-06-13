"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPositionsForSport } from "@/lib/sports";
import { SPORT_PREF_CHOICES } from "@/lib/userSportPreference";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation } from "@/hooks/use-api";

export default function ProfileForm({ user }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [position, setPosition] = useState(user.position || "");
  const [sportPreference, setSportPreference] = useState(user.sport_preference || "volleyball");
  const isPlayer = user.role === "player";
  const positions = getPositionsForSport(user.team_sport || user.active_sport || "volleyball");

  const mutation = useApiMutation({ url: "/api/profile" });

  function submit(e) {
    e.preventDefault();
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    mutation.mutate(body, {
      onSuccess: (data) => {
        setSaved(true);
        router.refresh();
        if (data?.redirect) router.push(data.redirect);
        setTimeout(() => setSaved(false), 2500);
      },
    });
  }

  return (
    <Card className="max-w-lg">
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Login email</Label>
            <Input value={user.email} readOnly className="bg-navy-50 text-navy-500" />
            <p className="mt-1 text-xs text-navy-400">Use this email to sign back in after signing out.</p>
          </div>

          <div>
            <Label>Sport focus</Label>
            <input type="hidden" name="sport_preference" value={sportPreference} />
            <Select value={sportPreference} onValueChange={setSportPreference}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORT_PREF_CHOICES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-navy-400">
              Choose one sport or all sports. This controls which schedules and teams you see after login.
            </p>
          </div>

          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={user.name} required />
          </div>

          {isPlayer && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Position</Label>
                  <input type="hidden" name="position" value={position} />
                  <Select
                    value={position || "_none"}
                    onValueChange={(v) => setPosition(v === "_none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      {positions.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jersey #</Label>
                  <Input
                    name="jersey_number"
                    type="number"
                    min="0"
                    defaultValue={user.jersey_number ?? ""}
                  />
                </div>
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input
                  name="height_cm"
                  type="number"
                  min="0"
                  defaultValue={user.height_cm ?? ""}
                />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea name="bio" defaultValue={user.bio ?? ""} rows={3} />
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save profile"}
            </Button>
            {saved && <span className="text-sm font-medium text-emerald-600">✓ Saved</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
