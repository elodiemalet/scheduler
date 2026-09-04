# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server (Turbopack) on http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint . (ESLint 9, native flat config)
npm test           # vitest run — the domain test suite
npm run test:watch # vitest in watch mode
npm test -- days   # run one module's tests by filename fragment
```

Vitest is configured in `vitest.config.ts`: `environment: 'node'`, `include: ['src/**/*.test.ts']`, with the `@/` alias resolved from `tsconfig.json` by Vite's native `resolve.tsconfigPaths`. **Only the pure domain is tested** — there are no UI, API-integration, or E2E tests.

`tsconfig.json` includes `**/*.ts`, so test files are type-checked by `next build` and a build can fail on a test file's types. Since Next 16, `next build` no longer runs ESLint — linting is a separate `npm run lint`. The `@typescript-eslint/no-unused-vars` disable comment in `parseSchedule.test.ts` (the omit-a-key destructuring idiom) therefore only matters to `npm run lint`.

A local MongoDB must be running on `mongodb://localhost:27017/scheduler` before the app will serve anything (every API route calls `dbConnect()` first).

### Two version ceilings, both blocked upstream

**TypeScript is pinned to 6.x, not 7.** `eslint-config-next` depends on `typescript-eslint`, whose peer
range is `typescript: ">=4.8.4 <6.1.0"`, and TypeScript 7's native compiler does not expose the
programmatic API typescript-eslint needs until 7.1.

**ESLint is pinned to 9.x, not 10.** `eslint-config-next@16` depends on `eslint-plugin-react@^7.37`, whose
newest published version (7.37.5) caps its peer at `eslint ^9.7` and calls `context.getFilename()`, which
ESLint 10 removed — the lint crashes outright. No fixed version exists; the package's `next` tag is a 2018
prerelease. Note `eslint-plugin-react` must **not** be a direct dependency: it blocks any ESLint bump with
an `ERESOLVE` conflict, and `eslint-config-next` already bundles it.

Bump either only once the upstream package declares support. Two related settings are load-bearing:

- `tsconfig.json` sets `noUncheckedSideEffectImports: false`. TypeScript 6 turned that check on by default
  and it rejects `import "./globals.css"` in `app/layout.tsx` with TS2882. Removing it breaks the build.
  `types: ["node"]` is deliberately *not* set — TypeScript 6 defaults `types` to `[]`, but `process.env`
  stays typed here anyway (verified, including without `next-env.d.ts`).
- `eslint.config.mjs` re-enables `react/no-unknown-property`, which `eslint-config-next` 16 leaves off, and
  demotes `react-hooks/set-state-in-effect` to a warning. That rule flags the two fetch-on-mount effects
  and accepts no local rewrite — the fix is a data library or Server Components, tracked in section 10 of
  the spec. Lint's clean baseline is **0 errors, 5 warnings**.

## What this is

A weekly planner: the user defines recurring **activities** (with priority, target duration, allowed days, optional fixed time slot), and then asks an LLM to lay everything out into a week-long **schedule**.

## Architecture

### Three layers

- `src/app/**` — App Router, **UI only**. Root layout (`src/app/layout.tsx`) mounts `TopNavigation`, `LeftSidebar` and `ToastContainer`. Routes: `/`, `/activity`, `/activity/add`, `/activity/edit/[id]`.
- `src/pages/api/**` — Pages Router, **API only**. Classic `NextApiRequest`/`NextApiResponse` handlers that branch on `req.method` (and, for catch-all routes, on `slug[0]`). No non-API pages live under `src/pages/`.
- `src/proxy.ts` — the per-request hook (Next 16's renamed `middleware.ts`). Draws a nonce and sets the CSP; the future auth guard lands here.
- `src/server/**` — server-side code that is not a route: `config/` (typed env), `infrastructure/db/` (Mongo connection), `domain/planning/` (pure planning logic), `http/` (input schemas, normalized responses, rate limiting — everything a handler needs that is not business logic).

Add new UI under `src/app/`, new endpoints under `src/pages/api/`, new business logic under `src/server/domain/`, and anything an endpoint needs to validate or answer under `src/server/http/`.

### The planning domain (`src/server/domain/planning/`)

**These modules are pure: no mongoose, no openai, no next, no Node built-ins.** They take plain data and return plain data, which is why they are the only tested part of the codebase. `days.ts` and `time.ts` are also imported by client components, so they must stay dependency-free.

| Module | Exports |
|---|---|
| `days.ts` | `WEEKDAYS`, `Weekday`, `isWeekday`, `weekdayFromDate`, `sortWeekdays` |
| `time.ts` | `TIME_PATTERN`, `isValidTime`, `parseTimeToMinutes`, `formatMinutesToTime` |
| `mergeTasks.ts` | `PlannableActivity`, `ActivityInput`, `ExternalTaskInput`, `activityToPlannable`, `externalTaskToPlannable`, `mergeActivitiesAndTasks` |
| `buildDayWindows.ts` | `DayWindow`, `buildDayWindows`, `DEFAULT_START_TIME`, `DEFAULT_END_TIME` |
| `parseSchedule.ts` | `ScheduleSlot`, `parseSchedule`, `InvalidModelResponseError` |

Two naming rules that look inconsistent but are deliberate:

- **`PlannableActivity.timeToSpendHours` vs. the Mongoose field `timeToSpend`.** The domain name spells out the unit; the adapter (`activityToPlannable`) does the mapping. Do not rename the persisted field — that needs a data migration.
- **`DayWindow` has French keys** (`jour`, `heure_debut`, `heure_fin`). This object is serialized straight into the prompt, whose contract expects exactly those names.

`__fixtures__/openai-response.json` is a real captured model response (14 slots over jeudi/vendredi). It doubles as an end-to-end test of `parseSchedule` and as the reference for the expected output shape.

### The HTTP layer (`src/server/http/`)

Every handler follows the same three rules.

**Input goes through a Zod schema — always.** `schemas/` holds one module per family of routes (`activity`, `schedule`, plus `common.ts` for the shared `objectId`). A handler starts with `safeParse` and answers `invalidInput(res, parsed.error)` on failure. Zod **strips** undeclared keys, and that stripping *is* the mass-assignment fix: `new Activity(parsed.data)` can no longer receive an `_id`. Never add `.strict()` — `ActivityForm` posts `_id` on every submit and must keep working.

**Errors go through `respond.ts`.** `fail(res, status, message)` is the only shape (`{error}`); `serverError(res, context, error)` logs the detail and answers a generic 500 — Mongo and upstream messages stay out of responses; `methodNotAllowed(res, allowed)` sets a single comma-separated `Allow`. The one deliberate exception is `invalidInput`, which also returns the Zod issue paths: they describe *our* input contract, not internal state. The whole body of each handler sits in one `try`, `dbConnect()` included.

**Generation is rate limited.** `rateLimit.ts` is an in-memory sliding window (`createRateLimiter(limit, windowMs)`), instantiated at module load in `generate_weekly_planning.ts` at 5 calls per 15 minutes. The counter is global to the route, not per caller: there is one user, and a per-IP counter would be forged around. State is per process and dies with it — accepted at this scale.

Success shapes are **unchanged** by this layer: `/api/activity` answers `{data}`, `/api/activity/[id]` answers the bare document, `/api/schedule/status` answers `{status, schedule}`. The UI reads those directly.

### Planning generation pipeline

`POST /api/generate_weekly_planning` (`src/pages/api/generate_weekly_planning.ts`) is the heart of the app. The handler is deliberately thin — load, call the domain, persist, respond:

0. Checks the rate limiter first, before touching the database: over 5 generations per 15 minutes the route answers **429** with `Retry-After` and never calls the model.
1. Loads all `Activity` docs, `.lean()`.
2. `activities.map(activityToPlannable)` → a `PlannableActivity[]`. The domain can also fold external tasks in — `mergeActivitiesAndTasks` gives them priority `2`, `timeToSpendHours` `0.25`, and the one French weekday derived from their `dueDate` (falling back to today) — but no task source is wired to the planning yet.
3. `buildDayWindows(plannable)` → per-day `{jour, heure_debut, heure_fin}`, sorted in week order. Defaults `09:00`–`18:00`, **widened but never narrowed** by the earliest `startTime` / latest `endTime` of that day's activities — they are a floor, so a fixed 07:00–09:00 block opens the day earlier without closing it at 09:00. The window never stretches to fit the requested durations: what does not fit is the model's problem to arbitrate by priority.
4. Sends `{jours, activites}` as a JSON string to `generateWeeklyPlanning()`, **inside a `try`** — a network failure or an upstream HTTP error is a bad model call, not a server bug.
5. `parseSchedule(raw)` validates the response and remaps snake_case → camelCase. Steps 4–5 are retried up to `GENERATION_ATTEMPTS` (2) times, because open-weight models break the output contract more often than proprietary ones. After the last failure the route answers **502**, not 500. A `401`/`403` from the provider short-circuits the loop and answers 500: the key is wrong, retrying changes nothing.
6. Saves a single `Planning` embedding the slots directly (`ScheduleSlot` already carries the schema's field names, so no adapter is needed). Nothing is written outside `plannings`.

`GET` on the same route returns the most recent `Planning` (`sort({timestamp: -1})`) — this is what the home page renders. There is no "regenerate in place"; each generation appends a new `Planning`. Any other method gets 405 with `Allow: GET, POST`.

### LLM integration

`src/services/LlmService.ts` holds the entire system prompt inline (in French) and calls a **chat-completions endpoint compatible with the OpenAI API**. The provider is configuration, not code — `LLM_BASE_URL`, `LLM_MODEL` and `LLM_API_KEY` are all read through `getEnv()`.

Default provider is **Groq** (`https://api.groq.com/openai/v1`, `qwen/qwen3.8-27b`), chosen because it serves open-weight models without training on customer data — the prompt carries the user's weekly routine. `qwen3.8-27b` is an open-weight model *hosted by Groq*; the vendor prefix in a model id names who released the weights, not who receives the request — nothing leaves Groq.

**There is no SDK.** `LlmService.ts` calls `POST {LLM_BASE_URL}/chat/completions` with plain `fetch`. The `openai` package was 23 MB for two calls, and the only thing it really provided is reimplemented in `llmRetry.ts`: 3 attempts total, exponential backoff (500 ms, doubling, capped at 8 s) on 408/409/429/5xx, honouring `retry-after-ms` and `retry-after` (capped at 60 s), plus a 10-minute timeout via `AbortSignal.timeout`. A non-retryable status throws `LlmRequestError`, which carries the upstream status so the route can tell a refused key from a busy provider. No code path can reach `api.openai.com`: the URL is built from `env.llmBaseUrl`, which defaults to Groq. Two constraints follow from targeting compatibility layers rather than OpenAI itself:

- `content` must be a **plain string**, not an array of `{type, text}` parts.
- Use `max_tokens`, not `max_completion_tokens`.

`getEnv()` is read inside `generateWeeklyPlanning`, at call time — there is no client object to build any more. Note this is not what keeps a key-less install working: `dbConnect()` calls `getEnv()` too, and `LLM_API_KEY` is mandatory there, so a missing key already breaks every route.

`temperature` is 0.3 — the task is constrained (fixed blocks, allowed days, no overlap), not creative.

**Groq's catalogue churns.** Model names are retired without much notice; `llama-3.3-70b-versatile` already disappeared. When generation starts returning `404 model_not_found`, list what is actually available:

```bash
node --env-file=.env --env-file=.env.local -e "fetch((process.env.LLM_BASE_URL??'https://api.groq.com/openai/v1')+'/models',{headers:{Authorization:'Bearer '+process.env.LLM_API_KEY}}).then(r=>r.json()).then(d=>console.log(d.data.map(m=>m.id).sort().join('\n')))"
```

The contract the prompt enforces:

- Activities with **both** `startTime` and `endTime` are fixed, uncuttable blocks.
- An activity's `days` array restricts which days it may be placed on; empty means any day.
- Output is `{schedule: [{day, start_time, end_time, activity, description}]}` — **snake_case**.

The prompt never names the duration field, so renaming it in `PlannableActivity` did not change the contract.

Never trust this output: `parseSchedule` is the validation boundary, and the real defense against prompt injection through whatever text reaches the prompt. Note it validates **shape only** — it does not check that a slot's day is in that activity's allowed `days`. On the way in, `mergeTasks.truncateForPrompt` caps external task titles and descriptions at `MAX_PROMPT_FIELD_LENGTH` (200) — that is a cost bound, not a security boundary; the two are complementary and neither replaces the other.

### Data model (Mongoose, `src/models/`)

- `Activity` — user-defined recurring work. `days: string[]` of French weekday names.
- `Schedule` — **not a collection.** `src/models/Schedule.ts` exports only `ScheduleSchema` and `ScheduleInterface`, the embedded subdocument type for `Planning.schedule` (`day`, `startTime`, `endTime`, `activity`, `description`, `status` of `pending`/`done`). There is no `Schedule` model: a slot has no life outside its planning.
- `Planning` — a generated week, and a historical snapshot. It embeds `ScheduleSchema` subdocuments for the slots, and `PlannedActivitySchema` copies of **the set actually sent to the model**, carrying `timeToSpendHours` (plus the `source` and `externalId` of any external task). Deliberately not `ActivitySchema`: a snapshot records what was planned, not a living activity, so editing an activity never mutates past plannings.

Slots exist in exactly one place: embedded in `Planning`. `POST /api/schedule/status` updates the subdocument atomically (`$set: {"schedule.$.status": status}`) and 404s when `findOneAndUpdate` matches nothing. Subdocuments carry their own `_id`, which is what the UI sends back.

Every model is exported as `mongoose.models.X || mongoose.model('X', …)` — required so Next.js hot reload doesn't redefine models.

Mongoose 9 dropped the `new` option on `findOneAndUpdate`: use `returnDocument: 'after'`. Its one call site (`src/pages/api/schedule/[...slug].ts`) already does.

### Configuration and database connection

`src/server/config/env.ts` exposes `getEnv(): AppEnv` (`{mongodbUri, llmApiKey, llmBaseUrl, llmModel}`), read once and cached. `MONGODB_URI`, `LLM_BASE_URL` and `LLM_MODEL` have defaults; **`LLM_API_KEY` is mandatory** and throws a named error if absent. `.env.example` lists every variable the app reads.

Values in `.env` override the code defaults, so bumping `DEFAULT_LLM_MODEL` in `env.ts` has no effect if `LLM_MODEL` is set in `.env`.

`src/server/infrastructure/db/connection.ts` default-exports `dbConnect()`, which caches the Mongoose connection on `global.mongoose` — the standard Next.js pattern to survive hot reload.

### Security headers and CSP

Two files, split by whether the value depends on the request.

`next.config.ts` carries what does not: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` — a deliberate duplicate of `frame-ancestors`, kept because it also covers API responses, which the proxy does not touch — and a `Permissions-Policy` denying camera, microphone and geolocation. `poweredByHeader: false` drops `X-Powered-By`.

`src/proxy.ts` carries the CSP, because its nonce is drawn per request. Six things to know before touching any of it:

- **The file is `src/proxy.ts`, not `middleware.ts`.** Next 16 renamed the convention — same mechanics, different file and export name. It sits beside `src/app`, never at the repo root.
- **The nonce forces dynamic rendering**, which is why `src/app/layout.tsx` awaits `connection()`. Making a page static again breaks the CSP *silently*: it would be rendered at build time, when there is no request and no nonce to read. `npm run build` must show every `app` route as `ƒ (Dynamic)`.
- **`react-toastify` must stay imported from `react-toastify/unstyled`**, with `react-toastify/ReactToastify.css` imported separately in the layout. The default entry injects a runtime `<style>`, which carries no nonce and is refused.
- **`'unsafe-eval'` is added in development only** — React rebuilds server error stacks with `eval` there, and neither React nor Next needs it in production.
- **`upgrade-insecure-requests` is deliberately absent** while the instance is served over http: it would rewrite its own requests to https. Add it the day this deploys behind HTTPS.
- **The `matcher` excludes `/api`**, plus static assets and `next/link` prefetches (which would burn a nonce nobody uses). API responses have no document to protect — if a route ever returns HTML, the matcher has to change. **The authentication guard will have to widen it too**: `proxy.ts` is where that guard lands.

`NODE_ENV` is the one value read from `process.env` outside `env.ts`, and only here: the proxy runtime has no business importing `getEnv()`'s cache.

### Client-side conventions

- **Use the `apiService` singleton** exported from `@/services/ApiService` — `import {apiService} from "@/services/ApiService"`. Don't `new ApiService()` per component, and don't reach for raw `fetch`. Endpoints are **relative** URLs (same origin); the class takes no `baseUrl`. `get`/`post`/`put`/`patch`/`delete` each map to the matching HTTP method.
- **There is no shared state.** No Redux, no context store. Every component holds local `useState` and refetches after a mutation. Don't assume a store exists.
- Form components keep **one state object**, not a field-per-`useState` (see `ActivityForm`'s `form` / `updateField`). Empty date inputs must be sent as `undefined`, never `new Date('')`.
- Feedback uses `react-toastify` (`toast.success(...)`); the `ToastContainer` lives in the root layout.

### Styling

Tailwind 4, CSS-first: **there is no `tailwind.config.ts`**. The semantic color scales (`primary`, `secondary`, `danger`, `success`, `warning`, each 50–900) are CSS custom properties in `src/app/globals.css`, exposed to Tailwind by the `@theme inline` block in that same file — `inline` because the values are `var()` references the dark-mode block redefines. To add a scale, add both the `--x-500` property and its `--color-x-500` line in `@theme inline`. Sources are auto-discovered; there is no `content` array. `globals.css` also carries an `@layer base` rule restoring v3's gray-400 `::placeholder`, which v4 would otherwise render as currentColor at 50%. Use `bg-primary-500` etc. rather than raw palette colors. Shared primitives live in `src/components/uiComponents/` — `BaseButton` takes `theme` and `size` props that resolve into those scales. Dark mode is applied via `dark:` variants throughout.

## Domain conventions

- **Days are lowercase French strings** (`"lundi"` … `"dimanche"`) and act as join keys across the whole stack: `Activity.days`, the OpenAI prompt input and output, `Planning.days`, per-day filtering in `WeeklyPlanning`, and the day checkboxes in `ActivityForm`. `src/server/domain/planning/days.ts` is the **single source** — import `WEEKDAYS` / `sortWeekdays` rather than writing the array again, and note `sortWeekdays` silently drops unknown values and never mutates its input. `ActivitySchema.days` and `PlannedActivitySchema.days` are `{type: [String], enum: WEEKDAYS}` — the schemas import `WEEKDAYS` from the domain. That direction is fine (the domain has no dependencies); the reverse would break its purity.
- Times are `"HH:MM"` strings, not Date objects. Parse and format them through `time.ts`; `TIME_PATTERN` requires zero-padding, so `"9:30"` is invalid.
- Priority is numeric and **inverted**: `1` = most important, `3` = least. Priority only guides the model's arbitration — it has no effect on the day windows, which depend solely on fixed times.
- User-facing copy is French. Identifiers are English; comments, test names and thrown error messages are French. Domain tests assert on those messages (`/heure invalide/i`, `/créneau 2/i`), so rewording an error breaks a test.

### Known trap: the unit of `timeToSpend`

`mergeTasks` maps `Activity.timeToSpend` onto `timeToSpendHours` unchanged, and the prompt says hours. But the activities actually in the database store **minutes** (`90`, `120`, `60`, `45`…), so `timeToSpend: 90` reaches the model as 90 hours. Since `buildDayWindows` no longer reads durations at all, this no longer distorts the day windows — the only remaining damage is that the model plans against nonsense durations.

This predates the domain extraction — the old inline code did the same arithmetic — and reconciling it requires either a data migration or a documented unit change. Don't "fix" one side in isolation; both the stored values and `EXTERNAL_TASK_DEFAULT_HOURS = 0.25` have to move together.

## Environment

`.env` and `.env.local` (both gitignored; `.env.example` is committed) provide: `MONGODB_URI`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`.

**`LLM_API_KEY` lives in `.env.local`, not `.env`** — Next loads both (`.env.local` wins), but a one-off `node --env-file=.env` does not, and answers `Invalid API Key` while the app works fine. Pass both files. `LLM_BASE_URL` and `LLM_MODEL` are set in neither: they come from the code defaults in `env.ts`, so a script that reads `process.env.LLM_BASE_URL` gets `undefined`.

Privacy is a stated requirement here: pick an LLM provider that does not train on submitted data.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
