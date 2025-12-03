import Salary from "../models/Salary.js";

// ADMIN MANAGES SALARY
export const manageSalary = async (req, res) => {
  try {
    const salary = new Salary({
      ...req.body,
      createdBy: req.user._id,
    });

    await salary.save();
    res.json({ message: "Salary saved", salary });
  } catch {
    res.status(500).json({ message: "Error saving salary" });
  }
};

// ADMIN VIEWS ALL SALARIES
export const adminSalaries = async (req, res) => {
  try {
    const data = await Salary.find({ createdBy: req.user._id })
      .populate("employeeId", "profile.name email");

    res.json(data);
  } catch {
    res.status(500).json({ message: "Error loading salaries" });
  }
};

// EMPLOYEE VIEW OWN SALARY
export const mySalary = async (req, res) => {
  try {
    const my = await Salary.find({ employeeId: req.user._id });
    res.json(my);
  } catch {
    res.status(500).json({ message: "Error loading salary" });
  }
};
