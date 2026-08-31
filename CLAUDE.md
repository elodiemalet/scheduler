# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server (Turbopack) on http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # next lint (ESLint 9 flat config)
npm test           # vitest run — the domain test suite
npm run test:watch # vitest in watch mode
npm test -- days   # run one module's tests by filename fragment
```

Vitest is configured in `vitest.config.ts`: `environment: 'node'`, `include: ['src/**/*.test.ts']`, with the `@/` alias resolved from `tsconfig.json` by `vite-tsconfig-paths`. **Only the pure domain is tested** — there are no UI, API-integration, or E2E tests.

`tsconfig.json` includes `**/*.ts`, so test files are type-checked *and* linted by `next build`. A build can therefore fail on a test file (e.g. `@typescript-eslint/no-unused-vars` on the omit-a-key destructuring idiom — see the disable comment in `parseSchedule.test.ts`).

A local MongoDB must be running on `mongodb://localhost:27017/scheduler` before the app will serve anything (every API route calls `dbConnect()` first).

## What this is

A weekly planner: the user defines recurring **activities** (with priority, target duration, allowed days, optional fixed time slot), and then asks GPT-4o to lay everything out into a week-long **schedule**.

## Architecture

### Three layers

- `src/app/**` — App Router, **UI only**. Root layout (`src/app/layout.tsx`) mounts `TopNavigation`, `LeftSidebar` and `ToastContainer`. Routes: `/`, `/activity`, `/activity/add`, `/activity/edit/[id]`.
- `src/pages/api/**` — Pages Router, **API only**. Classic `NextApiRequest`/`NextApiResponse` handlers that branch on `req.method` (and, for catch-all routes, on `slug[0]`). No non-API pages live under `src/pages/`.
- `src/server/**` — server-side non-HTTP code: `config/` (typed env), `infrastructure/db/` (Mongo connection), `domain/planning/` (pure planning logic).

Add new UI under `src/app/`, new endpoints under `src/pages/api/`, new business logic under `src/server/domain/`.

### The planning domain (`src/server/domain/planning/`)

**These modules are pure: no mongoose, no openai, no next, no Node built-ins.** They take plain data and return plain data, which is why they are the only tested part of the codebase. `days.ts` and `time.ts` are also imported by client components, so they must stay dependency-free.

| Module | Exports |
|---|---|
| `days.ts` | `WEEKDAYS`, `Weekday`, `isWeekday`, `weekdayFromDate`, `sortWeekdays` |
| `time.ts` | `TIME_PATTERN`, `isValidTime`, `parseTimeToMinutes`, `formatMinutesToTime` |
| `mergeTasks.ts` | `PlannableActivity`, `ActivityInput`, `ExternalTaskInput`, `activityToPlannable`, `externalTaskToPlannable`, `mergeActivitiesAndTasks` |
| `buildDayWindows.ts` | `DayWindow`, `buildDayWindows`, `DEFAULT_START_TIME`, `DEFAULT_END_TIME`, `MAX_END_HOUR` |
| `parseSchedule.ts` | `ScheduleSlot`, `parseSchedule`, `InvalidModelResponseError` |

Two naming rules that look inconsistent but are deliberate:

- **`PlannableActivity.timeToSpendHours` vs. the Mongoose field `timeToSpend`.** The domain name spells out the unit; the adapter (`activityToPlannable`) does the mapping. Do not rename the persisted field — that needs a data migration.
- **`DayWindow` has French keys** (`jour`, `heure_debut`, `heure_fin`). This object is serialized straight into the prompt, whose contract expects exactly those names.

`__fixtures__/openai-response.json` is a real captured model response (14 slots over jeudi/vendredi). It doubles as an end-to-end test of `parseSchedule` and as the reference for the expected output shape.

### Planning generation pipeline

`POST /api/generate_weekly_planning` (`src/pages/api/generate_weekly_planning.ts`) is the heart of the app. The handler is deliberately thin — load, call the domain, persist, respond:

1. Loads all `Activity` docs, `.lean()`.
2. `activities.map(activityToPlannable)` → a `PlannableActivity[]`. The domain can also fold external tasks in — `mergeActivitiesAndTasks` gives them priority `2`, `timeToSpendHours` `0.25`, and the one French weekday derived from their `dueDate` (falling back to today) — but no task source is wired to the planning yet.
3. `buildDayWindows(plannable)` → per-day `{jour, heure_debut, heure_fin}`, sorted in week order. Defaults `09:00`–`18:00`, widened by the earliest `startTime` / latest `endTime` of that day's activities, then `heure_fin` is pushed back if the day's **priority-1** activities need more hours than the window offers, capped at `MAX_END_HOUR` (23) while keeping the original minutes.
4. Sends `{jours, activites}` as a JSON string to `generateWeeklyPlanning()`.
5. `parseSchedule(raw)` validates the response and remaps snake_case → camelCase. On `InvalidModelResponseError` the route answers **502**, not 500 — a bad model response is not a server bug. An empty response is likewise 502.
6. Saves one `Schedule` doc per slot (`new Schedule(slot)` works directly — `ScheduleSlot` already carries the schema's field names), then a `Planning` embedding those schedules.

`GET` on the same route returns the most recent `Planning` (`sort({timestamp: -1})`) — this is what the home page renders. There is no "regenerate in place"; each generation appends a new `Planning`. Any other method gets 405 with `Allow: GET, POST`.

### OpenAI integration

`src/services/OpenAiService.ts` holds the entire system prompt inline (in French) and calls `gpt-4o` with `response_format: {type: "json_object"}`. The API key comes from `getEnv().openaiApiKey` **at module load**, so importing this module without `OPENAI_API_KEY` set throws immediately. The contract the prompt enforces:

- Activities with **both** `startTime` and `endTime` are fixed, uncuttable blocks.
- An activity's `days` array restricts which days it may be placed on; empty means any day.
- Output is `{schedule: [{day, start_time, end_time, activity, description}]}` — **snake_case**.

The prompt never names the duration field, so renaming it in `PlannableActivity` did not change the contract.

Never trust this output: `parseSchedule` is the validation boundary, and also the defense against prompt injection through whatever text reaches the prompt.

### Data model (Mongoose, `src/models/`)

- `Activity` — user-defined recurring work. `days: string[]` of French weekday names.
- `Schedule` — one time block (`day`, `startTime`, `endTime`, `activity`, `description`, `status` of `pending`/`done`).
- `Planning` — a generated week. **Embeds** copies of `ActivitySchema` and `ScheduleSchema` as subdocuments rather than referencing them.

Consequence of the embedding: schedules exist in two places. `POST /api/schedule/status` updates the copy embedded in `Planning` (via `$set: {"schedule.$": schedule}`) and does not persist the standalone `Schedule` document, so **the embedded copy inside `Planning` is what the UI reads and is the effective source of truth**.

Every model is exported as `mongoose.models.X || mongoose.model('X', …)` — required so Next.js hot reload doesn't redefine models.

### Configuration and database connection

`src/server/config/env.ts` exposes `getEnv(): AppEnv` (`{mongodbUri, openaiApiKey}`), read once and cached. `MONGODB_URI` falls back to `mongodb://localhost:27017/scheduler`; `OPENAI_API_KEY` is mandatory and throws a named error if absent. `.env.example` lists every variable the app reads.

`src/server/infrastructure/db/connection.ts` default-exports `dbConnect()`, which caches the Mongoose connection on `global.mongoose` — the standard Next.js pattern to survive hot reload.

### Client-side conventions

- **Use the `apiService` singleton** exported from `@/services/ApiService` — `import {apiService} from "@/services/ApiService"`. Don't `new ApiService()` per component, and don't reach for raw `fetch`. Endpoints are **relative** URLs (same origin); the class takes no `baseUrl`. `get`/`post`/`put`/`patch`/`delete` each map to the matching HTTP method.
- **There is no shared state.** No Redux, no context store. Every component holds local `useState` and refetches after a mutation. Don't assume a store exists.
- Form components keep **one state object**, not a field-per-`useState` (see `ActivityForm`'s `form` / `updateField`). Empty date inputs must be sent as `undefined`, never `new Date('')`.
- Feedback uses `react-toastify` (`toast.success(...)`); the `ToastContainer` lives in the root layout.

### Styling

Tailwind 3 with semantic color scales (`primary`, `secondary`, `danger`, `success`, `warning`, each 50–900) defined as CSS custom properties in `src/app/globals.css` and mapped in `tailwind.config.ts`. Use `bg-primary-500` etc. rather than raw palette colors. Shared primitives live in `src/components/uiComponents/` — `BaseButton` takes `theme` and `size` props that resolve into those scales. Dark mode is applied via `dark:` variants throughout.

## Domain conventions

- **Days are lowercase French strings** (`"lundi"` … `"dimanche"`) and act as join keys across the whole stack: `Activity.days`, the OpenAI prompt input and output, `Planning.days`, per-day filtering in `WeeklyPlanning`, and the day checkboxes in `ActivityForm`. `src/server/domain/planning/days.ts` is the **single source** — import `WEEKDAYS` / `sortWeekdays` rather than writing the array again, and note `sortWeekdays` silently drops unknown values and never mutates its input.
- Times are `"HH:MM"` strings, not Date objects. Parse and format them through `time.ts`; `TIME_PATTERN` requires zero-padding, so `"9:30"` is invalid.
- Priority is numeric and **inverted**: `1` = most important, `3` = least. Only priority-1 activities can stretch a day's window.
- User-facing copy is French. Identifiers are English; comments, test names and thrown error messages are French. Domain tests assert on those messages (`/heure invalide/i`, `/créneau 2/i`), so rewording an error breaks a test.

### Known trap: the unit of `timeToSpend`

`buildDayWindows` compares `timeToSpendHours` against a number of **hours**, and `mergeTasks` maps `Activity.timeToSpend` onto it unchanged. But the activities actually in the database store **minutes** (`90`, `120`, `60`, `45`…). So a priority-1 activity with `timeToSpend: 90` reads as 90 hours, blows past any window, and pushes `heure_fin` to the 23:00 cap.

This predates the domain extraction — the old inline code did the same arithmetic — and reconciling it requires either a data migration or a documented unit change. Don't "fix" one side in isolation; both the stored values and `EXTERNAL_TASK_DEFAULT_HOURS = 0.25` have to move together.

## Environment

`.env` (gitignored; `.env.example` is committed) provides: `MONGODB_URI`, `OPENAI_API_KEY`.
