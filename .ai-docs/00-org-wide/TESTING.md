# Testing Philosophy

## The core rule

**Every functional requirement gets a test.** If you can describe a behavior in an app's `README.md`, there must be a test that exercises it.

Every app has a test suite from project init (see [`NEW_PROJECT_CHECKLIST.md`](../20-templates/NEW_PROJECT_CHECKLIST.md)). If you find an app without one, do not improvise a suite mid-task and do not silently skip testing: flag it to the user, and add the suite as its own phase in the plan before (or alongside) the feature work.

The form of the test depends on the stack. Each stack's `RULES.md` § Tests explains **how** to write them; this file only defines the policy:

| Stack | Test artifact per functional requirement | Where | How-to |
|---|---|---|---|
| Spring Boot API | Test method in the controller's BDD test class (MockMvc + Testcontainers) | `src/test/java/.../interfaces/rest/` | [`spring-boot/RULES.md`](../10-stacks/spring-boot/RULES.md) |
| Vite / React | Playwright `test()` block | `e2e/<feature-slug>.spec.ts` | [`react-base/RULES.md`](../10-stacks/react-base/RULES.md) |
| TanStack Start | Playwright `test()` block | `e2e/<feature-slug>.spec.ts` | [`react-base/RULES.md`](../10-stacks/react-base/RULES.md) |
| Next.js | Playwright `test()` block, plus server function tests | `e2e/` and `__tests__/` | [`react-base/RULES.md`](../10-stacks/react-base/RULES.md), [`nextjs/RULES.md`](../10-stacks/nextjs/RULES.md) |
| React Native | Maestro flow | `.maestro/flows/<requirement-slug>.yaml` | [`react-native/RULES.md`](../10-stacks/react-native/RULES.md) |

Unit tests are permitted for genuinely complex pure logic (a price calculator, a state machine, a parser) but are not the primary deliverable. **Coverage is not a target.** A 90%-covered app whose only assertion is `expect(true).toBe(true)` is worse than a 30%-covered app whose tests prove each requirement.

## The test plan

Tests are laid out **at planning time**, not improvised during implementation. The `plan` skill writes a `### Test plan` section into `docs/plan.md` mapping every functional requirement to exactly one named test artifact from the table above. The `execute` skill creates each artifact in the same phase that implements its requirement, and the phase's verification includes running it. The `validate` skill cross-checks that every row of the test plan exists on the branch and passes before the PR opens.

## API behavior tests (Spring Boot)

BDD-style API behavior tests against the real Spring MVC stack (MockMvc + Testcontainers). The full conventions and examples live in [`spring-boot/RULES.md` § Tests](../10-stacks/spring-boot/RULES.md#tests--bdd-style).

## E2E tests (frontend) — Playwright

We standardize on **[Playwright](https://playwright.dev/)** for E2E across all web frontends: CI-grade test runner, official MCP server ([`playwright-mcp`](https://github.com/microsoft/playwright-mcp)) so AI agents can drive it like humans do, traces/screenshots for debugging. Writing conventions, setup commands, and an example spec live in [`react-base/RULES.md` § Tests](../10-stacks/react-base/RULES.md#tests).

### Agent-driven browser verification (Playwright MCP)

Besides the spec files above, the `validate` skill drives the app **interactively** through the Playwright MCP server — it signs in as the seeded test user and walks through each functional requirement like a human tester. This is per-branch verification, not persistent coverage; it writes no spec files.

Configure the server once per client repo in `.mcp.json` at the root:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@<exact-version>", "--isolated"]
    }
  }
}
```

- Pin `<exact-version>` to the latest stable release per [`DEPENDENCIES.md`](./DEPENDENCIES.md) — no `@latest`.
- `--isolated` keeps browser sessions profile-less, so runs leave no state behind.
- The agent works from accessibility snapshots (text), not screenshots — screenshots are taken only as failure evidence and go to the OS temp dir, never the repo.

Requirements this mode depends on (see [`NEW_PROJECT_CHECKLIST.md`](../20-templates/NEW_PROJECT_CHECKLIST.md)):

- A seeded **test user**, with `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` in the app's untracked env file (names mirrored in `.env.example`)
- A `## Verification viewports` declaration in the root `AGENTS.md` (see `ROOT_AGENTS.template.md`)
- A non-production data target — the validate skill hard-refuses to run against production data

