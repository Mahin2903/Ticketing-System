-- 008_firebase_uid_support.sql
-- 1. Alter tickets.user_id to VARCHAR(128) to store Firebase UID directly as the authenticated identity
ALTER TABLE tickets ALTER COLUMN user_id TYPE VARCHAR(128);

-- 2. Add firebase_uid to users table to link Firebase Auth with PostgreSQL user profiles
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
