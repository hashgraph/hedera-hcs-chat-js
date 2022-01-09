SET sql_safe_updates = FALSE;

USE defaultdb;

DROP TABLE users;

CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY,
    token_id text,
    token_symbol text
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    account_id text,
    account_key text,
    username text,
    badges text[]
);