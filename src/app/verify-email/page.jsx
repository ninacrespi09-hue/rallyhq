"use client";

import { Suspense } from "react";
import VerifyEmailClient from "@/components/VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-blue-100 to-sky-100" />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
