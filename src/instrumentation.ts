export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertProductReady } = await import("@/lib/product");
  assertProductReady();
  const { startChainWatcher } = await import("@/lib/chain");
  const { startSitWindowWatcher } = await import("@/lib/sit-windows");
  startChainWatcher();
  startSitWindowWatcher();
}
