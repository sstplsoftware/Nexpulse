// C:\NexPulse\backend\src\middleware\permissionMiddleware.js

// EMPLOYEE ONLY PERMISSION
export function employeePermission(requiredPermission) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // ADMIN & SUPER_ADMIN bypass
      if (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN") {
        return next();
      }

      // EMPLOYEE permission check
      if (req.user.permissions?.[requiredPermission]) {
        return next();
      }

      return res.status(403).json({
        message: "You do not have permission to access this module.",
      });
    } catch (err) {
      console.error("employeePermission error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  };
}

// ADMIN OR EMPLOYEE WITH PERMISSION
export function adminOrEmployeePermission(requiredPermission) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN") {
        return next();
      }

      if (
        req.user.role === "EMPLOYEE" &&
        req.user.permissions?.[requiredPermission]
      ) {
        return next();
      }

      return res.status(403).json({
        message: "Permission denied",
      });
    } catch (err) {
      console.error("adminOrEmployeePermission error:", err);
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
