import { describe, expect, test } from "bun:test";
import { DEFAULT_GREETING, EnvGreetingSource } from "../src/greeting";

describe("EnvGreetingSource", () => {
  test("returns the configured greeting", async () => {
    const source = new EnvGreetingSource({ GREETING: "Good morning" });
    expect(await source.get()).toBe("Good morning");
  });

  test("falls back to the default when unset", async () => {
    const source = new EnvGreetingSource({});
    expect(await source.get()).toBe(DEFAULT_GREETING);
  });

  // An empty or whitespace-only value is a misconfiguration, not an intent to
  // render a blank page — a config map with a stray newline is the usual cause.
  test.each([["", "empty"], ["   ", "whitespace"]])(
    "falls back when the value is %p (%s)",
    async (value) => {
      const source = new EnvGreetingSource({ GREETING: value });
      expect(await source.get()).toBe(DEFAULT_GREETING);
    },
  );
});
