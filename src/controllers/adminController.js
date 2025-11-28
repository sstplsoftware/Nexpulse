import User from "../models/User.js";
import bcrypt from "bcryptjs";

// GET employees of logged in admin
export async function getEmployees(req, res) {
  try {
    const employees = await User.find({
      role: "EMPLOYEE",
      createdBy: req.user._id,
    }).lean();

    return res.json({ employees });
  } catch (err) {
    console.error("getEmployees error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// CREATE employee
export async function createEmployee(req, res) {
  try {
    const {
      companyName,
      name,
      employeeId,
      officialPhone,
      personalPhone,
      gmailEmail,
      otherEmail,
      department,
      joiningDate,
      password,
    } = req.body;

    if (!name || !employeeId || !gmailEmail || !department || !joiningDate || !password) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    const existing = await User.findOne({ email: gmailEmail.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "Employee with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const employee = await User.create({
      email: gmailEmail.toLowerCase().trim(),
      passwordHash,
      role: "EMPLOYEE",
      createdBy: req.user._id,
      isLocked: false,
      profile: {
        name,
        companyName: companyName || req.user.profile?.companyName || "",
      },
      employeeId,
      officialPhone,
      personalPhone,
      otherEmail,
      department,
      dateOfJoining: joiningDate ? new Date(joiningDate) : null,
    });

    // update admin employeeCount
    await User.findByIdAndUpdate(req.user._id, { $inc: { employeeCount: 1 } });

    return res.json({ employee });
  } catch (err) {
    console.error("createEmployee error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// UPDATE employee
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      employeeId,
      officialPhone,
      personalPhone,
      gmailEmail,
      otherEmail,
      department,
      joiningDate,
      password,
    } = req.body;

    const employee = await User.findOne({
      _id: id,
      role: "EMPLOYEE",
      createdBy: req.user._id,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (gmailEmail) {
      employee.email = gmailEmail.toLowerCase().trim();
    }

    if (!employee.profile) employee.profile = {};
    if (name !== undefined) employee.profile.name = name;
    if (employeeId !== undefined) employee.employeeId = employeeId;
    if (officialPhone !== undefined) employee.officialPhone = officialPhone;
    if (personalPhone !== undefined) employee.personalPhone = personalPhone;
    if (otherEmail !== undefined) employee.otherEmail = otherEmail;
    if (department !== undefined) employee.department = department;
    if (joiningDate) employee.dateOfJoining = new Date(joiningDate);

    if (password) {
      employee.passwordHash = await bcrypt.hash(password, 10);
    }

    await employee.save();

    return res.json({ employee });
  } catch (err) {
    console.error("updateEmployee error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
// GET single employee details + permissions
export async function getSingleEmployee(req, res) {
  try {
    const { id } = req.params;

    const emp = await User.findById(id)
      .select("-passwordHash") // do not send password hash
      .lean();

    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.json({
      _id: emp._id,
      email: emp.email,
      profile: emp.profile,
      permissions: emp.permissions || {},
    });
  } catch (err) {
    console.error("getSingleEmployee error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// DELETE employee
export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;

    const employee = await User.findOneAndDelete({
      _id: id,
      role: "EMPLOYEE",
      createdBy: req.user._id,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await User.findByIdAndUpdate(req.user._id, { $inc: { employeeCount: -1 } });

    return res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error("deleteEmployee error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
