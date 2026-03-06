/**
 * Auto-start the background sync loop when the server boots.
 * This module is imported by the Next.js instrumentation hook.
 */
import { startSyncLoop } from "./sync";

let booted = false;

export function bootSync() {
  if (booted) return;
  booted = true;
  console.log("[boot] Starting election data sync...");
  startSyncLoop();
}
