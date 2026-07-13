# AI Agent Contexts — Features, Design, Data

AI agents need three foundational contexts to produce reliable code — without them, features get built to the wrong spec, UIs look generic, and schema changes break undocumented invariants. This file explains what each context is, where it lives, who owns it, and how to keep it current.

## The three contexts

### 1. Features — what the app does

**Lives in:**

- Root `README.md` — client overview + apps table (one-paragraph descriptions)
- `apps/<name>/README.md` — full functional requirements per app, one section per feature

**Format:** human-readable markdown. Every functional requirement is a bullet point that an AI agent can read and a test framework can validate against (see [`TESTING.md`](./TESTING.md)).

**Owner:** Product Owner (writes them with Tech Lead review)

**Updated when:**

- A new feature is planned — **before** implementation starts
- A requirement changes — **as part of the same PR** as the code change
- A requirement is removed — same PR as the code removal

**Why it matters:** the README is the contract — "this is what done looks like." Without it the agent guesses at acceptance criteria and ships happy-path only.

### 2. Design — what the app looks like

**Lives in:** `apps/<name>/ai-docs/screenshots/<feature-slug>/<requirement-slug>.png` (plus `--state` and `__variant` suffixes — see [`NAMING.md`](./NAMING.md))

**Format:** PNG screenshots, ≤500 KB each, committed to git.

**Owner:** Product Owner with designer; Tech Lead reviews coverage

**Updated when:**

- A new visual feature is designed — add the snapshot
- The design changes substantially — replace the snapshot
- A state is added (error, empty, loading) — add a `--state` snapshot

**Importantly: not always available.** Many projects start without a designer involved, and screenshots are best-effort. When a screenshot isn't available, **note "no design reference yet"** next to the requirement in the README rather than leaving the absence ambiguous. The agent then knows it's making style decisions on its own.

For prototype phases (Lovable, Claude Code mock-ups, early Vite work), design mockups are generated with the org's external design-prompt agent (not part of these docs) from the functional requirements — that output becomes the first set of screenshots once the design is approved.

### 3. Data — the schema and its rules

**Lives in:**

- `docs/DATA_MODEL.md` — the human-facing description of the data model (conventions, bounded contexts, polymorphic patterns)
- `docs/class.puml` — the PlantUML class diagram (source of truth for entities and relationships)
- `docs/<aggregate>-state.puml` — one per aggregate root with non-trivial lifecycle

**Format:** PlantUML — plain text, version-controllable, AI-readable, renders in VS Code via the `jebbs.plantuml` extension. See [`DATA_MODEL.template.md`](../20-templates/DATA_MODEL.template.md) for conventions.

**Owner:** Backend lead

**Updated when:**

- A new entity is added — **before** the Flyway migration is written
- A relationship changes (1:1 → 1:N, optional → required) — **before** the code change
- A new state is added to an aggregate's lifecycle — **before** the code that performs the transition
- A bounded context is restructured — same PR as the code

**Why "before":** the data model is the contract the backend and every frontend share. A schema change without a diagram update leaves the next agent with an outdated mental model.

**The backend owns the model.** Frontends never define their own DTOs — types are generated from the backend's OpenAPI spec. See [`DATA_MODEL.template.md`](../20-templates/DATA_MODEL.template.md).

## Summary table

| Context  | Location                           | Owner            | Update trigger                     |
| -------- | ---------------------------------- | ---------------- | ---------------------------------- |
| Features | `README.md` (root + per-app)       | Product Owner    | Before implementation              |
| Design   | `apps/<name>/ai-docs/screenshots/` | PO with designer | When design is ready (best effort) |
| Data     | `docs/DATA_MODEL.md` + `*.puml`    | Backend lead     | Before schema/lifecycle changes    |

## Delivery modes — which contexts are mandatory

KB projects run in one of two delivery modes. The mode determines which contexts must exist **before implementation starts**; it is recorded in the project-specific section of the root `AGENTS.md` at init.

| Context  | Small fixed-price (cascade)                                     | Retainer (iterative, DDD-first)                                                        |
| -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Features | **Mandatory** — root `README.md` + per-app functional requirements | **Mandatory** — same                                                                     |
| Design   | Best effort — prototype screenshots or "no design reference yet" | **Mandatory per feature** — approved mockup/screenshot before the feature is implemented |
| Data     | Only if the project has a backend — `docs/DATA_MODEL.md` + `class.puml` | **Mandatory before implementation** — full DDD pass: bounded contexts, `class.puml`, and a `<aggregate>-state.puml` for every aggregate with a lifecycle |

