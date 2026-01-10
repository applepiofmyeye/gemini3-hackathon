# Security Review (LLM Applications)

## Overview

Perform a comprehensive security review of the current codebase **with LLM usage involved** and provide specific remediation steps **with code examples** for each security issue identified.

Assume the application may include one or more of:
- Chat/assistant UX
- Tool/function calling (agentic actions)
- Retrieval-Augmented Generation (RAG) over private or semi-private data
- File uploads processed by an LLM
- Streaming responses and/or markdown rendering
- Third-party model providers (OpenAI/Anthropic/Gemini/etc.) or self-hosted models

## Steps

1. **Authentication & Authorization (Baseline)**
    - Verify proper authentication mechanisms
    - Check authorization controls and permission systems (including tool-level authorization)
    - Review session management and token handling
    - Ensure secure password policies and storage (if applicable)
2. **Input Validation & Sanitization (Baseline + LLM)**
    - Identify injection vulnerabilities (SQL/NoSQL/command/template)
    - Check for XSS/CSRF (especially if rendering LLM output as HTML/markdown)
    - Validate all user inputs and API parameters
    - Review file upload and processing security (content-type validation, AV scanning, size/time limits)
3. **LLM Threat Model & Prompt Injection**
    - Identify prompt injection and jailbreak surfaces (user messages, retrieved docs, tool outputs, file contents)
    - Verify system/developer instructions are not overridden by untrusted inputs
    - Ensure the model is explicitly instructed to treat retrieved data/tool outputs as untrusted
    - Check for cross-tenant/cross-user context mixing and conversation state bleed
4. **Context & Data Exposure Controls**
    - Audit what data is sent to the model (PII, secrets, tokens, internal URLs, stack traces, source code)
    - Add allowlists/denylists/redaction before model calls (PII and secrets filters)
    - Ensure least-privilege context: only include the minimum necessary data and tool outputs
    - Review logs/traces for accidental prompt/response storage and sensitive leakage
5. **Tool / Function Calling & Agentic Actions**
    - Treat tool calls as privileged operations: enforce authorization on the server, not in prompts
    - Validate tool inputs against strict schemas; reject unexpected fields and oversized payloads
    - Add guardrails: allowlisted tools only, scoped capabilities, rate limits, and timeouts
    - Ensure tools cannot access raw secrets; use short-lived scoped credentials where needed
    - Prevent SSRF / internal network access via tools (URL allowlists, DNS rebinding defenses)
6. **RAG / Retrieval Security (If applicable)**
    - Prevent data exfiltration: enforce row-level access controls at retrieval time
    - Detect/mitigate data poisoning and malicious documents (ingestion validation, provenance, signing)
    - Ensure retrieval results are attributed and not blindly trusted (cite sources; treat as untrusted)
    - Verify embeddings/index do not leak sensitive data (encryption, tenancy isolation, retention)
7. **Output Safety & UI Security**
    - Prevent unsafe rendering: sanitize markdown/HTML; disable raw HTML; block script/iframe
    - Add output filtering for policy violations (PII leakage, secrets, self-harm, hate, etc.)
    - Ensure safe link handling (noopener/noreferrer; prevent `javascript:` URLs)
    - Mitigate prompt injection via the UI (e.g., avoid showing hidden instructions, isolate tool outputs)
8. **Model/Provider & Supply Chain**
    - Verify API keys and secrets management (no client exposure; rotate; least privilege)
    - Confirm data handling with provider (retention/training opt-out, region, DPA, compliance)
    - Pin model versions where feasible; monitor behavior regressions across model upgrades
    - Review dependency vulnerabilities and known CVEs (LLM SDKs, markdown renderers, parsers)
9. **Abuse Prevention & Cost Security**
    - Add rate limits, quotas, and anomaly detection (token spikes, repeated failures, tool abuse)
    - Prevent prompt stuffing / oversized inputs (hard limits, truncation strategy)
    - Implement safe retries/backoff; avoid infinite tool loops and runaway agents
    - Ensure billing/cost controls (max tokens, max tool calls, max wall-clock per request)
10. **Infrastructure Security**
    - Ensure HTTPS configuration and certificate validation
    - Analyze CORS policies and security headers
    - Review environment variables and configuration security
    - Harden outbound egress (restrict where the app/tools can connect)

## Security Review Checklist (LLM Applications)

- [ ] Verified proper authentication mechanisms
- [ ] Checked authorization controls (including tool-level authorization)
- [ ] Reviewed session management and token handling
- [ ] Validated all user inputs and API parameters (strict schemas)
- [ ] Checked for XSS/CSRF risks, especially around LLM output rendering
- [ ] Identified prompt injection and jailbreak surfaces
- [ ] Confirmed system/developer instructions cannot be overridden by untrusted inputs
- [ ] Audited and minimized data sent to the model (PII/secrets redaction)
- [ ] Ensured logs/traces do not store sensitive prompts/responses by default
- [ ] Verified tool/function calling is server-authorized and schema-validated
- [ ] Implemented SSRF and internal-network access protections for tools
- [ ] Verified RAG retrieval enforces access control and tenant isolation
- [ ] Added ingestion/provenance protections against RAG poisoning (if applicable)
- [ ] Sanitized markdown/HTML and disabled unsafe rendering paths
- [ ] Added output filtering for PII/secrets and policy-violating content
- [ ] Reviewed model/provider data retention and compliance posture
- [ ] Secured API keys (no client exposure; rotation; least privilege)
- [ ] Added rate limiting/quotas/anomaly detection for abuse + cost control
- [ ] Reviewed dependency security and known vulnerabilities
- [ ] Analyzed CORS policies and security headers

