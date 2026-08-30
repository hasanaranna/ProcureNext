# ProcureNext — Implemented Features Report

**Project Title:** ProcureNext — AI-Powered eProcurement Platform  
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
    - 5.3 FR-04: Organization Registration and Onboarding
    - 5.4 FR-05: User Authentication and Account Security
    - 5.5 FR-06: Organization Profile and Verification
    - 5.6 FR-07: Employee Invitation and Management
    - 5.7 FR-08: Tender Creation and Lifecycle Management
    - 5.8 FR-10: Bid Submission and Management
    - 5.9 FR-15: Dashboard and Analytics
    - 5.10 FR-16/FR-17: Messaging and Real-Time Communication
    - 5.11 FR-18: Token Economy and Payment System
    - 5.12 FR-20: In-App Notification System
    - 5.13 FR-21: Admin Dashboard and Platform Moderation
    - 5.14 FR-22: Immutable Audit Trail and Compliance
    - 5.15 AI/ML-Powered Features
    - 5.16 Infrastructure and Middleware
6. API Endpoint Summary
7. Testing and Quality Assurance
8. Deployment Architecture
9. FR Coverage Summary Matrix

---

## 1. Executive Summary

ProcureNext is a full-stack, AI-powered electronic procurement (eProcurement) platform designed to digitize and streamline the public and private procurement lifecycle. The system supports three distinct user roles — **Buyer Organizations**, **Vendor Organizations**, and **Platform Administrators** — with end-to-end functionality spanning tender creation, vendor bidding, AI-assisted bid evaluation, real-time encrypted messaging, token-based monetization, and WORM-compliant audit logging.

The platform is built as a microservices-oriented application comprising a **FastAPI backend**, a **Next.js frontend**, an **ML microservice** for document intelligence, and **Celery workers** for asynchronous task processing. All services are containerized via Docker Compose and backed by a **PostgreSQL database** hosted on **Supabase** with cloud object storage for documents.

**Key accomplishments at the time of this report:**

- **26 functional requirements** defined; **11 fully or mostly implemented**, **8 partially implemented**
- **280 automated tests** passing across 18 test modules
- **40+ REST API endpoints** implemented and mounted
- **Real-time WebSocket messaging** with AES-256-GCM encryption
- **AI-powered PDF tender parsing** and **LLM-assisted bid evaluation**
- **Cryptographically chained, tamper-proof audit log** with WORM enforcement
- **Full containerized deployment** via Docker Compose (6 services)

---

## 2. System Architecture Overview

ProcureNext follows a layered, modular architecture with clear separation of concerns:

