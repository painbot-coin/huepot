import type { ReactNode } from "react";
import { headers } from "next/headers";
import { requestIpFromHeaders, staffIpAllowed } from "@/lib/staff-auth";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const ip = requestIpFromHeaders(await headers());
  if (!staffIpAllowed(ip)) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-3xl text-white">Staff</h1>
        <p className="mt-3 text-zinc-400">This desk is closed from this network.</p>
      </main>
    );
  }
  return children;
}
