// C:\NexPulse\backend\src\controllers\hrmController.js

import HrmDocument from "../models/HrmDocument.js";
import HrmChat from "../models/HrmChat.js";
import User from "../models/User.js";

// =============================
// UPLOAD DOCUMENT (Employee)
// =============================
export async function uploadHrmDocument(req, res) {
  try {
    const user = req.user;
    const { title } = req.body;

    if (!title || !req.file)
      return res.status(400).json({ message: "Missing title or file" });

    const fileUrl = req.file.path; // Cloudinary URL

    const doc = new HrmDocument({
      employeeId: user._id,
      createdBy: user.createdBy ?? user._id,
      title,
      fileUrl,
    });

    await doc.save();

    return res.json({ ok: true, doc });
  } catch (err) {
    console.error("uploadHrmDocument ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}


// =============================
// VIEW MY DOCUMENTS
// =============================
export async function getMyHrmDocuments(req, res) {
  try {
    const user = req.user;

    const docs = await HrmDocument.find({
      employeeId: user._id,
    }).sort({ createdAt: -1 });

    return res.json({ ok: true, docs });
  } catch (err) {
    console.error("getMyHrmDocuments ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// =============================
// ADMIN: VIEW EMPLOYEE DOCUMENTS
// =============================
export async function getHrmDocumentsForAdmin(req, res) {
  try {
    const admin = req.user;

    const docs = await HrmDocument.find({
      createdBy: admin._id,   // very important!
    }).sort({ createdAt: -1 });

    return res.json({ ok: true, docs });
  } catch (err) {
    console.error("getHrmDocumentsForAdmin ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// =============================
// SEND CHAT MESSAGE
// =============================
export async function sendHrmChatMessage(req, res) {
  try {
    const sender = req.user;
    const { receiverId, message } = req.body;

    if (!receiverId || !message)
      return res.status(400).json({ message: "Missing data" });

    const chat = new HrmChat({
      senderId: sender._id,
      receiverId,
      createdBy: sender.createdBy ?? sender._id,
      message,
      isRead: false,
    });

    await chat.save();

    // 🔥 REAL-TIME EMIT to sender + receiver rooms
    if (global.io) {
      const payload = {
        _id: chat._id,
        senderId: sender._id,
        receiverId,
        message,
        createdAt: chat.createdAt,
        isRead: chat.isRead,
      };

      global.io.to(sender._id.toString()).emit("hrm:chat:new", payload);
      global.io.to(receiverId.toString()).emit("hrm:chat:new", payload);

      // also trigger unread count refresh to receiver
      global.io.to(receiverId.toString()).emit("hrm:chat:unread-refresh");
    }

    return res.json({ ok: true, chat });
  } catch (err) {
    console.error("sendHrmChatMessage ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// =============================
// GET CHAT HISTORY (Admin/Employee)
// =============================
export async function getHrmChatHistory(req, res) {
  try {
    const user = req.user;

    const chats = await HrmChat.find({
      createdBy: user.role === "ADMIN" ? user._id : user.createdBy,
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "profile.name")
      .populate("receiverId", "profile.name");

    return res.json({ ok: true, chats });
  } catch (err) {
    console.error("getHrmChatHistory ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// =============================
// Notification MESSAGES AS unREAD 
// =============================
export async function getUnreadHrmCount(req, res) {
  try {
    const user = req.user;

    const count = await HrmChat.countDocuments({
      receiverId: user._id,
      isRead: false,
    });

    return res.json({ ok: true, count });
  } catch (err) {
    console.error("getUnreadHrmCount ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function markHrmChatRead(req, res) {
  try {
    const user = req.user;

    await HrmChat.updateMany(
      { receiverId: user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("markHrmChatRead ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}


