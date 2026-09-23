#!/usr/bin/env node

/**
 * CLI Script to assign Firebase custom claim roles ("user", "agent", "admin")
 *
 * Usage:
 *   node scripts/set-role.js <uid-or-email> <role>
 *
 * Examples:
 *   node scripts/set-role.js user@example.com admin
 *   node scripts/set-role.js 8RHdds5fjlZ7FXD4RgOodmz786n2 agent
 *   node scripts/set-role.js 8RHdds5fjlZ7FXD4RgOodmz786n2 user
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { setRole, VALID_ROLES } = require("../src/services/firebaseAuth.service");
const { admin } = require("../src/config/firebase");

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    // console.log("Usage: node scripts/set-role.js <uid-or-email> <role>");
    // console.log(`Allowed roles: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  const [identifier, targetRole] = args;
  const role = targetRole.trim().toLowerCase();

  if (!VALID_ROLES.includes(role)) {
    console.error(`❌ Error: Invalid role '${targetRole}'. Allowed roles: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  let uid = identifier;

  // If identifier is an email address, resolve it to UID first
  if (identifier.includes("@")) {
    try {
      const user = await admin.auth().getUserByEmail(identifier.trim().toLowerCase());
      uid = user.uid;
      // console.log(`🔍 Resolved email '${identifier}' to UID: ${uid}`);
    } catch (err) {
      console.error(`❌ Error finding user with email '${identifier}':`, err.message);
      process.exit(1);
    }
  }

  try {
    const result = await setRole(uid, role);
    // console.log(`✅ Success: Assigned role '${result.role}' to UID: ${result.uid}`);
    // console.log(`ℹ️  Note: The user should refresh their token using 'firebaseUser.getIdToken(true)' to see updated claims.`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Error setting custom claims:`, err.message);
    process.exit(1);
  }
}

main();
