# Add Documentation (Code + Engineering Journal)

## Overview

Write documentation that reads like it was authored by a senior engineer: high signal, explicit tradeoffs, and grounded in systems design. Every meaningful change should produce raw material that can later be consolidated into a public-facing post (with secrets/sensitive details removed).

Documentation includes:

- Standard docs (README updates, `docs/` pages, docstrings, minimal-but-meaningful inline comments)
- A required **engineering journal entry** for each feature/improvement/bug fix/investigation, written as “learnings” and structured so it can be shared with others later.

## Steps

1. **Decide documentation targets**
   - Identify what needs docs: feature behavior, public APIs, internal architecture, operational notes, and user-facing UX
   - Choose locations:
     - `README.md` for high-level usage and project overview
     - `docs/` for deeper design/architecture guides
     - Docstrings/types for API contracts and constraints
     - Inline comments only when they add non-obvious context (why/tradeoffs/invariants), not restating code
2. **Write standard documentation**
   - Overview: what it does, why it exists, who it’s for
   - API/contract docs: signatures, parameters, return values, errors, edge cases
   - Implementation details: architecture, critical paths, failure modes, dependencies/integrations, tradeoffs
   - Operational notes: config/env vars, rollout plan, observability, on-call/debug tips (where applicable)
   - Examples: common use cases, best practices, pitfalls
3. **Create an engineering journal entry (required for new work)**
   - Create a new markdown file under `docs/journal/` using the convention:
     - `docs/journal/YYYY-MM-DD__short-title.md`
   - Use the template in `docs/journal/_template.md`
   - Write it as a learning log you’d be happy to share with other engineers later:
     - The original issue + context
     - Motivation and goals (constraints: performance/security/cost/UX/time)
     - Options considered and why the chosen approach won (explicit tradeoffs)
     - Plan vs execution (what changed mid-flight and why)
     - Results (metrics if relevant; what improved, what didn’t, and why)
     - Follow-ups and next steps
   - Do **not** include secrets, private tokens, or sensitive customer/user data (redact aggressively)
4. **Polish & consistency**
   - Keep docs consistent with existing tone and structure in this repo
   - Prefer concrete examples over vague statements
   - Add links between docs: journal ↔ ticket/PR ↔ docs pages

## Add Documentation Checklist

- [ ] Identified what needs documentation and where it should live (README/docs/docstrings/inline)
- [ ] Explained what the code/feature does and why it exists
- [ ] Defined key concepts and terminology
- [ ] Documented function/method signatures (where applicable)
- [ ] Documented parameters, return values, and error modes
- [ ] Included example usage with code snippets
- [ ] Documented edge cases and common pitfalls
- [ ] Documented key design decisions, tradeoffs, and failure modes
- [ ] Created an engineering journal entry under `docs/journal/` using the template
- [ ] Captured motivation, options, plan vs execution, results, and learnings
- [ ] Added references/links (ticket, PR, commits, relevant docs)
