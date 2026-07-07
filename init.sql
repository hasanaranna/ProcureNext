-- ============================================================
-- ProcureNext — init.sql (PostgreSQL)
-- Drop existing objects in reverse-dependency order, then create
-- ============================================================

-- Drop tables (reverse dependency order)
DROP TABLE IF EXISTS organization_documents CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TABLE IF EXISTS organization_employees CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS user_verification CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS invitation_status CASCADE;
DROP TYPE IF EXISTS review_status_enum CASCADE;
DROP TYPE IF EXISTS role_in_org CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS organization_type CASCADE;
DROP TYPE IF EXISTS admin_role_type CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_status         AS ENUM ('Active', 'Suspended', 'Pending');
CREATE TYPE admin_role_type     AS ENUM ('SuperAdmin', 'PlatformAdmin');
CREATE TYPE organization_type   AS ENUM ('Buyer', 'Vendor');
CREATE TYPE verification_status AS ENUM ('Pending', 'Verified', 'Rejected');
CREATE TYPE role_in_org         AS ENUM ('Owner', 'ProcurementOfficer', 'Finance', 'Viewer' , 'TenderReceiver');
CREATE TYPE review_status_enum  AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE invitation_status   AS ENUM ('Pending', 'Accepted', 'Declined', 'Cancelled');

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
    user_id             INT                 PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    verified_by         INT                 REFERENCES admins(admin_id),
    nid_front_file_path TEXT,
    nid_back_file_path  TEXT,
    review_status       review_status_enum  DEFAULT 'Pending',
    verified_at         TIMESTAMP
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
    -- Temporarily store Supabase Storage URLs until real TIN/BIN values are collected
    tin_number           TEXT,  -- TIN certificate PDF URL
    bin_number           TEXT,  -- VAT certificate PDF URL
    credit_balance       INT                 DEFAULT 0,
    unique_join_code     VARCHAR(50)         UNIQUE,
    created_at           TIMESTAMP           DEFAULT NOW()
);

CREATE TABLE organization_employees (
    org_user_id     SERIAL          PRIMARY KEY,
    organization_id INT             NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    user_id         INT             NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_in_org     role_in_org     NOT NULL,
    joined_at       TIMESTAMP       DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE TABLE document_types (
    type_id     SERIAL          PRIMARY KEY,
    type_name   VARCHAR(100)    UNIQUE NOT NULL,
    description TEXT,
    is_active   BOOLEAN         DEFAULT TRUE,
    created_at  TIMESTAMP       DEFAULT NOW()
);

-- Seed initial document types
INSERT INTO document_types (type_name) VALUES
    ('TradeLicense'),
    ('TIN'),
    ('VAT'),
    ('RJSC');

CREATE TABLE organization_documents (
    document_id      SERIAL              PRIMARY KEY,
    organization_id  INT                 NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    reviewed_by      INT                 REFERENCES admins(admin_id),
    document_type_id INT                 NOT NULL REFERENCES document_types(type_id),
    file_path        TEXT                NOT NULL,
    review_status    review_status_enum  DEFAULT 'Pending',
    review_notes     TEXT,
    reviewed_at      TIMESTAMP,
    uploaded_at      TIMESTAMP           DEFAULT NOW()
);

-- ============================================================
-- USER INVITATIONS (for employee signup flow)
-- ============================================================

CREATE TABLE user_invitations (
    invitation_id   SERIAL              PRIMARY KEY,
    organization_id INT                 NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    invited_by      INT                 NOT NULL REFERENCES users(user_id),
    email           VARCHAR(255)        NOT NULL,
    token           VARCHAR(255)        UNIQUE NOT NULL,
    status          invitation_status   DEFAULT 'Pending',
    created_at      TIMESTAMP           DEFAULT NOW(),
    expires_at      TIMESTAMP           DEFAULT (NOW() + INTERVAL '7 days')
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email           ON users(email);
CREATE INDEX idx_users_status          ON users(status);
CREATE INDEX idx_org_type              ON organizations(organization_type);
CREATE INDEX idx_org_verify            ON organizations(verification_status);
CREATE INDEX idx_org_employees_org     ON organization_employees(organization_id);
CREATE INDEX idx_org_employees_user    ON organization_employees(user_id);
CREATE INDEX idx_invitations_token     ON user_invitations(token);
CREATE INDEX idx_invitations_org       ON user_invitations(organization_id);
CREATE INDEX idx_invitations_email     ON user_invitations(email);
