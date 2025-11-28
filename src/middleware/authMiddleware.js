// C:\NexPulse\backend\src\middleware\authMiddleware.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    const token = header.split(" ")[1];

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // fetch user
    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid user" });
    }

    // 🔥 1. Check if THIS ACCOUNT itself is locked (admin or employee)
    if (user.isLocked) {
      return res
        .status(403)
        .json({ message: "Account is locked by administrator" });
    }

    // 🔥 2. If EMPLOYEE → check their admin's lock/expiry state
    if (user.role === "EMPLOYEE" && user.createdBy) {
      const admin = await User.findById(user.createdBy).lean();

      if (!admin) {
        return res.status(403).json({
          message: "Your admin account is missing. Contact support.",
        });
      }

      // Admin Locked → employee blocked
      if (admin.isLocked) {
        return res.status(403).json({
          message: "Your admin is locked. Contact administrator.",
        });
      }

      // Admin expired → employee blocked
      if (admin.activeUntil && new Date(admin.activeUntil) < new Date()) {
        return res.status(403).json({
          message: "Admin subscription expired. Contact administrator.",
        });
      }
    }

    // pass user forward
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
