export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startServerKeepAlive } = await import("./lib/server-keepalive");
  startServerKeepAlive();

  const { deactivateDeprecatedFormFields } = await import("./lib/form-template-maintenance");
  deactivateDeprecatedFormFields().catch((error) => {
    console.error("[form-template] deprecated field cleanup failed:", error);
  });

  const { ensureProductionSeoIndexing } = await import("./lib/seo-maintenance");
  ensureProductionSeoIndexing().catch((error) => {
    console.error("[seo] production indexing sync failed:", error);
  });
}
