const db = require("../../config/db");


/**
 * Create a new user
 */
const createUser = async ({ name, email, role = "user" }) => {
  const queryText = `
    INSERT INTO users (name, email, role)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, role, created_at
  `;

  const values = [name.trim(), email.trim().toLowerCase(), role.trim()];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

/**
 * Get users with optional pagination, role filtering, and search
 */
const getAllUsers = async (query = {}) => {
  const { role, email, search, page = 1, limit = 20 } = query;
  const conditions = [];
  const params = [];

  if (role) {
    params.push(role.trim());
    conditions.push(`role = $${params.length}`);
  }

  if (email) {
    params.push(email.trim().toLowerCase());
    conditions.push(`LOWER(email) = $${params.length}`);
  }

  if (search) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Scalable pagination: clamp limit and page
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  // Run data query and total count query in parallel for high performance
  const countQuery = `SELECT COUNT(*)::int AS total FROM users ${whereClause}`;
  const dataQuery = `
    SELECT id, name, email, role, created_at
    FROM users
    ${whereClause}
    ORDER BY id ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, params),
    db.query(dataQuery, [...params, parsedLimit, offset]),
  ]);

  return {
    total: countResult.rows[0].total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(countResult.rows[0].total / parsedLimit),
    data: dataResult.rows,
  };
};

/**
 * Get user by ID
 */
const getUserById = async (id) => {
  const queryText = `
    SELECT id, name, email, role, created_at
    FROM users
    WHERE id = $1
  `;

  const result = await db.query(queryText, [parseInt(id, 10)]);
  return result.rows[0] || null;
};

/**
 * Update user by ID
 */
const updateUser = async (id, data) => {
  const { name, email, role } = data;
  const updates = [];
  const params = [];

  if (name !== undefined) {
    params.push(name.trim());
    updates.push(`name = $${params.length}`);
  }

  if (email !== undefined) {
    params.push(email.trim().toLowerCase());
    updates.push(`email = $${params.length}`);
  }

  if (role !== undefined) {
    params.push(role.trim());
    updates.push(`role = $${params.length}`);
  }

  if (updates.length === 0) {
    return await getUserById(id);
  }

  params.push(parseInt(id, 10));
  const queryText = `
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = $${params.length}
    RETURNING id, name, email, role, created_at
  `;

  const result = await db.query(queryText, params);
  return result.rows[0] || null;
};

/**
 * Get user by Email
 */
const getUserByEmail = async (email) => {
  const queryText = `
    SELECT id, name, email, role, created_at
    FROM users
    WHERE LOWER(email) = LOWER($1)
  `;

  const result = await db.query(queryText, [email.trim()]);
  return result.rows[0] || null;
};

/**
 * Delete user by ID
 */
const deleteUser = async (id) => {
  const queryText = `
    DELETE FROM users
    WHERE id = $1
    RETURNING id, name, email, role, created_at
  `;

  const result = await db.query(queryText, [parseInt(id, 10)]);
  return result.rows[0] || null;
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
};
