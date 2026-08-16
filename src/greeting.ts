/**
 * Where the greeting comes from.
 *
 * There are two sources and the difference between them matters. The
 * environment one exists so the service can be run and tested with nothing
 * else present. The S3 one is what runs for real, and it reads an object that
 * this service's Terraform creates — so if the infrastructure stage did not
 * run, the service does not answer. The IaC is load-bearing rather than
 * decorative, which is the only way to know it works.
 *
 * The seam is here so that swapping the source changes one file, and so that
 * readiness has something real to probe.
 */

export const DEFAULT_GREETING = "Hello from the paved road";

/** The object key the platform's Terraform writes the greeting to. */
export const GREETING_KEY = "greeting";

export type GreetingSource = {
  /** Resolve the greeting, or throw if the source is unavailable. */
  get(): Promise<string>;
};

/**
 * Normalise what a source returned. An empty or whitespace-only value is a
 * misconfiguration, not an intent to render a blank page — a config map with a
 * stray newline is the usual cause.
 */
function orDefault(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_GREETING;
}

export class EnvGreetingSource implements GreetingSource {
  constructor(private readonly env: Record<string, string | undefined> = Bun.env) {}

  async get(): Promise<string> {
    return orDefault(this.env.GREETING);
  }
}

/**
 * The minimum of an S3 client this needs. Narrow on purpose: it is the whole
 * surface a test has to stand in for, and it keeps the unit tests off the
 * network without pretending the network isn't there.
 */
export type ObjectStore = {
  /** Fetch an object's contents, or throw if it is not there. */
  text(key: string): Promise<string>;
};

/**
 * Which endpoint the object store lives behind, or undefined for real AWS.
 *
 * Bun's S3 client reads credentials and region from the standard AWS variables
 * but looks for the endpoint under `S3_ENDPOINT`/`AWS_ENDPOINT` rather than the
 * SDK's `AWS_ENDPOINT_URL_S3`. Resolving it here keeps the deployment contract
 * on the variable the AWS SDKs and Terraform already agree on, and confines
 * the difference to one function.
 *
 * Worth the trouble because of how it fails otherwise: an unset endpoint is not
 * an error, it is a client that quietly talks to real AWS. That was the actual
 * behaviour before this function existed.
 */
export function endpointFrom(
  env: Record<string, string | undefined> = Bun.env,
): string | undefined {
  const endpoint = env.AWS_ENDPOINT_URL_S3?.trim() || env.AWS_ENDPOINT_URL?.trim();
  return endpoint && endpoint.length > 0 ? endpoint : undefined;
}

/** Adapts Bun's built-in S3 client, which needs no dependency, to the above. */
export function s3Store(
  bucket: string,
  env: Record<string, string | undefined> = Bun.env,
): ObjectStore {
  // Region and credentials come from the environment, exactly as the Terraform
  // takes them, so the same image runs against the local stand-in and against
  // a real account with no code path between them. In a cluster the
  // credentials arrive from the workload's identity rather than from here.
  const endpoint = endpointFrom(env);
  const client = new Bun.S3Client({ bucket, ...(endpoint ? { endpoint } : {}) });
  return { text: (key) => client.file(key).text() };
}

export class S3GreetingSource implements GreetingSource {
  constructor(
    private readonly store: ObjectStore,
    private readonly key: string = GREETING_KEY,
  ) {}

  async get(): Promise<string> {
    // Deliberately not caught. A missing bucket or object means the
    // infrastructure this service depends on is not there, and the honest
    // answer to that is a failed readiness probe — not a default greeting that
    // makes a broken deployment look healthy.
    return orDefault(await this.store.text(this.key));
  }
}

/**
 * Pick a source from the environment. Presence of a bucket name is the switch:
 * the deployment supplies one, a laptop running `bun dev` does not, and
 * neither has to know the other exists.
 */
export function greetingSourceFrom(
  env: Record<string, string | undefined> = Bun.env,
): GreetingSource {
  const bucket = env.CONFIG_BUCKET?.trim();
  return bucket ? new S3GreetingSource(s3Store(bucket, env)) : new EnvGreetingSource(env);
}
