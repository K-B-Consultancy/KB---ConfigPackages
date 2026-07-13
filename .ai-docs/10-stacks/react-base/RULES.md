# React + TypeScript — Base Rules

These rules apply to **every React-based stack**: Vite, Next.js, Tanstack Start, React Native. Each of those has its own stack rules that build on top — read them after this one.

## TypeScript

`tsconfig.json` has strict mode enabled and these flags:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
    },
  },
}
```

The `@/*` alias maps to `src/*`. For Vite apps, `vite-tsconfig-paths` picks this up automatically — no duplication in `vite.config.ts`. See [vite/RULES.md](../vite/RULES.md) for the Vite-specific setup.

**Hard rules:**

- **No `any`, no non-null assertions, no type-only imports** — enforced by the base config; when blocked, use `unknown` and narrow or handle null explicitly, never a disable comment.
  - **Exception:** Variables matching the pattern `_<identifier>` (e.g., `_o`, `_Model`) are allowed as a convention for type-only imports without the `import type` keyword. The leading underscore signals intent. ESLint's unused-variable rule ignores these.
- **No other `as` type assertions either**, including narrowing a generated union type (e.g. `value as EntityType`). A type assertion tells the compiler to trust code that may be wrong. Instead:
- Type local state (`useState`, filters, form fields) with the generated union itself (e.g. `EntityType | 'all'`), so equality checks against a literal (`!== 'all'`) narrow the type for free.
- When a value crosses a boundary that only knows `string` (e.g. a third-party `Select`'s `onValueChange`), validate it with a type predicate (`value is EntityType`) instead of casting it.
- **No `@ts-ignore` or `@ts-expect-error`** without a comment explaining why and a linked ticket to fix it properly.
- **No `import *`** — name what you're using.

## Package manager & dependency versions

The React stacks standardize on **pnpm** (not npm or yarn). Pin the toolchain in `package.json` via `"packageManager": "pnpm@<exact>"` and an `engines.node` range.

Every dependency is pinned to an **exact** version. No `^`, no `~`, no `latest`. See [`DEPENDENCIES.md`](../../00-org-wide/DEPENDENCIES.md) for the org-wide rule.

Configure pnpm to write exact versions on install via the committed root `.npmrc` — the snippet lives in [`DEPENDENCIES.md`](../../00-org-wide/DEPENDENCIES.md).

## Naming

### Types and interfaces

- `PascalCase` for type and interface names: `CompanyResponse`, `CreateVacancyRequest`
- Request DTOs: `{Action}{Entity}Request` — `CreateCompanyRequest`, `UpdateVacancyRequest`
- Response DTOs: `{Entity}{Detail}Response` — `CompanyResponse`, `VacancyDetailResponse`
- Enums: `PascalCase` name, `SCREAMING_SNAKE_CASE` values

### Variables and functions

- `camelCase` for variables, functions, parameters
- Boolean variables: `isLoading`, `hasError`, `canEdit`
- React hooks: `use{Resource}` — `useOrder`, `useCurrentUser` (one hook per resource — see [Hooks](#hooks))
- Event handlers: `handle{Event}` — `handleSubmit`, `handleEmailChange`
- Constants (truly constant, module-level): `SCREAMING_SNAKE_CASE`

### Files

- React components: `PascalCase.tsx` — `CompanyList.tsx`, `LoginForm.tsx`
- Hook files: `useThing.ts` — `useCurrentUser.ts`
- All other TypeScript files: `kebab-case.ts` — `api.ts`, `query-keys.ts`, `format-date.ts`
- Test files: same name + `.test.ts(x)` — `CompanyList.test.tsx`, `format-date.test.ts`

## Folder structure (features-based)

```
src/
├── features/<feature-name>/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   │   ├── <feature>.ts         # API module — the only place apiClient is called
│   │   └── query-keys.ts
│   ├── types/
│   │   └── <aggregate>.ts       # re-exports from generated API types
│   └── index.ts                 # the feature's public API
├── shared/
│   ├── components/              # truly cross-feature UI primitives, plus shadcn/ui components under ui/
│   ├── hooks/                   # cross-feature hooks
│   └── lib/                     # utilities (date formatting, etc.)
└── app/                         # top-level setup (providers, router, error boundary)
```

**Rules:**

- One feature per folder under `features/`
- Cross-feature imports go through the feature's `index.ts` (its public API) — enforced by `no-restricted-imports` in the base config
- `shared/` is for genuinely cross-feature code only. If something is used by one feature, it belongs in that feature.
- `app/` is composition only — no business logic.
- **shadcn/ui** components live under `shared/components/ui/` (this is shadcn's default install path; keep it). These are owned by the project (shadcn copies them in, doesn't install as a dependency) — edit them freely.

## Styling — Tailwind CSS v4 + shadcn/ui

We standardize on **Tailwind CSS v4** (the modern config, CSS-first) and **[shadcn/ui](https://ui.shadcn.com/)** for component primitives.

### Tailwind v4

- Single CSS file (`src/index.css` or `src/app.css`) with the new `@import "tailwindcss";` directive at the top
- Theme tokens (colors, spacing, typography, radii) defined in CSS via `@theme { ... }` — not in a JS config file
- The `tailwind.config.ts` file from v3 is **not** used in v4 projects unless legacy compatibility is needed
- Vite plugin: `@tailwindcss/vite` (not the v3 PostCSS setup)

Hardcoded colors in JSX are not allowed. Use the theme tokens:

```tsx
// ✅
<div className="bg-primary text-primary-foreground">…</div>

// ❌
<div className="bg-[#2563eb] text-white">…</div>
```

If a color is needed and not in the theme, add it to the theme — don't inline it.

### shadcn/ui

- Components are **copied into the project**, not installed as a dependency. `pnpm dlx shadcn@latest add button` writes a `Button.tsx` file under `shared/components/ui/`.
- Components are then **owned by us** — edit them, restyle them, extend them. They are not a library.
- Use shadcn defaults as the starting point; customize when the design requires it
- For new components that don't exist in shadcn, follow the same pattern: build them under `shared/components/`, fully owned

### Standard shadcn dependencies

- `class-variance-authority` (CVA) for component variants
- `clsx` + `tailwind-merge` (wrapped as `cn()` in `shared/lib/utils.ts`) for conditional classes
- `lucide-react` for icons
- `@radix-ui/*` packages as needed (shadcn brings these in as the components are added)

Custom CSS only when Tailwind genuinely can't express it (rare — usually animations or third-party widget overrides).

## Components

- **One component per file**, named after the file
- **Props typed via interface**, never inline:

  ```tsx
  interface UserProfileProps {
    user: UserResponse;
    onEdit?: () => void;
  }

  export function UserProfile({ user, onEdit }: UserProfileProps) { ... }
  ```

- **Functional components only.** No class components.
- **Named exports** — enforced by `import/no-default-export` in the base config.
- **No required props with default values** — if it has a default, it's optional.
- File length is enforced by `max-lines` in the base config; when over, split into smaller components or extract hooks — never restructure to dodge the limit.

## Hooks

- Custom hooks start with `use`
- A custom hook composes other hooks; if it doesn't, it's just a function — make it one

**Hooks own all data-fetching and mutation logic.** Components import hooks; hooks call `useQuery`/`useMutation`. Hooks do **not** call `apiClient.GET/POST` directly — that call belongs in the feature's API module (see below). The ESLint rule `local/no-direct-query-in-components` enforces the first half of this; code review enforces the second.

### One hook per resource

Each resource (aggregate root) gets **one** hook file bundling its queries and mutations. Per-operation hook sprawl (`useCreateOrder`, `useUpdateOrder`, `useDeleteOrder` in separate hooks) is forbidden.

- File: `features/<feature>/hooks/use<Resource>.ts` — e.g. `useOrder.ts`
- Hook: `use<Resource>()` returns the list query plus the `create` / `update` / `remove` mutations
- A detail view gets `use<Resource>Detail(id)` in the **same file** — a separate hook, not an `enabled:`-gated query inside `use<Resource>()`
- Components destructure only what they use: `const { orders, create } = useOrder();`

### API modules

Each feature has an API module at `features/<feature>/api/<feature>.ts`. It is the only place that calls `apiClient` directly. Hooks import from here; nothing else does.

```typescript
// ✅ features/orders/api/orders.ts
import { apiClient } from "@/shared/api/client";
import type { CreateOrderRequest } from "@/features/orders/types/order";

export const orderApi = {
  getOrders: () => apiClient.GET("/api/orders"),
  createOrder: (body: CreateOrderRequest) =>
    apiClient.POST("/api/orders", { body }),
  deleteOrder: (id: string) =>
    apiClient.DELETE("/api/orders/{id}", { params: { path: { id } } }),
};
```

```tsx
// ✅ features/orders/hooks/useOrder.ts — the resource's single hook file
export function useOrder() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });

  const orders = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: orderApi.getOrders, // ← calls the API module, not apiClient directly
  });

  const create = useMutation({
    mutationFn: (body: CreateOrderRequest) => orderApi.createOrder(body),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => orderApi.deleteOrder(id),
    onSuccess: invalidate,
  });

  return { orders, create, remove };
}

// ✅ Same file — detail hook stays separate so it isn't `enabled:`-gated
export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => orderApi.getOrder(id),
  });
}
```

❌ Forbidden: per-operation hook files (`useCreateOrder.ts`, `useUpdateOrder.ts`), a hook calling `apiClient.GET(...)` directly (belongs in the API module), or a component calling `useQuery` directly (belongs in a hook).

## State management

The defaults, in order:

1. **Local component state** (`useState`, `useReducer`) — for UI state that belongs to one component
2. **URL params** (`useSearchParams` or the router equivalent) — for state that should survive refresh and be shareable
3. **TanStack Query** — for server state (anything fetched from an API)
4. **React Context** — for genuinely app-wide state that is not server state (theme, current user) — sparingly

**Do not** put server data in Context or Zustand. That's a TanStack Query smell.

**Table state (page, size, sort, filters) always lives in URL search params — never `useState`.** A table view must be shareable and reload-safe by URL alone; this also makes it deterministic to E2E test.

### Derived state is computed, never synced

If a value can be computed from props, state, or query data, compute it during render (or `useMemo` when measured as expensive). Mirroring it into its own `useState` and syncing via `useEffect` is forbidden — it introduces an extra render with stale data and a second source of truth. Effects are for synchronizing with **external** systems (DOM APIs, subscriptions, analytics) only.

```tsx
// ❌ synced copy — stale for one render, drifts on refactor
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${user.firstName} ${user.lastName}`);
}, [user]);

// ✅ computed during render
const fullName = `${user.firstName} ${user.lastName}`;
```

## API client

- **Types and client functions are generated from the backend's OpenAPI spec.** Hand-written DTOs are forbidden. See [DATA_MODEL.md](../../20-templates/DATA_MODEL.template.md).
- Tooling: `openapi-typescript` for types, `openapi-fetch` for the HTTP client
- Generated files live in `src/generated/api/` and are committed
- Generated files are excluded from linting by the base config's `ignores` (see [ESLint](#eslint)) and listed in `.prettierignore` at the repo root
- The generated client is wrapped in a thin app-specific layer (`src/shared/api/client.ts`) that handles:
  - Including the session cookie on every request (`credentials: 'include'`)
  - Reading the CSRF token from the `XSRF-TOKEN` cookie and setting `X-XSRF-TOKEN` on mutating requests
  - A **request timeout** (10 s via `AbortSignal.timeout`) so a hung backend surfaces as an error instead of an infinite spinner
  - **Error normalization**: every failure — network error, timeout, or non-2xx (parsing an RFC 7807 `application/problem+json` body when present, see [`spring-boot/RULES.md` § Error responses](../spring-boot/RULES.md#error-responses--rfc-7807)) — becomes the same typed `ApiError` (status, code, message, optional field errors). Components and hooks handle exactly one error shape.
- **Mutations are never auto-retried** — a timed-out create may have succeeded server-side; retrying duplicates it. Queries keep TanStack Query's default retry. Leave `mutations.retry` at its default `0` in the `QueryClient` — never raise it.
- **Dates cross the API as ISO-8601 UTC strings** (see [`spring-boot/RULES.md` § Dates & time](../spring-boot/RULES.md#dates--time)); convert to the user's timezone only at display time, via a shared formatter in `shared/lib/` — never store converted values in state.

## Readable types per aggregate root

Generated types (e.g. `components['schemas']['OrderResponse']`) are accurate but verbose to read and write throughout the codebase. For each aggregate root, create a thin re-export file that gives the generated types readable names:

```typescript
// src/features/orders/types/order.ts
// Re-exports only — never hand-write type shapes here.
import type { components } from "@/generated/api/schema";

export type Order = components["schemas"]["OrderResponse"];
export type OrderLine = components["schemas"]["OrderLineResponse"];
export type CreateOrderRequest = components["schemas"]["CreateOrderRequest"];
export type UpdateOrderRequest = components["schemas"]["UpdateOrderRequest"];
```

**Rules:**

- One file per aggregate root under `src/features/<feature>/types/<aggregate>.ts`
- Re-exports only — the shape is defined by the generated schema, not by hand
- All components and hooks `import type { Order } from '@/features/orders/types/order'`, not directly from `@/generated/api/schema`
- When the backend schema changes: regenerate the client, then update the re-export file to match any renamed/added schemas
- **Query-parameter objects are re-exported the same way**, from the generated operation's query parameters, never hand-typed field by field: `export type OrderFilters = operations['getOrders']['parameters']['query'];`. Hand-writing the fields duplicates the backend contract and silently drifts when the controller's query params change.

## TanStack Query

- One file per feature for query keys: `features/<name>/api/query-keys.ts`
- One hook per resource bundling its queries and mutations — see [Hooks](#one-hook-per-resource)
- Mutations invalidate the relevant query keys explicitly — no over-broad invalidation
- Do not use `enabled: !!variable` to gate fetching — split the hook or use Suspense
- Do not put `useQuery` inside conditionals — split the component instead

## Tables & pagination

Every table is **server-side paginated**. Never fetch a full collection and paginate in the browser — dataset size is not a judgment call agents make per table.

- Tables use **[TanStack Table](https://tanstack.com/table)** with `manualPagination: true` (and `manualSorting` / `manualFiltering` when the server drives sorting/filtering)
- Page index, page size, sort, and filters live in **URL search params**, never `useState` (see [State management](#state-management))
- Default page size **20**; if the table offers a page-size selector, the options are 20 / 50 / 100
- The backend contract is the standard page envelope `{ content, page, size, totalElements }` — see [`spring-boot/RULES.md` § Pagination](../spring-boot/RULES.md#pagination); `totalElements` drives the page count
- The list query key includes the pagination state: `queryKeys.orders.list({ page, size, sort, filters })`
- Paginated queries set `placeholderData: keepPreviousData` so the table doesn't flash empty between pages

## Query-state rendering

Every query-backed view renders all three non-happy states explicitly — shipping only the happy path is an incomplete feature:

- **Loading** — a spinner; never a blank screen
- **Error** — a visible error message with a retry affordance (a button calling `refetch()`); never a silently swallowed error
- **Empty** — when the query succeeds with zero items: guidance text plus the primary action (e.g. "No orders yet" + a *Create order* button); an empty table body does not count

## Validation at boundaries — Zod

Data entering the app from any source TypeScript can't vouch for is validated with **[Zod](https://zod.dev/)** at the point of entry — never trusted and cast:

- **Forms** — every form has a Zod schema (see [Forms](#forms))
- **URL search params** — parsed through a schema (or the router's typed search params, e.g. TanStack Router's `validateSearch`) before use; a hand-rolled `Number(params.get('page'))` is forbidden
- **Env vars** — validated at startup (see [`vite/RULES.md` § Env validation](../vite/RULES.md#env-validation-fail-fast))
- **`localStorage` / `sessionStorage`** — parsed on read; storage contents survive deployments and can hold any old shape
- **Third-party / non-OpenAPI APIs** — responses parsed through a Zod schema in the API module

The org's **own backend** responses are the exception: their types are generated from the OpenAPI spec (see [API client](#api-client)), and hand-writing per-resource Zod schemas would duplicate that contract and drift. Contract safety there comes from regenerating the client whenever the spec changes — not from runtime parsing.

## Forms

- **[React Hook Form](https://react-hook-form.com/)** for any form with more than two fields
- **Zod** for validation via `zodResolver`; schemas live alongside the form (see [Validation at boundaries](#validation-at-boundaries--zod))
- Server errors map to specific fields via `setError`, not a top-level toast
- Submit behavior (pending state, disable, feedback) follows [Mutation UX](#mutation-ux)

```tsx
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  ...
}
```

### Edit-in-place forms reflect server truth — never optimistic local state

> **Hard rule. Do not deviate without explicit instruction.**

Any edit/save UI (inline edit forms, detail panels, toggles that persist) must show **only what the server has confirmed**. Local edits are a transient draft — they must never be presented as committed unless the API call succeeded.

- **On a successful mutation:** invalidate the React Query key, re-fetch the aggregate root, and reconcile the form/display from the **re-fetched server data**. Do not promote the submitted draft into the displayed baseline — if the server stored something different (or dropped a field), the UI must reveal that immediately, not on the next hard refresh.
- **On a mutation error:** do not exit edit mode and do not show the edited values as saved. Surface the error and keep the draft so the user can retry. Never commit local state on failure.
- **No optimistic updates** for these forms. The displayed (read-only) value is always derived from server state, never from the in-progress draft.

## Mutation UX

Every mutation trigger follows one fixed pattern — no per-screen improvisation:

- The triggering control is **disabled and shows a pending indicator** while the mutation is in flight (`isPending` from `useMutation`; spinner inside the button)
- **Failure** surfaces visibly: an error toast for non-form mutations; form-field errors map to fields via `setError` (see [Forms](#forms))
- **Success** gives visible feedback: the invalidated query re-renders the list/detail, plus a success toast for destructive or otherwise non-obvious operations

## Error handling

- **Exactly one app-wide `<ErrorBoundary />`** in `app/`, wrapping the router/app shell. A render crash shows a recoverable fallback — a short "something went wrong" message plus a reload/reset action — never a white screen, and reports the error to monitoring (Datadog, Sentry, etc.). Mounting point per framework: the root component for Vite, `__root.tsx` for TanStack Start, `app/global-error.tsx` for Next.js.
- **Per-feature error UI** for query/mutation errors ([Query-state rendering](#query-state-rendering) / [Mutation UX](#mutation-ux)) — expected failures never reach the boundary, and no global toast fires for every error. Framework route-level error files (e.g. Next.js segment `error.tsx`) count as per-feature error UI, not as additional app-wide boundaries.
- The API client throws **typed errors** (`ApiError` with status, code, message). Consumers narrow before handling.
- **Never `catch (e: any)`.** Use `catch (e: unknown)` and narrow.
- **No swallowed errors** ([`ENGINEERING_PRINCIPLES.md`](../../00-org-wide/ENGINEERING_PRINCIPLES.md) owns the ban): a caught error either triggers meaningful recovery or propagates to the feature's error UI / the boundary.

## Imports

Import order and alphabetization are enforced mechanically by `import/order` in the synced base config ([`.ai-docs/config/eslint.config.base.js`](../../config/eslint.config.base.js)) — the grouping lives there, not here.

Use **path aliases** (`@/...`) for everything outside the current feature. Long relative imports (`../../../shared/...`) are a smell.

## Accessibility

The baseline is enforced by `eslint-plugin-jsx-a11y` (strict preset, as errors) in the base config — labels on inputs, semantic interactive elements, keyboard operability, `alt`/`aria-label` coverage. The why the config can't carry: accessible markup also keeps accessibility snapshots — which Playwright and the `validate` skill work from — meaningful and stable.

## Tests

E2E with **Playwright** is how functional requirements are proven (org policy: [TESTING.md](../../00-org-wide/TESTING.md) — one named test artifact per requirement, planned before code is written).

### Playwright E2E

Setup (once per app, part of project init):

```bash
pnpm create playwright
pnpm exec playwright install --with-deps chromium
```

Conventions:

- One file per feature: `e2e/<feature-slug>.spec.ts`
- One `test()` block per functional requirement, named after the requirement
- Assert on **user-visible outcomes**, not internal state — what the user sees, not which function was called
- Use `data-testid` attributes when a stable selector is needed; never select by CSS class or auto-generated id
- Use a Page Object for any flow with more than 3 interaction steps; page objects live in `e2e/pages/`
- Run headed locally for debugging (`pnpm exec playwright test --headed`), headless in CI
- **Filter to one spec or test title with `pnpm exec playwright test <filter>`** (matches file path or test title substring). Do not use `pnpm test:e2e -- <filter>` — under `pnpm`, the `--` forwarding does not reach the underlying `playwright test` argument parser the way it does with `npm run`, so the filter is silently dropped and the full suite runs instead. `docs/plan.md`'s `### Test plan` "Run with" column must always use the `pnpm exec playwright test <filter>` form.

Example — the requirement "a signed-in user can create an order and sees it in the list":

```typescript
// e2e/order-creation.spec.ts
import { test, expect } from "@playwright/test";

test("a signed-in user can create an order and sees it in the list", async ({ page }) => {
  await page.goto("/orders");
  await page.getByRole("button", { name: "New order" }).click();
  await page.getByLabel("Customer").fill("Acme Corp");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("row", { name: /Acme Corp/ })).toBeVisible();
});
```

Whether the tests hit a real backend or the typed mock client is org policy — see [TESTING.md § Where E2E tests point](../../00-org-wide/TESTING.md#where-e2e-tests-point).

### Unit tests

- **Vitest** for genuinely complex pure logic only (parsers, calculators, state machines)
- React component unit tests via Testing Library + Vitest — only for components with non-trivial logic; pure presentation components are tested via E2E
- Test file lives next to the file under test: `format-date.ts` + `format-date.test.ts`

## ESLint and Prettier

ESLint and Prettier are the **CLI-first** quality gates for TS/React (see [`CODE_QUALITY.md`](../../00-org-wide/CODE_QUALITY.md) for the org-wide policy).

**The org rule set is code, not prose.** It ships as npm packages published and updated centrally — a client repo never hand-writes it, and a new rule is added in the [`KB---ConfigPackages`](https://github.com/K-B-Consultancy/KB---ConfigPackages) repo, not per project (org policy: [`CODE_QUALITY.md`](../../00-org-wide/CODE_QUALITY.md)).

### ESLint

Install `@k-b-consultancy/eslint-config` from GitHub Packages at the monorepo root, then extend it in the root `eslint.config.js`:

```javascript
import kbBase from "@k-b-consultancy/eslint-config";

export default [...kbBase /*, app-specific overrides last */];
```

The rule set itself lives in [`@k-b-consultancy/eslint-config`](https://github.com/K-B-Consultancy/KB---ConfigPackages) — see the package source; this file does not restate it. Intent notes the config can't carry:

- `no-console` exists because output belongs in the monitoring logger
- `max-lines` (200 for `.tsx`, 100 for `use[A-Z]*.ts` hooks) exists to force splitting components and extracting hooks, not restructuring to dodge the cap
- `no-restricted-imports` is the mechanical form of feature isolation ([Folder structure](#folder-structure-features-based))
- `local/no-direct-query-in-components` (the custom rule in `@k-b-consultancy/eslint-config`) is the mechanical form of "hooks own all data-fetching" ([Hooks](#hooks))
- `jsx-a11y` strict is the mechanical form of [Accessibility](#accessibility)
- `import/no-default-export` — Next.js apps re-enable default exports for framework files only, as an app-specific override (see [`nextjs/RULES.md`](../nextjs/RULES.md))

Required devDependencies are listed in the package — install them at the monorepo root, exact-pinned.

CI runs `eslint --max-warnings 0` and fails if `eslint.config.js` doesn't extend the base config (guard step in the `pr-checks.yml` template). Pre-commit hook runs ESLint on staged files only.

### Prettier

Install `@k-b-consultancy/prettier-config` from GitHub Packages at the monorepo root, then re-export it in the root `prettier.config.js`:

```javascript
export { default } from "@k-b-consultancy/prettier-config";
```

Editors format-on-save. CI runs `prettier --check`. Stylelint (CSS outside Tailwind) is cross-stack tooling — see [`CODE_QUALITY.md`](../../00-org-wide/CODE_QUALITY.md).

## What we don't do

- **Redux / MobX in new projects.** TanStack Query + small Context = enough.
- **CSS-in-JS runtimes** (styled-components, emotion). Tailwind covers it.
- **Tailwind v3 config style** (`tailwind.config.ts` with JS theme). v4 is CSS-first.
- **Component libraries that ship as dependencies** (MUI, Mantine, Chakra). shadcn/ui is the pattern — copy components in, own them.
- **Barrel files** (`index.ts` re-exporting everything in a folder) except as a feature's public API.
- **Custom hooks that wrap a single library hook with no added value.** Just use the library hook.
- **PropTypes.** TypeScript covers it; don't ship runtime overhead.

## For AI agents

- When implementing a new feature, **start by checking if the backend's OpenAPI spec already defines the types you need.** If yes, regenerate the client. If no, the contract needs to be added to the backend first — return to the orchestrator.
- When you're about to write a new UI primitive, **check shadcn/ui first**. If a component exists, `pnpm dlx shadcn@latest add <name>` to copy it in, then customize.
- When you need state, **walk the state management ladder** (local → URL → TanStack Query → Context → external library). Stop at the first one that fits.
- When adding a dependency, use the latest stable version and pin exactly (see [`DEPENDENCIES.md`](../../00-org-wide/DEPENDENCIES.md))
- When you see a `// eslint-disable-next-line` in code you're editing, look at why it's there. If it's a workaround, leave it. If it's lazy, fix the underlying issue and remove the disable.
