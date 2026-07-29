-- ============================================================
-- eProcurement Platform — PostgreSQL Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- DROP EXISTING TABLES AND ENUMS (Reverse Dependency Order)
-- ============================================================

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS thread_participants CASCADE;
DROP TABLE IF EXISTS message_threads CASCADE;
DROP TABLE IF EXISTS tender_chat_seen CASCADE;
DROP TABLE IF EXISTS tender_chat_messages CASCADE;
DROP TABLE IF EXISTS tender_chat_participants CASCADE;
DROP TABLE IF EXISTS tender_chat_rooms CASCADE;
DROP TABLE IF EXISTS group_msg_seen CASCADE;
DROP TABLE IF EXISTS group_chat CASCADE;
DROP TABLE IF EXISTS org_messages_private CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS notification_recipients CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notification_types CASCADE;
DROP TABLE IF EXISTS credit_discounts CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS vendor_performance CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS awards CASCADE;
DROP TABLE IF EXISTS bid_securities CASCADE;
DROP TABLE IF EXISTS bid_documents CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS tender_vendor_suggestions CASCADE;
DROP TABLE IF EXISTS tender_invitations CASCADE;
DROP TABLE IF EXISTS tender_documents CASCADE;
DROP TABLE IF EXISTS tenders CASCADE;
DROP TABLE IF EXISTS tender_categories CASCADE;
DROP TABLE IF EXISTS procurement_method CASCADE;
DROP TABLE IF EXISTS procurement_nature CASCADE;
DROP TABLE IF EXISTS enlisted_vendors CASCADE;
DROP TABLE IF EXISTS organization_documents CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS organization_employees CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS user_verification CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS thread_type CASCADE;
DROP TYPE IF EXISTS procurement_method_val CASCADE;
DROP TYPE IF EXISTS procurement_nature_val CASCADE;
DROP TYPE IF EXISTS suggestion_status CASCADE;
DROP TYPE IF EXISTS chat_role CASCADE;
DROP TYPE IF EXISTS chat_room_status CASCADE;
DROP TYPE IF EXISTS notification_ref_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS completion_status CASCADE;
DROP TYPE IF EXISTS contract_status CASCADE;
DROP TYPE IF EXISTS security_type CASCADE;
DROP TYPE IF EXISTS bid_status CASCADE;
DROP TYPE IF EXISTS invitation_status CASCADE;
DROP TYPE IF EXISTS tender_status CASCADE;
DROP TYPE IF EXISTS tender_visibility CASCADE;
DROP TYPE IF EXISTS review_status_enum CASCADE;
DROP TYPE IF EXISTS role_in_org CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS organization_type CASCADE;
DROP TYPE IF EXISTS admin_role_type CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_status            AS ENUM ('Active', 'Suspended', 'Pending');
CREATE TYPE admin_role_type        AS ENUM ('SuperAdmin', 'PlatformAdmin');
CREATE TYPE organization_type      AS ENUM ('Buyer', 'Vendor');
CREATE TYPE verification_status    AS ENUM ('Pending', 'Verified', 'Rejected');
CREATE TYPE role_in_org            AS ENUM ('Owner', 'ProcurementOfficer', 'Finance', 'Viewer', 'TenderReceiver');

CREATE TYPE review_status_enum     AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE tender_visibility      AS ENUM ('Public', 'Restricted');
CREATE TYPE tender_status          AS ENUM ('Draft', 'Published', 'Closed', 'Awarded', 'Cancelled');
CREATE TYPE invitation_status      AS ENUM ('Pending', 'Accepted', 'Declined', 'Cancelled');
CREATE TYPE bid_status             AS ENUM ('Draft', 'Submitted', 'UnderEvaluation', 'Accepted', 'Rejected', 'Withdrawn');
CREATE TYPE security_type          AS ENUM ('BankGuarantee', 'Escrow', 'WalletHold');
CREATE TYPE contract_status        AS ENUM ('Active', 'Completed', 'Terminated');
CREATE TYPE completion_status      AS ENUM ('OnTime', 'Delayed', 'Incomplete', 'Disputed');
CREATE TYPE transaction_type       AS ENUM ('Purchase', 'Deduct', 'Refund');
CREATE TYPE notification_ref_type  AS ENUM ('TENDER', 'BID', 'CONTRACT', 'SYSTEM');

