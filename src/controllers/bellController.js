// C:\NexPulse\backend\src\controllers\bellController.js
import Bell from "../models/Bell.js";
import User from "../models/User.js";

/**
 * GET /api/bell/targets
 * Return ONLY employees based on role rules:
 * - SUPER_ADMIN → all EMPLOYEES
 * - ADMIN → only EMPLOYEES createdBy this admin
 * - EMPLOYEE → all EMPLOYEES except himself
 */
export const getBellTargets = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id.toString();

    let filter = {
      _id: { $ne: userId },
      role: "EMPLOYEE",      // 🔥 ALWAYS employees only
      isLocked: false
    };

    // ADMIN → only employees created by this admin
    if (user.role === "ADMIN") {
      filter.createdBy = userId;
    }

    // SUPER_ADMIN → all employees (no extra filter)

    // EMPLOYEE → all employees except self

    const employees = await User.find(filter)
      .select("_id email role profile.name")
      .lean();

    const formatted = employees.map((u) => ({
      _id: u._id,
      email: u.email,
      role: "EMPLOYEE",
      name: u?.profile?.name || u.email,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getBellTargets error:", err);
    res.status(500).json({ message: "Failed to load bell targets" });
  }
};



/**
 * POST /api/bell/ring
 * body: { toEmployeeId, message, ringAll }
 * Super Admin → ring all employees
 * Admin → ring only employees created by same admin
 * Employee → ring only employees
 */
export const sendBell = async (req, res) => {
  try {
    const sender = req.user;
    const fromId = sender._id.toString();
    const { toEmployeeId, message, ringAll } = req.body;

    if (!message || (!ringAll && !toEmployeeId)) {
      return res.status(400).json({ message: "Target and message required" });
    }

    let targets = [];

    if (ringAll) {
      // SUPER_ADMIN → all employees
      // ADMIN → only employees createdBy them
      // EMPLOYEE → all employees except self

      const filter = {
        _id: { $ne: fromId },
        role: "EMPLOYEE",
        isLocked: false
      };

      if (sender.role === "ADMIN") {
        filter.createdBy = fromId;
      }

      targets = await User.find(filter).select("_id").lean();
    } else {
      // single target
      const target = await User.findOne({
        _id: toEmployeeId,
        role: "EMPLOYEE",
        isLocked: false
      })
        .select("_id")
        .lean();

      if (!target) {
        return res.status(404).json({ message: "Target employee not found" });
      }

      // ADMIN check → target must be same-admin employee
      if (sender.role === "ADMIN" && target.createdBy?.toString() !== fromId) {
        return res
          .status(403)
          .json({ message: "You cannot ring this employee" });
      }

      targets = [target];
    }

    if (!targets.length) {
      return res.status(400).json({ message: "No valid employees found" });
    }

    const docs = targets.map((t) => ({
      from: fromId,
      to: t._id,
      message,
      ringAll: !!ringAll,
    }));

    await Bell.insertMany(docs);

    res.status(201).json({
      message: "Bell sent successfully",
      count: docs.length,
    });
  } catch (err) {
    console.error("sendBell error:", err);
    res.status(500).json({ message: "Failed to send bell" });
  }
};



/**
 * GET /api/bell/me/active
 * Get latest active bell for logged-in user
 */
export const getMyActiveBell = async (req, res) => {
  try {
    const userId = req.user._id;

    const bell = await Bell.findOne({
      to: userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .populate("from", "email profile.name")
      .lean();

    if (!bell) return res.json(null);

    res.json({
      bellId: bell._id,
      message: bell.message,
      fromName: bell.from?.profile?.name || "Someone",
      fromEmail: bell.from?.email,
      createdAt: bell.createdAt,
    });
  } catch (err) {
    console.error("getMyActiveBell error", err);
    res.status(500).json({ message: "Failed to fetch bell status" });
  }
};



/**
 * POST /api/bell/stop/:bellId
 * Stop bell for current user
 */
export const stopBell = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bellId } = req.params;

    const bell = await Bell.findOne({
      _id: bellId,
      to: userId,
      isActive: true,
    });

    if (!bell) {
      return res.json({ message: "Bell already stopped" });
    }

    bell.isActive = false;
    await bell.save();

    res.json({ message: "Bell stopped" });
  } catch (err) {
    console.error("stopBell error", err);
    res.status(500).json({ message: "Failed to stop bell" });
  }
};
