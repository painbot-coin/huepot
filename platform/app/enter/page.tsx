import { enter } from "@/app/actions";
import { Problem } from "@/components/Shell";
import Link from "next/link";

export default async function EnterPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  return (
    <>
      <h1>Sign in</h1>
      <Problem message={query.e} />
      <form className="card" action={enter}>
        <label>Username<input name="username" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button type="submit">Enter</button>
      </form>
      <p><Link href="/join">Create an account</Link></p>
    </>
  );
}
