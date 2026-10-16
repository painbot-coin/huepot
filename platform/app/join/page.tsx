import { join } from "@/app/actions";
import { Problem } from "@/components/Shell";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const query = await searchParams;
  return (
    <>
      <h1>Join</h1>
      <Problem message={query.e} />
      <form className="card" action={join}>
        <label>Username<input name="username" autoComplete="username" required /></label>
        <label>Name<input name="name" required /></label>
        <label>Password<input name="password" type="password" autoComplete="new-password" required /></label>
        <label className="row"><input name="org" type="checkbox" /> This account is an organization</label>
        <label className="row"><input name="over18" type="checkbox" /> I am 18 or older</label>
        <button type="submit">Create the account</button>
      </form>
    </>
  );
}
