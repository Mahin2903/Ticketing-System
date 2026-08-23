const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL environment variable is not defined.");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes("neon.tech") || process.env.NODE_ENV === "production")
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
