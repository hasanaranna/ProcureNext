# ProcureNext — Development Tracker

Last updated: 2026-08-30

Use this file to track progress. Mark items with `[x]` when done, `[~]` when in progress, or leave `[ ]` for not started.

**Legend**
- **P0** — Broken or misleading today; fix first
- **P1** — Core product gap
- **P2** — Polish / nice-to-have
- **P3** — Large scope / later phase

**Audit baseline:** `ProcureNext_Completion_Audit.pdf` reviewed **main @ `d59a56c`** (2026-08-30).  
Sections below map audit findings → tracker status. **Post-audit work** is on the working branch (uncommitted).

---

## Quick status

| Area | Audit (main @ d59a56c) | Now | Notes |
|------|------------------------|-----|-------|
| Auth & org signup | Partial | Partial | Login works; no reset/2FA/OTP |
| Tender lifecycle | Partial | **Mostly done** | Draft/publish/edit/cancel/delete/auto-close added post-audit |
| Bidding & comparison | Done | Done | Accept bid → award (still no formal NOA) |
| Messaging & notifications | Done | Done | + notification tests (was 0 at audit) |
| Token balance | Partial | Partial | Ledger real; gateway still simulated |
| Public tenders page | **Broken** | **Fixed** | API path + mock fallbacks removed |
| Admin guards | **Missing** | **Fixed** | `get_current_admin` on sensitive routes |
| Audit middleware | **Inactive** | **Active** | Mounted in `main.py` post-audit |
| Request logging | **Missing** | **Active** | `RequestLoggingMiddleware` implemented + mounted |
| Users module | **Stub** | **Partial** | `users` mounted; change-password UI at `/change-password` |
| Restricted visibility | Not started | Not started | Stored in DB, not enforced |
| Search / recommendations | Not started | Not started | 7 stub modules still unmounted |
| Contracts & evaluations | Not started | Not started | Stub modules only |
| Tender delete | Broken (schema) | **Fixed** | `reference_type` → `action_url` cleanup |

**Tests:** 280 passed, 2 skipped (post-audit; audit noted notifications had zero tests).

---

## Audit findings — resolved since main @ d59a56c

| # | Audit finding | FR | Resolution |
|---|---------------|-----|------------|
| 7 | Public tenders frontend called `/api/v1/...`, fell back to fake data | FR-02 | Phase 1 — correct proxy path, error states |
| — | Admin endpoints unguarded | FR-21 | Phase 1 — `Depends(get_current_admin)` + tests |
| — | No draft / edit / cancel workflow | FR-08 | Phase 2 — full lifecycle API + UI |
| 4 | Audit middleware never registered | FR-22 | Phase 9 — `AuditMiddleware` mounted |
| — | Request logging comment-only | infra | Phase 9 — implemented + mounted |
| — | Notifications module untested | — | 14 router/service + middleware tests |
| — | Seller dashboard stats hardcoded (15 / 6) | FR-15 | Phase 5 partial — live API counts on home |
| — | Tender delete failed (`reference_type` missing) | FR-08 | Fixed `delete_notifications_for_tender()` |
| 7 | `users` router comment-only stub | FR-05/06 | Phase 7 — profile/password/documents API mounted |

## Audit findings — still open

| # | Audit finding | FR | Tracker |
|---|---------------|-----|---------|
| 1 | Seven stub modules unmounted (search, contracts, …) | FR-03,09,12,13,14,23,24 | Phase 7 |
| 2 | SSLCommerz simulated; no webhook | FR-18, FR-25 | Phase 8/9 |
| 3 | No password reset, logout blacklist, 2FA, OTP | FR-05 | Phase 8 (API only for password change) |
| 5 | `core/permissions.py` empty; no RBAC | FR-04, FR-06 | Phase 9 |
| 6 | Alembic unconfigured; schema drift risk | infra | Phase 9 (deferred) |
| — | Restricted tenders visible to all vendors | FR-12 | Phase 3 |
| — | No contracts module / post-award flow | FR-13 | Phase 4 |
| — | No formal NOA; no bid-bond refunds | FR-11, FR-19 | Phase 4 |
| — | Admin KPIs hardcoded | FR-21 | Phase 5 |
| — | Semantic search / embeddings read-only | FR-03 | Phase 5 |
| — | Recommended sellers placeholder | FR-09 | Phase 5 |
| — | Rate limiting middleware not mounted | infra | Phase 9 |

