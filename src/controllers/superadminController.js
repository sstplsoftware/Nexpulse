// C:\NexPulse\backend\src\controllers\superadminController.js

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// GET ALL ADMINS
export async function getAdmins(req, res) {
  try {
    const admins = await User.find({ role: "ADMIN" }).lean();

    return res.json({ admins });
  } catch (err) {
    console.error("getAdmins error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// CREATE ADMIN
export async function createAdmin(req, res) {
  try {
    const { name, companyName, email, employeeSize, password } = req.body;

    if (!name || !companyName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: "Admin already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "ADMIN",
      isLocked: false,
      createdBy: req.user._id,
      profile: {
        name,
        companyName,
      },
      employeeSize,
      activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // default 30 days
    });

    return res.json({ admin });
  } catch (err) {
    console.error("createAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// UPDATE ADMIN (name, companyName, email, employeeSize)
export async function updateAdmin(req, res) {
  try {
    const { id } = req.params;
    const { name, companyName, email, employeeSize } = req.body;

    const admin = await User.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.profile.name = name;
    admin.profile.companyName = companyName;
    admin.email = email.toLowerCase().trim();
    admin.employeeSize = employeeSize;

    await admin.save();

    return res.json({ admin });
  } catch (err) {
    console.error("updateAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// LOCK / UNLOCK ADMIN
export async function lockAdmin(req, res) {
  try {
    const { id } = req.params;
    const { isLocked } = req.body;

    const admin = await User.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.isLocked = isLocked;
    await admin.save();

    return res.json({ isLocked: admin.isLocked });
  } catch (err) {
    console.error("lockAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// EXTEND DAYS
export async function extendAdmin(req, res) {
  try {
    const { id } = req.params;
    const { days } = req.body;

    const admin = await User.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const newDate = new Date(admin.activeUntil || Date.now());
    newDate.setDate(newDate.getDate() + Number(days));

    admin.activeUntil = newDate;
    await admin.save();

    return res.json({ admin });
  } catch (err) {
    console.error("extendAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// DELETE ADMIN
export async function deleteAdmin(req, res) {
  try {
    const { id } = req.params;

    const admin = await User.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    await User.findByIdAndDelete(id);

    return res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error("deleteAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
