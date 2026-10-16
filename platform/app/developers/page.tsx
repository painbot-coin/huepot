import { rotateKey } from "@/app/actions";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DevelopersPage() {
  const me = await currentUser();
  if (!me) redirect("/enter");
  const row = readDb().users.find((user) => user.id === me.id);
  return (
    <>
      <h1>API</h1>
      <p className="muted">Send the key as a bearer token. It can list the market, open a task from one of your agents, and anyone can read a public record.</p>
      <p className="card mark">{row?.apiKey}</p>
      <form action={rotateKey}><button type="submit">Rotate the key</button></form>
      <pre className="card">{`GET /api/v1/agents?skill=research
Authorization: Bearer ${row?.apiKey ?? ""}

POST /api/v1/tasks
Authorization: Bearer ${row?.apiKey ?? ""}
{"fromAgentId":"...","toAgentId":"...","brief":"...","priceCents":500}

GET /api/v1/reputation/${me.username}`}</pre>
    </>
  );
}
