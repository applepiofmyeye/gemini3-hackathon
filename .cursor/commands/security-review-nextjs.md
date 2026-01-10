# Security Review (Next.js / React Websites)

## Overview

Perform a comprehensive security review of the current **Next.js + React** codebase and provide **specific remediation steps with code examples** for each security issue identified.

Assume the application may include one or more of:
- Next.js App Router and/or Pages Router
- Route handlers (`app/api/**/route.ts`) and/or API routes (`pages/api/**`)
- Middleware (`middleware.ts`) and edge runtime code
- Server Actions (`"use server"`)
- Client components (`"use client"`) with browser-side state and fetches
- Auth (NextAuth/Auth.js, Clerk, Firebase Auth, custom JWT/session cookies)
- Markdown/MDX rendering, CMS content, user-generated content
- File uploads and image optimization (`next/image`)
- Third-party embeds, analytics, and external scripts

## Steps

1. **Authentication & Session Management**
    - Verify auth is enforced server-side for protected pages, APIs, route handlers, and server actions
    - Confirm session cookies are `HttpOnly`, `Secure`, `SameSite` (appropriate for your flows), and have sane expirations
    - Ensure tokens (JWT/OAuth access tokens) are never exposed to client JS unless strictly required
    - Validate logout/session revocation behavior (especially for JWT-only setups)
    - Review password policies and secure storage if you manage credentials directly

2. **Authorization & Access Control**
    - Identify all protected resources and verify authorization checks happen on the server (not only in UI)
    - Review role/permission checks in API handlers, server actions, and data layer queries (row/record-level access)
    - Confirm no cross-user data leakage via caching, shared ISR/SSG output, or mis-scoped queries
    - Verify admin-only endpoints are not reachable via client-side “hidden routes”

3. **Input Validation & Injection Defense**
    - Validate all inputs at boundaries (route params, query strings, headers, cookies, request bodies, server action args)
    - Check for SQL/NoSQL injection, command injection, template injection, and unsafe `eval`-like usage
    - Ensure type coercion and parsing are strict (e.g., don’t trust `Number(req.nextUrl.searchParams.get("x"))` without checking)
    - Add size limits and timeouts to parsing/processing (JSON, form-data, uploads)

4. **XSS & Content Rendering Safety (React / Next.js)**
    - Locate any use of `dangerouslySetInnerHTML` and ensure content is sanitized/escaped correctly
    - Review markdown/MDX rendering pipelines: disable raw HTML unless necessary; sanitize if enabling it
    - Verify user-controlled URLs are not rendered into `href/src` without validation (block `javascript:` and other dangerous schemes)
    - Ensure external links opened with `target="_blank"` use `rel="noopener noreferrer"`
    - Check for DOM XSS in client components (e.g., writing untrusted content into `innerHTML`, `document.write`, `setAttribute`)

5. **CSRF & Browser-Side Request Safety**
    - Identify cookie-authenticated state-changing routes (POST/PUT/PATCH/DELETE) and ensure CSRF defenses exist
    - Confirm dangerous actions require explicit user intent (re-auth, confirmation, idempotency keys where appropriate)
    - Verify CORS is not used as a CSRF defense (it is not sufficient for cookie-based auth)

6. **SSRF, Open Redirects, and URL Handling**
    - Audit server-side `fetch` usage where URLs can be influenced by users (route handlers, server actions, server components)
    - Add URL allowlists and block internal address ranges for outbound requests where applicable
    - Review any `redirect()` / return-to / callback URLs for open redirect vulnerabilities (enforce allowlisted origins/paths)

7. **Next.js-Specific Caching, Rendering, and Data Leakage**
    - Review usage of `fetch()` caching, `revalidate`, `revalidatePath`, `revalidateTag`, and `unstable_cache`
    - Confirm personalized data is never cached/shared across users (especially with ISR/SSG, shared caches, CDNs)
    - Verify `cookies()` / `headers()` usage doesn’t accidentally force dynamic rendering for sensitive pages without proper auth
    - Ensure error pages, logs, and debug screens never expose secrets or internal stack traces in production

8. **Security Headers, CSP, and Platform Hardening**
    - Ensure baseline headers exist: `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options`,
      `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (HSTS), and sensible `Cache-Control` on sensitive routes
    - Validate CSP is compatible with Next.js runtime requirements and does not allow unsafe `script-src 'unsafe-inline'` unless justified
    - Confirm HTTPS is enforced end-to-end (including behind proxies/CDNs) and HSTS is appropriate for your domain strategy

9. **File Uploads, Images, and Static Asset Safety**
    - Validate uploads: MIME sniffing, extension checks, size/time limits, antivirus scanning where needed
    - Prevent stored XSS via uploaded SVG/HTML or mislabeled content types
    - Review `next/image` remote patterns and ensure you don’t allow arbitrary image proxying (SSRF via image optimization)
    - Ensure private uploads are not served from public buckets/paths without access control

10. **API Routes, Route Handlers, Middleware, and Server Actions**
    - Ensure request methods are enforced (reject unexpected methods) and responses avoid leaking sensitive error details
    - Add rate limits to auth, search, expensive queries, and any endpoints that can be abused for cost
    - Validate middleware logic cannot be bypassed (e.g., matcher patterns are correct and cover all protected routes)
    - Confirm server actions validate inputs and enforce auth/authorization (don’t rely on client-side gating)
    - Check edge runtime limitations (no accidental secret exposure via logs or error serialization)

11. **Secrets, Environment Variables, and Client Exposure**
    - Audit `process.env` usage; ensure secrets are not referenced in client components or shipped bundles
    - Verify `NEXT_PUBLIC_*` variables contain only non-sensitive values
    - Confirm no secrets are committed: `.env*`, service account JSON, provider keys, webhook secrets, database URLs with creds

12. **Dependencies, Supply Chain, and Build/Deploy**
    - Review dependency risks and known vulnerabilities (lockfile audit; pay attention to markdown parsers, auth libs, upload libs)
    - Confirm CI/CD does not leak secrets in logs and that preview deployments handle secrets correctly
    - Validate build output and sourcemap strategy (don’t publish sourcemaps containing sensitive URLs/tokens)
    - Ensure server runtime is patched and minimal (least-privilege environment variables and network egress where possible)

## Security Review Checklist (Next.js / React)

- [ ] Verified authentication enforcement across pages, APIs, route handlers, and server actions
- [ ] Checked server-side authorization (role/record-level) and prevented cross-user access
- [ ] Validated inputs at all boundaries; prevented SQL/NoSQL/command/template injection
- [ ] Audited XSS risks: `dangerouslySetInnerHTML`, markdown/MDX, unsafe URLs, and DOM sinks
- [ ] Implemented CSRF protections for cookie-authenticated state-changing requests
- [ ] Prevented SSRF via user-controlled server-side fetches (allowlists + block private ranges)
- [ ] Prevented open redirects in callback/return-to flows
- [ ] Reviewed Next.js caching/ISR/SSG for user data leakage and cache poisoning
- [ ] Added/verified security headers + CSP + HSTS (where appropriate)
- [ ] Secured uploads and `next/image` remote patterns (no arbitrary proxying)
- [ ] Hardened API routes/middleware/server actions (method enforcement, schema validation, rate limits)
- [ ] Ensured secrets are not exposed to client bundles (`NEXT_PUBLIC_*` hygiene)
- [ ] Audited dependencies, build artifacts, and deployment pipeline for supply-chain and leakage risks


