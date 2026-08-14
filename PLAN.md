# Plan: Next.js 15 → 16 Migration (fitness-tracker)

> Written by Coder Agents on 2026-08-14 after a CI failure investigation.
> Intended to be picked up in a **fresh Coder Agents session** with none of
> that conversation's context. Read this whole file before touching code.

## Why this exists

The `ci` workflow's `npm audit (production deps)` job started failing on
`main` (first observed 2026-08-05, still failing as of 2026-08-14). Root
cause: 4 high-severity advisories, one fixable non-breaking (`nanoid`,
already handled, see "Already done" below), three only fixable by bumping
`next` from `15.5.x` to `16.3.1` (`postcss` XSS/path-traversal chain and
`sharp`/libvips CVEs bundled inside Next's own dependency tree). npm flags
that bump as a breaking change. We deliberately chose **not** to run
`npm audit fix --force` blind — see the "Do not YOLO this" note the user
gave — and instead scoped this as its own migration project.

## Precedent in the vibes-coder repos (read these first)

- **`carryologist/the-vibe-coder`** is already built on `next@^16.2.6` +
  `react@19.2.4` / `react-dom@19.2.4` (has been since its first commit —
  it was never migrated from 15, so there's no direct "before/after" diff
  to copy, but it's a working reference for what a Next 16 + React 19 app
  in this same account looks like). Notably: it still names its auth file
  `src/middleware.ts` (not `proxy.ts`), and that works fine on `16.2.6` —
  useful data point that the rename is not yet a hard requirement at that
  minor version. Confirm this is still true at whatever 16.x we land on.
- **`carryologist/the-vibe-coder` commit `05830ac`** (`deps: bump next to
  16.2.6 and @anthropic-ai/sdk to 0.95.2`) is the house style for a
  dependency-bump commit message: it lists each GHSA advisory closed, its
  severity, and explicitly calls out ones that don't apply to this app's
  usage (e.g. "n/a, we do not use i18n"). Match that style for the commit
  that lands this migration. That commit also flagged that some of the
  Next 16.x point releases fixed **middleware-bypass** CVEs
  (`GHSA-492v-c6pp-mqqv`, `GHSA-267c-6grr-h53f`) — directly relevant here
  since `fitness-tracker`'s entire auth model lives in middleware. Re-check
  the advisory database for the specific `16.3.1` (or later patch) we land
  on before/after upgrading, since fitness-tracker's `middleware.ts` is the
  single most security-sensitive file in the app (session check + bearer
  token check gating every route).
- **`carryologist/the-vibe-coder-content/docs/audits/2026-05-11-qwen-3-5/`**
  documents the house pattern for security-audit-driven work: multiple
  audit sources get synthesized into one remediation plan, phased, and
  landed as a series of small verifiable commits rather than one big
  rewrite. Follow that shape below.

## Current state (as of 2026-08-14, verified in this session)

- `package.json`: `"next": "^15.5.18"`, `"react": "^18.2.0"`,
  `"react-dom": "^18.2.0"`, `"eslint": "^8.56.0"`.
- Installed (lockfile): `next@15.5.23` after the already-applied
  `npm audit fix` (see "Already done").
- Node in CI: `actions/setup-node@v4` with `node-version: '20'` (resolves
  to latest 20.x at build time). Node in this dev workspace: `v22.19.0`.
- `next lint` is **already broken today**, independent of the Next 16
  question: running it throws `Invalid Options: Unknown options:
  useEslintrc, extensions, resolvePluginsRelativeTo, rulePaths,
  ignorePath, reportUnusedDisableDirectives` — a pre-existing ESLint
  version mismatch with the flat config in `eslint.config.mjs`. This is
  unrelated to the Next version but must be fixed as part of this work
  either way, since Next 16 removes the `next lint` command entirely.
- No usage found anywhere in `src/` of synchronous `cookies()`,
  `headers()`, page-level `params`, or page-level `searchParams` props
  (the only `searchParams` usages are `new URL(...).searchParams` and the
  client-side `useSearchParams()` hook, both unaffected by Next 16's
  "async request APIs" enforcement). Low risk on that specific item, but
  still worth running the codemod as a safety net (see Phase 2).
- No dynamic page routes (`app/**/[slug]/page.tsx` etc.) exist. Only two
  dynamic **route handlers**: `src/app/api/auth/[...nextauth]/route.ts`
  (just re-exports `handlers` from `next-auth`, doesn't touch `params`
  itself) and `src/app/api/mcp/[transport]/route.ts` (delegates to
  `mcp-handler`'s `createMcpHandler`, doesn't destructure `params` either).
  Low risk.
- No `next/image` usage anywhere in the app, and no `images:` block in
  `next.config.ts` — so Next 16's changed `next/image` defaults
  (`minimumCacheTTL` 60s → 4h, `qualities`, `imageSizes`) don't apply here.
- No AMP, no `publicRuntimeConfig`/`serverRuntimeConfig`, no
  `experimental.ppr`/`dynamicIO`/`useCache`. None of those Next 16
  removals apply to this codebase.
- `next.config.ts` has no `experimental` or `turbopack` block today —
  worth checking whether Next 16's default-Turbopack production build
  changes anything, given `build` is `prisma db push && next build`.
- Auth model recap (why `src/middleware.ts` is the highest-risk file):
  it gates every route except `/api/auth/*`, `/api/mcp/*`, and `/login`,
  accepting either a NextAuth session cookie or
  `Authorization: Bearer $MCP_API_TOKEN`. See `README.md`'s "Security"
  section and `AGENTS.md`'s "MCP Server" section for the full contract
  this file must keep intact.

## Already done (this session, safe/non-breaking — land these regardless of the Next 16 decision)

These two fixes are already applied in the working tree but **not yet
committed**. Land them first, independent of the Next 16 question:

1. `package-lock.json` — ran `npm audit fix` (no `--force`). Bumped
   `next` `15.5.22` → `15.5.23` inside the lockfile only (still satisfies
   `package.json`'s `^15.5.18` range; no `package.json` diff). This
   resolved the `nanoid <3.3.18` high-severity finding
   (`GHSA-2v37-7h3g-55p8`). Verified `npx tsc --noEmit` still passes.
2. `.github/workflows/ci.yml` — added `permissions: {}` at the workflow
   top level and `permissions: { contents: read, issues: write }` to the
   `audit` job (`typecheck` job gets `contents: read` only). This fixes an
   unrelated bug where the "Open tracking issue on failure" step 403'd
   with `Resource not accessible by integration` because the job had no
   `issues: write` grant — so every failing `main` push since 2026-08-05
   has been silently failing to open its own tracking issue on top of the
   real audit failure.

**First action in a fresh session:** run `git status`/`git diff` in
`fitness-tracker` to confirm these two changes are still present (or
already committed if this plan is being resumed after that step). If
present and untouched, commit them as their own commit (suggested message
below) and push straight to `main` (repo owner has been treating `main`
as the working branch for this app in recent sessions and giving explicit
per-push confirmation each time — **ask for that confirmation again**,
don't assume it carries over from a prior session).

```
fix(ci): grant issues:write to the audit job's failure-tracking step

The audit job's "Open tracking issue on failure" step was 403ing
(Resource not accessible by integration) because the workflow had no
explicit permissions block. Every failing main push since 2026-08-05
was hitting this on top of the actual audit finding. Add
`permissions: {}` at the workflow level and grant contents:read +
issues:write only to the audit job, contents:read to typecheck.

chore(deps): npm audit fix for nanoid (non-breaking)

Bumps next 15.5.22 -> 15.5.23 in the lockfile only (package.json range
unchanged), which pulls in a patched nanoid and resolves
GHSA-2v37-7h3g-55p8. The remaining 3 high-severity findings (postcss,
sharp, both bundled inside next's own dependency tree) require the
next 15->16 major upgrade tracked separately in PLAN.md.
```

(Split into two commits or one — either is fine; keep the message content.)

## Goal

Upgrade `fitness-tracker` from Next.js 15.5.x / React 18.2 to Next.js 16.x
/ React 19.x, closing the remaining 3 `npm audit` high-severity findings,
without breaking auth, the MCP server, or the Peloton/Tonal sync jobs.

## Non-goals

- Do not adopt Next 16's new Cache Components / `use cache` model as part
  of this migration. Land the version bump first; consider caching-model
  adoption as a separate follow-up if it turns out to matter for this app
  (it's a small single-user app with no heavy caching requirements today).
- Do not enable the React Compiler (`reactCompiler` config) in this pass.
  It's optional/stable-but-off-by-default in Next 16; evaluate separately.
- Do not switch dev/build scripts to explicit `--turbopack` flags beyond
  whatever the upgrade codemod sets by default; just verify it works.

## Phased plan

### Phase 0 — Land the safe fixes (see "Already done" above)
Commit + push (with explicit confirmation) the `ci.yml` permissions fix
and the `npm audit fix` lockfile change. This is independent of
everything below and de-risks the rest of the work by giving you a clean
CI baseline to upgrade from.

### Phase 1 — Pre-flight
1. Confirm Node version available in the dev workspace and in CI is
   >= 20.9.0 (Next 16's floor). Bump `actions/setup-node`'s
   `node-version` in `ci.yml` from `'20'` to an explicit `'20.9'` or
   higher if there's any doubt about what "20" resolves to by the time
   this lands, or just confirm `node --version` in the runner image is
   already safely above the floor.
2. Confirm `typescript` is >= 5.1.0 (Next 16 floor). Currently `^5` in
   `devDependencies` — almost certainly fine, just confirm the resolved
   version in the lockfile.
3. Create a branch: `deps/nextjs-16` (or similar). Do not do this work
   directly on `main` — this is exactly the kind of change that warrants
   a PR, unlike the routine fixes in Phase 0.
4. Read the live Next.js 16 upgrade guide
   (`https://nextjs.org/docs/app/guides/upgrading/version-16`) again at
   migration time — it may have been updated since this plan was written
   (last checked 2026-08-14).

### Phase 2 — Run the official codemods
1. `npx @next/codemod@canary upgrade latest` (or whatever the current
   canonical invocation is per the live guide) to bump `next`, `react`,
   `react-dom`, `@types/react`, `@types/react-dom` together and apply the
   mechanical codemods.
2. Even though the scan in this session found no synchronous
   `cookies()`/`headers()`/`params`/`searchParams` usage, run the async
   Request APIs codemod anyway as a safety net (cheap, idempotent):
   `npx @next/codemod@canary next-async-request-api .`
3. Inspect the full diff before running anything else. Expect changes in
   `package.json`, `package-lock.json`, possibly `next.config.ts`, and
   possibly `tsconfig.json` (Next 16 wants `npx next typegen` for the
   `PageProps`/`LayoutProps`/`RouteContext` helpers — not critical here
   since there are no dynamic pages, but run it once and check for diff).

### Phase 3 — The middleware question (highest-risk step)
1. Check whether `src/middleware.ts` still works as-is on the Next 16.x
   version actually landed (recall: `the-vibe-coder` on `16.2.6` still
   uses `middleware.ts`, unrenamed — but confirm this for the specific
   version you land on, since the upgrade guide describes it as
   deprecated-and-renamed, and deprecation timelines vary by point
   release).
2. If a rename to `proxy.ts` (or equivalent) is required or recommended:
   read the specific migration doc for it before touching anything, then
   rename and re-verify **every** branch through the file by hand:
   - Public paths pass through untouched: `/api/auth/*`, `/api/mcp/*`,
     `/login`.
   - A request to any other `/api/*` path with a valid
     `Authorization: Bearer $MCP_API_TOKEN` succeeds without a session
     cookie.
   - A request to any other `/api/*` path with no valid token and no
     session gets a `401` JSON response (not a redirect).
   - A request to any non-API page with no session gets redirected to
     `/login?callbackUrl=<original path>`.
   - A request to any non-API page with a valid session passes through.
   - The Edge-runtime constraint documented in the file's own comments
     (don't import `../auth` directly, don't lose the inlined
     `timingSafeEqual` duplicate) still holds after any rename/rewrite.
     If the runtime this file executes under changes at all in Next 16,
     re-verify the Edge-runtime env-var-timing bug described in the
     `hasValidSession` comment doesn't resurface.
3. Do **not** consider this phase done from a green `next build` alone.
   This file is the entire auth boundary for a single-user app whose MCP
   token is described in this repo's own `README.md` as "a global admin
   credential" — manually exercise all five cases above against a running
   `next dev` (or `next start`) instance before moving on.

### Phase 4 — React 19 fallout
1. `next-auth` is on `5.0.0-beta.31` (a beta release). Check its release
   notes / issue tracker for React 19 compatibility before assuming it
   works. If there's a newer beta or a stable v5 release with confirmed
   React 19 support by the time this is picked up, prefer that.
2. Grep for any legacy React patterns that changed in 19: class component
   `propTypes`/`defaultProps` (unlikely in this codebase — it's function
   components throughout, but confirm), `useFormState` (Next 15 already
   flagged this as deprecated in favor of `useActionState` — check
   `react-hook-form` usages aren't relying on the old hook name), and any
   legacy Context API usage.
3. `recharts` (`^3.1.2`) and `lucide-react` — check these support React
   19 at whatever versions are currently pinned; bump if needed.

### Phase 5 — Tooling cleanup (required regardless, since `next lint` is removed in 16)
1. Run `npx @next/codemod@canary next-lint-to-eslint-cli .` (mentioned in
   this repo's own `next lint` deprecation warning today) to replace the
   `"lint": "next lint"` script with a direct ESLint CLI invocation.
2. This is also the opportunity to fix the **pre-existing** `next lint`
   breakage found in this session (ESLint 8 + flat config option
   mismatch) — confirm the new script actually runs clean, not just that
   it exists.

### Phase 6 — Turbopack build verification
1. `next build` now defaults to Turbopack. Run a full production build
   locally (`prisma db push && next build`, same as the real `build`
   script) against a real or throwaway Postgres instance and confirm:
   - The build succeeds.
   - The generated Prisma client is picked up correctly (no stale-client
     or module-resolution surprises from the bundler switch).
   - `next start` serves the app and the MCP endpoint
     (`/api/mcp/mcp`) responds to a basic tool call.

### Phase 7 — Verification checklist before opening the PR
- [ ] `npx tsc --noEmit` clean
- [ ] New lint script clean
- [ ] `next build` (Turbopack) succeeds locally
- [ ] All 5 middleware auth cases from Phase 3 manually verified
- [ ] `npm audit --omit=dev --audit-level=high` reports 0 findings (this
      was the whole point — confirm the postcss/sharp findings are gone)
- [ ] MCP server smoke test: at least one `list_workouts`-equivalent call
      succeeds over the bearer token
- [ ] Peloton/Tonal sync routes still compile and (if credentials are
      available in the dev environment) still authenticate
- [ ] CI green on the PR branch (both `audit` and `typecheck` jobs)

### Phase 8 — Land it
1. Open a PR (do not push this one straight to `main` the way the smaller
   fixes have been landing recently — this is exactly the kind of change
   that warrants review, per the standing "discuss architectural
   decisions before implementation" rule). Title following repo
   convention, e.g. `deps(fitness-tracker): upgrade to Next.js 16 / React 19`.
2. PR body: use the `05830ac`-style format from `the-vibe-coder` — list
   each GHSA/CVE closed, its severity, and call out anything intentionally
   left as a follow-up (e.g. Cache Components adoption, React Compiler).
3. Link back to this plan (or paste its content into a collapsible
   section) so the reviewer has the same context.

## Open questions to resolve when picking this up

1. Is there a newer stable `next-auth` v5 release (out of beta) by the
   time this is picked up? Prefer it if so.
2. Does the Next 16.x version actually available at migration time still
   accept `middleware.ts` unrenamed, or has that deprecation window
   closed? Check the live docs, don't trust this plan's snapshot.
3. Does Turbopack's production build change anything about how the
   Prisma-generated client is bundled? Untested as of this plan.
4. Should the React Compiler be adopted in the same pass or deferred?
   Current recommendation above is defer, but revisit if the ecosystem
   guidance has shifted.
