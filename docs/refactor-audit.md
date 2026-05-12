# Refactor Audit & Optimization Plan

## Overview
This document outlines opportunities to refactor, optimize, and improve the architecture of the codebase without changing external behavior. It also details the strategic introduction of `Effect` (`effect-ts`) within the `convex/` backend to improve error handling, composability, and side-effect management.

**⚠️ CRITICAL CONSTRAINT:** `Effect` must **only** be used within the `convex/` backend environment. It should **not** be used in the React frontends (Studio, Site), as its concepts for state, side-effects, and dependency injection will collide with idiomatic React patterns (like Hooks, Context, and Suspense). React handles its own effects; we are utilizing `effect-ts` strictly to tame backend complexity.

---

## 1. Architectural Deepening & Refactoring

### A. Consolidate Serialization Logic (Mappers)
**Problem:** The codebase has multiple identical or nearly identical object mappers scattered across different files. For example, `serializePost` is defined in `convex/posts.ts`, `serializePublicPost` in `convex/public.ts`, and `serializeOverviewPost` in `convex/site.ts`. The same applies to AI Research records.
**Solution:** Extract these into a centralized `mappers` module (e.g., `packages/shared/src/mappers.ts` or `convex/mappers.ts`). 
**Benefits:**
- **Locality:** A single source of truth for the API response schemas.
- **LoC Reduction:** Eliminates duplicate mapping logic.
- **Maintainability:** Adding a new field to a post or research entry only requires updating one mapping function.

### B. Optimize Slug Generation (Performance)
**Problem:** Currently, unique slug generation in `convex/posts.ts` and `convex/aiResearch.ts` fetches the entire table into memory via `await ctx.db.query("...").collect()` just to check existing slugs.
```typescript
const existingEntries = await ctx.db.query("aiResearch").collect();
const slug = createUniqueSlug(title, existingEntries.map((entry) => entry.slug));
```
**Solution:** Update the slug generation logic to perform targeted lookups using the existing `by_slug` index, or fetch only the slugs.
**Benefits:**
- **Performance:** Prevents a severe bottleneck as the number of posts and research entries grows.
- **Memory Optimization:** Reduces unnecessary load on the Convex database and memory overhead in the runtime.

---

## 2. Introducing `Effect` to the Convex Backend

`Effect` provides a robust, functional approach to handling errors, async operations, and dependency injection. We will strictly use it on the backend (`convex/` directory) to avoid conceptual overlap with React on the frontend.

### A. Declarative Error Handling
**Problem:** The backend currently uses untyped `throw new Error("...")` for validation (e.g., missing titles or bodies).
**Solution:** Replace thrown errors with `Effect.fail` and typed error classes (e.g., `ValidationError`).
**Example:**
```typescript
class ValidationError extends Data.TaggedError("ValidationError")<{ message: string }> {}

const validateTitle = (title: string) => 
  title.trim() ? Effect.succeed(title.trim()) : Effect.fail(new ValidationError({ message: "Posts need a title." }));
```

### B. Managing Side Effects in Actions
**Problem:** The `bookmarks.ts` action handles thumbnail fetching using standard `try/catch` blocks around `fetch` and Convex storage calls. This can mask unexpected errors and is harder to test.
**Solution:** Wrap network requests and storage interactions in `Effect.tryPromise`.
**Example:**
```typescript
const fetchThumbnail = (url: string) => 
  Effect.tryPromise({
    try: () => fetch(url),
    catch: (error) => new NetworkError({ error })
  });
```

### C. Dependency Injection for Convex `ctx`
**Problem:** The Convex `ctx` object (which contains `db`, `storage`, etc.) has to be passed deeply down the call stack to utility functions.
**Solution:** Define an `Effect.Context` tag for `ConvexCtx`. Pure business logic can yield the context without needing it passed as an argument.
**Example:**
```typescript
export class ConvexDB extends Context.Tag("ConvexDB")<
  ConvexDB,
  { insert: (table: string, data: any) => Promise<string>, query: ... }
>() {}

// Usage inside a generator
const insertPost = (data: PostData) => Effect.gen(function* () {
  const db = yield* ConvexDB;
  return yield* Effect.tryPromise(() => db.insert("posts", data));
});
```

### D. Composable Mutation Pipelines
**Execution:** We will refactor complex handlers (like `publish` in `posts.ts` and `bookmarks.ts`) into `Effect.gen` pipelines. These pipelines will:
1. Validate inputs.
2. Resolve side-effects (like fetching thumbnails or generating slugs).
3. Perform database operations.
4. Return serialized data.

```typescript
handler: async (ctx, args) => {
  const program = Effect.gen(function* () {
    const input = yield* validatePostInput(args);
    const slug = yield* generateSlug(input.title);
    const entryId = yield* insertPost(slug, input);
    return yield* fetchAndSerializePost(entryId);
  });

  // Execute the program, providing the Convex DB context
  return Effect.runPromise(
    Effect.provideService(program, ConvexDB, ctx.db)
  );
}
```

---

## Action Plan

1. **Install Dependencies:** Run `npm install effect` in the root workspace.
2. **Phase 1: Refactoring:** Extract `mappers.ts` and consolidate the serialization logic across `convex/*.ts`.
3. **Phase 2: Optimization:** Fix the `.collect()` logic in `posts.ts` and `aiResearch.ts` for efficient slug lookups.
4. **Phase 3: Effect Integration (Mutations):** Refactor `posts.ts` and `aiResearch.ts` validation and insertion logic to use `Effect.gen` and typed errors.
5. **Phase 4: Effect Integration (Actions):** Refactor `bookmarks.ts` thumbnail fetching logic to leverage `Effect` for safer side-effects.