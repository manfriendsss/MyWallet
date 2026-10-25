-- The owner account. The starting password is 12345678 and must be changed at first login.
INSERT OR IGNORE INTO users (username, password_hash, must_change_password)
VALUES ('manfriends', 'pbkdf2$100000$DfC7A0bPeJ9a0Ac2EkDufg==$uJDVsZEaTMi/4MuMjPae9PHmWk/LZtDuSod/B81I62w=', 1);
