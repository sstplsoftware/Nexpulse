// C:\NexPulse\backend\src\controllers\hrmChatController.js

import HrmChat from "../models/HrmChat.js";
import User from "../models/User.js";

// Helper: shape message for frontend
function mapChatDoc(doc) {
  return {
    _id: doc._id.toString(),
    adminId: doc.adminId.toString(),
    employeeId: doc.employeeId.toString(),
    senderId: doc.senderId.toString(),
    receiverId: doc.receiverId.toString(),
    message: doc.message,
    createdAt: doc.createdAt,
    isReadByAdmin: doc.isReadByAdmin,
    isReadByEmployee: doc.isReadByEmployee,
  };
}

/* 
|--------------------------------------------------------------------------
| EMPLOYEE SIDE – CHAT WITH ADMIN
|--------------------------------------------------------------------------
*/

// POST /api/employee/hrm/chat/send
export async function employeeSendHrmMessage(req, res) {
  try {
    const employee = req.user;

    if (employee.role !== "EMPLOYEE") {
      return res.status(403).json({ message: "Only employees can send here" });
    }

    const adminId = employee.createdBy;
    if (!adminId) {
      return res
        .status(400)
        .json({ message: "No admin linked to this employee" });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const chat = await HrmChat.create({
      adminId,
      employeeId: employee._id,
      senderId: employee._id,
      receiverId: adminId,
      message: message.trim(),
      isReadByAdmin: false,
      isReadByEmployee: true,
    });

    // 🔔 If you already have Socket.IO setup, you can emit here
    // import { emitHrmMessageToUser } from "../socket/hrmSocket.js";
    // emitHrmMessageToUser(adminId, mapChatDoc(chat));

    return res.json({ ok: true, chat: mapChatDoc(chat) });
  } catch (err) {
    console.error("employeeSendHrmMessage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/employee/hrm/chat/history
export async function employeeGetHrmHistory(req, res) {
  try {
    const employee = req.user;

    if (employee.role !== "EMPLOYEE") {
      return res.status(403).json({ message: "Only employees allowed" });
    }

    const adminId = employee.createdBy;
    if (!adminId) {
      return res
        .status(400)
        .json({ message: "No admin linked to this employee" });
    }

    const chats = await HrmChat.find({
      adminId,
      employeeId: employee._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    // mark all messages TO employee as read
    await HrmChat.updateMany(
      {
        adminId,
        employeeId: employee._id,
        receiverId: employee._id,
        isReadByEmployee: false,
      },
      { $set: { isReadByEmployee: true } }
    );

    return res.json({
      ok: true,
      chats: chats.map((c) => mapChatDoc(c)),
    });
  } catch (err) {
    console.error("employeeGetHrmHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/employee/hrm/chat/unread
export async function employeeGetUnreadCount(req, res) {
  try {
    const employee = req.user;
    const adminId = employee.createdBy;
    if (!adminId) return res.json({ unread: 0 });

    const unread = await HrmChat.countDocuments({
      adminId,
      employeeId: employee._id,
      receiverId: employee._id,
      isReadByEmployee: false,
    });

    return res.json({ unread });
  } catch (err) {
    console.error("employeeGetUnreadCount error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/employee/hrm/chat/mark-read
export async function employeeMarkChatRead(req, res) {
  try {
    const employee = req.user;
    const adminId = employee.createdBy;
    if (!adminId) return res.json({ ok: true });

    await HrmChat.updateMany(
      {
        adminId,
        employeeId: employee._id,
        receiverId: employee._id,
        isReadByEmployee: false,
      },
      { $set: { isReadByEmployee: true } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("employeeMarkChatRead error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* 
|--------------------------------------------------------------------------
| ADMIN SIDE – INBOX + REPLY
|--------------------------------------------------------------------------
*/

// GET /api/admin/hrm/chat/inbox
// List all employees who have chatted with this admin + unread count
export async function adminGetHrmInbox(req, res) {
  try {
    const adminId = req.user._id;

    // Aggregate last message & unread count per employee
    const agg = await HrmChat.aggregate([
      { $match: { adminId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$employeeId",
          lastMessage: { $first: "$message" },
          lastAt: { $first: "$createdAt" },
          unreadForAdmin: {
            $sum: {
              $cond: [{ $eq: ["$isReadByAdmin", false] }, 1, 0],
            },
          },
        },
      },
      { $sort: { lastAt: -1 } },
    ]);

    const employeeIds = agg.map((a) => a._id);
    const employees = await User.find({ _id: { $in: employeeIds } })
      .select("_id email profile.name")
      .lean();

    const employeeMap = {};
    employees.forEach((e) => {
      employeeMap[e._id.toString()] = e;
    });

    const list = agg.map((a) => {
      const emp = employeeMap[a._id.toString()] || {};
      return {
        _id: a._id,
        email: emp.email,
        name: emp.profile?.name || emp.email,
        lastMessage: a.lastMessage,
        lastAt: a.lastAt,
        unreadForAdmin: a.unreadForAdmin,
      };
    });

    return res.json({ employees: list });
  } catch (err) {
    console.error("adminGetHrmInbox error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/hrm/chat/history/:employeeId
export async function adminGetChatWithEmployee(req, res) {
  try {
    const adminId = req.user._id;
    const { employeeId } = req.params;

    const employee = await User.findById(employeeId).lean();
    if (!employee || employee.role !== "EMPLOYEE") {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Security: ensure this employee belongs to this admin
    if (String(employee.createdBy) !== String(adminId)) {
      return res
        .status(403)
        .json({ message: "This employee does not belong to you" });
    }

    const chats = await HrmChat.find({
      adminId,
      employeeId,
    })
      .sort({ createdAt: 1 })
      .lean();

    // Mark all messages TO admin as read
    await HrmChat.updateMany(
      {
        adminId,
        employeeId,
        receiverId: adminId,
        isReadByAdmin: false,
      },
      { $set: { isReadByAdmin: true } }
    );

    return res.json({
      ok: true,
      chats: chats.map((c) => mapChatDoc(c)),
    });
  } catch (err) {
    console.error("adminGetChatWithEmployee error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/admin/hrm/chat/send
export async function adminSendHrmMessage(req, res) {
  try {
    const adminId = req.user._id;
    const { receiverId, message } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId (employee) required" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const employee = await User.findById(receiverId).lean();
    if (!employee || employee.role !== "EMPLOYEE") {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (String(employee.createdBy) !== String(adminId)) {
      return res
        .status(403)
        .json({ message: "You cannot chat with this employee" });
    }

    const chat = await HrmChat.create({
      adminId,
      employeeId: employee._id,
      senderId: adminId,
      receiverId: employee._id,
      message: message.trim(),
      isReadByAdmin: true,
      isReadByEmployee: false,
    });

    // 🔔 Optional Socket emit
    // emitHrmMessageToUser(employee._id, mapChatDoc(chat));

    return res.json({ ok: true, chat: mapChatDoc(chat) });
  } catch (err) {
    console.error("adminSendHrmMessage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
