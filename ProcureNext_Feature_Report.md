# ProcureNext — Implemented Features Report

**Project Title:** ProcureNext — AI-Powered eProcurement Platform  
**Repository:** [https://github.com/hasanaranna/ProcureNext.git](https://github.com/hasanaranna/ProcureNext.git)  
**Report Date:** August 30, 2026  
**Prepared For:** Project Supervisor  
**Version:** 1.0

---

## Table of Contents

1. Executive Summary
2. System Architecture Overview
3. Technology Stack
4. Database Design
5. Implemented Features by Functional Requirement
    - 5.1 FR-01: Landing Page and Public Interface
    - 5.2 FR-02: Public Tender Browsing
    - 5.3 FR-03: Search and Discovery
    - 5.4 FR-04: Organization Registration and Onboarding
    - 5.5 FR-05: User Authentication and Account Security
    - 5.6 FR-06: Organization Profile and Verification
    - 5.7 FR-07: Employee Invitation and Management
    - 5.8 FR-08: Tender Creation and Lifecycle Management
    - 5.9 FR-09: Vendor Recommendations and Matching
    - 5.10 FR-10: Bid Submission and Management
    - 5.11 FR-11: Bid Evaluation and Award
    - 5.12 FR-15: Dashboard and Analytics
    - 5.13 FR-16: Intra-Company Messaging and Real-Time Chat
    - 5.14 FR-17: Inter-Company and Tender-Scoped Messaging
    - 5.15 FR-18: Token Economy and Payment System
    - 5.16 FR-20: In-App Notification System
    - 5.17 FR-21: Admin Dashboard and Platform Moderation
    - 5.18 FR-22: Immutable Audit Trail and Compliance
    - 5.19 FR-24: Vendor Intelligence and Performance Analytics
    - 5.20 FR-26: Public Content and Informational Pages
    - 5.21 AI/ML-Powered Features
    - 5.22 Infrastructure and Middleware
6. API Endpoint Summary
7. Testing and Quality Assurance
8. Deployment Architecture
9. FR Coverage Summary Matrix

---

## 1. Executive Summary

ProcureNext is a full-stack, AI-powered electronic procurement (eProcurement) platform designed to digitize and streamline the public and private procurement lifecycle. The system supports three distinct user roles — **Buyer Organizations**, **Vendor Organizations**, and **Platform Administrators** — with end-to-end functionality spanning tender creation, vendor bidding, AI-assisted bid evaluation, real-time encrypted messaging, token-based monetization, and WORM-compliant audit logging.

The platform is built as a microservices-oriented application comprising a **FastAPI backend**, a **Next.js frontend**, an **ML microservice** for document intelligence, and **Celery workers** for asynchronous task processing. All services are containerized via Docker Compose and backed by a **PostgreSQL database** hosted on **Supabase** with cloud object storage for documents.

**Key accomplishments at the time of this report:**

- **25 functional requirements** defined; **13 fully implemented**, **7 partially implemented**, **5 pending integration**
- **280 automated tests** passing across 18 test modules
- **40+ REST API endpoints** implemented and mounted
- **Real-time WebSocket messaging** with AES-256-GCM encryption
- **AI-powered PDF tender parsing** and **LLM-assisted bid evaluation**
- **Cryptographically chained, tamper-proof audit log** with WORM enforcement
- **Full containerized deployment** via Docker Compose (6 services)

---

## 2. System Architecture Overview

ProcureNext follows a layered, modular architecture with clear separation of concerns. The system is composed of five distinct layers, each with well-defined responsibilities.

### Layer 1 — Client Layer

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| Web Application | Next.js 14 (React / TypeScript) | Server-side rendering, client-side interactivity, routing |
| Communication | HTTP REST + WebSocket | API calls and real-time messaging |

### Layer 2 — API Gateway Layer (FastAPI)

**Middleware Stack:**

| Middleware | Status | Responsibility |
|-----------|--------|----------------|
| CORS Middleware | Active | Cross-origin request handling for frontend communication |
| Request Logging | Active | Structured JSON logging with request IDs and timing |
| Audit Middleware | Active | Auto-capture of state-changing operations to audit outbox |
| Rate Limiter | Defined | Protection of public endpoints from abuse |

**Mounted Module Routers:**

| Module | Prefix | Domain |
|--------|--------|--------|
| auth | /api/auth | Login, registration, password reset |
| organizations | /orgs | Organization CRUD, members, documents |
| tenders | /tenders, /buyer | Tender lifecycle, public browsing |
| bids | /bids | Bid submission, comparison, evaluation |
| messaging | /api/messages | Encrypted DM, threads, WebSocket |
| payments | /payments | Token balance, purchase, transactions |
| notifications | /notifications | In-app notification management |
| admin | /admin | Platform moderation, pricing, verification |
| audit | /admin/audit | Audit log search, integrity verification |
| users | /api/users | Profile, password, documents |
| contracts | /contracts | Contract lifecycle (stub) |

### Layer 3 — ML Microservice

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| Tender Parser | Groq LLM + PyPDF2 | Extract structured fields from procurement PDFs |
| Bid Evaluator | Groq LLM (4-stage) | Financial, compliance, semantic, and rubric scoring |
| Embedding Engine | SentenceTransformer (all-MiniLM-L6-v2) | Generate 384-dim vectors for semantic similarity |

### Layer 4 — Task Queue Layer

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| Celery Worker | Celery 5 | Asynchronous task execution |
| Celery Beat | Beat Scheduler | Periodic task scheduling (auto-close, audit drain) |
| Message Broker | Redis 7 | Task queue broker and result backend |

**Registered Background Tasks:**

| Task | Schedule | Responsibility |
|------|----------|----------------|
| upload_tender_documents | On-demand | Async document upload to cloud storage |
| process_pdf_tender | On-demand | PDF parsing via ML service |
| send_password_reset_email | On-demand | Async email dispatch via SMTP |
| auto_close_expired_tenders | Hourly (Beat) | Close tenders past submission deadline |
| process_audit_outbox | Periodic (Beat) | Drain audit outbox and build hash chain |
| audit_tamper_detection | Periodic (Beat) | Verify cryptographic integrity of audit logs |

### Layer 5 — Data Layer

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| Primary Database | PostgreSQL 15 (+ pgvector) | 30+ relational tables, vector similarity indexes |
| Cloud Storage | Supabase Storage | PDF documents, NID images, org certificates |
| Cache / Broker | Redis 7 Alpine | Celery broker, result backend, application cache |

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TypeScript | Server-side rendered UI with client-side interactivity |
| Styling | Tailwind CSS | Utility-first responsive design |
| Backend API | FastAPI (Python 3.11+) | Async REST API with automatic OpenAPI docs |
| Database | PostgreSQL 15 + pgvector | Relational data storage + vector similarity search |
| Cloud Storage | Supabase Storage | Document and file hosting (PDFs, NID images) |
| Task Queue | Celery + Redis | Background job processing (docs, emails, ML) |
| Cache / Broker | Redis 7 | Message broker for Celery and application caching |
| ML Service | FastAPI + Groq LLM + SentenceTransformers | Document parsing, embeddings, bid evaluation |
| Authentication | JWT (HS256) + bcrypt | Access/refresh token pair with password hashing |
| Encryption | AES-256-GCM | End-to-end message encryption at rest |
| Email | SMTP (Gmail) via Celery | Transactional email (invitations, password resets) |
| Containerization | Docker + Docker Compose | Multi-service orchestration (6 containers) |
| Testing | pytest + pytest-asyncio | Automated unit and integration testing |

---

## 4. Database Design

The database schema consists of **30+ tables** organized into logical domains.

### 4.1 Core User and Authentication Tables

| Table | Purpose |
|-------|---------|
| users | Central user accounts with email, NID, password hash, 2FA flag, status |
| admins | Platform administrator role assignments (SuperAdmin, PlatformAdmin) |
| user_verification | NID document review status for KYC compliance |
| password_reset_tokens | Time-limited (30-minute) cryptographic reset tokens |

### 4.2 Organization Tables

| Table | Purpose |
|-------|---------|
| organizations | Buyer/Vendor entities with verification status, credit balance, embeddings |
| organization_employees | User-to-org membership with role-based access |
| user_invitations | Email-based employee invitation tokens with 7-day expiry |
| organization_documents | Trade License, TIN, VAT, RJSC verification documents |
| document_types | Extensible document type catalog |
| enlisted_vendors | Buyer-Vendor business relationship tracking |

### 4.3 Tender and Bidding Tables

| Table | Purpose |
|-------|---------|
| tenders | Core tender entity with lifecycle status (Draft, Published, Closed, Awarded, Cancelled) |
| tender_documents | Uploaded procurement documents (PDFs, BOQ, scope of work) |
| tender_required_documents | Per-tender document requirements for bidders |
| tender_categories | Hierarchical tender classification |
| procurement_nature | Goods, Works, Services, Consultancy |
| procurement_method | OTM, RFQ, RFP, ReverseAuction, Direct |
| tender_invitations | Vendor invitations for restricted tenders |
| tender_vendor_suggestions | AI-generated vendor recommendations with similarity scores |
| bids | Vendor bid submissions with financial amount and status tracking |
| bid_documents | Uploaded bid compliance documents linked to requirements |
| bid_securities | Bid bond/security documentation |
| bid_evaluation_runs | LLM-assisted evaluation run lifecycle tracking |
| bid_evaluations | Per-bid scoring results (financial, document, semantic, LLM rubric) |

### 4.4 Award and Contract Tables

| Table | Purpose |
|-------|---------|
| awards | Winning bid selection records |
| contracts | Post-award contract lifecycle (Active, Completed, Terminated) |
| vendor_performance | Performance ratings and feedback with vector embeddings |

### 4.5 Payment and Credit Tables

| Table | Purpose |
|-------|---------|
| payments | Payment gateway transaction records |
| credit_transactions | Token purchase, deduction, and refund ledger |
| platform_pricing | Configurable per-token price, tender publish cost, bid cost |
| token_packages | Admin-managed token bundles with pricing |
| credit_discounts | Organization-specific pricing overrides |

### 4.6 Messaging Tables

| Table | Purpose |
|-------|---------|
| message_threads | Intra-company and inter-company conversation threads |
| thread_participants | Thread membership with read tracking |
| messages | AES-256-GCM encrypted message content with IV storage |
| tender_chat_rooms | Buyer-Vendor chat scoped to specific tenders |
| group_chat | Organization-level group messaging |

### 4.7 Notification Tables

| Table | Purpose |
|-------|---------|
| notification_types | Extensible notification type catalog |
| notifications | Platform notifications with reference linking |
| notification_recipients | Per-user delivery and read tracking |
| user_notifications | Direct user-level notifications |

### 4.8 Audit and Compliance Tables

| Table | Purpose |
|-------|---------|
| audit_outbox | Transactional outbox for non-blocking event capture |
| audit_logs | WORM-compliant, cryptographically chained, append-only audit log |
| audit_archives | Sealed batch archives with Merkle root verification |

**Key Enums:** user_status, organization_type, verification_status, role_in_org, tender_status, tender_visibility, bid_status, contract_status, transaction_type, notification_ref_type, procurement_nature_val, procurement_method_val

---

## 5. Implemented Features by Functional Requirement

### 5.1 FR-01: Landing Page and Public Interface
**Status: Done**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Public Landing Page | Marketing homepage with platform overview, hero section, feature showcase, and call-to-action | Next.js server-rendered page |
| Navigation | Header with links to About, News, Events, Help, Legal, Policies, Support | Dedicated route directories |
| Static Info Pages | About, Help, Legal, and Policy pages for platform information | Static Next.js pages |
| Responsive Design | Mobile-first responsive layout using Tailwind CSS | Global CSS + Tailwind config |

---

### 5.2 FR-02: Public Tender Browsing
**Status: Done (Fixed Post-Audit)**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Public Tenders Listing | Browse all published public tenders without authentication | `GET /tenders/public/list` |
| Tender Detail View | View full tender details including documents, deadlines, and budget | `GET /tenders/public/{id}` |
| API Path Correction | Fixed incorrect frontend API path (post-audit fix) | Removed broken proxy path |
| Error State Handling | Shows proper error states when API is unreachable | Replaced hardcoded fallback |

---

### 5.3 FR-03: Search and Discovery
**Status: Done (Data limited)**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Semantic Search | Vector-based similarity search matching tender descriptions | `pgvector` cosine similarity |
| Keyword & Filter Search | Search tenders by title, category, procurement nature and method | Database filter indexes |
| Embedding Query Pipeline | User search queries converted to 384-dim embeddings via ML service | `SentenceTransformer` model |
| Data Volume Note | Search architecture and backend indexes are complete; production testing is subject to mock data volume | Fully functional engine |

---

### 5.4 FR-04: Organization Registration and Onboarding
**Status: Done**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Master Account Signup | Owner registers with full KYC details (name, email, NID, DOB, phone, org info) | `POST /orgs` |
| Organization Types | Support for Buyer and Vendor organization types | `organization_type` enum |
| Document Upload | Upload Trade License, TIN, VAT, and RJSC certificates | `POST /orgs/{id}/docs` |
| Verification Status | Organization enters Pending status until admin verifies | `verification_status` enum |
| Unique Join Code | Auto-generated unique join code for member onboarding | `unique_join_code` field |
| NID Verification | Upload NID front and back images for identity verification | Supabase Storage |
| Credit Balance Init | New organizations receive 250 starter tokens | `credit_balance = 250` |

---

### 5.5 FR-05: User Authentication and Account Security
**Status: Done**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| User Login | Email + password authentication with JWT access/refresh token pair | `POST /api/auth/login` |
| Access Token | 60-minute expiry JWT with user ID and email in payload | `create_access_token()` |
| Refresh Token | 7-day expiry JWT for session renewal | `create_refresh_token()` |
| Password Hashing | bcrypt-based password hashing and verification | `bcrypt.hashpw()` |
| Change Password | Authenticated users can change their password | `PUT /api/users/me/pwd` |
| Password Reset | Email-based reset with 30-minute cryptographic token | `POST /api/auth/forgot` |
| Reset Token Verify | Validates token existence, expiry, and single-use enforcement | `GET /api/auth/verify` |
| Reset Confirmation | Updates password hash after valid token verification | `POST /api/auth/reset` |
| Token Security | Previous unused tokens auto-invalidated on new request | SQL-level invalidation |
| Last Login Tracking | Records timestamp of each successful login | `UPDATE users ...` |

---

### 5.6 FR-06: Organization Profile and Verification
**Status: Done**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Org Profile | View and update organization details (name, address, website, description) | `GET/PUT /orgs/{id}` |
| Document Mgmt | Upload and track verification documents with review status | `POST/GET .../documents` |
| Admin Verification | Platform admin reviews and approves/rejects org documents | `POST /admin/verify/{id}` |
| Org Search | Search organizations by name and type | `GET /search-organization` |
| Vendor Enlistment | Buyer orgs can enlist verified vendors for future tenders | `enlisted_vendors` table |
| Org Directory | Browse and view verified organizations | Frontend listing pages |

---

### 5.7 FR-07: Employee Invitation and Management
**Status: Done**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Email Invitations | Owner invites employees via email with unique token link | `POST /orgs/{id}/invite` |
| Invitation Accept | Invited user registers with pre-filled org association | `POST /auth/register` |
| Role Assignment | Owner assigns roles (ProcurementOfficer, Finance, Viewer, TenderReceiver) | `PUT .../members/role` |
| Member Management | View, update roles, and remove organization members | GET/DELETE member endpoints |
| Invitation Expiry | Invitations automatically expire after 7 days | `expires_at + 7 days` |
| Invitation UI | Frontend section with pending/accepted status display | `InvitationSection.tsx` |

---

### 5.8 FR-08: Tender Creation and Lifecycle Management
**Status: Done**

#### 5.8.1 Tender Creation

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Manual Creation | Create tender with title, description, category, nature/method, budget, deadlines, doc requirements | `POST /buyer/tender` |
| One-Click PDF | Upload procurement PDF; AI extracts and auto-fills all tender fields | Async Celery + ML Service |
| Document Upload | Attach multiple PDFs (scope of work, BOQ, specifications) | Supabase Storage + Celery |
| Required Docs List | Define which documents vendors must submit with bids | `tender_required_docs` |
| Procurement Class. | Nature (Goods/Works/Services/Consultancy) and Method (OTM/RFQ/RFP/Auction/Direct) | Lookup tables + enums |
| Form Autosave | Draft autosave to localStorage for in-progress creation | Client-side persistence |
| Token Deduction | Publishing deducts tokens from buyer org balance | `credit_transactions` |
| Vector Embedding | Generated 384-dim embedding for semantic similarity | SentenceTransformer |

#### 5.8.2 Server-Side Draft Workflow

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Save as Draft | Save tender without publishing (status = Draft) | `POST /buyer/draft` |
| Draft Listing | Buyer sees draft tenders on dashboard | `GET /buyer/my-tenders` |
| Publish Draft | Promote a draft to Published with token deduction | `POST /tenders/{id}/pub` |
| Edit Rules | Draft freely edited; Published only if no bids received | `PUT /tenders/{id}` |

#### 5.8.3 Edit, Cancel, Delete, and Auto-Close

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Update Tender | Modify tender details (title, budget, deadlines, documents) | `PUT /tenders/{id}` |
| Edit Page | Dedicated frontend page for editing tender details | `edit-tender/[id]/page` |
| Soft Cancel | Cancel a published tender (status → Cancelled) | `POST /tenders/.../withdraw` |
| Hard Delete | Permanently delete a draft or no-bid tender | `DELETE /tenders/{id}` |
| Cancel vs Delete UX | Confirmation modals differentiate cancel from delete | Frontend dialogs |
| Notif. Cleanup | Deleting a tender removes associated notifications | Cascading delete logic |
| Auto-Close Expired | Celery Beat job closes tenders past submission deadline | Hourly periodic task |
| Status Badges | Visual status indicators on tender cards | `TenderCard.tsx` |
| Status Filters | Filter tenders by status on buyer dashboard | Enum-based filtering |

#### 5.8.4 Buyer Tender Workbench

| Feature | Description | Implementation |
|---------|-------------|----------------|
| My Tenders List | View all tenders created by buyer organization | `GET /buyer/jobs` |
| Tender Detail | Full tender detail with tabs for bids, comparison, actions | `view-my-tender/[id]` |
| Bid Comparison | Side-by-side bid comparison with metrics | `GET /bids/.../compare` |
| Accept Bid | Accept a winning bid and award the tender | `POST /bids/.../accept` |

---

### 5.9 FR-09: Vendor Recommendations and Matching
**Status: Done (Data limited)**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Intelligent Matching | Match published tenders with vendor specializations via vector embeddings | `pgvector` cosine similarity |
| Suggestion Table | Auto-generate vendor recommendation records per tender | `tender_vendor_suggestions` |
| Similarity Scoring | Float score indicating alignment between tender scope and vendor profile | Embedding dot product |
| Data Volume Note | Recommendation architecture is fully implemented; recommendation breadth expands with production data | Fully functional pipeline |

---

### 5.10 FR-10: Bid Submission and Management
**Status: Done**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Browse Tenders | Vendor dashboard shows all available published tenders | Home page with search |
| Bid Submission | Submit bid with financial amount, description, and required documents | `POST /bids/vendor/submit` |
| Document Upload | Upload compliance documents mapped to tender requirements | Supabase Storage upload |
| Bid Update | Modify a submitted bid (amount, description, documents) | `PUT /bids/{bid_id}` |
| Bid Withdrawal | Withdraw a submitted bid | `DELETE /bids/{bid_id}` |
| My Bids View | View all bids submitted by vendor organization | `GET /bids/vendor/my-bids` |
| Ongoing Tenders | Track awarded tenders where vendor is the winner | `ongoing-tenders/ page` |
| Token Deduction | Bidding deducts tokens from vendor org balance | Credit transaction on submit |
| Document Download | Download bid documents via signed Supabase URLs | Signed URL generation |

---

### 5.11 FR-11: Bid Evaluation and Award
**Status: Partial**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Multi-Stage Scoring | 4-stage AI bid evaluation (financial, compliance, semantic, rubric) | ML microservice pipeline |
| Bid Acceptance | Award winning bid and update status | `POST /bids/.../accept/{bid_id}` |
| Integration Status | AI scoring and bid acceptance complete; formal Notice of Award (NOA) PDF generation in progress | Backend active |

---

### 5.12 FR-15: Dashboard and Analytics
**Status: Partial+**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Buyer Dashboard | Overview of created tenders with status breakdown and quick actions | `home/page.tsx` |
| Seller Dashboard | Live statistics (total bids, active tenders, awarded contracts) | Aggregated from API |
| Tender Search | Client-side search filtering by title, description, and org name | Real-time client filter |
| Status-Based Tabs | Quick filters for Draft, Published, Closed, Awarded, Cancelled | Tab-based navigation |

---

### 5.13 FR-16: Intra-Company Messaging and Real-Time Chat
**Status: Done**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Intra-Company DM | 1-to-1 direct messaging between organization members | `POST /api/messages/dm` |
| Msg Encryption | AES-256-GCM encryption of all message content at rest | `encryption.py` (12-byte IV) |
| Key Management | Server-managed 256-bit key from environment variable | `MESSAGE_ENCRYPTION_KEY` |
| WebSocket Real-Time | Live message delivery via WebSocket connections | `ws://.../ws/messages` |
| Connection Mgr | Active WebSocket connections per user with multi-device support | `ConnectionManager` |
| Ping/Pong | Client-server heartbeat to maintain persistent connections | `ping/pong protocol` |
| Contact Search | Search for colleagues within the same organization | `GET /contacts/search` |
| Thread Listing | View all conversation threads with last message preview | `GET /api/messages/threads` |
| Message History | Paginated message history per thread with decryption | `GET .../messages` |
| Send Message | Encrypted message with real-time broadcast to recipient | `POST .../messages` |
| Messaging Sidebar | Slide-out messaging UI accessible from any page | `MessagingSidebar.tsx` |
| Read Tracking | Track when participants last read a thread | `last_read_at` field |

---

### 5.14 FR-17: Inter-Company and Tender-Scoped Messaging
**Status: Partial**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Tender Chat Rooms | Dedicated chat rooms scoped to specific tenders | `tender_chat_rooms` table |
| Tender Messages | Buyer-to-Vendor clarification messages during bidding window | `tender_chat_messages` |
| Integration Status | Database schema and models defined; UI routing in progress | Backend schema active |

---

### 5.15 FR-18: Token Economy and Payment System
**Status: Partial**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Token Balance | View organization's current credit token balance | `GET /payments/balance` |
| Platform Pricing | Configurable per-token price, tender publish cost, bid cost | `GET /payments/pricing` |
| Token Packages | Pre-defined token bundles with calculated savings | `GET /payments/packages` |
| Token Purchase | Purchase tokens via payment gateway (sandbox simulation) | `POST /payments/purchase` |
| Transaction History | View purchase, deduction, and refund transaction ledger | `GET /payments/transactions` |
| Credit Deduction | Automatic deduction on tender publish and bid submission | Service-level deduction |
| Transaction Ledger | Complete audit trail of all credit movements | `credit_transactions` table |
| Manage Tokens UI | Frontend for viewing balance, buying tokens, and history | `ManageTokensModal.tsx` |

---

### 5.16 FR-20: In-App Notification System
**Status: Done**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| List Notifications | View all notifications with status filtering (all/unread/read) | `GET /notifications` |
| Unread Count | Badge-style unread notification count for UI indicators | `GET .../unread-count` |
| Mark as Read | Mark individual notification as read | `PATCH .../{id}/read` |
| Mark All Read | Bulk-mark all notifications as read | `PATCH .../read-all` |
| Delete Notification | Remove a specific notification | `DELETE .../{id}` |
| Tender Notifications | Auto-generated notifications for tender events | `create_notification()` |
| Notification Cleanup | Cascading cleanup when tender is deleted | Cascading delete logic |
| Notification Types | Extensible notification type catalog | `notification_types` table |

---

### 5.17 FR-21: Admin Dashboard and Platform Moderation
**Status: Partial+**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Admin Login | Dedicated admin auth with admin-role JWT claims | `POST /api/auth/admin/login` |
| Admin Role Types | SuperAdmin and PlatformAdmin roles | `admin_role_type` enum |
| Auth Guards | All sensitive admin routes protected with `get_current_admin` | Post-audit fix |
| Pending Accounts | View organizations awaiting verification approval | `GET /admin/pending-accounts` |
| Org Verification | Approve or reject organization with document review | `POST /admin/verify/{id}` |
| Pricing Mgmt | Update platform-wide token pricing and activity costs | `POST /admin/update-price` |
| Package CRUD | Create, update, and delete token package bundles | `/admin/packages` |
| Admin Dashboard UI | Dedicated admin interface with org review workflow | `admin-home/ page` |
| Request Detail | Modal for reviewing org details and verification documents | `PendingRequestDetailModal` |

---

### 5.18 FR-22: Immutable Audit Trail and Compliance
**Status: Active**

#### 5.18.1 Audit Middleware (Auto-Capture)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Auto Capture | Non-blocking middleware captures all state-changing operations | `AuditMiddleware` in `main.py` |
| User Extraction | Extracts user identity from JWT Bearer token | JWT payload decoding |
| Request Metadata | Captures IP address, User-Agent, and response status code | Logged with audit event |
| Selective Skipping | Skips non-auditable paths (docs, health, login, audit) | `SKIP_PATH_PREFIXES` |

#### 5.18.2 Transactional Outbox Pattern

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Outbox Table | Non-blocking event buffer for audit events | `audit_outbox` (PENDING) |
| Background Draining | Celery task drains outbox and chains records cryptographically | `process_audit_outbox` |
| Failure Handling | Records marked FAILED with error messages on processing errors | Status column management |

#### 5.18.3 WORM-Compliant Cryptographic Audit Log

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Append-Only Log | Immutable audit log — inserts only, no updates or deletes | `audit_logs` + trigger |
| Crypto Chaining | Each entry references hash of previous (blockchain-style) | `previous_hash, payload_hash` |
| Tamper Detection | Periodic integrity verification walks the hash chain | `audit_tamper_detection` |
| WORM Trigger | PostgreSQL trigger prevents UPDATE/DELETE/TRUNCATE | `trg_protect_audit_logs` |
| Sequence Numbers | Monotonically increasing sequence for ordering/gap detection | `sequence_number` BIGINT |
| Event UUIDs | Globally unique event identifiers for deduplication | `event_uuid` UUID UNIQUE |

#### 5.18.4 Audit API and Change Data Capture

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Search Logs | Paginated, multi-filter audit log search | `GET /admin/audit/logs` |
| Log Detail | Retrieve single audit entry by ID | `GET /admin/audit/logs/{id}` |
| Entity Trail | View complete audit history for a specific entity | `GET .../entity-trail` |
| Integrity Check | Run on-demand hash chain verification | `POST .../verify-integrity` |
| Audit Stats | Summary statistics (entries, timestamp, chain health) | `GET /admin/audit/stats` |
| Archive List | View sealed batch archives with Merkle root | `GET /admin/audit/archives` |
| CDC Triggers | Auto audit capture on INSERT/UPDATE/DELETE for critical tables | `fn_cdc_audit_capture()` |
| Old/New Values | Captures both old and new values as JSONB | `old_values, new_values` |
| Batch Sealing | Archive audit log batches with Merkle root verification | `seal_audit_archive_batch()` |

---

### 5.19 FR-24: Vendor Intelligence and Performance Analytics
**Status: Partial (Data limited)**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Performance Table | Database schema and models tracking vendor delivery metrics | `vendor_performance` table |
| Rating Embeddings | Vectorized performance feedback for similarity matching | `SentenceTransformer` |
| Data Volume Note | Analytics models and database infrastructure ready; statistical scoring expands with transaction history | Baseline active |

---

### 5.20 FR-26: Public Content and Informational Pages
**Status: Partial**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Static Content Pages | Dedicated Next.js pages for About, Help, Legal, Policies, Terms | Route directories under `app/` |
| Placeholder Content | Baseline policy, terms, and legal structures currently populated with dummy copy | Dynamic CMS integration pending |

---

### 5.21 AI/ML-Powered Features
**Status: Done**

#### 5.21.1 PDF Tender Parsing (Document Intelligence)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| PDF Extraction | Extract raw text from uploaded procurement PDFs | `tender_parser.py` |
| LLM Field Extract | Use Groq LLM to extract structured fields from unstructured PDF text | System prompt → JSON |
| One-Click Create | Upload PDF, auto-fill tender fields, buyer reviews and publishes | Async Celery + ML service |
| Extracted Fields | Title, description, eligibility, budget, deadlines, nature/method, required docs | `ProcurementDocument` schema |
| Embedding Gen | Generate 384-dim vector embeddings for semantic similarity | SentenceTransformer |

#### 5.21.2 Smart Bid Evaluation (LLM-Assisted Scoring)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Multi-Stage Eval | 4-stage: Financial, Document Compliance, Semantic Relevance, LLM Rubric | `bid_evaluator.py` |
| Financial Scoring | Automated scoring based on bid amount vs budget midpoint | `_financial_score_for()` |
| Doc Compliance | Check which required documents were submitted vs missing | `compute_compliance()` |
| Semantic Relevance | Compare bid embedding against tender embedding | Cosine similarity |
| LLM Rubric | Groq LLM scores on clarity, completeness, feasibility (0–100) | `RUBRIC_SYSTEM_PROMPT` |
| Risk Flags | AI identifies risk indicators (vague timelines, missing certs) | LLM rubric response |
| Weighted Composite | Configurable: Financial 20%, Docs 20%, Embed 5%, LLM 55% | `DEFAULT_WEIGHT_CONFIG` |
| Run Tracking | Track lifecycle (pending, running, completed, failed) | `bid_evaluation_runs` table |
| Results Storage | Append-only — re-runs create new rows, never overwrite | `bid_evaluations` table |
| Low Outlier Detect | Statistical detection of abnormally low bids | `is_low_outlier` flag |
| Evaluation UI | Frontend panel for triggering and viewing results | `BidEvaluationPanel.tsx` |

#### 5.21.3 ML Microservice

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Dedicated Service | Separate FastAPI microservice for compute-intensive ML tasks | `ml/src/main.py` (port 8001) |
| Stateless Design | Receives self-contained payloads; never queries the database | Clean separation |
| Model Caching | HuggingFace model cache mounted as Docker volume | Volume mount |

---

### 5.22 Infrastructure and Middleware

#### 5.22.1 Request Logging, CORS, and Health Check

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Structured Logging | Every request/response logged as structured JSON with timing | `RequestLoggingMiddleware` |
| Request ID | Unique request ID per request; returned in X-Request-Id header | UUID-based |
| Performance Timing | Request duration measured in milliseconds | `time.perf_counter()` |
| Path Redaction | Sensitive paths (/password, /login) sanitized in logs | `_sanitize_path()` |
| User Identification | Extracts authenticated user ID from JWT for log correlation | `_extract_user_id()` |
| CORS Support | Configured middleware allowing frontend-backend communication | `CORSMiddleware` |
| Health Endpoint | Application health check with database connectivity status | `GET /health` |

#### 5.22.2 Email Service and Cloud Storage

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Transactional Email | SMTP-based delivery for invitations, resets, notifications | `services/email.py` (Gmail) |
| HTML Templates | Professionally designed responsive HTML email templates | Inline HTML generation |
| Celery Integration | Non-blocking email dispatch via background tasks | `send_.._email_task.delay()` |
| Fallback Mechanism | Falls back to async thread if Celery dispatch fails | `asyncio.to_thread()` |
| Supabase Storage | File upload, download, and signed URL generation | `supabase_storage.py` |
| Path Sanitization | File paths sanitized and prefixed with UUID for uniqueness | `_build_object_path()` |

---

## 6. API Endpoint Summary

### 6.1 Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/api/auth/login` | User login with JWT token pair |
| **POST** | `/api/auth/register-user` | Employee registration via invitation token |
| **POST** | `/api/auth/admin/login` | Admin-specific login |
| **POST** | `/api/auth/forgot-password` | Request password reset email |
| **GET** | `/api/auth/verify-reset-token` | Validate reset token |
| **POST** | `/api/auth/reset-password` | Confirm password reset |

### 6.2 Organizations (`/orgs`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/orgs` | Create new organization (master signup) |
| **GET** | `/orgs/{org_id}` | Get organization details |
| **PUT** | `/orgs/{org_id}` | Update organization info |
| **POST** | `/orgs/{org_id}/documents` | Upload verification documents |
| **GET** | `/orgs/{org_id}/documents` | List verification documents |
| **POST** | `/orgs/{org_id}/invite` | Invite employee by email |
| **GET** | `/orgs/{org_id}/members` | List organization members |
| **PUT** | `/orgs/{id}/members/{uid}/role` | Update member role |
| **DELETE** | `/orgs/{id}/members/{uid}` | Remove member |
| **GET** | `/search-organization` | Search organizations |

### 6.3 Tenders (`/tenders`, `/buyer`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/buyer/tender` | Create and publish tender with documents |
| **POST** | `/buyer/draft-with-documents` | Save tender as draft |
| **GET** | `/buyer/jobs` | List buyer's tenders (filterable) |
| **GET** | `/tenders/{id}` | Get tender details |
| **PUT** | `/tenders/{id}` | Update tender |
| **POST** | `/tenders/{id}/publish` | Publish a draft tender |
| **POST** | `/tenders/{id}/withdraw` | Cancel/withdraw tender |
| **DELETE** | `/tenders/{id}` | Delete tender |
| **GET** | `/tenders/public/list` | List public tenders (no auth) |
| **GET** | `/tenders/public/{id}` | Public tender detail (no auth) |

### 6.4 Bids (`/bids`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/bids/vendor/submit-with-docs` | Submit bid with documents |
| **GET** | `/bids/vendor/my-bids` | List vendor's submitted bids |
| **PUT** | `/bids/{bid_id}` | Update submitted bid |
| **DELETE** | `/bids/{bid_id}` | Withdraw bid |
| **GET** | `/bids/buyer/tender/{id}/bids` | List bids for buyer's tender |
| **GET** | `/bids/buyer/tender/{id}/compare` | Bid comparison analysis |
| **POST** | `/bids/.../accept/{bid_id}` | Accept winning bid |
| **POST** | `/bids/.../evaluate` | Trigger AI bid evaluation |
| **GET** | `/bids/.../evaluation/latest` | Get latest evaluation results |

### 6.5 Payments, Messaging, Notifications, Users, Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/payments/balance` | Get token balance |
| **GET** | `/payments/pricing` | Get platform pricing |
| **GET** | `/payments/packages` | List token packages |
| **POST** | `/payments/purchase` | Purchase tokens |
| **GET** | `/payments/transactions` | Transaction history |
| **GET** | `/api/messages/contacts/search` | Search organization contacts |
| **GET** | `/api/messages/threads` | List conversation threads |
| **POST** | `/api/messages/threads/dm` | Create/get DM thread |
| **POST** | `/api/messages/threads/{id}/msg` | Send message |
| **WS** | `/ws/messages?token=` | Real-time WebSocket |
| **GET** | `/notifications` | List notifications (filterable) |
| **GET** | `/notifications/unread-count` | Unread notification count |
| **PATCH** | `/notifications/{id}/read` | Mark as read |
| **PATCH** | `/notifications/read-all` | Mark all as read |
| **DELETE** | `/notifications/{id}` | Delete notification |
| **GET** | `/api/users/me` | Get user profile |
| **PUT** | `/api/users/me/profile` | Update profile |
| **PUT** | `/api/users/me/password` | Change password |
| **POST** | `/api/users/me/documents` | Upload NID documents |
| **GET** | `/admin/pending-accounts` | Pending organization accounts |
| **POST** | `/admin/verify/{org_id}` | Verify/reject organization |
| **POST** | `/admin/update-price` | Update platform pricing |
| **GET** | `/admin/audit/logs` | Search audit logs |
| **POST** | `/admin/audit/verify-integrity` | Verify hash chain |
| **GET** | `/health` | Health check with DB status |

---

## 7. Testing and Quality Assurance

### 7.1 Test Suite Overview

The project maintains a comprehensive automated test suite with **280 tests passing** across 18 test modules:

| Test Module | Coverage Area |
|-------------|---------------|
| `test_auth/` | Login, registration, JWT token generation, password hashing |
| `test_admin/` | Admin login, auth guards (401/403), pending accounts, verification |
| `test_organizations/` | Organization CRUD, member management, document upload |
| `test_tenders/` | Tender lifecycle (31 tests: service + router + Celery) |
| `test_tenders/test_tender_delete.py` | Tender deletion with notification cascade cleanup |
| `test_bids/` | Bid submission, update, withdraw, comparison |
| `test_evaluations/` | Bid evaluation run lifecycle |
| `test_payments/` | Balance, pricing, purchase, transactions |
| `test_messaging/` | Thread creation, message encryption/decryption |
| `test_notifications/` | 14 tests: router, service, and middleware integration |
| `test_users/` | 10 tests: profile, password change, document upload |
| `test_middleware/` | Request logging and audit outbox capture |
| `test_audit/` | Log integrity verification, outbox processing |
| `test_core/` | Security utilities, pagination, database helpers |
| `test_storage/` | Supabase file upload/download mocking |

### 7.2 Test Infrastructure

| Component | Technology |
|-----------|-----------|
| Framework | `pytest` + `pytest-asyncio` |
| DB Mocking | `asyncpg` mock connections |
| API Testing | FastAPI `TestClient` |
| Fixtures | Shared `conftest.py` with reusable fixtures |

---

## 8. Deployment Architecture

The application is fully containerized using Docker Compose with 6 services:

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `db` | PostgreSQL 15 Alpine | 5433 | Primary database with pgvector extension |
| `backend` | FastAPI (custom) | 8000 | REST API server with auto-reload |
| `redis` | Redis 7 Alpine | 6380 | Message broker and cache |
| `ml` | FastAPI ML (custom) | 8001 | Document intelligence and bid evaluation |
| `celery_worker` | Celery (custom) | — | Background task worker with Beat scheduler |
| `frontend` | Next.js 14 (custom) | 3000 | Server-side rendered React application |

---

## 9. FR Coverage Summary Matrix

| FR | Description | Status | Key Implementation |
|----|-------------|--------|-------------------|
| FR-01 | Landing Page | **Done** | Next.js public pages with responsive design |
| FR-02 | Public Tender Browsing | **Done** | Fixed API path + error states (post-audit) |
| FR-03 | Search and Discovery | **Done (Data limited)** | Vector embedding search; limited by data volume |
| FR-04 | Organization Registration | **Done** | Full KYC signup with Supabase document storage |
| FR-05 | Authentication & Security | **Done** | Login, JWT, password change/reset, last login |
| FR-06 | Organization Profile | **Done** | Profile CRUD, admin verification, vendor enlistment |
| FR-07 | Employee Management | **Done** | Email invitations, role assignment, member CRUD |
| FR-08 | Tender Lifecycle | **Done** | Draft/publish/edit/cancel/delete/auto-close |
| FR-09 | Vendor Recommendations | **Done (Data limited)** | pgvector semantic matching; limited by data |
| FR-10 | Bid Submission | **Done** | Submit, update, withdraw with document upload |
| FR-11 | Bid Eval & Award | **Partial** | AI evaluation + bid accept; no formal NOA |
| FR-12 | Restricted Tenders | **Not Implemented** | Schema exists; access enforcement pending |
| FR-13 | Contracts Module | **Not Implemented** | Table schema defined; CRUD stub only |
| FR-15 | Dashboard Analytics | **Partial+** | Live seller stats; admin KPIs in progress |
| FR-16 | Intra-Company Messaging | **Done** | Encrypted DM with WebSocket real-time delivery |
| FR-17 | Inter-Company Messaging | **Partial** | Tender-scoped chat schema; full flow pending |
| FR-18 | Payment and Tokens | **Partial** | Token ledger real; payment gateway simulated |
| FR-19 | Bid Bond and Refunds | **Not Implemented** | Schema ready; no refund logic |
| FR-20 | Notifications | **Done** | Full CRUD + auto-generation + cascade cleanup |
| FR-21 | Admin Dashboard | **Partial+** | Auth guards, org verify, pricing; KPIs pending |
| FR-22 | Audit and Compliance | **Active** | Full WORM audit chain with middleware |
| FR-23 | Report Generation | **Not Implemented** | Module stub exists |
| FR-24 | Vendor Intelligence | **Partial (Data limited)** | Performance tracking schema ready; data limited |
| FR-25 | Payment Gateway (Live) | **Not Implemented** | SSLCommerz stub; no webhook |
| FR-26 | CMS for Public Content | **Partial** | Static informational pages with placeholder data |

### Summary Statistics

| Category | Count |
|----------|-------|
| Fully Implemented (Done / Active) | 13 |
| Partially Implemented | 7 |
| Not Yet Implemented | 5 |
| **Total Functional Requirements** | **25** |

---

*This report was generated from a comprehensive analysis of the ProcureNext codebase, including the database schema, backend API modules, ML microservice, frontend pages and components, middleware stack, Celery tasks, and test suite.*
