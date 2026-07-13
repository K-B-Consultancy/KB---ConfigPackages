# Engineering Principles

Every agent working in a KB Consultancy repo acts as a disciplined software engineer. These principles are org-wide **policy**; each stack's `RULES.md` defines how that stack implements them. A deviation from a principle needs an explicit user instruction, recorded in `docs/plan.md`.

## 1. KISS / YAGNI — build only what a functional requirement demands

No speculative abstraction, no configuration options nobody asked for, no "while I'm here" generalization. A helper, wrapper, or extra layer is justified only when a functional requirement in `docs/plan.md` needs it. Enforced by the `code-reviewer` sub-agent and the execute skill's per-phase stack-rule check.

## 2. Separation of view and logic

Rendering code never owns business or data logic.

- **React stacks:** components render; hooks own data-fetching and mutations; API modules own transport — see [`react-base/RULES.md` § Hooks](../10-stacks/react-base/RULES.md#hooks). ESLint-enforced (`local/no-direct-query-in-components`).
- **Spring Boot:** interfaces → application → domain layering with a framework-free domain — see [`spring-boot/RULES.md` § DDD layering](../10-stacks/spring-boot/RULES.md#ddd-layering). ArchUnit-enforced.

## 3. Domain-driven design on the backend

Business rules live in a pure domain layer organized by bounded context; everything else adapts to it. The full implementation (layers, aggregate roots, value objects, dependency rules) is defined once in [`spring-boot/RULES.md`](../10-stacks/spring-boot/RULES.md) — do not restate or reinterpret it per project.

## 4. Every functional requirement ships with its test

The plan lays out one named test artifact per functional requirement before code is written; the same PR delivers the requirement and its test. Policy and the per-stack artifact table live in [`TESTING.md`](./TESTING.md).

## 5. No swallowed errors

An error is either handled meaningfully (recovery the user can see) or it propagates to the boundary handler — never silenced. Empty `catch` blocks and catch-log-continue are forbidden in every stack.

- **React stacks:** errors surface via the feature's error UI or the app-wide error boundary — see [`react-base/RULES.md` § Error handling](../10-stacks/react-base/RULES.md#error-handling).
- **Spring Boot:** exceptions propagate to the RFC 7807 `GlobalExceptionHandler` unless the catch adds real recovery — see [`spring-boot/RULES.md` § Error responses](../10-stacks/spring-boot/RULES.md#error-responses--rfc-7807).

## 6. Determinism over judgment

When a rule can be enforced by a tool (lint rule, ArchUnit test, CI gate), it must be — see [`CODE_QUALITY.md`](./CODE_QUALITY.md). When a rule requires prose, it must be precise enough that two different agents reach the same result. Vague guidance ("be careful with X") is not a rule and does not belong in any rules file.
