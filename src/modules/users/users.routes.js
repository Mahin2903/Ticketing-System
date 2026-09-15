const express = require("express");
const router = express.Router();
const usersController = require("./users.controller");

router.post("/", usersController.createUser);
router.get("/", usersController.getAllUsers);
router.get("/:id", usersController.getUserById);
router.put("/:id", usersController.updateUser);
router.patch("/:id", usersController.updateUser);
router.delete("/:id", usersController.deleteUser);

module.exports = router;
