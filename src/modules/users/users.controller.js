const usersService = require("./users.service");
const { isValidRole, normalizeRole, VALID_ROLES } = require("../../utils/role.validator");

// Simple email regex for fast validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/users - Create a new user
 */
const createUser = async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "name is required and must be a valid non-empty string.",
    });
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: "Valid email address is required.",
    });
  }

  // Validate role strictly against existing PostgreSQL user roles
  if (role !== undefined && !isValidRole(role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role '${role}'. Role must be one of: ${VALID_ROLES.join(", ")}.`,
    });
  }

  // ✅ Check if user already exists — return them instead of conflicting
  const existingUser = await usersService.getUserByEmail(email.trim());
  if (existingUser) {
    return res.status(200).json({
      success: true,
      message: "User already exists",
      data: existingUser,
    });
  }

  const user = await usersService.createUser({
    name,
    email,
    role: normalizeRole(role || "USER"),
  });

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user,
  });
};

/**
 * GET /api/users - Get all users (supports pagination, role filtering & search)
 */
const getAllUsers = async (req, res) => {
  if (req.query.email) {
    return getUserbyEmail(req, res);
  }

  const result = await usersService.getAllUsers(req.query);

  res.json({
    success: true,
    ...result,
  });
};

/**
 * GET /api/users?email=xxx - Get user by email
 */
const getUserbyEmail = async (req, res) => {
  const { email } = req.query;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Email query parameter is required.",
    });
  }

  const user = await usersService.getUserByEmail(email);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    data: user,
  });
};

/**
 * GET /api/users/:id - Get user by ID
 */
const getUserById = async (req, res) => {
  const user = await usersService.getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    data: user,
  });
};

/**
 * PUT /api/users/:id - Update user details
 */
const updateUser = async (req, res) => {
  const { name, email, role } = req.body;

  if (
    email !== undefined &&
    (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim()))
  ) {
    return res.status(400).json({
      success: false,
      message: "Provided email address is invalid.",
    });
  }

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({
      success: false,
      message: "name cannot be empty.",
    });
  }

  if (role !== undefined && !isValidRole(role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role '${role}'. Role must be one of: ${VALID_ROLES.join(", ")}.`,
    });
  }

  const user = await usersService.updateUser(req.params.id, {
    name,
    email,
    role: role !== undefined ? normalizeRole(role) : undefined,
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    message: "User updated successfully",
    data: user,
  });
};

/**
 * DELETE /api/users/:id - Delete a user
 */
const deleteUser = async (req, res) => {
  const user = await usersService.deleteUser(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    message: "User deleted successfully",
    data: user,
  });
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getUserbyEmail,
  getUserByEmail: getUserbyEmail,
  updateUser,
  deleteUser,
};
