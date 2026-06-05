"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { POSITIONS } from "@/lib/format";
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
  const isPlayer = user.role === "player";

  const mutation = useApiMutation({ url: "/api/profile" });

  function submit(e) {
    e.preventDefault();
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    mutation.mutate(body, {
      onSuccess: () => {
        setSaved(true);
        router.refresh();
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
                      {POSITIONS.map((p) => (
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
