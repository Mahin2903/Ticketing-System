-- 002_departments.sql: Departments table initialization

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  department_code TEXT NOT NULL UNIQUE,      -- university-assigned ID, e.g. 'CSE', 'FMB'
  department_title TEXT NOT NULL UNIQUE,     -- e.g. 'Computer Science & Engineering'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(department_code);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