## FR ledger (audit → current)

Status key: **Done** · **Partial** · **Not implemented** · **Fixed post-audit**

| FR | Audit (main) | Current | Change since audit |
|----|--------------|---------|-------------------|
| FR-01 | Done | Done | — |
| FR-02 | Partial (broken frontend) | **Partial → fixed path** | Public API wired; still over-exposes data to anon users |
| FR-03 | Not implemented | Not implemented | — |
| FR-04 | Partial | Partial | Org signup works; no OTP/email verify |
| FR-05 | Partial | **Partial+** | Password change UI + API; reset/2FA still missing |
| FR-06 | Partial | Partial | Admin verify works; join-by-code flow missing |
| FR-07 | Done | Done | — |
| FR-08 | Partial | **Mostly done** | Draft/publish/edit/cancel/delete/auto-close added |
| FR-09 | Not implemented | Not implemented | — |
| FR-10 | Done | Done | — |
| FR-11 | Partial | Partial | Still no formal NOA / refunds |
| FR-12 | Not implemented | Not implemented | — |
| FR-13 | Not implemented | Not implemented | — |
| FR-14 | Not implemented | Not implemented | — |
| FR-15 | Partial (hardcoded stats) | **Partial+** | Seller stats now from API |
| FR-16–17 | Partial | Partial | — |
| FR-18 | Partial | Partial | Sandbox purchase unchanged |
| FR-19 | Not implemented | Not implemented | — |
| FR-20 | Partial | Partial | — |
| FR-21 | Partial | **Partial+** | Admin guards added; KPIs still hardcoded |
| FR-22 | Built, inactive | **Active** | Middleware mounted |
| FR-23–26 | Not implemented | Not implemented | — |

Audit headline (**main @ d59a56c**): ~11.5% done · 46.2% partial · 42.3% not implemented across 26 FRs. Post-audit work improves FR-02, FR-08, FR-15, FR-21, FR-22 materially but does not close the seven stub-module gap.

---

## Phase 1 — Fix what's broken (P0)

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [x] | Public tenders API path | — | `public-tenders/page.tsx`, `public-tenders/[id]/page.tsx` | Change `/api/v1/tenders/...` → `/api/tenders/public/...` |
| [x] | Remove fake public tender fallbacks | — | `public-tenders/*` | Show error state instead of `FALLBACK_PUBLIC_TENDERS` |
| [x] | Admin auth guards | `admin/router.py` | — | Add `Depends(get_current_admin)` to `pending-accounts`, `verify`, `GET pricing` |
| [x] | Unskip admin security tests | `tests/test_admin/test_admin_router.py` | — | After guards are wired |
| [x] | Clarify draft UX | — | `new-tender/page.tsx` | Renamed to “Saved on this device”; fixed restore race |

---

## Phase 2 — Tender lifecycle (P1)

### Draft & publish

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [x] | Save tender as Draft | `tenders/service.py`, `router.py` | `new-tender/page.tsx` | `POST /buyer/draft-with-documents` |
| [x] | Publish draft endpoint | `POST /tenders/{id}/publish` | `view-my-tender/[id]/page.tsx` | Draft → Published + token deduct |
| [x] | Draft list on buyer home | `GET /buyer/my-tenders?status=` | `home/page.tsx` | Draft filter added |
| [ ] | Scheduled publish (optional) | Celery beat job | Date picker UX | Publish at `tender_public_date` |

### Edit tender

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [x] | Update tender API | `PUT /tenders/{id}`, `update_tender()` | — | Rules: Draft freely; Published only if no bids |
| [x] | Edit tender page | — | `app/edit-tender/[id]/page.tsx` | New route |
| [x] | Edit action on buyer tender view | — | `view-my-tender/[id]/page.tsx` | Link from workbench |

