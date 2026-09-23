/**
 * Role-Based Authorization Middleware
 *
 * Checks whether the verified user in req.user has one of the allowed roles.
 *
 * Exactly 3 application roles:
 * - "user"
 * - "agent"
 * - "admin"
 *
 * @param {...string} allowedRoles Roles permitted to access the route
 */
const authorize = (...allowedRoles) => {
  // Normalize allowed roles to lowercase
  const normalizedAllowedRoles = allowedRoles.map((r) =>
    typeof r === "string" ? r.trim().toLowerCase() : r
  );

  return (req, res, next) => {
    // 1. Verify user was authenticated by authenticate middleware
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User is not authenticated.",
      });
    }

    const userRole = (req.user.role || "user").toLowerCase();

    // 2. Check if the verified custom claim role is in allowed roles
    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Required role(s): [${allowedRoles.join(", ")}], but current role is '${userRole}'.`,
      });
    }

    // 3. User is authorized
    next();
  };
};

module.exports = authorize;