CREATE TYPE chat_room_status       AS ENUM ('Active', 'Closed', 'Archived');
CREATE TYPE chat_role              AS ENUM ('Admin', 'Member');
CREATE TYPE suggestion_status      AS ENUM ('Pending', 'Invited', 'Dismissed');
CREATE TYPE procurement_nature_val AS ENUM ('Goods', 'Works', 'Services', 'Consultancy');
CREATE TYPE procurement_method_val AS ENUM ('OTM', 'RFQ', 'RFP', 'ReverseAuction', 'Direct');

-- ============================================================
-- CORE USER & AUTH TABLES
-- ============================================================

CREATE TABLE users (
    user_id         SERIAL          PRIMARY KEY,
    full_name       VARCHAR(255),
    email           VARCHAR(255)    UNIQUE NOT NULL,
    nid             NUMERIC         UNIQUE NOT NULL,
    date_of_birth   TIMESTAMP       NOT NULL,
    password_hash   TEXT            NOT NULL,
    phone           VARCHAR(30),
    is_2fa_enabled  BOOLEAN         DEFAULT FALSE,
    status          user_status     DEFAULT 'Pending',
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP       DEFAULT NOW(),
    updated_at      TIMESTAMP       DEFAULT NOW(),
    refresh_token   TEXT
);

CREATE TABLE admins (
    admin_id    SERIAL          PRIMARY KEY,
    user_id     INT             NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    admin_role  admin_role_type NOT NULL
);

CREATE TABLE user_verification (
    user_id            INT             PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    verified_by        INT             REFERENCES admins(admin_id),
    nid_front_file_path TEXT,
    nid_back_file_path  TEXT,
    review_status      review_status_enum DEFAULT 'Pending',
    verified_at        TIMESTAMP
);

-- ============================================================
-- ORGANIZATION TABLES
-- ============================================================

CREATE TABLE organizations (
    organization_id      SERIAL              PRIMARY KEY,
    primary_contact      INT                 REFERENCES users(user_id),
    organization_name    VARCHAR(255)        NOT NULL,
    organization_type    organization_type   NOT NULL DEFAULT 'Buyer',
    address              TEXT,
    website              VARCHAR(255),
    description          TEXT,
    verification_status  verification_status DEFAULT 'Pending',
    tin_number           TEXT,
    bin_number           TEXT,
    credit_balance       INT                 DEFAULT 0,
    unique_join_code     VARCHAR(50)         UNIQUE,
    org_embedding        VECTOR(768),
    created_at           TIMESTAMP           DEFAULT NOW()
);

