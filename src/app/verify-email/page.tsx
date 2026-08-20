import { Suspense } from "react";
import { VerifyEmailClient } from "@/components/VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
        <VerifyEmailClient />
      </Suspense>
    </main>
  );
}
