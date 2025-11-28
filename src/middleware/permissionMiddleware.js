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
