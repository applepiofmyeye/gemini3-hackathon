# Remove AI Code Slop

Check the diff against `main` and remove AI-generated “slop” introduced in this branch while preserving behavior (unless the diff clearly introduces a bug).

Goal: code that looks like it was written by a good human contributor in **this** repo: consistent style, minimal ceremony, no unnecessary abstractions, and no fake safety.

## What to remove (common slop patterns)

### Comments that add no value

- Remove only truly redundant comments that add zero information (e.g., `// Set the value` above `value = 5`).
- Remove overly generic comments like "Handle errors", "Validate input", "Check if null" ONLY if they're immediately obvious from the code AND don't explain context.
- **Preserve comments that help understanding**, even if they seem to "restate code":
  - Comments explaining multi-step processes or complex logic flow
  - Comments that provide context about why something is done a certain way
  - Comments that explain non-obvious behavior or edge cases
  - Comments that help navigate complex code sections
- Keep comments that capture **intent**, **constraints**, **gotchas**, **why this is weird**, or **how this fits into a larger flow**.

### Over-defensive code in trusted paths

- Remove redundant checks when upstream validation/typing already guarantees invariants.
- Remove “paranoid” try/catch blocks that only rethrow, wrap without adding context, or swallow errors.
- Remove fallback branches that hide failures (e.g., returning empty arrays/strings) unless the product behavior requires it and it’s documented.

### TypeScript type slop

- Remove `any` casts used to silence errors.
- Replace `as any` / `as unknown as X` with proper types, narrowing, schema validation, or refactors that make the types true.
- Remove unnecessary generics/utility types that don’t improve correctness or readability.

### Structure and abstraction slop

- Inline needless helper functions created “just because”.
- Remove premature abstractions (e.g., single-use wrappers, factory functions with no variation).
- Prefer the simplest code that fits the existing codebase patterns.

### Error handling slop

- Avoid “catch everything → log → continue” unless this is a deliberate resilience boundary.
- Avoid overly verbose custom error messages that leak internals.
- Prefer adding context at boundaries (API handlers, job runners), not deep in leaf utilities.

## Quick workflow

1. Review the diff against `main` and identify suspicious additions:
    - New comments
    - New try/catch blocks
    - New validation/guards
    - New helper layers / indirection
    - `any` casts or type escapes
2. For each suspicious change:
    - Ask: does this improve correctness, clarity, or UX **in this repo’s style**?
    - If not, delete or simplify it.
3. Ensure behavior remains correct:
    - Keep necessary validation at trust boundaries (API routes, user input parsing, external services).
    - Keep errors observable (don’t swallow); add context only where it helps.

## Report format (keep it short)

At the end, respond with **only** a 1–3 sentence summary:
- What categories you removed (comments/guards/try-catch/type casts/abstractions)
- Which areas/files were impacted (high level, no line-by-line)