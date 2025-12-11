// C:\NexPulse\backend\src\controllers\misCommonController.js

import MisRecord from "../models/MisRecord.js";
import MisActivityLog from "../models/MisActivityLog.js";
import { MIS_MASTER_HEADINGS } from "../constants/misHeadings.js";
import { extractFilterFields, getAdminScopeFromUser } from "../utils/misUtils.js";

async function logActivity({ misRecordId, user, action, changedFields = null }) {
  try {
    await MisActivityLog.create({
      misRecordId,
      performedBy: user._id,
      performedByRole: user.role,
      action,
      changedFields,
    });
  } catch (err) {
    console.error("MIS ActivityLog error:", err.message);
  }
}

/**
 * POST /api/mis/create
 * Universal create (ADMIN + EMPLOYEE with MIS access)
 * Body: { rowData: { ... }, insertAfterId?, insertBeforeId? }
 */
export async function createMisRecord(req, res) {
  try {
    const adminId = getAdminScopeFromUser(req.user);

    if (!adminId) {
      return res.status(403).json({ message: "Admin scope missing" });
    }

    const { rowData: partialRowData = {}, insertAfterId, insertBeforeId } =
      req.body || {};

    // Normalize rowData → ensure EVERY MIS_MASTER_HEADINGS present
    const rowData = {};
    MIS_MASTER_HEADINGS.forEach((heading) => {
      const value = partialRowData[heading];
      rowData[heading] =
        value === undefined || value === null || value === ""
          ? "NA"
          : String(value).trim();
    });

    // derive filter fields from rowData
    const filters = extractFilterFields(rowData);

    // Compute orderIndex (like admin create)
    let orderIndex = 0;

    if (insertAfterId) {
      const afterRecord = await MisRecord.findOne({
        _id: insertAfterId,
        visibleToAdmin: adminId,
        isDeleted: false,
      }).lean();

      if (!afterRecord) {
        return res.status(400).json({ message: "Invalid insertAfterId" });
      }

      const nextRecord = await MisRecord.findOne({
        visibleToAdmin: adminId,
        isDeleted: false,
        orderIndex: { $gt: afterRecord.orderIndex },
      })
        .sort({ orderIndex: 1 })
        .lean();

      if (!nextRecord) {
        orderIndex = afterRecord.orderIndex + 1;
      } else {
        orderIndex = (afterRecord.orderIndex + nextRecord.orderIndex) / 2;
      }
    } else if (insertBeforeId) {
      const beforeRecord = await MisRecord.findOne({
        _id: insertBeforeId,
        visibleToAdmin: adminId,
        isDeleted: false,
      }).lean();

      if (!beforeRecord) {
        return res.status(400).json({ message: "Invalid insertBeforeId" });
      }

      const prevRecord = await MisRecord.findOne({
        visibleToAdmin: adminId,
        isDeleted: false,
        orderIndex: { $lt: beforeRecord.orderIndex },
      })
        .sort({ orderIndex: -1 })
        .lean();

      if (!prevRecord) {
        orderIndex = beforeRecord.orderIndex - 1;
      } else {
        orderIndex = (beforeRecord.orderIndex + prevRecord.orderIndex) / 2;
      }
    } else {
      const lastRecord = await MisRecord.findOne({
        visibleToAdmin: adminId,
      })
        .sort({ orderIndex: -1 })
        .lean();

      orderIndex = lastRecord ? lastRecord.orderIndex + 1 : 1;
    }

    const record = await MisRecord.create({
      createdByAdmin: adminId,
      createdByUser: req.user._id,
      visibleToAdmin: adminId,
      uploadSource: "manual-unified",
      orderIndex,
      ...filters,
      rowData,
      lastEditedBy: req.user._id,
      lastEditedAt: new Date(),
    });

    await logActivity({
      misRecordId: record._id,
      user: req.user,
      action: "create",
    });

    return res.status(201).json({
      message: "MIS record created successfully",
      recordId: record._id,
    });
  } catch (err) {
    console.error("createMisRecord (/api/mis/create) error:", err);
    return res
      .status(500)
      .json({ message: "Server error while creating MIS record" });
  }
}
