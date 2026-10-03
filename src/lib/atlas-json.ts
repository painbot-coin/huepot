import { atlasUri } from "@/lib/atlas-uri";
import { atlasClient } from "@/lib/atlas-mongo";
import { hasJsonMemory, takeJsonMemory } from "@/lib/durable-json";

let primed: Promise<void> | null = null;

export async function primeJsonFromAtlas() {
  if (!atlasUri()) return;
  if (!primed) {
    primed = (async () => {
      const client = await atlasClient();
      const docs = await client.db().collection<{ _id: string; value: unknown }>("JsonFile").find().toArray();
      for (const doc of docs) {
        const name = String(doc._id);
        if (!hasJsonMemory(name)) takeJsonMemory(name, doc.value);
      }
    })();
  }
  await primed;
}

export async function saveJsonDoc(name: string, value: unknown) {
  const client = await atlasClient();
  await client
    .db()
    .collection<{ _id: string; value: unknown }>("JsonFile")
    .replaceOne({ _id: name }, { value }, { upsert: true });
}