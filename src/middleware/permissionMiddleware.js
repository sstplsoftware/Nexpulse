// C:\NexPulse\backend\src\middleware\permissionMiddleware.js

export function employeePermission(requiredPermission) {
  return (req, res, next) => {
    try {
      const perms = req.user?.permissions || {};

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

/*
 * MIS Access Guard:
 * ADMIN → always allowed
 * EMPLOYEE → allowed only if MIS_MANAGE = true
 */
export function misAccessGuard(req, res, next) {
  try {
    if (req.user?.role === "ADMIN") return next();

    // Employee must have MIS_MANAGE permission
    if (req.user?.role === "EMPLOYEE" && req.user.permissions?.MIS_MANAGE) {
      return next();
    }

    return res.status(403).json({ message: "MIS access denied" });
  } catch (err) {
    console.error("misAccessGuard error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
}
