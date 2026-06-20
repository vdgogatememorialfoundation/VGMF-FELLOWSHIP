export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startServerKeepAlive } = await import("./lib/server-keepalive");
  startServerKeepAlive();
}
