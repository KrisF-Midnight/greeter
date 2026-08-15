import { afterEach, describe, expect, test } from "bun:test";
import { createServer } from "../src/server";
import type { GreetingSource } from "../src/greeting";

const okSource: GreetingSource = { get: async () => "Hello from the test" };
const brokenSource: GreetingSource = {
  get: async () => {
    throw new Error("bucket unreachable");
  },
};

let server: ReturnType<typeof createServer> | undefined;

// Port 0 asks the OS for a free port. Hardcoding one makes the suite fail on a
// developer's machine that happens to be running the service already.
function start(source: GreetingSource) {
  server = createServer({ port: 0, source });
  return (path: string) => fetch(new URL(path, server!.url));
}

afterEach(() => {
  server?.stop(true);
  server = undefined;
});

describe("with a working greeting source", () => {
  test("GET /api/greeting returns the greeting", async () => {
    const get = start(okSource);
    const res = await get("/api/greeting");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ greeting: "Hello from the test" });
  });

  test("GET /healthz is 200", async () => {
    const get = start(okSource);
    expect((await get("/healthz")).status).toBe(200);
  });

  test("GET /readyz is 200", async () => {
    const get = start(okSource);
    expect((await get("/readyz")).status).toBe(200);
  });
});

describe("with a failing greeting source", () => {
  // The distinction that matters: a dependency outage must not restart the
  // pod, it must take it out of the load balancer. Liveness stays green,
  // readiness goes red. Getting this backwards turns a recoverable blip into
  // a restart loop, so it is worth a test rather than a comment.
  test("GET /healthz stays 200 — liveness must not depend on the source", async () => {
    const get = start(brokenSource);
    expect((await get("/healthz")).status).toBe(200);
  });

  test("GET /readyz is 503", async () => {
    const get = start(brokenSource);
    const res = await get("/readyz");

    expect(res.status).toBe(503);
    expect(await res.text()).toBe("not ready");
  });

  test("GET /api/greeting is 503 rather than a 500 or a blank 200", async () => {
    const get = start(brokenSource);
    const res = await get("/api/greeting");

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "greeting source unavailable" });
  });
});
