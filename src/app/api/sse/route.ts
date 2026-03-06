import { getSubscriber, CHANNEL_ELECTION_UPDATE } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint — streams real-time election updates to the browser.
 * Subscribes to Redis pub/sub channel and forwards events.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let cleanupFn: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(": heartbeat\n\n"));

      let closed = false;
      let sub: ReturnType<typeof getSubscriber> | null = null;

      try {
        sub = getSubscriber();
        sub.subscribe(CHANNEL_ELECTION_UPDATE).catch(() => {});

        sub.on("message", (_channel: string, message: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          } catch {
            closed = true;
          }
        });
      } catch {
        // Redis unavailable — SSE still works for heartbeats
      }

      // Send periodic heartbeats to keep the connection alive
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Send connected event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`)
      );

      // Store cleanup in the outer variable (avoid TDZ on `stream`)
      cleanupFn = () => {
        closed = true;
        clearInterval(heartbeat);
        sub?.unsubscribe(CHANNEL_ELECTION_UPDATE).catch(() => {});
      };
    },
    cancel() {
      cleanupFn?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
