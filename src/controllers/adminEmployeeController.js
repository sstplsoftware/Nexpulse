import User from "../models/User.js";

// GET ALL EMPLOYEES BELONGING TO ADMIN
export async function getEmployeesByAdmin(req, res) {
  try {
    const adminId = req.user._id;

    const employees = await User.find({
      createdBy: adminId,
      role: "EMPLOYEE",
    })
      .select("-passwordHash")
      .lean();

    return res.json({ employees });
  } catch (err) {
    console.error("getEmployeesByAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// UPDATE EMPLOYEE PERMISSIONS
export async function updateEmployeePermissions(req, res) {
  try {
    const employeeId = req.params.id;
    const adminId = req.user._id;
    const { permissions } = req.body;

    if (!employeeId || !permissions) {
      return res
        .status(400)
        .json({ message: "Employee ID and permissions are required" });
    }

    const employee = await User.findById(employeeId);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // SECURITY:
    // Ensure the admin can ONLY modify employees BELONGING TO THIS ADMIN
    if (String(employee.createdBy) !== String(adminId)) {
      return res
        .status(403)
        .json({ message: "You cannot modify another admin's employee" });
    }

    employee.permissions = permissions;
    await employee.save();

    return res.json({
      message: "Permissions updated successfully",
      permissions: employee.permissions,
    });
  } catch (err) {
    console.error("updateEmployeePermissions error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
