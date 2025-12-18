export function resolveAdminId(user) {
  if (!user || !user.role) {
    throw new Error("Invalid user context");
  }

  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return user._id;
  }

  if (user.role === "EMPLOYEE") {
    if (!user.createdBy) {
      throw new Error("Employee missing createdBy (admin reference)");
    }
    return user.createdBy;
  }

  throw new Error("Unsupported role");
}
