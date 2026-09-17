const { Pool } = require("pg");
require("dotenv").config();

const hasConnectionString = Boolean(process.env.DATABASE_URL);
const hasDiscreteConfig = Boolean(
  process.env.DB_HOST || process.env.DB_NAME || process.env.DB_USER
);

let poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

if (hasConnectionString) {
  const connectionString = process.env.DATABASE_URL;
  const isNeonOrProd =
    connectionString.includes("neon.tech") || process.env.NODE_ENV === "production";

  poolConfig = {
    ...poolConfig,
    connectionString,
    ssl: isNeonOrProd ? { rejectUnauthorized: false } : false,
  };
} else if (hasDiscreteConfig) {
  poolConfig = {
    ...poolConfig,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : undefined,
    database: process.env.DB_NAME || "postgres",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  };
} else {
  console.warn(
    "WARNING: Neither DATABASE_URL nor DB_* configuration variables found in environment. Defaulting to local postgres."
  );
  poolConfig = {
    ...poolConfig,
    host: "localhost",
    port: 5432,
    user: "postgres",
    database: "postgres",
  };
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
