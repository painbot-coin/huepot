import { appUrl, mailConfigured } from "./config";
import { formatCents } from "./money";

export type MailResult = { sent: boolean; error?: string };

export async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<MailResult> {
  if (!mailConfigured()) {
    return { sent: false, error: "SMTP is not configured." };
  }

  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const from = process.env.SMTP_FROM || `Huepot <${user}>`;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);

  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({ from, to, subject, html });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mail failed";
    console.error("[mail]", message);
    return { sent: false, error: message };
  }
}

export function verifyEmailHtml(username: string, token: string) {
  const url = `${appUrl()}/verify-email?token=${token}`;
  return `
    <div style="font-family:Georgia,serif;background:#07070c;color:#f4f1ea;padding:32px">
      <h1 style="margin:0 0 12px">Huepot</h1>
      <p>Hi ${username}, confirm this email so you can invest, click, and withdraw.</p>
      <p>
        <a href="${url}" style="display:inline-block;background:#f4f1ea;color:#111;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">
          Verify email
        </a>
      </p>
      <p style="color:#9a9aa4;font-size:13px">Or paste this link:<br>${url}</p>
    </div>
  `;
}

export function resetEmailHtml(username: string, token: string) {
  const url = `${appUrl()}/reset-password?token=${token}`;
  return `
    <div style="font-family:Georgia,serif;background:#07070c;color:#f4f1ea;padding:32px">
      <h1 style="margin:0 0 12px">Huepot</h1>
      <p>Hi ${username}, use this link to pick a new password. It expires in one hour.</p>
      <p>
        <a href="${url}" style="display:inline-block;background:#f4f1ea;color:#111;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">
          Reset password
        </a>
      </p>
      <p style="color:#9a9aa4;font-size:13px">Or paste this link:<br>${url}</p>
    </div>
  `;
}

export function resetUrl(token: string) {
  return `${appUrl()}/reset-password?token=${token}`;
}

export function verifyUrl(token: string) {
  return `${appUrl()}/verify-email?token=${token}`;
}

export function securityEmailHtml(
  username: string,
  kind: "signin" | "password" | "email",
  detail: string,
) {
  const line =
    kind === "signin"
      ? "a new sign-in was opened on your account."
      : kind === "email"
        ? "the email on this account was changed."
        : "your password was changed.";
  return `
    <div style="font-family:Georgia,serif;background:#07070c;color:#f4f1ea;padding:32px">
      <h1 style="margin:0 0 12px">Huepot</h1>
      <p>Hi ${username}, ${line}</p>
      <p style="color:#9a9aa4;font-size:13px">${detail}</p>
      <p>If this was not you, reset the password and sign out other devices from Account.</p>
    </div>
  `;
}

export function payoutEmailHtml(
  username: string,
  cents: number,
  action: "paid" | "rejected",
  txHash: string,
) {
  const amount = formatCents(cents);
  const explorer = txHash ? `https://bscscan.com/tx/${txHash}` : "";
  if (action === "rejected") {
    return `
    <div style="font-family:Georgia,serif;background:#07070c;color:#f4f1ea;padding:32px">
      <h1 style="margin:0 0 12px">Huepot</h1>
      <p>Hi ${username}, ${amount} USDT was put back in your bank. The cash-out did not go out.</p>
    </div>
  `;
  }
  return `
    <div style="font-family:Georgia,serif;background:#07070c;color:#f4f1ea;padding:32px">
      <h1 style="margin:0 0 12px">Huepot</h1>
      <p>Hi ${username}, ${amount} USDT left on BNB Chain.</p>
      ${
        explorer
          ? `<p><a href="${explorer}" style="color:#d4af77">View on BscScan</a></p>`
          : ""
      }
    </div>
  `;
}
