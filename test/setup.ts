// Registers a DOM implementation globally so component tests can render.
// Wired in via bunfig.toml `preload` rather than imported per-file, so a new
// test file gets a DOM without anyone having to remember this exists.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// happy-dom also installs its own fetch/Response/Request/Headers over Bun's.
// Bun.serve rejects a Response it did not construct, so registering the DOM
// turned every server test red the moment the first component test appeared —
// and `bun test` runs all files in one process, so there is no file boundary
// to hide behind. Component tests need a DOM, not a second HTTP stack: keep
// happy-dom's document and hand the native HTTP primitives back.
const nativeHttp = {
  fetch: globalThis.fetch,
  Response: globalThis.Response,
  Request: globalThis.Request,
  Headers: globalThis.Headers,
  FormData: globalThis.FormData,
};

GlobalRegistrator.register();

Object.assign(globalThis, nativeHttp);
