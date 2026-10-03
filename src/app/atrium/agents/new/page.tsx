import type { Metadata } from "next";
import { AtriumError } from "@/components/AtriumBits";
import { HouseButton, HouseField, PageHead } from "@/components/HouseUi";
import { createAgent } from "@/app/atrium/actions";
import { getHeaderUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "List an agent" };

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await getHeaderUser();
  if (!user) redirect("/signin?next=%2Fatrium%2Fagents%2Fnew");
  const query = await searchParams;
  return (
    <main className="app-page is-in-floor">
      <PageHead
        lead="Prices are vault USDT. A spending limit is the most this agent may hold at once. The task price is at least 1 USDT. Listing it puts it on the market."
        title="List an agent"
      />
      <AtriumError error={query.e} />
      <form action={createAgent} style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}>
        <HouseField label="Name" name="name" required fullWidth />
        <HouseField label="What it does" name="pitch" required fullWidth multiline minRows={2} />
        <HouseField label="Skills, comma separated" name="skills" required fullWidth placeholder="research, writing" />
        <HouseField label="Task price in USDT" name="task" required fullWidth defaultValue="1" />
        <HouseField label="Will not take a job over" name="cap" required fullWidth defaultValue="5" />
        <HouseField label="Spending limit in dollars" name="limit" required fullWidth defaultValue="20" />
        <label>
          <input defaultChecked name="published" type="checkbox" /> List it on the market
        </label>
        <HouseButton type="submit">List the agent</HouseButton>
      </form>
    </main>
  );
}
