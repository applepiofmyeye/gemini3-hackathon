# Code Review

## Overview

Perform a comprehensive code review of the current changes. Identify issues across functionality, code quality, security, performance, and maintainability. Provide specific, actionable feedback with code examples for fixes.

**Works for:**
- **Local changes**: Uncommitted changes in working directory (`git diff`)
- **Branch changes**: Current branch vs main (`git diff main...HEAD`)
- **Specific files**: Files explicitly provided for review
- **PR review**: Changes in an existing pull request

## How to Determine What to Review

1. Run `git status` to see uncommitted changes
2. Run `git diff main...HEAD --name-only` to see files changed on this branch
3. If specific files are provided, focus only on those files
4. If the scope is unclear, ask what should be reviewed

## Review Process

1. **Understand Context**: Read commit messages, ticket references, or ask about intent if unclear
2. **Review Architecture**: Check if the approach is sound before diving into details
3. **Line-by-Line Review**: Examine each change methodically
4. **Test Coverage**: Verify tests exist and are meaningful
5. **Final Pass**: Check for consistency and completeness

## Review Categories

### 1. Functionality & Correctness

- [ ] Code does what it's supposed to do (matches requirements/ticket)
- [ ] Edge cases are handled (null, empty, boundary values, negative numbers)
- [ ] Error handling is appropriate and doesn't swallow errors silently
- [ ] No obvious bugs or logic errors (off-by-one, wrong operators, inverted conditions)
- [ ] Race conditions and concurrency issues are addressed
- [ ] State mutations are intentional and predictable
- [ ] Async/await patterns are correct (no floating promises, proper error handling)

### 2. Code Quality & Readability

- [ ] Code is readable and self-documenting
- [ ] Functions are small, focused, and do one thing well (Single Responsibility)
- [ ] Variable and function names are descriptive and consistent with codebase
- [ ] No code duplication (DRY principle applied appropriately)
- [ ] Follows project conventions and style guide
- [ ] No dead code, commented-out code, or unreachable branches
- [ ] Complex logic has clarifying comments explaining *why*, not *what*
- [ ] Magic numbers/strings are extracted to named constants
- [ ] Nesting depth is reasonable (max 3-4 levels)

### 3. Security

- [ ] No obvious security vulnerabilities (injection, XSS, CSRF)
- [ ] Input validation is present at trust boundaries
- [ ] Sensitive data is not logged or exposed in error messages
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Authentication/authorization checks are in place where needed
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] File operations validate paths (no path traversal)
- [ ] External data is sanitized before use

### 4. Performance

- [ ] No unnecessary database queries or N+1 query patterns
- [ ] Expensive operations are not in hot paths or loops
- [ ] Appropriate use of caching where beneficial
- [ ] No memory leaks (event listeners cleaned up, subscriptions unsubscribed)
- [ ] Large data sets are paginated or streamed
- [ ] Async operations are parallelized where possible
- [ ] No blocking operations on main thread (UI/Node event loop)

### 5. Error Handling & Resilience

- [ ] Errors are caught at appropriate boundaries (not everywhere)
- [ ] Error messages are informative without leaking internals
- [ ] Failed operations have appropriate fallback behavior
- [ ] Resources are cleaned up in error paths (try/finally, using patterns)
- [ ] External service calls have timeouts and retry logic where appropriate
- [ ] Validation errors provide actionable feedback

### 6. Testing

- [ ] New code has corresponding tests
- [ ] Tests cover happy path and important edge cases
- [ ] Tests are meaningful (not just for coverage)
- [ ] Test names clearly describe what's being tested
- [ ] No flaky tests or tests dependent on execution order
- [ ] Mocks/stubs are used appropriately (not over-mocked)

### 7. API Design (if applicable)

- [ ] API is intuitive and consistent with existing patterns
- [ ] Request/response schemas are validated
- [ ] HTTP status codes are used correctly
- [ ] API changes are backward compatible or versioned
- [ ] Error responses are structured and helpful

### 8. TypeScript Specific

- [ ] Types are accurate (no `any` escapes without justification)
- [ ] Nullability is handled properly (no `!` assertions without checks)
- [ ] Generics are used appropriately (not over-engineered)
- [ ] Type guards are used for narrowing where needed
- [ ] Interfaces/types match actual runtime behavior

### 9. React/Frontend Specific (if applicable)

- [ ] Components are appropriately sized (not doing too much)
- [ ] State is lifted appropriately (not prop drilling excessively)
- [ ] Effects have correct dependency arrays
- [ ] Keys are stable and meaningful (not array indices for dynamic lists)
- [ ] Event handlers are properly typed
- [ ] Loading and error states are handled in UI
- [ ] Accessibility basics are present (alt text, labels, semantic HTML)

### 10. Maintainability

- [ ] Code is modular and easy to modify
- [ ] No tight coupling between unrelated components
- [ ] Dependencies are appropriate (not pulling in heavy libs for simple tasks)
- [ ] Configuration is externalized where appropriate
- [ ] Logging is sufficient for debugging in production

## Red Flags to Watch For

**Immediate Concerns (must fix)**:
- Security vulnerabilities
- Data loss risks
- Breaking changes without migration
- Missing error handling on critical paths

**Strong Suggestions**:
- Significant performance issues
- Missing tests for complex logic
- Code that will be hard to maintain
- Violations of established patterns

**Nitpicks (optional)**:
- Style preferences
- Minor naming improvements
- Additional documentation suggestions

## Report Format

Provide feedback in this structure:

```
## Summary
[1-2 sentence overview of the changes and overall assessment]

## Critical Issues
[Must be fixed before merge - security, correctness, data integrity]

## Suggestions
[Recommended improvements - performance, maintainability, best practices]

## Minor/Nitpicks
[Optional improvements - style, documentation]

## Questions
[Clarifying questions about intent or edge cases]
```

For each issue, include:
1. **Location**: File and line reference
2. **Issue**: What's wrong and why it matters
3. **Fix**: Specific code example or approach to resolve
