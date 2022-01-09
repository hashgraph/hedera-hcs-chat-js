SET sql_safe_updates = FALSE;

USE defaultdb;

CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY,
    token_id character varying(255),
    token_symbol character varying(255)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    account_id character varying(255),
    account_key character varying(255),
    username character varying(255)
);