// C:\NexPulse\backend\src\controllers\bellController.js

import Bell from "../models/Bell.js";
import User from "../models/User.js";
import { emitBellToUser, emitBellStoppedToUser } from "../socket/bellSocket.js";

/*  
|--------------------------------------------------------------------------
| GET BELL TARGETS
|--------------------------------------------------------------------------
| SUPER_ADMIN → All employees  
| ADMIN → Only employees created by him  
| EMPLOYEE → All employees except himself  
*/

export const getBellTargets = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id.toString();

    let filter = {
      _id: { $ne: userId },
      role: "EMPLOYEE",
      isLocked: false,
    };

    if (user.role === "ADMIN") {
      filter.createdBy = userId;
    }

    const employees = await User.find(filter)
      .select("_id email role profile.name createdBy")
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

/*  
|--------------------------------------------------------------------------
| SEND BELL
|--------------------------------------------------------------------------
| SUPER_ADMIN → all employees  
| ADMIN → employees created by him  
| EMPLOYEE → employees except himself  
*/

export const sendBell = async (req, res) => {
  try {
    const sender = req.user;
    const fromId = sender._id.toString();
    const { toEmployeeId, message, ringAll } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    let targets = [];

    // 🔔 Ring ALL employees
    if (ringAll) {
      let filter = {
        _id: { $ne: fromId },
        role: "EMPLOYEE",
        isLocked: false,
      };

      if (sender.role === "ADMIN") {
        filter.createdBy = fromId;
      }

      targets = await User.find(filter).select("_id").lean();
    }

    // 🔔 Single target
    else {
      if (!toEmployeeId) {
        return res.status(400).json({ message: "Target employee required" });
      }

      const target = await User.findOne({
        _id: toEmployeeId,
        role: "EMPLOYEE",
        isLocked: false,
      })
        .select("_id createdBy")
        .lean();

      if (!target) {
        return res.status(404).json({ message: "Target employee not found" });
      }

      // Admin cannot ring employees of other admins
      if (
        sender.role === "ADMIN" &&
        target.createdBy?.toString() !== fromId
      ) {
        return res
          .status(403)
          .json({ message: "You cannot ring this employee" });
      }

      targets = [target];
    }

    if (!targets.length) {
      return res.status(400).json({ message: "No valid employees found" });
    }

    const fromUser = await User.findById(fromId)
      .select("profile.name email")
      .lean();

    // Save bells to DB
    const docs = targets.map((t) => ({
      from: fromId,
      to: t._id,
      message,
      ringAll: !!ringAll,
      isActive: true,
    }));

    const created = await Bell.insertMany(docs);

    // Emit socket event for each employee
    created.forEach((doc) => {
      emitBellToUser(doc.to, {
        bellId: doc._id.toString(),
        fromName: fromUser?.profile?.name || "Someone",
        message: doc.message,
        createdAt: doc.createdAt,
      });
    });

    res.json({
      message: "Bell sent successfully",
      count: created.length,
    });
  } catch (err) {
    console.error("sendBell error:", err);
    res.status(500).json({ message: "Failed to send bell" });
  }
};

/*  
|--------------------------------------------------------------------------
| GET ACTIVE BELL FOR USER
|--------------------------------------------------------------------------
*/

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

/*  
|--------------------------------------------------------------------------
| STOP BELL
|--------------------------------------------------------------------------
*/

export const stopBell = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bellId } = req.params;

    const bell = await Bell.findOneAndUpdate(
      { _id: bellId, to: userId },
      { isActive: false },
      { new: true }
    );

    if (!bell) {
      return res.json({ message: "Bell already stopped" });
    }

    emitBellStoppedToUser(bell.from, {
      bellId: bell._id.toString(),
      to: userId.toString(),
    });

    res.json({ message: "Bell stopped" });
  } catch (err) {
    console.error("stopBell error:", err);
    res.status(500).json({ message: "Failed" });
  }
};
