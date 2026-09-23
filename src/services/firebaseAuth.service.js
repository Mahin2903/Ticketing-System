const { admin } = require("../config/firebase");
const db = require("../config/db");

const VALID_ROLES = Object.freeze(["user", "agent", "admin"]);

/**
 * Validates whether a given role string is one of the three accepted application roles:
 * "user", "agent", "admin" (case-insensitive).
 */
const isValidRole = (role) => {
  if (!role || typeof role !== "string") return false;
  return VALID_ROLES.includes(role.trim().toLowerCase());
};

/**
 * Normalize role to lowercase.
 */
const normalizeRole = (role) => {
  if (!role || typeof role !== "string") return "user";
  const lower = role.trim().toLowerCase();
  return VALID_ROLES.includes(lower) ? lower : "user";
};

/**
 * Assigns or updates a user's role in Firebase custom claims and synchronizes with PostgreSQL.
 *
 * @param {string} uid Firebase User UID
 * @param {string} role "user" | "agent" | "admin"
 * @returns {Promise<{uid: string, role: string, success: boolean}>}
 */
const setRole = async (uid, role) => {
  if (!uid || typeof uid !== "string") {
    throw new Error("Invalid UID: uid must be a non-empty string.");
  }

  if (!isValidRole(role)) {
    throw new Error(`Invalid role '${role}'. Role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  const normalizedRole = normalizeRole(role);

  // 1. Set custom claims in Firebase Auth
  await admin.auth().setCustomUserClaims(uid, {
    role: normalizedRole,
  });

  // 2. Synchronize role in PostgreSQL users table if record exists
  try {
    const userRecord = await admin.auth().getUser(uid);
    const email = userRecord.email;

    await db.query(
      `UPDATE users
       SET role = $1
       WHERE firebase_uid = $2 OR (email IS NOT NULL AND LOWER(email) = LOWER($3))`,
      [normalizedRole, uid, email || ""]
    );
  } catch (dbErr) {
    console.warn("Could not sync role change to PostgreSQL:", dbErr.message);
  }

  return {
    uid,
    role: normalizedRole,
    success: true,
  };
};

/**
 * Retrieves the custom claim role for a user. Defaults to "user".
 *
 * @param {string} uid Firebase User UID
 * @returns {Promise<string>} Normalized lowercase role
 */
const getRole = async (uid) => {
  const user = await admin.auth().getUser(uid);
  return normalizeRole(user.customClaims?.role);
};

/**
 * Fetch a Firebase user record by email.
 */
const getUserByEmail = async (email) => {
  return await admin.auth().getUserByEmail(email.trim().toLowerCase());
};

/**
 * Fetch a Firebase user record by UID.
 */
const getUserByUid = async (uid) => {
  return await admin.auth().getUser(uid);
};

module.exports = {
  VALID_ROLES,
  isValidRole,
  normalizeRole,
  setRole,
  getRole,
  getUserByEmail,
  getUserByUid,
};
