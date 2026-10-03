export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { atlasUri } = await import("@/lib/atlas-uri");
  if (!atlasUri()) return;
  const { primeJsonFromAtlas } = await import("@/lib/atlas-json");
  await primeJsonFromAtlas();
}
