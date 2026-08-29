import { adminSecret } from "@/lib/config";

export function requireAdmin(request: Request) {
  const secret = adminSecret();
  if (!secret) {
    const error = new Error("Set ADMIN_SECRET to open the staff console.");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }
  const header = request.headers.get("x-admin-secret") ?? "";
  if (header !== secret) {
    const error = new Error("Wrong staff secret.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}
