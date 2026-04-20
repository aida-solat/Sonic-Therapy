# Security Policy

## Supported Versions

Only the latest `master` branch and the currently deployed production build at [sonic.deciwa.com](https://sonic.deciwa.com) receive security updates.

| Version | Supported |
| ------- | --------- |
| `master` (latest) | ✅ |
| Older tags / forks | ❌ |

## Reporting a Vulnerability

**Please do not open public GitHub Issues for security vulnerabilities.**

Instead, report them privately via one of the following channels:

1. **GitHub Security Advisory** (preferred): [Open a private advisory](https://github.com/aida-solat/Sonic-Therapy/security/advisories/new)
2. **Direct contact:** open a GitHub Issue with the `[Security]` prefix and no sensitive details, and a maintainer will reach out to establish a private channel.

### What to include

- A clear description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept code, request payloads, or URLs)
- The affected component (API route, frontend page, audio pipeline, auth flow, billing, storage, etc.)
- Your preferred contact method for follow-up

### What to expect

- **Acknowledgement** within 72 hours
- **Initial assessment** within 7 days
- **Fix + disclosure timeline** coordinated with the reporter — typically 30–90 days depending on severity
- **Credit** in the release notes and SECURITY advisory (unless you prefer to remain anonymous)

## Scope

In-scope:

- The Sonic Therapy API (`src/`)
- The Sonic Therapy web dashboard (`web/`)
- The deployed production services (`sonic.deciwa.com`, `sonic-therapy-api.onrender.com`)
- The Supabase database schema and storage policies (`supabase/`)
- Stripe billing integration and webhook handling

Out-of-scope:

- Third-party services (Supabase, Stripe, Replicate, OpenAI, Vercel, Render) — please report directly to those vendors
- Denial-of-service attacks against shared infrastructure
- Social engineering of Deciwa personnel
- Issues requiring physical access to a user's device

## Medical / Safety Concerns

If you believe a generated audio track could pose a **health risk** (e.g., triggering photosensitive reactions, extreme volume, or misleading therapeutic claims), please report it via the same channel. Sonic Therapy is a wellness tool, not a medical device — see the Medical Disclaimer in [README.md](README.md).

---

Thank you for helping keep Sonic Therapy and its users safe.
