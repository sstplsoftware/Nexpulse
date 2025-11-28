// C:\NexPulse\backend\src\controllers\authController.js

import "../loadEnv.js";

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in .env");
}

export async function loginHandler(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    // find user
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).lean();

    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    // if THIS user is locked
    if (user.isLocked)
      return res.status(403).json({
        message: "Account is locked by administrator.",
      });

    // compare password
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches)
      return res.status(401).json({ message: "Invalid credentials" });

    console.log("🔍 DEBUG JWT_SECRET =", JWT_SECRET);

    // 🔥 EMPLOYEE → also check their ADMIN's status
    if (user.role === "EMPLOYEE" && user.createdBy) {
      const admin = await User.findById(user.createdBy).lean();

      if (!admin) {
        return res.status(403).json({
          message: "Your admin account is missing. Contact support.",
        });
      }

      if (admin.isLocked) {
        return res.status(403).json({
          message: "Your admin is locked. Contact administrator.",
        });
      }

      if (admin.activeUntil && new Date(admin.activeUntil) < new Date()) {
        return res.status(403).json({
          message:
            "Your admin's subscription has expired. Contact administrator.",
        });
      }
    }

    // create token payload
    const payload = {
      userId: user._id,
      role: user.role,
      email: user.email,
    };

    // sign token
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // return full user object to frontend
    return res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isLocked: user.isLocked,

        // admin + employee details
        profile: user.profile,                 // name, companyName
        employeeSize: user.employeeSize,       // admin limit
        employeeCount: user.employeeCount,     // employees created
        activeUntil: user.activeUntil,         // admin subscription
        createdBy: user.createdBy,             // for employees
        expiresAt: user.expiresAt,   
        
        // 🔥 permissions now included
    permissions: user.permissions || {},// original field
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