```
+-----------------------------------------------------------------+
|                        CLIENT LAYER                             |
|                   Next.js 14 (React / TypeScript)               |
|              Server-Side Rendering + Client Interactivity       |
+---------------------------+-------------------------------------+
                            | HTTP / WebSocket
+---------------------------v-------------------------------------+
|                      API GATEWAY LAYER                          |
|                   FastAPI (Python 3.11+)                         |
|  +-----------+----------+-----------+-----------+               |
|  | CORS      | Request  | Audit     | Rate      |               |
|  | Middleware | Logging  | Middleware| Limiter   |               |
|  +-----------+----------+-----------+-----------+               |
|  +-------------------------------------------------------------+|
|  |                    MODULE ROUTERS                            ||
|  | auth | orgs | tenders | bids | messaging | payments | ...   ||
|  +-------------------------------------------------------------+|
|  +-------------------------------------------------------------+|
|  |                    SERVICE LAYER                             ||
|  |         Business Logic + Data Access (asyncpg)              ||
|  +-------------------------------------------------------------+|
+----------+---------------------+--------------------------------+
           |                     |
+----------v---------+ +--------v-------------------------------+
|   ML Microservice  | |         TASK QUEUE LAYER               |
|   (FastAPI)        | |   Celery + Redis (Broker + Backend)    |
| - Tender Parser    | | - Document upload tasks                |
| - Bid Evaluator    | | - PDF-to-tender processing             |
| - Embeddings       | | - Auto-close expired tenders           |
|   (all-MiniLM-L6)  | | - Audit outbox draining               |
+--------------------+ | - Email dispatch (SMTP)                |
                       | - Bid evaluation orchestration          |
                       +---------+-------------------------------+
                                 |
+--------------------------------v--------------------------------+
|                       DATA LAYER                                |
|  +----------------+  +--------------+  +--------------+         |
|  | PostgreSQL 15  |  | Supabase     |  | Redis 7      |         |
|  | (+ pgvector)   |  | Object Store |  | (Cache)      |         |
|  | 30+ tables     |  | (Documents)  |  |              |         |
|  +----------------+  +--------------+  +--------------+         |
+-----------------------------------------------------------------+
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TypeScript | Server-side rendered UI with client-side interactivity |
| Styling | Tailwind CSS | Utility-first responsive design |
| Backend API | FastAPI (Python 3.11+) | Async REST API with automatic OpenAPI documentation |
| Database | PostgreSQL 15 with pgvector extension | Relational data storage + vector similarity search |
| Cloud Storage | Supabase Storage | Document and file hosting (PDFs, NID images) |
| Task Queue | Celery + Redis | Background job processing (documents, emails, ML) |
| Cache/Broker | Redis 7 | Message broker for Celery and application caching |
| ML Service | FastAPI + Groq LLM + SentenceTransformers | Document parsing, embeddings, bid evaluation |
| Authentication | JWT (HS256) + bcrypt | Access/refresh token pair with password hashing |
| Encryption | AES-256-GCM | End-to-end message encryption at rest |
| Email | SMTP (Gmail) via Celery | Transactional email (invitations, password resets) |
| Containerization | Docker + Docker Compose | Multi-service orchestration (6 containers) |
| Testing | pytest + pytest-asyncio | Automated unit and integration testing |

---

## 4. Database Design

The database schema consists of **30+ tables** organized into logical domains. Below is a summary of the key table groups.

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
| organization_employees | User-to-org membership with role-based access (Owner, ProcurementOfficer, Finance, Viewer) |
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
| tender_chat_messages | Messages within tender-scoped chat rooms |
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
| audit_outbox | Transactional outbox for resilient, non-blocking event capture |
| audit_logs | WORM-compliant, cryptographically chained, append-only audit log |
| audit_archives | Sealed batch archives with Merkle root verification |

**Key Enums:** user_status, organization_type, verification_status, role_in_org, tender_status, tender_visibility, bid_status, contract_status, transaction_type, notification_ref_type, procurement_nature_val, procurement_method_val

---

## 5. Implemented Features by Functional Requirement

### 5.1 FR-01: Landing Page and Public Interface

**Status: Fully Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Public Landing Page | Marketing homepage with platform overview, hero section, feature showcase, and call-to-action | Next.js server-rendered page |
| Navigation | Header with links to About, News, Events, Help, Legal, Policies, Support | Dedicated route directories |
| Static Information Pages | About, Help, Legal, and Policy pages for platform information | Static Next.js pages |
| Responsive Design | Mobile-first responsive layout using Tailwind CSS | Global CSS + Tailwind configuration |

---

### 5.2 FR-02: Public Tender Browsing

**Status: Implemented (Fixed Post-Audit)**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Public Tenders Listing | Browse all published public tenders without authentication | GET /tenders/public/list |
| Tender Detail View | View full tender details including documents, deadlines, and budget | GET /tenders/public/{tender_id} |
| API Path Correction | Fixed incorrect frontend API path (post-audit fix) | Removed broken proxy path and fake fallback data |
| Error State Handling | Shows proper error states when API is unreachable | Replaced hardcoded fallback with error UI |

---

### 5.3 FR-04: Organization Registration and Onboarding

**Status: Fully Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Master Account Signup | Organization owner registers with full KYC details (name, email, NID, DOB, phone, org info) | POST /orgs endpoint |
| Organization Types | Support for Buyer and Vendor organization types | organization_type enum |
| Document Upload | Upload Trade License, TIN, VAT, and RJSC certificates to Supabase Storage | POST /orgs/{org_id}/documents |
| Verification Status | Organization enters Pending status until admin verifies documents | verification_status enum |
| Unique Join Code | Auto-generated unique join code for member onboarding | unique_join_code field |
| NID Verification | Upload NID front and back images for identity verification | Supabase Storage integration |
| Credit Balance Init | New organizations receive 250 starter tokens | credit_balance DEFAULT 250 |

---

### 5.4 FR-05: User Authentication and Account Security

**Status: Partially Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| User Login | Email + password authentication with JWT access/refresh token pair | POST /api/auth/login with bcrypt + HS256 JWT |
| Access Token | 60-minute expiry JWT with user ID and email in payload | create_access_token() |
| Refresh Token | 7-day expiry JWT for session renewal | create_refresh_token() |
| Password Hashing | bcrypt-based password hashing and verification | bcrypt.hashpw() / bcrypt.checkpw() |
| Change Password | Authenticated users can change their password | PUT /api/users/me/password |
| Password Reset | Email-based password reset with 30-minute cryptographic token | POST /api/auth/forgot-password |
| Reset Token Verification | Validates token existence, expiry, and single-use enforcement | GET /api/auth/verify-reset-token |
| Reset Confirmation | Updates password hash after valid token verification | POST /api/auth/reset-password |
| Reset Token Security | Previous unused tokens auto-invalidated on new request | SQL-level token invalidation |
| Last Login Tracking | Records timestamp of each successful login | UPDATE users SET last_login_at |

**Not yet implemented:** Two-factor authentication (2FA/TOTP), OTP verification, logout token blacklist.

---

### 5.5 FR-06: Organization Profile and Verification

**Status: Partially Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Organization Profile | View and update organization details (name, address, website, description) | GET/PUT /orgs/{org_id} |
| Document Management | Upload and track verification documents with review status | POST/GET /orgs/{org_id}/documents |
| Admin Verification | Platform admin reviews and approves/rejects organization documents | POST /auth/admin/verify/{org_id} |
| Organization Search | Search organizations by name and type | GET /search-organization |
| Vendor Enlistment | Buyer organizations can enlist verified vendors for future tenders | enlisted_vendors table |
| Organization Directory | Browse and view verified organizations | Frontend listing pages |

---

### 5.6 FR-07: Employee Invitation and Management

**Status: Fully Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Email Invitations | Organization owner invites employees via email with unique token link | POST /orgs/{org_id}/invite with Celery email dispatch |
| Invitation Acceptance | Invited user registers with pre-filled organization association | POST /api/auth/register-user |
| Role Assignment | Owner assigns roles to members (ProcurementOfficer, Finance, Viewer, TenderReceiver) | PUT /orgs/{org_id}/members/{user_id}/role |
| Member Management | View, update roles, and remove organization members | GET/DELETE member endpoints |
| Invitation Expiry | Invitations automatically expire after 7 days | expires_at DEFAULT NOW() + INTERVAL '7 days' |
| Invitation UI | Frontend invitation section with pending/accepted status display | InvitationSection.tsx component |

---

### 5.7 FR-08: Tender Creation and Lifecycle Management

**Status: Mostly Implemented**

This is the most feature-rich module in the system, covering the complete tender lifecycle.

#### 5.7.1 Tender Creation

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Manual Tender Creation | Create tender with title, description, category, procurement nature/method, budget, deadlines, and document requirements | POST /buyer/tender |
| One-Click PDF Tender | Upload procurement PDF; AI extracts and auto-fills all tender fields | Async Celery task via ML Service |
| Document Upload | Attach multiple PDF documents (scope of work, BOQ, specifications) | Supabase Storage with background Celery processing |
| Required Documents List | Define which documents vendors must submit with their bids | tender_required_documents table |
| Procurement Classification | Nature (Goods/Works/Services/Consultancy) and Method (OTM/RFQ/RFP/ReverseAuction/Direct) | Lookup tables with enum validation |
| Form Autosave | Draft autosave to localStorage for in-progress tender creation | Client-side persistence |
| Token Deduction | Publishing a tender deducts tokens from buyer organization balance | Credit transaction with Deduct type |
| Vector Embedding | Generated 384-dimensional embedding for semantic similarity | SentenceTransformer via ML service |

#### 5.7.2 Server-Side Draft Workflow

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Save as Draft | Save tender without publishing (status = Draft) | POST /buyer/draft-with-documents |
| Draft Listing | Buyer sees draft tenders on their dashboard | GET /buyer/my-tenders?status=Draft |
| Publish Draft | Promote a draft to Published status with token deduction | POST /tenders/{id}/publish |
| Edit Rules | Draft tenders freely edited; Published tenders only if no bids received | PUT /tenders/{id} with business rule enforcement |

#### 5.7.3 Edit Tender

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Update Tender | Modify tender details (title, description, budget, deadlines, documents) | PUT /tenders/{id} |
| Edit Page | Dedicated frontend page for editing tender details | edit-tender/[id]/page.tsx |
| Edit Action | Quick edit link from buyer's tender workbench view | Button in view-my-tender page |

#### 5.7.4 Cancel and Delete

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Soft Cancel (Withdraw) | Cancel a published tender without deleting data (status = Cancelled) | POST /tenders/{id}/withdraw |
| Hard Delete | Permanently delete a draft or no-bid tender | DELETE /tenders/{id} |
| Cancel vs Delete UX | Confirmation modals differentiate cancel from delete | Frontend confirmation dialogs |
| Notification Cleanup | Deleting a tender removes associated notifications using action_url | Fixed legacy reference_type schema issue |

#### 5.7.5 Auto-Close and Status Management

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Auto-Close Expired | Celery Beat job automatically closes tenders past submission deadline | auto_close_expired_tenders() — hourly task |
| Status Badges | Visual status indicators on tender cards | TenderCard.tsx with status-specific styling |
| Status Filters | Filter tenders by status on buyer dashboard | Enum-based filtering |

#### 5.7.6 Buyer Tender Workbench

| Feature | Description | Implementation |
|---------|-------------|----------------|
| My Tenders List | View all tenders created by buyer organization | GET /buyer/jobs |
| Tender Detail View | Full tender detail with tabs for bids, comparison, and actions | view-my-tender/[id]/page.tsx |
| Bid List | View all bids received for a tender | Bids tab in workbench |
| Bid Comparison | Side-by-side bid comparison with financial and compliance metrics | GET /bids/buyer/tender/{id}/compare |
| Accept Bid | Accept a winning bid and award the tender | POST /bids/buyer/tender/{id}/accept/{bid_id} |

---

### 5.8 FR-10: Bid Submission and Management

**Status: Fully Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Browse Published Tenders | Vendor dashboard shows all available published tenders | Home page with tender listing and search |
| Tender Detail View | View full tender details before bidding | Tender detail page with document downloads |
| Bid Submission | Submit bid with financial amount, description, and required documents | POST /bids/vendor/submit-with-documents |
| Document Upload | Upload compliance documents mapped to tender requirements | Per-document upload to Supabase Storage |
| Bid Update | Modify a submitted bid (amount, description, documents) | PUT /bids/{bid_id} |
| Bid Withdrawal | Withdraw a submitted bid | DELETE /bids/{bid_id} |
| My Bids View | View all bids submitted by vendor organization | GET /bids/vendor/my-bids |
| Ongoing Tenders | Track awarded tenders where vendor is the winner | ongoing-tenders/ page |
| Token Deduction | Bidding deducts tokens from vendor organization balance | Credit transaction on bid submission |
| Bid Document Download | Download bid documents via signed Supabase URLs | Signed URL generation |

---

### 5.9 FR-15: Dashboard and Analytics

**Status: Partially Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Buyer Dashboard | Overview of created tenders with status breakdown and quick actions | home/page.tsx with role-based rendering |
| Seller Dashboard | Live statistics (total bids, active tenders, awarded contracts) | Aggregated from API (replaced hardcoded values) |
| Tender Search | Client-side search filtering by title, description, and organization name | Real-time client filter |
| Status-Based Tabs | Quick filters for Draft, Published, Closed, Awarded, Cancelled tenders | Tab-based navigation |

---

### 5.10 FR-16/FR-17: Messaging and Real-Time Communication

**Status: Partially Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Intra-Company DM | 1-to-1 direct messaging between organization members | POST /api/messages/threads/dm |
| Message Encryption | AES-256-GCM encryption of all message content at rest | messaging/encryption.py — 12-byte IV per message |
| Encryption Key Management | Server-managed 256-bit key from environment variable | MESSAGE_ENCRYPTION_KEY hex-encoded env var |
| WebSocket Real-Time | Live message delivery via WebSocket connections | ws://host/ws/messages?token=jwt with JWT auth |
| Connection Manager | Manages active WebSocket connections per user with multi-device support | ConnectionManager singleton |
| Ping/Pong Keepalive | Client-server heartbeat to maintain persistent connections | ping/pong protocol |
| Contact Search | Search for colleagues within the same organization | GET /api/messages/contacts/search |
| Thread Listing | View all conversation threads with last message preview | GET /api/messages/threads |
| Message History | Paginated message history per thread with decryption | GET /api/messages/threads/{id}/messages |
| Send Message | Send encrypted message with real-time broadcast to recipient | POST /api/messages/threads/{id}/messages |
| Messaging Sidebar | Slide-out messaging UI accessible from any page | MessagingSidebar.tsx |
| Read Tracking | Track when participants last read a thread | last_read_at in thread_participants |

---

### 5.11 FR-18: Token Economy and Payment System

**Status: Partially Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Token Balance | View organization's current credit token balance | GET /payments/balance |
| Platform Pricing | Configurable per-token price, tender publish cost, and bid cost | GET /payments/pricing |
| Token Packages | Pre-defined token bundles with calculated savings percentages | GET /payments/packages |
| Token Purchase | Purchase tokens via payment gateway (sandbox simulation) | POST /payments/purchase |
| Transaction History | View purchase, deduction, and refund transaction ledger | GET /payments/transactions |
| Credit Deduction | Automatic token deduction on tender publish and bid submission | Service-level deduction with logging |
| Transaction Ledger | Complete audit trail of all credit movements | credit_transactions table |
| Manage Tokens Modal | Frontend UI for viewing balance, buying tokens, and transaction history | ManageTokensModal.tsx |

**Payment gateway:** Currently using sandbox simulation. SSLCommerz integration is defined but not yet connected to live webhooks.

---

### 5.12 FR-20: In-App Notification System

**Status: Partially Implemented**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| List Notifications | View all notifications with status filtering (all/unread/read) | GET /notifications?status= |
| Unread Count | Badge-style unread notification count for UI indicators | GET /notifications/unread-count |
| Mark as Read | Mark individual notification as read | PATCH /notifications/{id}/read |
| Mark All Read | Bulk-mark all notifications as read | PATCH /notifications/read-all |
| Delete Notification | Remove a specific notification | DELETE /notifications/{id} |
| Tender Notifications | Auto-generated notifications for tender events | create_notification() service function |
| Notification Cleanup | Cascading cleanup when tender is deleted | delete_notifications_for_tender() |
| Notification Types | Extensible notification type catalog | notification_types table |

---

### 5.13 FR-21: Admin Dashboard and Platform Moderation

**Status: Partially Implemented (Guards Added Post-Audit)**

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Admin Login | Dedicated admin authentication with admin-role JWT claims | POST /api/auth/admin/login |
| Admin Role Types | SuperAdmin and PlatformAdmin roles | admin_role_type enum with JWT embedding |
| Auth Guards | All sensitive admin routes protected with get_current_admin dependency | Post-audit fix on all sensitive endpoints |
| Pending Accounts | View organizations awaiting verification approval | GET /admin/pending-accounts |
| Organization Verification | Approve or reject organization registration with document review | POST /auth/admin/verify/{org_id} |
| Pricing Management | Update platform-wide token pricing and activity costs | POST /admin/update-price |
| Token Package CRUD | Create, update, and delete token package bundles | POST/PUT/DELETE /admin/packages |
| Admin Dashboard UI | Dedicated admin interface with organization review workflow | admin-home/ and admin-login/ pages |
| Pending Request Detail | Modal for reviewing organization details and verification documents | PendingRequestDetailModal.tsx |

---

### 5.14 FR-22: Immutable Audit Trail and Compliance

**Status: Implemented (Activated Post-Audit)**

This is a comprehensive, enterprise-grade audit system with multiple layers of protection.

#### 5.14.1 Audit Middleware (Auto-Capture)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Automatic Capture | Non-blocking middleware captures all state-changing operations (POST/PUT/PATCH/DELETE) | AuditMiddleware mounted in main.py |
| User Extraction | Extracts user identity from JWT Bearer token | JWT payload decoding |
| Request Metadata | Captures IP address, User-Agent, and response status code | Logged alongside audit event |
| Selective Skipping | Skips non-auditable paths (docs, health, login, audit endpoints) | Configurable SKIP_PATH_PREFIXES |

#### 5.14.2 Transactional Outbox Pattern

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Outbox Table | Non-blocking event buffer for audit events | audit_outbox table with PENDING status |
| Background Draining | Celery task drains outbox records and chains them cryptographically | process_audit_outbox_task() |
| Failure Handling | Outbox records marked FAILED with error messages on processing errors | status column management |

#### 5.14.3 WORM-Compliant Cryptographic Audit Log

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Append-Only Log | Immutable audit log — inserts only, no updates or deletes | audit_logs table with trigger enforcement |
| Cryptographic Chaining | Each log entry references the hash of the previous entry (blockchain-style) | previous_hash, payload_hash, hash_signature |
| Tamper Detection | Periodic integrity verification walks the hash chain | audit_tamper_detection_check_task() |
| WORM Trigger | PostgreSQL trigger prevents UPDATE/DELETE/TRUNCATE | trg_protect_audit_logs trigger |
| Sequence Numbers | Monotonically increasing sequence for ordering and gap detection | sequence_number BIGINT UNIQUE |
| Event UUIDs | Globally unique event identifiers for deduplication | event_uuid UUID UNIQUE |

#### 5.14.4 Audit API Endpoints

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Search Logs | Paginated, multi-filter audit log search | GET /admin/audit/logs |
| Log Detail | Retrieve single audit entry by ID | GET /admin/audit/logs/{log_id} |
| Entity Trail | View complete audit history for a specific entity | GET /admin/audit/entity-trail |
| Integrity Check | Run on-demand hash chain verification | POST /admin/audit/verify-integrity |
| Audit Stats | Summary statistics (total entries, latest timestamp, chain health) | GET /admin/audit/stats |
| Archive List | View sealed batch archives with Merkle root verification | GET /admin/audit/archives |

#### 5.14.5 Change Data Capture (CDC)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Database Triggers | Automatic audit capture on INSERT/UPDATE/DELETE for critical tables | fn_cdc_audit_capture() PostgreSQL function |
| Old/New Values | Captures both old and new values as JSONB for change diff | old_values, new_values columns |
| Entity Auto-Detection | Automatically identifies entity type and ID from table and column naming | Cascading COALESCE on common ID columns |

#### 5.14.6 Sealed Archives

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Batch Sealing | Archive audit log batches with Merkle root verification | seal_audit_archive_batch() |
| Archive Storage | Upload sealed archive files to Supabase Storage | Integration with supabase_storage.py |
| Archive Metadata | Track sequence ranges, record counts, genesis/terminal hashes | audit_archives table |

---

### 5.15 AI/ML-Powered Features

**Status: Implemented**

#### 5.15.1 PDF Tender Parsing (Document Intelligence)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| PDF Text Extraction | Extract raw text from uploaded procurement PDF documents | tender_parser.py — supports filepath, bytes, and stream |
| LLM-Powered Field Extraction | Use Groq LLM to extract structured tender fields from unstructured PDF text | System prompt to structured JSON output |
| One-Click Tender Creation | Upload PDF, auto-fill all tender fields, buyer reviews and publishes | Async Celery task via ML service |
| Extracted Fields | Title, description, eligibility, budget range, deadlines, procurement nature/method, required documents | ProcurementDocument Pydantic schema |
| Embedding Generation | Generate 384-dimensional vector embeddings for semantic similarity | SentenceTransformer (all-MiniLM-L6-v2) |

#### 5.15.2 Smart Bid Evaluation (LLM-Assisted Scoring)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Multi-Stage Evaluation | 4-stage pipeline: Financial, Document Compliance, Semantic Relevance, LLM Rubric | bid_evaluator.py — stateless scoring engine |
| Financial Scoring | Automated scoring based on bid amount relative to budget midpoint | _financial_score_for() |
| Document Compliance | Check which required documents were submitted vs missing | compute_compliance_for_bid() |
| Semantic Relevance | Compare bid description embedding against tender embedding | Cosine similarity via SentenceTransformer |
| LLM Rubric Scoring | Groq LLM scores bids on clarity, completeness, and feasibility (0-100 each) | RUBRIC_SYSTEM_PROMPT |
| Risk Flag Detection | AI identifies risk indicators (vague timelines, missing certifications) | Extracted from LLM rubric response |
| Weighted Composite Score | Configurable weight blending: Financial 20%, Docs 20%, Embeddings 5%, LLM 55% | DEFAULT_WEIGHT_CONFIG |
| Evaluation Run Tracking | Track evaluation lifecycle (pending, running, completed, failed) | bid_evaluation_runs table with timeout recovery |
| Results Storage | Append-only evaluation results — re-runs create new rows, never overwrite | bid_evaluations table |
| Low Outlier Detection | Statistical detection of abnormally low bids | is_low_outlier flag |
| Evaluation UI Panel | Frontend panel for triggering evaluation and viewing results | BidEvaluationPanel.tsx |

#### 5.15.3 ML Microservice

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Dedicated ML Service | Separate FastAPI microservice for compute-intensive ML tasks | ml/src/main.py — runs on port 8001 |
| Stateless Design | ML service receives self-contained payloads; never queries the database | Clean separation of concerns |
| Model Caching | Hugging Face model cache mounted as Docker volume for persistence | Volume mount for model weights |

---

### 5.16 Infrastructure and Middleware

#### 5.16.1 Request Logging Middleware

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Structured JSON Logging | Every request/response logged as structured JSON with timing data | RequestLoggingMiddleware — mounted in main.py |
| Request ID Tracking | Unique request ID generated for each request; returned in X-Request-Id header | UUID-based or client-provided |
| Performance Timing | Request duration measured in milliseconds | time.perf_counter() — logged as duration_ms |
| Sensitive Path Redaction | Paths containing /password, /login, /register are sanitized in logs | _sanitize_path() function |
| User Identification | Extracts authenticated user ID from JWT for log correlation | _extract_user_id() from Bearer token |

#### 5.16.2 CORS Configuration

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Cross-Origin Support | Configured CORS middleware allowing frontend-backend communication | CORSMiddleware with credentials support |

#### 5.16.3 Background Task Processing

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Celery Worker | Background task processing for long-running operations | celery worker --beat |
| Redis Broker | Redis 7 as message broker and result backend | Docker service on port 6379 |
| Document Upload Tasks | Async upload of tender documents to Supabase Storage | upload_tender_documents_to_supabase() |
| PDF Processing Tasks | Async PDF parsing and ML embedding generation | document_tasks.py |
| Email Dispatch | Async email sending for invitations and password resets | notification_tasks.py via SMTP |
| Auto-Close Task | Periodic task to close expired tenders | auto_close_expired_tenders_task() — Celery Beat |
| Audit Outbox Draining | Background task to process audit event buffer | process_audit_outbox_task() |
| Tamper Detection | Periodic hash chain integrity verification | audit_tamper_detection_check_task() |

#### 5.16.4 Email Service

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Transactional Email | SMTP-based email delivery for invitations, password resets, and notifications | services/email.py — Gmail SMTP |
| HTML Email Templates | Professionally designed HTML email templates | Inline HTML generation |
| Celery Integration | Non-blocking email dispatch via background tasks | send_password_reset_email_task.delay() |
| Fallback Mechanism | Falls back to async thread if Celery dispatch fails | asyncio.create_task(asyncio.to_thread()) |

#### 5.16.5 Cloud Storage

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Supabase Integration | File upload, download, and signed URL generation via Supabase Storage API | services/supabase_storage.py |
| File Operations | Upload (stream/local), download bytes, generate signed URLs, delete files | Multiple utility functions |
| Path Sanitization | File paths sanitized and prefixed with UUID for uniqueness | _build_object_path() |

#### 5.16.6 Health Check

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Health Endpoint | Application health check with database connectivity status | GET /health — returns ok/degraded |

---

## 6. API Endpoint Summary

### Authentication (/api/auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login with JWT token pair |
| POST | /api/auth/register-user | Employee registration via invitation token |
| POST | /api/auth/admin/login | Admin-specific login |
| POST | /api/auth/forgot-password | Request password reset email |
| GET | /api/auth/verify-reset-token | Validate reset token |
| POST | /api/auth/reset-password | Confirm password reset |

### Organizations (/orgs)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /orgs | Create new organization (master signup) |
| GET | /orgs/{org_id} | Get organization details |
| PUT | /orgs/{org_id} | Update organization info |
| POST | /orgs/{org_id}/documents | Upload verification documents |
| GET | /orgs/{org_id}/documents | List verification documents |
| POST | /orgs/{org_id}/invite | Invite employee by email |
| GET | /orgs/{org_id}/members | List organization members |
| PUT | /orgs/{org_id}/members/{user_id}/role | Update member role |
| DELETE | /orgs/{org_id}/members/{user_id} | Remove member |
| GET | /search-organization | Search organizations |

### Tenders (/tenders, /buyer)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /buyer/tender | Create and publish tender with documents |
| POST | /buyer/draft-with-documents | Save tender as draft |
| GET | /buyer/jobs | List buyer's tenders (filterable) |
| GET | /tenders/{id} | Get tender details |
| PUT | /tenders/{id} | Update tender |
| POST | /tenders/{id}/publish | Publish a draft tender |
| POST | /tenders/{id}/withdraw | Cancel/withdraw tender |
| DELETE | /tenders/{id} | Delete tender |
| GET | /tenders/public/list | List public tenders (no auth) |
| GET | /tenders/public/{id} | Public tender detail (no auth) |

### Bids (/bids)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /bids/vendor/submit-with-documents | Submit bid with documents |
| GET | /bids/vendor/my-bids | List vendor's submitted bids |
| PUT | /bids/{bid_id} | Update submitted bid |
| DELETE | /bids/{bid_id} | Withdraw bid |
| GET | /bids/buyer/tender/{id}/bids | List bids for buyer's tender |
| GET | /bids/buyer/tender/{id}/compare | Bid comparison analysis |
| POST | /bids/buyer/tender/{id}/accept/{bid_id} | Accept winning bid |
| POST | /bids/buyer/tender/{id}/evaluate | Trigger AI bid evaluation |
| GET | /bids/buyer/tender/{id}/evaluation/latest | Get latest evaluation results |

### Payments (/payments)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /payments/balance | Get token balance |
| GET | /payments/pricing | Get platform pricing |
| GET | /payments/packages | List token packages |
| POST | /payments/purchase | Purchase tokens |
| GET | /payments/transactions | Transaction history |

### Messaging (/api/messages)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/messages/contacts/search | Search organization contacts |
| GET | /api/messages/threads | List conversation threads |
| POST | /api/messages/threads/dm | Create/get DM thread |
| GET | /api/messages/threads/{id}/messages | Get thread messages |
| POST | /api/messages/threads/{id}/messages | Send message |
| WS | /ws/messages?token= | Real-time WebSocket messaging |

### Notifications (/notifications)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notifications | List notifications (filterable) |
| GET | /notifications/unread-count | Unread notification count |
| PATCH | /notifications/{id}/read | Mark as read |
| PATCH | /notifications/read-all | Mark all as read |
| DELETE | /notifications/{id} | Delete notification |

### Users (/api/users)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/me | Get user profile |
| PUT | /api/users/me/profile | Update profile |
| PUT | /api/users/me/password | Change password |
| GET | /api/users/me/documents | List verification documents |
| POST | /api/users/me/documents | Upload NID documents |

### Admin (/api/auth/admin, /admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/pending-accounts | Pending organization accounts |
| POST | /auth/admin/verify/{org_id} | Verify/reject organization |
| POST | /admin/update-price | Update platform pricing |
| CRUD | /admin/packages | Token package management |
| GET | /admin/audit/logs | Search audit logs |
| GET | /admin/audit/stats | Audit statistics |
| POST | /admin/audit/verify-integrity | Verify hash chain |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check with DB status |

---

## 7. Testing and Quality Assurance

### 7.1 Test Suite Overview

The project maintains a comprehensive automated test suite with **280 tests passing** across 18 test modules:

| Test Module | Coverage Area |
|-------------|---------------|
| test_auth/ | Login, registration, JWT token generation, password hashing |
| test_admin/ | Admin login, auth guards (401/403), pending accounts, verification |
| test_organizations/ | Organization CRUD, member management, document upload |
| test_tenders/ | Tender lifecycle (31 tests: service + router + Celery) |
| test_tenders/test_tender_delete.py | Tender deletion with notification cascade cleanup |
| test_tenders/test_notification_cleanup.py | Notification cleanup on tender operations |
| test_bids/ | Bid submission, update, withdraw, comparison |
| test_evaluations/ | Bid evaluation run lifecycle |
| test_payments/ | Balance, pricing, purchase, transactions |
| test_messaging/ | Thread creation, message encryption/decryption |
| test_notifications/ | 14 tests: router, service, and middleware integration |
| test_users/ | 10 tests: profile, password change, document upload |
| test_middleware/ | Request logging and audit outbox capture |
| test_audit/ | Log integrity verification, outbox processing |
| test_core/ | Security utilities, pagination, database helpers |
| test_storage/ | Supabase file upload/download mocking |

### 7.2 Test Infrastructure

| Component | Technology |
|-----------|-----------|
| Framework | pytest + pytest-asyncio |
| DB Mocking | asyncpg mock connections |
| API Testing | FastAPI TestClient |
| Fixtures | Shared conftest.py with reusable fixtures |

---

## 8. Deployment Architecture

The application is fully containerized using Docker Compose with 6 services:

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| db | PostgreSQL 15 Alpine | 5433 | Primary database with pgvector extension |
| backend | FastAPI (custom) | 8000 | REST API server with auto-reload |
| redis | Redis 7 Alpine | 6380 | Message broker and cache |
| ml | FastAPI ML (custom) | 8001 | Document intelligence and bid evaluation |
| celery_worker | Celery (custom) | — | Background task worker with Beat scheduler |
| frontend | Next.js 14 (custom) | 3000 | Server-side rendered React application |

### Key Infrastructure Features

- **Hot Reload:** Backend, frontend, and ML service all support live code reloading in development
- **Volume Mounting:** Source code directories mounted for development; Hugging Face model cache persisted
- **Service Dependencies:** Proper startup ordering (db, redis, ml, backend, celery, frontend)
- **Environment Isolation:** Per-service .env files with Docker-internal networking

---

## 9. FR Coverage Summary Matrix

| FR | Description | Status | Key Implementation |
|----|-------------|--------|-------------------|
| FR-01 | Landing Page | Done | Next.js public pages with responsive design |
| FR-02 | Public Tender Browsing | Done | Fixed API path + error states (post-audit) |
| FR-03 | Search and Discovery | Not Implemented | Embedding infrastructure ready; search module stub |
| FR-04 | Organization Registration | Done | Full KYC signup with Supabase document storage |
| FR-05 | Authentication and Security | Partial+ | Login, JWT, password change/reset; no 2FA/OTP |
| FR-06 | Organization Profile | Partial | Profile CRUD, admin verification; no join-by-code |
| FR-07 | Employee Management | Done | Email invitations, role assignment, member CRUD |
| FR-08 | Tender Lifecycle | Mostly Done | Draft/publish/edit/cancel/delete/auto-close |
| FR-09 | Vendor Recommendations | Not Implemented | DB schema and ML infrastructure ready |
| FR-10 | Bid Submission | Done | Submit, update, withdraw with document upload |
| FR-11 | Bid Evaluation and Award | Partial | AI evaluation + bid accept; no formal NOA |
| FR-12 | Restricted Tenders | Not Implemented | Schema exists; access enforcement pending |
| FR-13 | Contracts Module | Not Implemented | Table schema defined; CRUD stub only |
| FR-14 | Disputes Module | Not Implemented | Module stub exists |
| FR-15 | Dashboard Analytics | Partial+ | Live seller stats; admin KPIs still hardcoded |
| FR-16 | Intra-Company Messaging | Partial | Encrypted DM with WebSocket real-time delivery |
| FR-17 | Inter-Company Messaging | Partial | Tender-scoped chat schema; full flow pending |
| FR-18 | Payment and Tokens | Partial | Token ledger real; payment gateway simulated |
| FR-19 | Bid Bond and Refunds | Not Implemented | Schema ready; no refund logic |
| FR-20 | Notifications | Partial | Full CRUD + cleanup; limited auto-generation |
| FR-21 | Admin Dashboard | Partial+ | Auth guards, org verification, pricing; KPIs pending |
| FR-22 | Audit and Compliance | Active | Full WORM audit chain with middleware (post-audit) |
| FR-23 | Report Generation | Not Implemented | Module stub exists |
| FR-24 | Vendor Intelligence | Not Implemented | Schema and ML infrastructure ready |
| FR-25 | Payment Gateway (Live) | Not Implemented | SSLCommerz stub; no webhook |
| FR-26 | CMS for Public Content | Not Implemented | Static pages only |

### Summary Statistics

| Category | Count |
|----------|-------|
| Fully Implemented | 6 |
| Mostly Implemented | 1 |
| Partially Implemented (functional) | 8 |
| Not Yet Implemented | 11 |
| Total Functional Requirements | 26 |

---

*This report was generated from a comprehensive analysis of the ProcureNext codebase, including the database schema (init.sql), backend API modules, ML microservice, frontend pages and components, middleware stack, Celery tasks, and test suite.*
