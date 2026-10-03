"use server";

import { redirect } from "next/navigation";
import { newId } from "@/lib/atrium/ids";
import { readDesks } from "@/lib/desk-store";
import { parseUsdtToCents } from "@/lib/money";
import { getHeaderUser } from "@/lib/auth";
import { lockVaultPact, moveVaultPact } from "@/lib/vault-contracts";
import { MAX_PACT_CENTS, MIN_PACT_CENTS } from "@/lib/vault-pact";

function fail(path: string, error: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}e=${encodeURIComponent(error)}`);
}

async function actor(back: string) {
  const user = await getHeaderUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(back)}`);
  return user;
}

function priceOf(form: FormData) {
  const cents = parseUsdtToCents(Number(String(form.get("price") ?? "").trim()));
  if (!Number.isInteger(cents) || cents < MIN_PACT_CENTS) return "Name a price of at least 1 USDT.";
  if (cents > MAX_PACT_CENTS) return "A contract locks at most 100,000 USDT.";
  return cents;
}

export async function offerClient(form: FormData) {
  const me = await actor("/contracts");
  const price = priceOf(form);
  if (typeof price === "string") fail("/contracts", price);
  const id = newId();
  const error = await lockVaultPact({
    actorId: me.id,
    username: String(form.get("username") ?? ""),
    kind: "client",
    companyId: "",
    title: String(form.get("title") ?? ""),
    terms: String(form.get("terms") ?? ""),
    priceCents: price,
    id,
  });
  if (error) fail("/contracts", error);
  redirect(`/contracts/${id}`);
}

export async function offerEmployee(form: FormData) {
  const companyId = String(form.get("company") ?? "");
  const me = await actor(`/companies/${companyId}`);
  const desks = readDesks();
  const company = desks.companies.find((row) => row.id === companyId);
  if (!company || company.founderId !== me.id) fail(`/companies/${companyId}`, "Only the founder locks a company contract.");
  const price = priceOf(form);
  if (typeof price === "string") fail(`/companies/${companyId}`, price);
  const id = newId();
  const error = await lockVaultPact({
    actorId: me.id,
    username: String(form.get("username") ?? ""),
    kind: "company",
    companyId,
    title: String(form.get("title") ?? ""),
    terms: String(form.get("terms") ?? ""),
    priceCents: price,
    memberIds: company.memberIds,
    id,
  });
  if (error) fail(`/companies/${companyId}`, error);
  redirect(`/contracts/${id}`);
}

export async function movePact(form: FormData) {
  const pactId = String(form.get("pact") ?? "");
  const me = await actor(`/contracts/${pactId}`);
  const action = String(form.get("action") ?? "") as "accept" | "decline" | "deliver" | "release";
  if (action !== "accept" && action !== "decline" && action !== "deliver" && action !== "release") {
    fail(`/contracts/${pactId}`, "That step is not available.");
  }
  const error = await moveVaultPact({
    actorId: me.id,
    pactId,
    action,
    proof: String(form.get("proof") ?? ""),
    id: newId(),
  });
  if (error) fail(`/contracts/${pactId}`, error);
  redirect(`/contracts/${pactId}`);
}
