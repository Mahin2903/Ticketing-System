const express = require("express");
const router = express.Router();
const departmentsController = require("./departments.controller");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

// Authenticated users can view departments
router.get("/", authenticate, authorize("user", "agent", "admin"), departmentsController.getAllDepartments);
router.get("/:id", authenticate, authorize("user", "agent", "admin"), departmentsController.getDepartmentById);

// Only administrators can mutate departments
router.post("/", authenticate, authorize("admin"), departmentsController.createDepartment);
router.patch("/:id", authenticate, authorize("admin"), departmentsController.updateDepartment);
router.delete("/:id", authenticate, authorize("admin"), departmentsController.deleteDepartment);

module.exports = router;
