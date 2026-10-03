"use server";

import { redirect } from "next/navigation";
import { newId } from "@/lib/atrium/ids";
import { companyName, deskRole, helpNote, openingTitle } from "@/lib/desk";
import { withDesks } from "@/lib/desk-store";
import { getHeaderUser } from "@/lib/auth";

function fail(path: string, error: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}e=${encodeURIComponent(error)}`);
}

async function actor(back: string) {
  const user = await getHeaderUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(back)}`);
  return user;
}

export async function openCompany(form: FormData) {
  const me = await actor("/companies");
  const name = companyName(String(form.get("name") ?? ""));
  const brief = String(form.get("brief") ?? "").trim().slice(0, 280);
  if (!name) fail("/companies", "Name the company.");
  const id = newId();
  await withDesks((db) => {
    db.companies.push({
      id,
      founderId: me.id,
      name,
      brief,
      memberIds: [me.id],
      createdAt: Date.now(),
    });
  });
  redirect(`/companies/${id}`);
}

export async function joinCompany(form: FormData) {
  const id = String(form.get("company") ?? "");
  const me = await actor(`/companies/${id}`);
  const error = await withDesks((db) => {
    const company = db.companies.find((row) => row.id === id);
    if (!company) return "That company is gone.";
    if (!company.memberIds.includes(me.id)) company.memberIds.push(me.id);
    return "";
  });
  if (error) fail("/companies", error);
  redirect(`/companies/${id}`);
}

export async function postOpening(form: FormData) {
  const companyId = String(form.get("company") ?? "");
  const me = await actor(`/companies/${companyId}`);
  const role = deskRole(String(form.get("role") ?? ""));
  const title = openingTitle(String(form.get("title") ?? ""));
  const brief = String(form.get("brief") ?? "").trim().slice(0, 400);
  if (!role) fail(`/companies/${companyId}`, "Pick a role.");
  if (!title) fail(`/companies/${companyId}`, "Name the opening.");
  const error = await withDesks((db) => {
    const company = db.companies.find((row) => row.id === companyId);
    if (!company || company.founderId !== me.id) return "Only the founder posts an opening.";
    db.openings.push({
      id: newId(),
      companyId,
      role: role.id,
      title,
      brief,
      open: true,
      createdAt: Date.now(),
    });
    return "";
  });
  if (error) fail(`/companies/${companyId}`, error);
  redirect(`/companies/${companyId}`);
}

export async function applyOpening(form: FormData) {
  const companyId = String(form.get("company") ?? "");
  const openingId = String(form.get("opening") ?? "");
  const me = await actor(`/companies/${companyId}`);
  const note = helpNote(String(form.get("note") ?? ""));
  if (!note) fail(`/companies/${companyId}`, "Write at least a short note.");
  const error = await withDesks((db) => {
    const opening = db.openings.find((row) => row.id === openingId && row.companyId === companyId);
    const company = db.companies.find((row) => row.id === companyId);
    if (!opening || !opening.open || !company) return "That opening is closed.";
    if (company.founderId === me.id) return "The founder does not apply to their own opening.";
    const already = db.applications.find((row) => row.openingId === opening.id && row.userId === me.id);
    if (already) return "You already wrote on this opening.";
    db.applications.push({
      id: newId(),
      openingId: opening.id,
      userId: me.id,
      username: me.username,
      note,
      createdAt: Date.now(),
    });
    return "";
  });
  if (error) fail(`/companies/${companyId}`, error);
  redirect(`/companies/${companyId}`);
}

export async function closeOpening(form: FormData) {
  const companyId = String(form.get("company") ?? "");
  const openingId = String(form.get("opening") ?? "");
  const me = await actor(`/companies/${companyId}`);
  await withDesks((db) => {
    const company = db.companies.find((row) => row.id === companyId);
    const opening = db.openings.find((row) => row.id === openingId && row.companyId === companyId);
    if (company?.founderId === me.id && opening) opening.open = false;
  });
  redirect(`/companies/${companyId}`);
}
