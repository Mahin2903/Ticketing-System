/**
 * Role Validator Utility
 * Strictly enforces valid PostgreSQL user roles: 'SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER'
 */

const VALID_ROLES = Object.freeze(["SUPER_ADMIN", "ADMIN", "AGENT", "USER"]);
const STAFF_ROLES = Object.freeze(["SUPER_ADMIN", "ADMIN", "AGENT"]);

/**
 * Check if the provided role is a valid PostgreSQL user role.
 * Case-insensitive check.
 * @param {string} role
 * @returns {boolean}
 */
const isValidRole = (role) => {
  if (!role || typeof role !== "string") return false;
  return VALID_ROLES.includes(role.trim().toUpperCase());
};

/**
 * Check if the provided role has staff/admin privileges.
 * @param {string} role
 * @returns {boolean}
 */
const isStaffRole = (role) => {
  if (!role || typeof role !== "string") return false;
  return STAFF_ROLES.includes(role.trim().toUpperCase());
};

/**
 * Normalize a role string to standard uppercase.
 * @param {string} role
 * @returns {string}
 */
const normalizeRole = (role) => {
  if (!role || typeof role !== "string") return "USER";
  const upper = role.trim().toUpperCase();
  return VALID_ROLES.includes(upper) ? upper : "USER";
};

module.exports = {
  VALID_ROLES,
  STAFF_ROLES,
  isValidRole,
  isStaffRole,
  normalizeRole,
};
