import { prisma } from "@/lib/db";
import { ensureStaffTables, type StaffActor } from "@/lib/staff-auth";

export type StaffLogRow = {
  id: string;
  at: number;
  operator: string;
  ip: string;
  action: string;
  target: string;
  note: string;
};

export async function writeStaffLog(
  actor: StaffActor,
  action: string,
  target: string,
  note = "",
) {
  await ensureStaffTables();
  const id = crypto.randomUUID();
  const at = Date.now();
  await prisma.$executeRaw`
    INSERT INTO StaffLog (id, at, operator, ip, action, target, note)
    VALUES (${id}, ${at}, ${actor.operator}, ${actor.ip}, ${action}, ${target.slice(0, 80)}, ${note.slice(0, 160)})
  `;
}

export async function listStaffLogs(limit = 80): Promise<StaffLogRow[]> {
  await ensureStaffTables();
  const take = Math.max(1, Math.min(120, Math.floor(limit)));
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      at: string | number;
      operator: string;
      ip: string;
      action: string;
      target: string;
      note: string;
    }[]
  >(
    `SELECT id, CAST(at AS TEXT) as at, operator, ip, action, target, note FROM StaffLog ORDER BY at DESC LIMIT ${take}`,
  );
  return rows.map((row) => ({
    id: row.id,
    at: Number(row.at),
    operator: row.operator,
    ip: row.ip,
    action: row.action,
    target: row.target,
    note: row.note,
  }));
}
