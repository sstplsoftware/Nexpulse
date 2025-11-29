// C:\NexPulse\backend\src\controllers\bellController.js
import Bell from "../models/Bell.js";
import User from "../models/User.js";
import { emitBellToUser, emitBellStoppedToUser } from "../socket/bellSocket.js";

// 🎯 who can be called
export const getBellTargets = async (req, res) => {
  try {
    const userId = req.user._id;

    const users = await User.find({
      _id: { $ne: userId },
      isLocked: false,
    })
      .select("_id profile.name email role")
      .lean();

    res.json(users);
  } catch (err) {
    console.error("getBellTargets error:", err);
    res.status(500).json({ message: "Failed to load bell targets" });
  }
};

// 🔔 send bell
export const sendBell = async (req, res) => {
  try {
    const from = req.user._id;
    const { toEmployeeId, message, ringAll } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message required" });
    }

    let targets = [];

    if (ringAll) {
      targets = await User.find({ isLocked: false, _id: { $ne: from } })
        .select("_id")
        .lean();
    } else {
      if (!toEmployeeId) {
        return res
          .status(400)
          .json({ message: "Target employee is required" });
      }
      const target = await User.findById(toEmployeeId)
        .select("_id")
        .lean();
      if (!target) {
        return res.status(404).json({ message: "Target user not found" });
      }
      targets = [target];
    }

    if (!targets.length) {
      return res.status(400).json({ message: "No valid targets" });
    }

    const fromUser = await User.findById(from)
      .select("profile.name email")
      .lean();

    const docs = targets.map((t) => ({
      from,
      to: t._id,
      message,
      ringAll: !!ringAll,
    }));

    const created = await Bell.insertMany(docs);

    // 🔥 Emit socket event for each target
    created.forEach((doc) => {
      emitBellToUser(doc.to, {
        bellId: doc._id.toString(),
        fromName: fromUser?.profile?.name || "Someone",
        message: doc.message,
        createdAt: doc.createdAt,
      });
    });

    res.json({ message: "Bell sent", count: created.length });
  } catch (err) {
    console.error("sendBell error:", err);
    res.status(500).json({ message: "Failed to send bell" });
  }
};

// 👂 (fallback HTTP) – active bell (optional now, but keep for safety)
export const getMyActiveBell = async (req, res) => {
  try {
    const userId = req.user._id;

    const bell = await Bell.findOne({
      to: userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .populate("from", "profile.name email")
      .lean();

    if (!bell) return res.json(null);

    res.json({
      bellId: bell._id.toString(),
      fromName: bell.from?.profile?.name || "Someone",
      message: bell.message,
      createdAt: bell.createdAt,
    });
  } catch (err) {
    console.error("getMyActiveBell error:", err);
    res.status(500).json({ message: "Failed" });
  }
};

// 🛑 stop bell
export const stopBell = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bellId } = req.params;

    const bell = await Bell.findOneAndUpdate(
      { _id: bellId, to: userId },
      { isActive: false },
      { new: true }
    );

    if (bell) {
      emitBellStoppedToUser(bell.from, {
        bellId: bell._id.toString(),
        to: userId.toString(),
      });
    }

    res.json({ message: "Bell stopped" });
  } catch (err) {
    console.error("stopBell error:", err);
    res.status(500).json({ message: "Failed" });
  }
};
