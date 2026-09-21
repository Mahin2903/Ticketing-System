-- 006_ticket_feedback.sql: Ticket Feedback table initialization

CREATE TABLE IF NOT EXISTS ticket_feedback (
  id            SERIAL PRIMARY KEY,
  ticket_id     INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_feedback_ticket_id ON ticket_feedback(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_feedback_user_id ON ticket_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_feedback_created_at ON ticket_feedback(created_at);
