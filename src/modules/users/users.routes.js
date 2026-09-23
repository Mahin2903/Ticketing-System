const express = require("express");
const router = express.Router();
const usersController = require("./users.controller");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

// User creation / sync upon authentication
router.post("/", authenticate, usersController.createUser);

// Get users (users can only fetch own profile via ?email=..., staff can browse)
router.get("/", authenticate, usersController.getAllUsers);
router.get("/:id", authenticate, usersController.getUserById);

// Role management: strictly ADMIN only
router.patch("/:id/role", authenticate, authorize("admin"), usersController.updateUserRole);

// User administration: strictly ADMIN only
router.put("/:id", authenticate, authorize("admin"), usersController.updateUser);
router.patch("/:id", authenticate, authorize("admin"), usersController.updateUser);
router.delete("/:id", authenticate, authorize("admin"), usersController.deleteUser);

module.exports = router;
