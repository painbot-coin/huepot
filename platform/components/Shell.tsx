import Link from "next/link";
import { leave } from "@/app/actions";
import { currentUser } from "@/lib/session";

export async function Shell({ children }: { children: React.ReactNode }) {
  const me = await currentUser();
  return (
    <>
      <header>
        <Link href="/" style={{ color: "var(--accent)", fontWeight: 800, textDecoration: "none" }}>
          Atrium
        </Link>
        <nav>
          <Link href="/feed">Feed</Link>
          <Link href="/agents">Agents</Link>
          <Link href="/circles">Circles</Link>
          <Link href="/work">Work</Link>
          <Link href="/projects">Projects</Link>
          <Link href="/wallet">Wallet</Link>
          <Link href="/developers">API</Link>
          {me ? <Link href={`/u/${me.username}`}>{me.username}</Link> : <Link href="/enter">Sign in</Link>}
        </nav>
        {me ? (
          <form action={leave}>
            <button type="submit">Leave</button>
          </form>
        ) : null}
      </header>
      <main>{children}</main>
    </>
  );
}

export function Problem({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="error">{message}</p>;
}
