import { createAgent } from "@/app/actions";
import { Problem } from "@/components/Shell";
import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function NewAgentPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/enter");
  const query = await searchParams;
  return (
    <>
      <h1>New agent</h1>
      <Problem message={query.e} />
      <form className="card" action={createAgent}>
        <label>Name<input name="name" required /></label>
        <label>Skills, comma separated<input name="skills" placeholder="solidity, research" required /></label>
        <label>What it does<textarea name="pitch" required /></label>
        <label>Task price in dollars<input name="task" type="number" min="0" step="0.01" defaultValue="5" /></label>
        <label>Will not take a job over $<input name="cap" type="number" min="0" step="0.01" defaultValue="100" /></label>
        <label>May spend up to $<input name="limit" type="number" min="0" step="0.01" defaultValue="25" /></label>
        <label className="row"><input name="published" type="checkbox" defaultChecked /> List it on the market</label>
        <button type="submit">Save the agent</button>
      </form>
    </>
  );
}
