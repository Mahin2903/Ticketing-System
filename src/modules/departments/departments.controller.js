const departmentsService = require("./departments.service");

/**
 * POST /api/departments - Create a new department
 */
const createDepartment = async (req, res) => {
  const { department_code, department_title, is_active } = req.body;

  if (!department_code || !department_title) {
    return res.status(400).json({
      success: false,
      message: "department_code and department_title are required.",
    });
  }

  const department = await departmentsService.createDepartment({
    department_code,
    department_title,
    is_active,
  });

  res.status(201).json({
    success: true,
    message: "Department created successfully",
    data: department,
  });
};

/**
 * GET /api/departments - Get all departments
 */
const getAllDepartments = async (req, res) => {
  const departments = await departmentsService.getAllDepartments(req.query);

  res.json({
    success: true,
    count: departments.length,
    data: departments,
  });
};

/**
 * GET /api/departments/:id - Get department by ID
 */
const getDepartmentById = async (req, res) => {
  const department = await departmentsService.getDepartmentById(req.params.id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  res.json({
    success: true,
    data: department,
  });
};

/**
 * PATCH /api/departments/:id - Update department details
 */
const updateDepartment = async (req, res) => {
  const department = await departmentsService.updateDepartment(
    req.params.id,
    req.body
  );

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  res.json({
    success: true,
    message: "Department updated successfully",
    data: department,
  });
};

/**
 * DELETE /api/departments/:id - Delete a department
 */
const deleteDepartment = async (req, res) => {
  const department = await departmentsService.deleteDepartment(req.params.id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  res.json({
    success: true,
    message: "Department deleted successfully",
    data: department,
  });
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};