### Cancel / delete

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [x] | Soft withdraw (Cancelled status) | `POST /tenders/{id}/withdraw` | `view-my-tender/[id]` | Distinct from hard delete |
| [ ] | Vendor refunds on cancel | `tasks/payment_tasks.py` | — | `process_tender_cancel_refunds` — deferred |
| [x] | Delete tender UI + notification cleanup | `delete_tender()`, `notifications/service.py` | `view-my-tender/[id]` | Fixed legacy `reference_type` SQL; uses `action_url` |
| [x] | Cancel vs delete UX | — | Confirmation modals | Delete=draft/no-bids; Cancel=published |

### Auto-close & status

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [x] | Auto-close expired tenders | Celery beat: `auto_close_expired_tenders()` | — | Hourly via worker `--beat` |
| [x] | Show Closed/Cancelled on cards | — | `TenderCard`, home filters | Status badges + filters |

---

## Phase 3 — Restricted visibility & invitations (P1)

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [ ] | Invitations module | `invitations/router.py`, `service.py` | — | Register in `main.py` |
| [ ] | Invite vendors to tender | `POST /tenders/{id}/invite` | `new-tender` invite picker | Uses `tender_invitations` table |
| [ ] | Vendor invitation inbox | `GET /vendor/invitations` | New page/route | Accept / decline |
| [ ] | NDA upload & status | `check_nda_status()` | NDA sign UI | Required before bid |
| [ ] | Central access check | `permissions.py` or service helper | — | `validate_restricted_access()` |
| [ ] | Enforce on seller list | `get_all_published_tenders()` | — | Hide Restricted unless invited |
| [ ] | Enforce on tender detail | `get_tender_detail()` | — | |
| [ ] | Enforce on bid submit | `bids/service.py` | — | Block if not invited + NDA |
| [ ] | Visibility toggle on create | — | `new-tender/page.tsx` | Stop hardcoding `"Public"` |
| [ ] | `security_required` toggle | — | `new-tender/page.tsx` | Currently always `false` |

---

## Phase 4 — Post-award (P1–P2)

### Evaluations & awards

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [ ] | Evaluation scoring API | `evaluations/` module | Buyer workbench | `UnderEvaluation` workflow |
| [ ] | NOA issuance | `evaluations/router.py` | — | |
| [ ] | Vendor NOA acceptance | — | Seller UI | Credit deduction |
| [ ] | Publish award results | `publish_award()` | Public/buyer view | |
| [ ] | Bid-bond refunds to losers | `payment_tasks.py` | — | On award acceptance |

### Contracts

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [ ] | Contracts module | `contracts/router.py`, `service.py` | — | Register in `main.py`; `contracts` table exists |
| [ ] | Auto-create contract on award | `bids/service.py` hook | — | |
| [ ] | Contract milestones & signing | CRUD endpoints | Ongoing tender UI | |

### Amendments & clarifications

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [ ] | Amendments DB + API | New table + `POST /tenders/{id}/amendments` | Upload UI | Notify vendors |
| [ ] | Clarifications Q&A | New table + endpoints | Buyer + vendor UI | Thread per question |

---

## Phase 5 — Discovery & intelligence (P2)

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [ ] | Semantic tender search | `search/` module + ML | Home search input | pgvector + embeddings |
| [ ] | Search filters & pagination | `search/filters.py` | — | |
| [ ] | Vendor recommendations | `vendor_intelligence/` + ML | “Recommended” tab | Uses `tender_vendor_suggestions` |
| [ ] | Recommended sellers (buyer) | API endpoint | `view-my-tender/[id]` | Replace placeholder text |
| [x] | Real seller dashboard stats | Aggregate from bids + ongoing APIs | `home/page.tsx` | Was hardcoded 15/6 per audit |
| [ ] | Real admin dashboard KPIs | `reports/` module | `admin-home/page.tsx` | Replace hardcoded stats |
| [x] | Home tender search | Client filter on dashboard | `home/page.tsx` | Title, description, org name |

