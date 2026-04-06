DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_status;

CREATE TYPE user_status AS ENUM ('Pending', 'Active', 'Suspended');

CREATE TABLE users (
    user_id         SERIAL          PRIMARY KEY,
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
