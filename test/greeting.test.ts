import { describe, expect, test } from "bun:test";
import {
  DEFAULT_GREETING,
  EnvGreetingSource,
  endpointFrom,
  GREETING_KEY,
  greetingSourceFrom,
  S3GreetingSource,
  type ObjectStore,
} from "../src/greeting";

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

describe("S3GreetingSource", () => {
  // The store is injected, so none of this touches a network. What is being
  // tested is the behaviour around the fetch, not S3 itself — there is a
  // separate check that the real client can reach the real bucket.
  const storeReturning = (value: string): ObjectStore => ({
    text: async () => value,
  });

  test("returns what the object contains", async () => {
    const source = new S3GreetingSource(storeReturning("Good evening"));
    expect(await source.get()).toBe("Good evening");
  });

  test("reads the key the platform's terraform writes", async () => {
    let requested: string | undefined;
    const source = new S3GreetingSource({
      text: async (key) => {
        requested = key;
        return "hello";
      },
    });

    await source.get();
    expect(requested).toBe(GREETING_KEY);
  });

  // An empty object is a missing object that happens to exist: the greeting the
  // Terraform should have written is not there, so defaulting would report a
  // broken deployment as ready.
  test.each([["", "empty"], ["  \n ", "whitespace"]])(
    "rejects when the object is %p (%s)",
    async (value) => {
      const source = new S3GreetingSource(storeReturning(value));
      await expect(source.get()).rejects.toThrow(/is empty/);
    },
  );

  // The important one. A missing bucket means the infrastructure this service
  // depends on was never provisioned; answering with a default would make a
  // broken deployment look healthy and readiness would never catch it.
  test("propagates the failure rather than defaulting", async () => {
    const source = new S3GreetingSource({
      text: async () => {
        throw new Error("NoSuchBucket");
      },
    });

    await expect(source.get()).rejects.toThrow("NoSuchBucket");
  });
});

describe("greetingSourceFrom", () => {
  test("uses S3 when the deployment supplies a bucket", () => {
    expect(greetingSourceFrom({ CONFIG_BUCKET: "greeter-local-config" }))
      .toBeInstanceOf(S3GreetingSource);
  });

  test("falls back to the environment when it does not", () => {
    expect(greetingSourceFrom({})).toBeInstanceOf(EnvGreetingSource);
  });

  // An empty variable is what a Kubernetes manifest produces when the value it
  // interpolates is missing. Treating it as "use S3" would send the service
  // looking for a bucket called "".
  test("treats a blank bucket name as absent", () => {
    expect(greetingSourceFrom({ CONFIG_BUCKET: "   " })).toBeInstanceOf(EnvGreetingSource);
  });
});

// Guarding a failure mode with no error message: an unresolved endpoint is not
// a crash, it is a client that quietly reaches real AWS.
describe("endpointFrom", () => {
  test("prefers the S3-specific variable over the general one", () => {
    expect(endpointFrom({
      AWS_ENDPOINT_URL: "http://general:4566",
      AWS_ENDPOINT_URL_S3: "http://specific:4566",
    })).toBe("http://specific:4566");
  });

  test("falls back to the general one", () => {
    expect(endpointFrom({ AWS_ENDPOINT_URL: "http://general:4566" }))
      .toBe("http://general:4566");
  });

  // Undefined means "real AWS", which is correct in production and is exactly
  // why a blank value must not be mistaken for a configured one.
  test.each([[{}, "unset"], [{ AWS_ENDPOINT_URL: "  " }, "blank"]])(
    "is undefined when %p (%s)",
    (env) => {
      expect(endpointFrom(env)).toBeUndefined();
    },
  );
});
