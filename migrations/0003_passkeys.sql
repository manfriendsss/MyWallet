-- Passkeys: sign in with the device's fingerprint / Face ID instead of typing the password

CREATE TABLE IF NOT EXISTS passkeys (
  -- base64url credential ID as the authenticator reports it
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- base64url COSE public key
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  name TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys(user_id);

-- One-time challenges for a registration or sign-in ceremony, valid for 5 minutes
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  user_id INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('register', 'login')),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expiry ON webauthn_challenges(expires_at);
