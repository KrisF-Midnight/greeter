import index from "./index.html";
import { greetingSourceFrom, type GreetingSource } from "./greeting";

export type ServerOptions = {
  port?: number;
  source?: GreetingSource;
};

/**
 * Liveness and readiness are deliberately different checks.
 *
 * Liveness answers "is this process wedged" — if it fails, killing the pod is
 * the right response. It must not depend on anything external, or a blip in a
 * dependency turns into a restart loop that makes the outage worse.
 *
 * Readiness answers "can this instance serve traffic right now" — if it fails,
 * the pod is pulled from the load balancer but left running to recover.
 * Probing the greeting source is exactly what belongs here.
 */
export function createServer(opts: ServerOptions = {}) {
  const source = opts.source ?? greetingSourceFrom();

  return Bun.serve({
    port: opts.port ?? Number(Bun.env.PORT ?? 3000),

    routes: {
      "/api/greeting": async () => {
        try {
          return Response.json({ greeting: await source.get() });
        } catch (err) {
          console.error("greeting source unavailable:", err);
          return Response.json({ error: "greeting source unavailable" }, { status: 503 });
        }
      },

      "/healthz": () => new Response("ok"),

      "/readyz": async () => {
        try {
          await source.get();
          return new Response("ready");
        } catch (err) {
          console.error("not ready:", err);
          return new Response("not ready", { status: 503 });
        }
      },

      // Everything else is the SPA. Bun bundles the HTML entrypoint and its
      // imports, with hot reload in development and a static build otherwise.
      "/*": index,
    },

    development: Bun.env.NODE_ENV !== "production",
  });
}

// Only listen when run directly, so the tests can start their own instance on
// an ephemeral port without this one racing them for 3000.
if (import.meta.main) {
  const server = createServer();
  console.log(`greeter listening on ${server.url}`);
}
