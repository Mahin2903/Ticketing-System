const express = require("express");
const router = express.Router();
const departmentsController = require("./departments.controller");

router.post("/", departmentsController.createDepartment);
router.get("/", departmentsController.getAllDepartments);
router.get("/:id", departmentsController.getDepartmentById);
router.patch("/:id", departmentsController.updateDepartment);
router.delete("/:id", departmentsController.deleteDepartment);

module.exports = router;
