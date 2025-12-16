// C:\NexPulse\backend\src\middleware\permissionMiddleware.js

export function employeePermission(requiredPermission) {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // ✅ Admin/Super Admin bypass (important)
      if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        return next();
      }

      const perms = user.permissions || {};
      if (!perms[requiredPermission]) {
        return res.status(403).json({
          message: "You do not have permission to access this module.",
        });
      }

      next();
    } catch (err) {
      console.error("employeePermission middleware error:", err.message);
      return res.status(500).json({ message: "Server error" });
    }
  };
}

/**
 * ✅ Allow ADMIN/SUPER_ADMIN always
 * ✅ Allow EMPLOYEE only if permission=true
 */
export function adminOrEmployeePermission(requiredPermission) {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        return next();
      }

      if (user.role === "EMPLOYEE" && user.permissions?.[requiredPermission]) {
        return next();
      }

      return res.status(403).json({
        message: "You do not have permission to access this module.",
      });
    } catch (err) {
      console.error("adminOrEmployeePermission error:", err.message);
      return res.status(500).json({ message: "Server error" });
    }
  };
}

/*
 * MIS Access Guard:
 * ADMIN → always allowed
 * EMPLOYEE → allowed only if MIS_MANAGE = true
 */
export function misAccessGuard(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      return next();
    }

    if (user.role === "EMPLOYEE" && user.permissions?.MIS_MANAGE) {
      return next();
    }

    return res.status(403).json({ message: "MIS access denied" });
  } catch (err) {
    console.error("misAccessGuard error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
}