### Where E2E tests point

**Rule:** E2E tests run against a real backend when a test environment exists. When it does not, they run against a typed mock of the API client.

| Environment | What the E2E test calls |
|---|---|
| Client has a test environment | `VITE_API_URL` pointed at the test environment; tests hit the real API |
| No test environment | Mock the API client (see below) |

### Inducing error/empty states against a real backend

A real test-environment backend generally can't be told to return a 500 or an empty collection on demand for a specific test case. Use Playwright's [`page.route()`](https://playwright.dev/docs/network#modify-requests) to intercept and fabricate the response for that one request, scoped to a single `test()` block:

```typescript
test("shows an error state when the orders request fails", async ({ page }) => {
  await page.route("**/api/orders", (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ message: "Internal error" }) }),
  );
  await page.goto("/orders");
  await expect(page.getByText("Something went wrong")).toBeVisible();
});
```

This is **not** the forbidden mocking pattern above — it does not replace the API client, it does not run for tests other than the one that calls it, and every other test in the file still exercises the real backend. Use it only for states the real backend cannot be driven into through normal test data (server errors, timeouts, malformed responses); reach genuinely reachable empty/error states (no orders yet, invalid form input) through real data and real interactions instead of interception.

### Mocking the API client (when no test environment is available)

Each frontend wraps the generated client in `src/shared/api/client.ts` (see [`react-base/RULES.md`](../10-stacks/react-base/RULES.md)). To mock it for E2E:

1. Generate the API client and types from the backend's OpenAPI spec (see [`DATA_MODEL.md`](../20-templates/DATA_MODEL.template.md))
2. Create `src/shared/api/client.mock.ts` next to `client.ts` that imports the **same generated types** and provides mock implementations:

   ```typescript
   import type { UserResponse, CompanyResponse } from '@/generated/api/schema-aliases';

   export const mockApiClient = {
     getCurrentUser: async (): Promise<UserResponse> => ({
       id: '00000000-0000-0000-0000-000000000001',
       email: 'mock@example.com',
       role: 'ADMIN',
     }),
     getCompanies: async (): Promise<CompanyResponse[]> => [
       { id: '00000000-0000-0000-0000-000000000002', name: 'Mock Co' },
     ],
   };
   ```

3. When the API contract changes (generated types change after regeneration), `client.mock.ts` produces **TypeScript errors**. The errors must be resolved before the change can land — this is the contract enforcement mechanism.
4. The test harness swaps in the mock client at runtime when `VITE_API_URL` is unset or `VITE_USE_MOCK_API=1`.

This is the **only** mock pattern — prototypes use the same file layout (they follow these same rules via `.ai-docs/` — see [`LOVABLE.md`](../30-handoffs/LOVABLE.md)), so graduated projects don't need restructuring.

**Never** use untyped mocks (`jest.fn()` returning `any`) for API responses. They silently survive contract changes and let regressions ship.

## What does not count as a test

- A test that mocks the thing it claims to test (mocking the API client to test the API client)
- A test that only checks types compile
- A test that has no assertion
- A test that asserts on an implementation detail when a behavior assertion would do (e.g., `expect(useState).toHaveBeenCalled()` instead of `expect(screen.getByText(...)).toBeVisible()`)

## For AI agents

First, check whether the app has a test suite (look for test scripts in `package.json`, a `src/test/` directory, an `e2e/` directory, or equivalent). If no test suite is present, flag it to the user and add suite setup as its own plan phase — do not improvise a suite inline, and do not skip testing silently.

When you are adding a new functional requirement:

1. Add the requirement to the app's `README.md`
2. Implement the feature
3. **Write the test that proves the requirement.** This is not optional and not deferrable.
4. Run the test suite — the new test must pass, and no existing test may break

When you are fixing a bug:

1. Write the test that **reproduces** the bug first — it should fail before your fix
2. Fix the bug — the test now passes
3. Commit both the test and the fix together

Tests are part of every functional requirement's definition of done — they ship in the same PR as the feature. Spike work is an explicit exception: confirm it with the user and tag the commit as a spike so it gets removed or properly tested later.
