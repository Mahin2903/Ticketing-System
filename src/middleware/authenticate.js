const { admin } = require("../config/firebase");
const db = require("../config/db");

/**
 * Normalizes a role string to lowercase: "user", "agent", or "admin".
 * Defaults to "user" if absent or unrecognized.
 */
const normalizeRole = (role) => {
  if (!role || typeof role !== "string") return "user";
  const lower = role.trim().toLowerCase();
  if (lower === "admin" || lower === "agent" || lower === "user") {
    return lower;
  }
  return "user";
};

/**
 * Firebase ID Token Authentication Middleware
 *
 * Verifies the Firebase ID Token (JWT) sent via Authorization header.
 * - Expects: Authorization: Bearer <Firebase-ID-Token>
 * - Verifies using: admin.auth().verifyIdToken(token, true) (enforcing revocation check)
 * - Rejects missing, malformed, invalid, expired, or revoked tokens with HTTP 401
 * - Attaches decoded user to req.user (uid, email, email_verified, role, claims, dbId)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== "string") {
      return res.status(401).json({
        success: false,
        message: "Authentication required: Missing Authorization header.",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required: Malformed Authorization header. Expected 'Bearer <token>'.",
      });
    }

    const token = authHeader.split("Bearer ")[1]?.trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required: Token is missing.",
      });
    }

    // Verify token with Firebase Admin SDK and check for token revocation
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token, true);
    } catch (verifyError) {
      // Handle Firebase specific error codes
      let message = "Invalid or expired authentication token.";
      if (verifyError.code === "auth/id-token-expired") {
        message = "Authentication token has expired. Please refresh your session.";
      } else if (verifyError.code === "auth/id-token-revoked") {
        message = "Authentication token has been revoked. Please sign in again.";
      } else if (verifyError.code === "auth/argument-error") {
        message = "Malformed authentication token format.";
      }

      return res.status(401).json({
        success: false,
        message,
      });
    }

    // Determine normalized lowercase role from verified custom claims
    const verifiedRole = normalizeRole(decodedToken.role);

    // Attach verified user identity to req.user
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      email_verified: !!decodedToken.email_verified,
      role: verifiedRole,
      claims: decodedToken,
      // Provide legacy uid alias for full compatibility
      id: decodedToken.uid,
    };

    // Lookup / sync corresponding PostgreSQL user for DB relations
    try {
      let dbUserRes = await db.query(
        "SELECT id, name, email, role, role_category_id FROM users WHERE firebase_uid = $1",
        [decodedToken.uid]
      );

      if (dbUserRes.rows.length === 0 && decodedToken.email) {
        dbUserRes = await db.query(
          "SELECT id, name, email, role, role_category_id FROM users WHERE LOWER(email) = LOWER($1)",
          [decodedToken.email]
        );

        if (dbUserRes.rows.length > 0) {
          // Link firebase_uid to existing user record
          await db.query(
            "UPDATE users SET firebase_uid = $1 WHERE id = $2",
            [decodedToken.uid, dbUserRes.rows[0].id]
          );
        }
      }

      if (dbUserRes.rows.length > 0) {
        req.user.dbId = dbUserRes.rows[0].id;
        req.user.dbUser = dbUserRes.rows[0];
      }
    } catch (dbErr) {
      console.error("User DB lookup warning in auth middleware:", dbErr.message);
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

module.exports = authenticate;
