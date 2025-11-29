// C:\NexPulse\backend\src\controllers\bellController.js
import Bell from "../models/Bell.js";
import User from "../models/User.js";

/**
 * GET /api/bell/targets
 * Return list of employees/admins who can receive bell
 */
export const getBellTargets = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // You can adjust filter as per your project
    const users = await User.find({
      _id: { $ne: currentUserId },
      isActive: true,
    })
      .select("_id email role profile.name")
      .lean();

    const formatted = users.map((u) => ({
      _id: u._id,
      email: u.email,
      role: u.role,
      name: u?.profile?.name || "User",
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getBellTargets error", err);
    res.status(500).json({ message: "Failed to load bell targets" });
  }
};

/**
 * POST /api/bell/ring
 * body: { toEmployeeId, message, ringAll }
 */
export const sendBell = async (req, res) => {
  try {
    const fromId = req.user._id;
    const { toEmployeeId, message, ringAll } = req.body;

    if (!message || (!ringAll && !toEmployeeId)) {
      return res
        .status(400)
        .json({ message: "Target and message are required" });
    }

    let targetUsers = [];

    if (ringAll) {
      // Ring all active employees / admins except sender
      targetUsers = await User.find({
        _id: { $ne: fromId },
        isActive: true,
      })
        .select("_id")
        .lean();
    } else {
      const target = await User.findById(toEmployeeId).select("_id").lean();
      if (!target) {
        return res.status(404).json({ message: "Target user not found" });
      }
      targetUsers = [target];
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ message: "No target users found" });
    }

    const docs = targetUsers.map((u) => ({
      from: fromId,
      to: u._id,
      message,
      ringAll: !!ringAll,
    }));

    const created = await Bell.insertMany(docs);

    res.status(201).json({
      message: "Bell sent successfully",
      count: created.length,
    });
  } catch (err) {
    console.error("sendBell error", err);
    res.status(500).json({ message: "Failed to send bell" });
  }
};

/**
 * GET /api/bell/me/active
 * Get latest active bell for logged-in user (if any)
 */
export const getMyActiveBell = async (req, res) => {
  try {
    const userId = req.user._id;

    const bell = await Bell.findOne({
      to: userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .populate("from", "email role profile.name")
      .lean();

    if (!bell) {
      return res.json(null);
    }

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
      // nothing to stop, return OK
      return res.json({ message: "Bell already stopped or not found" });
    }

    bell.isActive = false;
    await bell.save();

    res.json({ message: "Bell stopped" });
  } catch (err) {
    console.error("stopBell error", err);
    res.status(500).json({ message: "Failed to stop bell" });
  }
};
