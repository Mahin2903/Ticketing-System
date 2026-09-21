-- 007_role_category_and_building_name.sql: Add role_category_id to users and building_name to tickets

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_category_id INT REFERENCES help_topics(id);

CREATE INDEX IF NOT EXISTS idx_users_role_category_id ON users(role_category_id);

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS building_name VARCHAR(255) DEFAULT 'Administration Building';
