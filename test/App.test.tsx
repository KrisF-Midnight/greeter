import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { App } from "../src/App";

// `bun test` runs every file in one process, so a mock installed on globalThis
// outlives the file that set it — stubbing fetch here silently broke the HTTP
// tests in server.test.ts until this restore was added.
const realFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

function mockFetch(impl: () => Promise<Response>) {
  globalThis.fetch = mock(impl) as unknown as typeof fetch;
}

describe("App", () => {
  test("renders the greeting the API returns", async () => {
    mockFetch(async () => Response.json({ greeting: "Hello from the API" }));

    render(<App />);

    // Asserts the value came from the API rather than from a hardcoded string,
    // which is the only reason this component exists.
    expect(await screen.findByText("Hello from the API")).toBeDefined();
  });

  test("shows a failure state rather than a blank page when the API is down", async () => {
    mockFetch(async () => new Response("nope", { status: 503 }));

    render(<App />);

    expect(await screen.findByText(/could not reach the greeting service/i)).toBeDefined();
    expect(await screen.findByText(/503/)).toBeDefined();
  });
});
