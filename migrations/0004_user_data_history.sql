-- Previous copies of each synced document, so an accidental overwrite can be undone.
-- The data route keeps the last 60 versions per user and key.

CREATE TABLE IF NOT EXISTS user_data_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  replaced_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_data_history_user_key ON user_data_history (user_id, key, id);
