/**
 * Where the greeting comes from.
 *
 * Today it is an environment variable. Shortly it will be an object read from
 * the bucket that this service's Terraform provisions, which is the point:
 * the infrastructure stage has to have run for the service to work, so the
 * IaC in the pipeline is load-bearing rather than decorative.
 *
 * The seam is here so that swapping the source changes one file, and so that
 * readiness has something real to probe.
 */

export const DEFAULT_GREETING = "Hello from the paved road";

export type GreetingSource = {
  /** Resolve the greeting, or throw if the source is unavailable. */
  get(): Promise<string>;
};

export class EnvGreetingSource implements GreetingSource {
  constructor(private readonly env: Record<string, string | undefined> = Bun.env) {}

  async get(): Promise<string> {
    const value = this.env.GREETING?.trim();
    return value && value.length > 0 ? value : DEFAULT_GREETING;
  }
}