---

## Phase 6 — Multi-lot tenders (P3 — large scope)

| Done | Task | Backend | Frontend | Notes |
|:----:|------|---------|----------|-------|
| [ ] | `tender_lots` table | `init.sql` migration | — | New schema |
| [ ] | Lot CRUD API | `create_lot`, `update_lot`, `delete_lot` | — | Comment-only today |
| [ ] | Per-lot bidding | `bids/` changes | Bid form | Major refactor |
| [ ] | Lot builder UI | — | `new-tender`, edit page | |

---

## Phase 7 — Stub backend modules

Register in `main.py` only after implementation.

| Done | Module | Key endpoints | Notes |
|:----:|--------|---------------|-------|
| [x] | `users` | Profile, password, documents | `GET/PUT /api/users/me/*`; settings/report/delete deferred |
| [ ] | `search` | `/search-jobs`, vendor/org search | Org search partially in `/api/org/search` |
| [ ] | `invitations` | Tender vendor invites, NDA | See Phase 3 |
| [ ] | `contracts` | Full contract lifecycle | See Phase 4 |
| [ ] | `evaluations` | Scoring, NOA, publish award | See Phase 4 |
| [ ] | `disputes` | CRUD + admin resolution | Needs DB table |
| [ ] | `reports` | Analytics, exports | |
| [ ] | `public` | CMS for about/news/events | Or keep static frontend pages |
| [ ] | `vendor_intelligence` | Skills, reviews, recommendations | See Phase 5 |

---

## Phase 8 — Frontend polish & cleanup (P2)

| Done | Task | File(s) | Notes |
|:----:|------|---------|-------|
| [x] | Seller bid update / withdraw | `bid-for-tender`, `view-my-bids` | Wired to existing `PUT/DELETE /api/bids/{id}` |
| [x] | Change password page | `change-password/page.tsx` | Sidebar links to `/change-password` |
| [ ] | Admin audit log viewer | New admin page | Backend `/admin/audit/*` exists |
| [x] | Delete dead `InviteModal.tsx` | — | Removed unused component |
| [x] | Fix stale auth header pattern | `InvitationSection` | Cookie auth via `credentials: 'include'` |
| [x] | Bid comparison error handling | `view-my-tender/[id]` | Removed fake fallback metrics |
| [ ] | Richer `TenderCard` | Component | Status, deadline, actions menu |
| [ ] | Production payment gateway | `ManageTokensModal` | Replace sandbox simulation |
| [ ] | Host hero image locally | `lib/constants.ts` | External URL today |
| [x] | Home tender search | `home/page.tsx` | Client-side title/org filter |
| [x] | Buyer workbench emoji cleanup | `view-my-tender/[id]` | Professional tab labels |

---

## Phase 9 — Infrastructure & security (P2)

| Done | Task | Location | Notes |
|:----:|------|----------|-------|
| [ ] | Rate limiting middleware | `middleware/rate_limiter.py` | Documented in `main.py`, not mounted |
| [x] | Request logging middleware | `middleware/request_logging.py` | Mounted; JSON logs + `X-Request-Id` |
| [x] | Audit auto-capture middleware | `middleware/audit_middleware.py` | Mounted on POST/PUT/PATCH/DELETE |
| [ ] | Central RBAC | `core/permissions.py` | `require_buyer`, `require_vendor`, resource guards |
| [ ] | Payment webhook retry | `payment_tasks.py` | SSLCommerz verification |
| [ ] | Rotate exposed API keys | `.env` files | GROQ key was shared in chat |

---

## Test coverage backlog

