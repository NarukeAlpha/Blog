# TypeScript Structured Types Audit

## Goal

Tighten the app's TypeScript boundaries so we convert untrusted input into structured types once, then work with typed data instead of carrying `unknown`, `Record<string, unknown>`, or string coercion deeper into the code.

This document proposes the smallest sensible cleanup pass. It does not include any runtime behavior changes yet.

## Current State

`tsc --noEmit` passes today, but several boundaries are typed loosely enough that the compiler is not protecting the real data contracts as well as it could.

The issue is not that `unknown` exists at all. `unknown` is correct at true boundaries like:

- `request.json()`
- `JSON.parse(...)`
- third-party SDK responses
- caught errors

The problem is that some of those values are kept broad for too long instead of being parsed into a known application type immediately.

## Highest-Value Fixes

### 1. Type the Electron IPC boundary end to end

Files:

- `apps/studio/electron/preload.ts`
- `apps/studio/electron/main.ts`
- `packages/shared/src/types.ts`

Current issue:

- preload methods accept `payload: unknown`
- main handlers accept untyped payloads
- renderer code compensates with casts and defensive coercion

Proposed change:

- make the exposed preload object satisfy `StudioBridge`
- type each IPC handler payload using the shared request types already defined in `packages/shared/src/types.ts`
- remove redundant renderer-side result casts

Expected result:

- app-owned boundaries stay aligned with the shared contract
- `publishPost`, `publishBookmark`, and `saveSettings` become typed all the way through

### 2. Replace generic Convex studio request parsing with route-specific parsers

Files:

- `convex/http.ts`
- `packages/shared/src/types.ts`

Current issue:

- `request.json()` is cast to `Record<string, unknown>`
- handlers call `String(body.title || "")`, `String(body.url || "")`, and similar coercions

Proposed change:

- parse request JSON once per route
- convert it into a typed request shape like post publish input or bookmark publish input
- reject malformed request bodies explicitly instead of silently coercing them

Expected result:

- fewer ad hoc `typeof` checks in handlers
- stronger request contracts between studio and Convex HTTP routes

### 3. Type the studio HTTP client around concrete request and response contracts

Files:

- `apps/studio/lib/convex.ts`
- `packages/shared/src/types.ts`

Current issue:

- request bodies are `Record<string, unknown>`
- responses are returned as `payload as T`

Proposed change:

- use typed helper functions per endpoint instead of a single generic helper that accepts broad objects
- define a typed error payload for failed studio endpoint responses

Expected result:

- fewer unsafe casts
- clearer contracts for overview, post publish, and bookmark publish calls

### 4. Validate the settings file shape once after `JSON.parse`

Files:

- `apps/studio/lib/settings.ts`

Current issue:

- parsed JSON is asserted to `StoredStudioSettings`
- shape checking happens piecemeal afterward

Proposed change:

- add a small local guard that validates the parsed object shape once
- keep normalization logic, but operate on a known stored settings type afterward

Expected result:

- persisted configuration handling becomes easier to reason about
- fewer implicit assumptions around disk data

## Secondary Cleanup

### 5. Remove coercion that only exists because upstream types are weak

Files:

- `apps/studio/lib/publish.ts`
- `apps/studio/src/app.tsx`
- `apps/studio/src/components/studio-shell.tsx`

Current issue:

- already-typed payloads are re-coerced with `String(...)`
- renderer code still casts values that are already declared globally or returned from typed interfaces

Proposed change:

- after fixing IPC and HTTP contracts, simplify publish helpers to validate structured input directly
- remove casts like `window.studio as StudioBridge | undefined`
- remove casts on `studio.publishPost(...)` and `studio.publishBookmark(...)`

## OpenCode Boundary

Files:

- `apps/studio/lib/opencode.ts`

The OpenCode integration is a legitimate external boundary, so some runtime parsing is appropriate.

The cleanup here should be incremental:

- keep `unknown` at the SDK/network edge
- replace broad assertions with a few focused guards for health responses, session creation, and status maps
- keep the current structured bookmark extraction flow, since it is already doing the right kind of narrowing

## Suggested Order

1. Type the shared IPC and HTTP request and response contracts.
2. Wire those contracts through preload, Electron main, and `apps/studio/lib/convex.ts`.
3. Replace broad request parsing in `convex/http.ts`.
4. Tighten `settings.ts` persisted JSON parsing.
5. Remove now-redundant casts and string coercions.
6. Make the small OpenCode boundary cleanup pass.

## Non-Goals

- introducing a schema library unless the handwritten guards become repetitive
- changing site behavior or publish behavior in this first pass
- refactoring stable Convex domain logic that is already validated by `v.string()` and related validators

## Definition of Done

- app-owned boundaries do not accept `unknown` when a shared structured type is available
- `unknown` remains only at true external or parsing boundaries
- request parsing converts raw input into typed data once, early
- renderer and helper code stop relying on broad casts to recover lost type information
- `npx tsc --noEmit` still passes

## PR Scope

This branch intentionally contains documentation only.

If approved, the implementation PR should focus on the boundary typing cleanup above without broad unrelated refactors.
