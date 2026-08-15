import { useEffect, useState } from "react";

type State =
  | { status: "loading" }
  | { status: "ok"; greeting: string }
  | { status: "error"; message: string };

/**
 * Fetches the greeting from the API rather than hardcoding it, so that a
 * failure anywhere behind the endpoint — the service, its config, the bucket
 * its Terraform provisions — is visible in the browser instead of hidden
 * behind a page that always renders the same string.
 */
export function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/greeting")
      .then(async (res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return (await res.json()) as { greeting: string };
      })
      .then((body) => {
        if (!cancelled) setState({ status: "ok", greeting: body.greeting });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1 data-testid="greeting">
        {state.status === "loading" && "…"}
        {state.status === "ok" && state.greeting}
        {state.status === "error" && "Could not reach the greeting service"}
      </h1>
      {state.status === "error" && <p className="detail">{state.message}</p>}
    </main>
  );
}
