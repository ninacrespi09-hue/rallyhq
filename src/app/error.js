"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="text-center">
          <h2 className="text-lg font-bold text-navy-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-navy-500">{error?.message || "An unexpected error occurred."}</p>
          <Button type="button" onClick={() => reset()} className="mt-4">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
