-- 001_init.sql: Simple Tickets table initialization

DO $$ BEGIN
    CREATE TYPE priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DROP TABLE IF EXISTS tickets;

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority priority NOT NULL DEFAULT 'MEDIUM',
  mobile TEXT NOT NULL,
  room TEXT,
  pabx TEXT,
  status ticket_status NOT NULL DEFAULT 'PENDING',
  assigned_to INTEGER,
  total_pending_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
