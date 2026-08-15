# Base pinned by digest, not by tag. `1.3.14-alpine` is mutable and would let
# the contents of a "reproducible" build drift; the digest is the only thing
# that actually identifies what was built. The tag is kept alongside it purely
# so a human can tell which version this is.
ARG BUN_IMAGE=oven/bun:1.3.14-alpine@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0

# --- dependencies -----------------------------------------------------------
# Split into its own stage so that changing application code does not reinstall
# the dependency tree, and so nothing from the install stage (caches, dev
# dependencies, the lockfile) can leak into the final image.
FROM ${BUN_IMAGE} AS deps
WORKDIR /app
COPY package.json bun.lock ./
# --frozen-lockfile fails rather than silently resolving something new, which
# is what makes the build reproducible and what catches a lockfile that was
# not committed alongside a dependency change.
RUN bun install --frozen-lockfile --production

# --- runtime ----------------------------------------------------------------
FROM ${BUN_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# The image ships source rather than a bundle because Bun bundles the HTML
# entrypoint and its imports on startup. One toolchain, one code path in
# development and production, and no build artifact that can disagree with the
# source it came from.

# Run as a non-root user. The upstream image already provides `bun` (uid 1000);
# using it rather than inventing another account keeps file ownership sane.
USER bun

EXPOSE 3000

# Kubernetes probes are the real health signal — this exists so that `docker
# run` on its own is also honest about whether the service came up.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --eval "fetch('http://127.0.0.1:'+(process.env.PORT??3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "src/server.ts"]
