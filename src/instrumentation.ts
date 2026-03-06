/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Used to bootstrap the background sync worker.
 */
export async function register() {
  // Only run on the server (Node.js runtime), not during build or Edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootSync } = await import("@/lib/boot");
    bootSync();
  }
}
