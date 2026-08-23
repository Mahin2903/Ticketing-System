const db = require("../../config/db");

/**
 * Create a new department
 */
const createDepartment = async ({ department_code, department_title, is_active = true }) => {
  const queryText = `
    INSERT INTO departments (department_code, department_title, is_active)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const values = [
    department_code.trim(),
    department_title.trim(),
    is_active !== undefined ? Boolean(is_active) : true,
  ];

  const result = await db.query(queryText, values);
  return result.rows[0];
};

/**
 * Get all departments with optional is_active filter
 */
const getAllDepartments = async (query = {}) => {
  const { is_active } = query;
  const conditions = [];
  const params = [];

  if (is_active !== undefined) {
    params.push(is_active === "true" || is_active === true);
    conditions.push(`is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const queryText = `
    SELECT *
    FROM departments
    ${whereClause}
    ORDER BY id ASC
  `;

  const result = await db.query(queryText, params);
  return result.rows;
};

/**
 * Get department by ID
 */
const getDepartmentById = async (id) => {
  const queryText = `
    SELECT *
    FROM departments
    WHERE id = $1
  `;

  const result = await db.query(queryText, [parseInt(id, 10)]);
  return result.rows[0] || null;
};

/**
 * Update department by ID
 */
const updateDepartment = async (id, data) => {
  const { department_code, department_title, is_active } = data;
  const updates = [];
  const params = [];

  if (department_code !== undefined) {
    params.push(department_code.trim());
    updates.push(`department_code = $${params.length}`);
  }

  if (department_title !== undefined) {
    params.push(department_title.trim());
    updates.push(`department_title = $${params.length}`);
  }

  if (is_active !== undefined) {
    params.push(Boolean(is_active));
    updates.push(`is_active = $${params.length}`);
  }

  if (updates.length === 0) {
    return await getDepartmentById(id);
  }

  params.push(parseInt(id, 10));
  const queryText = `
    UPDATE departments
    SET ${updates.join(", ")}
    WHERE id = $${params.length}
    RETURNING *
  `;

  const result = await db.query(queryText, params);
  return result.rows[0] || null;
};

/**
 * Delete department by ID
 */
const deleteDepartment = async (id) => {
  const queryText = `
    DELETE FROM departments
    WHERE id = $1
    RETURNING *
  `;

  const result = await db.query(queryText, [parseInt(id, 10)]);
  return result.rows[0] || null;
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};