| Done | Area | Test file | Notes |
|:----:|------|-----------|-------|
| [ ] | Search router | `tests/test_search/` | Router not implemented yet |
| [ ] | Contracts | `tests/test_contracts/` | Router not implemented yet |
| [ ] | Evaluations | `tests/test_evaluations/` | Router not implemented yet |
| [ ] | Disputes | `tests/test_disputes/` | Router not implemented yet |
| [x] | Users router | `tests/test_users/` | 10 tests — profile, password, documents |
| [x] | Tender delete (notification schema) | `tests/test_tenders/test_tender_delete.py`, `test_notification_cleanup.py` | No `reference_type`; 280 tests pass |
| [x] | Notifications router | `tests/test_notifications/` | 14 tests — was 0 at audit |
| [ ] | Invitations | New test dir | No tests exist |
| [ ] | Restricted access enforcement | New tests | |
| [x] | Lifecycle tests | `tests/test_tenders/test_tender_lifecycle.py` | 31 tests: service + router + celery |
| [x] | Admin auth guards | `test_admin_router.py` | 401/403 tests for pending-accounts + verify |
| [x] | Request/audit middleware | `tests/test_middleware/` | Logging + audit outbox capture |

---

## Working notes

Use this section for session notes, blockers, and decisions.

### Current focus

```
Phase: 8 polish (in progress) / 3 next (restricted visibility)
Baseline: main @ d59a56c audit (2026-08-30)
Branch: working tree (post-audit changes uncommitted)
```

### Blockers

- None for core marketplace loop; payment gateway and RBAC are largest product gaps per audit.

### Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-30 | Use audit PDF as FR baseline on main | Official completion review @ d59a56c |
| 2026-08-30 | Defer scheduled publish + vendor refunds | Phase 2 core sufficient for now |
| 2026-08-30 | Fix tender delete via `action_url` not legacy schema | Live DB uses new notifications table |

### Session log

| Date | What I did | Next up |
|------|------------|---------|
| 2026-08-30 | Created this tracker from codebase audit | Phase 1 — fix public tenders API |
| 2026-08-30 | Phase 1: public tenders API fix, removed mock fallbacks, admin auth guards | Phase 2 |
| 2026-08-30 | Phase 2 core: server drafts, publish/edit/cancel/delete, auto-close, UI | Phase 3 or vendor refunds |
| 2026-08-30 | Phase 7 `users` module; logging + audit middleware; notification tests | Phase 3 or change-password UI |
| 2026-08-30 | UI polish (home, PDF import, org directory); tender delete fix | Reconcile tracker vs audit PDF |
| 2026-08-30 | Phase 8 polish: change-password UI, bid edit/withdraw, compare fix, search | Phase 3 or admin audit viewer |

---

## What already works (reference)

Don't re-build these unless fixing bugs:

- [x] Master org signup + Supabase storage
- [x] Employee invite & registration
- [x] Login / cookie auth
- [x] Manual tender publish with documents
- [x] PDF extract preview (sync ML)
- [x] 1-click PDF tender create (async Celery)
- [x] Server-side draft → publish workflow (post-audit)
- [x] Edit / cancel / delete tender (buyer UI + API)
- [x] Form draft autosave (localStorage, device-only)
- [x] Buyer my-tenders + workbench (bids, compare, accept)
- [x] Seller browse + bid submit
- [x] Ongoing awarded tenders
- [x] Org management + enlisted vendors
- [x] Messaging + WebSocket
- [x] In-app notifications (+ tests)
- [x] Token balance + sandbox purchase
- [x] Admin pending account verification UI
- [x] Admin pricing & token packages
- [x] Admin auth guards on sensitive routes
- [x] Audit chain backend + **auto-capture middleware active**
- [x] Request logging middleware
- [x] Public tenders page (real API data)
- [x] Users profile / password / document API (`/api/users/me/*`)
- [x] pytest suite: 280 passed (incl. lifecycle, delete, middleware)

## Module inventory (vs audit)

| Module | Audit (main) | Now |
|--------|--------------|-----|
| organizations, auth, admin, tenders, bids, messaging, payments | Mounted · real | Unchanged |
| notifications | Mounted · **0 tests** | Mounted · **tested** |
| audit | Mounted · **middleware inactive** | Mounted · **middleware active** |
| users | **Stub, unmounted** | **Mounted · partial** |
| search, contracts, disputes, evaluations, invitations, reports, vendor_intelligence, public | Stub, unmounted | Still stub, unmounted |