Both modes start from a prototype shown to the client before real building begins (see the Lovable flow and [`GRADUATION.md`](../30-handoffs/GRADUATION.md)).

---

## Initialization workflow — new project

Run this **once**, after the technical init (see [`NEW_PROJECT_CHECKLIST.md`](../20-templates/NEW_PROJECT_CHECKLIST.md) for that). The Product Owner and Tech Lead do these together, ideally in one sitting.

### Features

- [ ] Write the **client overview paragraph** in root `README.md` — what the client does, who their users are, what this monorepo delivers
- [ ] List every planned app in the **apps table** in root `README.md` with a one-line purpose
- [ ] For each app, copy [`APP_README.template.md`](../20-templates/APP_README.template.md) to `apps/<name>/README.md`
- [ ] In each `apps/<name>/README.md`, list at least the **first three features** with their functional requirements (each requirement phrased so it's testable — see [`TESTING.md`](./TESTING.md))
- [ ] For each feature listed, note: "design reference: pending" or link to the screenshot path if it exists

You don't need every future feature in the README at init — only the ones the team is committed to building in the first phase. New features get added as they're committed to, before implementation.

### Design

- [ ] Decide whether the project will have a designer involved (yes / no / later)
- [ ] If yes: schedule a design review for the initial set of features; designer delivers PNGs into `apps/<name>/ai-docs/screenshots/`
- [ ] If no / later: generate a mockup for each feature with the org's external design-prompt agent; commit the resulting screenshots as the working reference
- [ ] In each `apps/<name>/README.md`, replace "design reference: pending" with the snapshot link or "no design reference (placeholder mockup generated)"

### Data

- [ ] Copy [`DATA_MODEL.template.md`](../20-templates/DATA_MODEL.template.md) to `docs/DATA_MODEL.md`
- [ ] Copy [`class.template.puml`](../20-templates/class.template.puml) to `docs/class.puml`
- [ ] Fill in the **initial bounded contexts** based on the features listed in each app's README
- [ ] Add the **initial aggregate roots** with their fields and relationships
- [ ] For any aggregate with a lifecycle (e.g., Order: draft → submitted → fulfilled), create `docs/<aggregate>-state.puml`
- [ ] Install the [PlantUML VS Code extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml) so the diagram renders in the side panel

You don't need the complete schema at init — only the entities needed to support the first phase's features. Schema grows as features grow.

### Verification

- [ ] Open Claude Code (or your preferred AI agent) at the repo root and ask: "What does this client do, what apps are in this monorepo, and what entities are in the data model?" If the agent can answer all three correctly from the docs alone, the contexts are good enough to start.

---

## Maintenance workflow — keeping contexts current

Drift is the silent killer of AI-agent reliability — old features still in the README, new entities missing from the diagram, stale screenshots. Run these checks regularly.

### Per-PR maintenance (every PR)

The author of any code-changing PR is responsible for keeping their PR's contexts current:

- [ ] If the PR **adds a feature**: it includes the functional requirements in the relevant `README.md` (or a justification why not, e.g., refactoring with no behavior change)
- [ ] If the PR **changes a feature**: it updates the requirement text in the README
- [ ] If the PR **adds an entity or relationship**: it updates `docs/class.puml`
- [ ] If the PR **adds a state transition**: it updates the relevant `<aggregate>-state.puml`
- [ ] If the PR **changes the UI substantially** AND a screenshot exists for the requirement: it updates the screenshot

Reviewers reject PRs that ship code changes without context updates (or without a noted justification).

### Triggers for unscheduled review

Some events trigger a context review immediately:

- **A major refactor** (architectural shift, new bounded context, library swap) — review all three contexts before merging
- **A new lead developer joining the project** — they should be able to onboard from the contexts alone; gaps they hit become tickets
- **A client meeting that surfaces a misunderstanding** ("we thought X worked differently") — the README likely lies somewhere; find and fix

## For AI agents

- When you're asked to implement a feature: **read the relevant `apps/<name>/README.md` first**, find the feature section, and treat its functional requirements as the spec. If a requirement is ambiguous, ask the user before implementing — don't guess.
- When you're asked to change the data model: **update `docs/class.puml` in the same PR as the code change**. A schema PR without a diagram update should be rejected by the reviewer; you can save them the round trip by including both.
- When you finish a feature: **check whether a screenshot exists for it**. If yes, take a fresh screenshot and compare; commit the update if the UI has diverged.
- When you find a discrepancy (the code says X but the README says Y), **stop and surface it**. Don't silently align the code to the README or the README to the code; the user needs to decide which is correct.