CREATE TABLE organization_employees (
    org_user_id     SERIAL          PRIMARY KEY,
    organization_id     INT             NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    user_id             INT             NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_in_org         role_in_org     NOT NULL,
    joined_at           TIMESTAMP       DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

-- ============================================================
-- USER INVITATIONS (for employee signup flow)
-- ============================================================
CREATE TABLE user_invitations (
    invitation_id       SERIAL              PRIMARY KEY,
    organization_id     INT                 NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    invited_by          INT                 NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    email               VARCHAR(255)        NOT NULL,
    token               TEXT                UNIQUE NOT NULL,
    status              invitation_status   DEFAULT 'Pending',
    created_at          TIMESTAMP           DEFAULT NOW(),
    expires_at          TIMESTAMP           DEFAULT NOW() + INTERVAL '7 days',
    UNIQUE (organization_id, email)
);

CREATE TABLE document_types (
    type_id     SERIAL          PRIMARY KEY,
    type_name   VARCHAR(100)    UNIQUE NOT NULL,
    description TEXT,
    is_active   BOOLEAN         DEFAULT TRUE,
    created_at  TIMESTAMP       DEFAULT NOW()
);

-- Seed initial known types (extendable at any time)
INSERT INTO document_types (type_name) VALUES
    ('TradeLicense'),
    ('TIN'),
    ('VAT'),
    ('RJSC');

CREATE TABLE organization_documents (
    document_id     SERIAL              PRIMARY KEY,
    organization_id INT                 NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    reviewed_by     INT                 REFERENCES admins(admin_id),
    document_type_id INT               NOT NULL REFERENCES document_types(type_id),
    file_path       TEXT                NOT NULL,
    review_status   review_status_enum  DEFAULT 'Pending',
    review_notes    TEXT,
    reviewed_at     TIMESTAMP,
    uploaded_at     TIMESTAMP           DEFAULT NOW()
);

CREATE TABLE enlisted_vendors (
    org_id          INT         NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    enlisted_org_id INT         NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    enlisted_by     INT         REFERENCES organization_employees(org_user_id),
    enlisted_at     TIMESTAMP   DEFAULT NOW(),
    PRIMARY KEY (org_id, enlisted_org_id)
);

-- ============================================================
-- LOOKUP / REFERENCE TABLES
-- ============================================================

CREATE TABLE procurement_nature (
    nature_id   SERIAL                  PRIMARY KEY,
    name        procurement_nature_val  UNIQUE NOT NULL
);

CREATE TABLE procurement_method (
    method_id   SERIAL                  PRIMARY KEY,
    method_code procurement_method_val  UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE tender_categories (
    category_id     SERIAL          PRIMARY KEY,
    parent_id       INT             REFERENCES tender_categories(category_id),
    category_name   VARCHAR(255)    NOT NULL,
    UNIQUE (parent_id, category_name)
);

-- ============================================================
-- TENDER TABLES
-- ============================================================

CREATE TABLE tenders (
    tender_id           SERIAL          PRIMARY KEY,
    buyer_id            INT             NOT NULL REFERENCES organizations(organization_id),
    created_by          INT             NOT NULL REFERENCES organization_employees(org_user_id),
    category_id         INT             REFERENCES tender_categories(category_id),
    nature_id           INT             REFERENCES procurement_nature(nature_id),
    method_id           INT             REFERENCES procurement_method(method_id),
    title               VARCHAR(500)    NOT NULL,
    description         TEXT            NOT NULL,
    visibility_type     tender_visibility DEFAULT 'Public',
    budget_min          NUMERIC(18,2),
    budget_max          NUMERIC(18,2),
    security_required   BOOLEAN         DEFAULT FALSE,
    security_valid_until DATE,
    proposal_valid_until DATE,
    tender_public_date  TIMESTAMP,
    pre_bid_meeting     TIMESTAMP,
    tender_opening_date TIMESTAMP,
    submission_deadline TIMESTAMP,
    status              tender_status   DEFAULT 'Draft',
    embedding           VECTOR(768),
    created_at          TIMESTAMP       DEFAULT NOW(),
    updated_at          TIMESTAMP       DEFAULT NOW()
);

CREATE TABLE tender_documents (
    tender_doc_id   SERIAL      PRIMARY KEY,
    tender_id       INT         NOT NULL REFERENCES tenders(tender_id) ON DELETE CASCADE,
    file_name       VARCHAR(255),
    file_path       TEXT,
    uploaded_at     TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE tender_invitations (
    invitation_id       SERIAL              PRIMARY KEY,
    tender_id           INT                 NOT NULL REFERENCES tenders(tender_id) ON DELETE CASCADE,
    vendor_org_id       INT                 NOT NULL REFERENCES organizations(organization_id),
    invited_at          TIMESTAMP           DEFAULT NOW(),
    invitation_status   invitation_status   DEFAULT 'Pending',
    UNIQUE (tender_id, vendor_org_id)
);

CREATE TABLE tender_vendor_suggestions (
    suggestion_id   SERIAL              PRIMARY KEY,
    tender_id       INT                 NOT NULL REFERENCES tenders(tender_id) ON DELETE CASCADE,
    vendor_org_id   INT                 NOT NULL REFERENCES organizations(organization_id),
    similarity_score NUMERIC(5,4),
    suggested_at    TIMESTAMP           DEFAULT NOW(),
    status          suggestion_status   DEFAULT 'Pending'
);

-- ============================================================
-- BID TABLES
-- ============================================================

CREATE TABLE bids (
    bid_id          SERIAL      PRIMARY KEY,
    vendor_org_id   INT         NOT NULL REFERENCES organizations(organization_id),
    submitted_by    INT         NOT NULL REFERENCES organization_employees(org_user_id),
    tender_id       INT         NOT NULL REFERENCES tenders(tender_id),
    financial_amount NUMERIC(18,2),
    description     TEXT,
    status          bid_status  DEFAULT 'Draft',
    submitted_at    TIMESTAMP   DEFAULT NOW(),
    updated_at      TIMESTAMP   DEFAULT NOW(),
    UNIQUE (tender_id, vendor_org_id)
);

CREATE TABLE bid_documents (
    bid_doc_id      SERIAL      PRIMARY KEY,
    bid_id          INT         NOT NULL REFERENCES bids(bid_id) ON DELETE CASCADE,
    doc_type_id     INT         NOT NULL REFERENCES document_types(type_id),
    file_path       TEXT,
    uploaded_at     TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE bid_securities (
    security_id         SERIAL          PRIMARY KEY,
    bid_id              INT             NOT NULL REFERENCES bids(bid_id) ON DELETE CASCADE,
    security_amount     NUMERIC(18,2),
    security_type       security_type,
    bid_security_doc_path TEXT,
    submitted_at        TIMESTAMP DEFAULT NOW(),
    valid_until         DATE
);

-- ============================================================
-- AWARD & CONTRACT TABLES
-- ============================================================

CREATE TABLE awards (
    award_id        SERIAL      PRIMARY KEY,
    winning_bid_id  INT         NOT NULL REFERENCES bids(bid_id),
    awarded_by      INT         NOT NULL REFERENCES organization_employees(org_user_id),
    tender_id       INT         NOT NULL REFERENCES tenders(tender_id),
    remarks         TEXT,
    awarded_at      TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE contracts (
    contract_id             SERIAL          PRIMARY KEY,
    award_id                INT             NOT NULL REFERENCES awards(award_id),
    contract_value          NUMERIC(18,2),
    signed_at               TIMESTAMP,
    contract_document_path  TEXT,
    estimated_end_date      DATE,
    status                  contract_status DEFAULT 'Active'
);

CREATE TABLE vendor_performance (
    performance_id      SERIAL              PRIMARY KEY,
    vendor_org_id       INT                 NOT NULL REFERENCES organizations(organization_id),
    contract_id         INT                 NOT NULL REFERENCES contracts(contract_id),
    rating              NUMERIC(2,1)        CHECK (rating BETWEEN 1 AND 5),
    feedback            TEXT,
    completion_status   completion_status,
    recorded_at         TIMESTAMP           DEFAULT NOW(),
    embedding           VECTOR(768)
);

-- ============================================================
-- PAYMENT & CREDIT TABLES
-- ============================================================

CREATE TABLE payments (
    transaction_id          SERIAL          PRIMARY KEY,
    organization_id         INT             NOT NULL REFERENCES organizations(organization_id),
    amount                  NUMERIC(18,2)   NOT NULL,
    gateway_transaction_id  VARCHAR(255),
    gateway_validation_id   VARCHAR(50),
    status                  VARCHAR(50),
    paid_at                 TIMESTAMP       DEFAULT NOW()
);

CREATE TABLE credit_transactions (
    transaction_id      SERIAL              PRIMARY KEY,
    organization_id     INT                 NOT NULL REFERENCES organizations(organization_id),
    payment_id          INT                 REFERENCES payments(transaction_id),
    amount              NUMERIC(18,2)       NOT NULL,
    transaction_type    transaction_type    NOT NULL,
    payment_reference   VARCHAR(255),
    balance_after       NUMERIC(18,2),
    created_at          TIMESTAMP           DEFAULT NOW()
);

CREATE TABLE credit_discounts (
    org_id                  INT         PRIMARY KEY REFERENCES organizations(organization_id),
    issued_by               INT         REFERENCES admins(admin_id),
    discounted_credit_price NUMERIC(18,2),
    valid_from              TIMESTAMP,
    valid_until             TIMESTAMP,
    is_active               BOOLEAN     DEFAULT TRUE
);

-- ============================================================
-- NOTIFICATION TABLES
-- ============================================================

CREATE TABLE notification_types (
    type_id     SERIAL          PRIMARY KEY,
    type_name   VARCHAR(100)    UNIQUE NOT NULL,
    description TEXT,
    is_active   BOOLEAN         DEFAULT TRUE,
    created_at  TIMESTAMP       DEFAULT NOW()
);

CREATE TABLE notifications (
    notification_id SERIAL                  PRIMARY KEY,
    created_by      INT                     REFERENCES organization_employees(org_user_id),
    reference_type  notification_ref_type,
    reference_id    BIGINT,
    type_id         INT                     NOT NULL REFERENCES notification_types(type_id),
    title           VARCHAR(255)            NOT NULL,
    message         TEXT,
    created_at      TIMESTAMP               DEFAULT NOW()
);

CREATE TABLE notification_recipients (
    recipient_id    SERIAL      PRIMARY KEY,
    notification_id INT         NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
    org_user_id     INT         NOT NULL REFERENCES organization_employees(org_user_id),
    is_read         BOOLEAN     DEFAULT FALSE,
    read_at         TIMESTAMP
);

CREATE TABLE user_notifications (
    notification_id SERIAL      PRIMARY KEY,
    user_id         INT         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(255),
    message         TEXT,
    created_at      TIMESTAMP   DEFAULT NOW()
);

-- ============================================================
-- MESSAGING TABLES
-- ============================================================

-- Direct (private) messages between users
CREATE TABLE org_messages_private (
    message_id      SERIAL      PRIMARY KEY,
    sender_user_id  INT         NOT NULL REFERENCES users(user_id),
    receiver_user_id INT        NOT NULL REFERENCES users(user_id),
    message         TEXT,
    sent_time       TIMESTAMP   DEFAULT NOW(),
    is_read         BOOLEAN     DEFAULT FALSE,
    read_time       TIMESTAMP
);

-- Organisation-level group chat
CREATE TABLE group_chat (
    message_id  SERIAL      PRIMARY KEY,
    org_id      INT         NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    sender_id   INT         NOT NULL REFERENCES organization_employees(org_user_id),
    message     TEXT,
    sent_time   TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE group_msg_seen (
    msg_id      INT         NOT NULL REFERENCES group_chat(message_id) ON DELETE CASCADE,
    member_id   INT         NOT NULL REFERENCES organization_employees(org_user_id),
    is_read     BOOLEAN     DEFAULT FALSE,
    read_time   TIMESTAMP,
    PRIMARY KEY (msg_id, member_id)
);

-- Tender-scoped chat rooms (buyer ↔ vendor per tender)
CREATE TABLE tender_chat_rooms (
    room_id         SERIAL          PRIMARY KEY,
    vendor_org_id   INT             NOT NULL REFERENCES organizations(organization_id),
    buyer_org_id    INT             NOT NULL REFERENCES organizations(organization_id),
    tender_id       INT             NOT NULL REFERENCES tenders(tender_id),
    status          chat_room_status DEFAULT 'Active',
    created_at      TIMESTAMP       DEFAULT NOW(),
    UNIQUE (tender_id, buyer_org_id, vendor_org_id)
);

CREATE TABLE tender_chat_participants (
    room_id     INT         NOT NULL REFERENCES tender_chat_rooms(room_id) ON DELETE CASCADE,
    org_user_id INT         NOT NULL REFERENCES organization_employees(org_user_id),
    added_by    INT         REFERENCES organization_employees(org_user_id),
    role        chat_role   DEFAULT 'Member',
    joined_at   TIMESTAMP   DEFAULT NOW(),
    removed_at  TIMESTAMP,
    PRIMARY KEY (room_id, org_user_id)
);

CREATE TABLE tender_chat_messages (
    message_id  SERIAL      PRIMARY KEY,
    room_id     INT         NOT NULL REFERENCES tender_chat_rooms(room_id) ON DELETE CASCADE,
    sender_id   INT         NOT NULL REFERENCES organization_employees(org_user_id),
    message     TEXT,
    sent_at     TIMESTAMP   DEFAULT NOW(),
    is_deleted  BOOLEAN     DEFAULT FALSE
);

CREATE TABLE tender_chat_seen (
    message_id  INT         NOT NULL REFERENCES tender_chat_messages(message_id) ON DELETE CASCADE,
    org_user_id INT         NOT NULL REFERENCES organization_employees(org_user_id),
    read_at     TIMESTAMP,
    PRIMARY KEY (message_id, org_user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_status  ON users(status);
CREATE INDEX idx_org_type       ON organizations(organization_type);
CREATE INDEX idx_org_verify     ON organizations(verification_status);
CREATE INDEX idx_tenders_buyer  ON tenders(buyer_id);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_deadline ON tenders(submission_deadline);
CREATE INDEX idx_bids_tender    ON bids(tender_id);
CREATE INDEX idx_bids_vendor    ON bids(vendor_org_id);
CREATE INDEX idx_bids_status    ON bids(status);
CREATE INDEX idx_notif_recipients_user ON notification_recipients(org_user_id);
CREATE INDEX idx_notif_recipients_read ON notification_recipients(is_read);
CREATE INDEX idx_tender_chat_messages_room ON tender_chat_messages(room_id);
CREATE INDEX idx_group_chat_org            ON group_chat(org_id);
-- ============================================================
-- MESSAGING (Real-time encrypted intra-company messaging)
-- ============================================================

CREATE TYPE thread_type AS ENUM ('IntraCompany', 'InterCompany');

CREATE TABLE message_threads (
    thread_id       SERIAL PRIMARY KEY,
    thread_type     thread_type NOT NULL DEFAULT 'IntraCompany',
    tender_id       INT REFERENCES tenders(tender_id),
    group_name      VARCHAR(255),
    created_by      INT NOT NULL REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE thread_participants (
    id              SERIAL PRIMARY KEY,
    thread_id       INT NOT NULL REFERENCES message_threads(thread_id) ON DELETE CASCADE,
    user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    is_admin        BOOLEAN DEFAULT FALSE,
    joined_at       TIMESTAMP DEFAULT NOW(),
    last_read_at    TIMESTAMP,
    UNIQUE(thread_id, user_id)
);

CREATE TABLE messages (
    message_id      SERIAL PRIMARY KEY,
    thread_id       INT NOT NULL REFERENCES message_threads(thread_id) ON DELETE CASCADE,
    sender_user_id  INT NOT NULL REFERENCES users(user_id),
    message_text    TEXT NOT NULL,
    encryption_iv   TEXT NOT NULL,
    sent_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_thread_participants_user   ON thread_participants(user_id);
CREATE INDEX idx_thread_participants_thread ON thread_participants(thread_id);
CREATE INDEX idx_messages_thread            ON messages(thread_id, sent_at);
CREATE INDEX idx_messages_sender            ON messages(sender_user_id);
