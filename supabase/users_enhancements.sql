-- Sesión 13: last_login_at + reset de contraseña

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at      timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token         text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires timestamptz;
