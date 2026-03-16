/**
 * Auto-start the background sync loop when the server boots.
 * This module is imported by the Next.js instrumentation hook.
 */
import { startSyncLoop } from "./sync";
import { ENABLE_BACKGROUND_SYNC } from "./results-mode";

let booted = false;

export function bootSync() {
  if (booted) return;
  booted = true;
  if (!ENABLE_BACKGROUND_SYNC) {
    console.log("[boot] Background sync disabled in final-results mode");
    return;
  }
  console.log("[boot] Starting election data sync...");
  startSyncLoop();
}
