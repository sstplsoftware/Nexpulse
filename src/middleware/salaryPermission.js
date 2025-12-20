export const canManageSalary = (req, res, next) => {
  const user = req.user;

  if (
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN"
  ) {
    return next();
  }

  if (
    user.role === "EMPLOYEE" &&
    user.permissions?.SALARY_MANAGE === true
  ) {
    return next();
  }

  return res.status(403).json({
    message: "You are not allowed to manage salary",
  });
};

export const canMarkSalaryPaid = (req, res, next) => {
  const user = req.user;

  if (
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN"
  ) {
    return next();
  }

  return res.status(403).json({
    message: "Only admin can mark salary as PAID",
  });
};
