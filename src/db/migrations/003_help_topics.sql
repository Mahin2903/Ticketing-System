-- 003_help_topics.sql: Help Topics table initialization

CREATE TABLE IF NOT EXISTS help_topics (
  id SERIAL PRIMARY KEY,
  topic_code TEXT NOT NULL UNIQUE,
  topic_title TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_topics_code ON help_topics(topic_code);
