/**
 * Production start — runs Next.js and seminar-style Render keep-alive in one process tree.
 * Render Dashboard often uses `npm start`; keep-alive must not depend on start:render.
 */
import { spawn } from "node:child_process";
import { startRenderKeepalive } from "../lib/render-keepalive.mjs";

startRenderKeepalive();

const child = spawn("npx", ["next", "start", "-H", "0.0.0.0"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

const shutdown = (signal) => {
  child.kill(signal);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
