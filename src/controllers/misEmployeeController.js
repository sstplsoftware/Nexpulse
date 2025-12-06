// C:\NexPulse\backend\src\controllers\misEmployeeController.js

import XLSX from "xlsx";
import MisRecord from "../models/MisRecord.js";
import MisActivityLog from "../models/MisActivityLog.js";
import { MIS_MASTER_HEADINGS } from "../constants/misHeadings.js";
import {
  buildRowDataFromExcelRow,
  extractFilterFields,
  getAdminScopeFromUser,
} from "../utils/misUtils.js";

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
 * POST /api/employee/mis/upload
 * Requires MIS_MANAGE
 */
export async function uploadMisExcelEmployee(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const adminId = getAdminScopeFromUser(req.user);
    if (!adminId) {
      return res.status(403).json({ message: "Admin scope missing" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let inserted = 0;

    const lastRecord = await MisRecord.findOne({
      visibleToAdmin: adminId,
    })
      .sort({ orderIndex: -1 })
      .lean();
    let currentOrderIndex = lastRecord ? lastRecord.orderIndex : 0;

    for (const rawRow of jsonRows) {
      const rowData = buildRowDataFromExcelRow(rawRow);
      const filters = extractFilterFields(rowData);

      currentOrderIndex += 1;

      const record = await MisRecord.create({
        createdByAdmin: adminId,
        createdByUser: req.user._id,
        visibleToAdmin: adminId,
        uploadSource: "excel",
        orderIndex: currentOrderIndex,
        ...filters,
        rowData,
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
      });

      inserted += 1;

      await logActivity({
        misRecordId: record._id,
        user: req.user,
        action: "create",
      });
    }

    return res.json({
      message: "MIS Excel uploaded successfully",
      inserted,
    });
  } catch (err) {
    console.error("uploadMisExcelEmployee error:", err);
    return res.status(500).json({ message: "Server error while uploading MIS" });
  }
}

/**
 * GET /api/employee/mis/records
 * Requires MIS_VIEW or MIS_MANAGE
 */
export async function listMisRecordsEmployee(req, res) {
  try {
    const adminId = getAdminScopeFromUser(req.user);
    if (!adminId) {
      return res.status(403).json({ message: "Admin scope missing" });
    }

    const {
      batchId,
      scheme,
      ssc,
      arId,
      assessorName,
      assessmentStatus,
      resultStatus,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      visibleToAdmin: adminId,
      isDeleted: false,
    };

    if (batchId) query.batchId = batchId;
    if (scheme) query.schemeProgramModel = scheme;
    if (ssc) query.sectorSSCName = ssc;
    if (arId) query.assessorArId = arId;
    if (assessorName) query.assessorName = new RegExp(assessorName, "i");
    if (assessmentStatus) query.assessmentStatus = assessmentStatus;
    if (resultStatus) query.resultStatus = resultStatus;

    if (startDate || endDate) {
      query.batchStartDate = {};
      if (startDate) query.batchStartDate.$gte = new Date(startDate);
      if (endDate) query.batchStartDate.$lte = new Date(endDate);
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      MisRecord.find(query)
        .sort({ orderIndex: 1, batchStartDate: 1 })
        .skip(skip)
        .limit(limitNum)
        .populate("lastEditedBy", "profile.name role")
        .lean(),
      MisRecord.countDocuments(query),
    ]);

    const formatted = records.map((r) => ({
      _id: r._id,
      batchId: r.batchId,
      schemeProgramModel: r.schemeProgramModel,
      sectorSSCName: r.sectorSSCName,
      assessorName: r.assessorName,
      assessmentStatus: r.assessmentStatus,
      resultStatus: r.resultStatus,
      batchStartDate: r.batchStartDate,
      batchEndDate: r.batchEndDate,
      lastEditedBy: r.lastEditedBy
        ? {
            _id: r.lastEditedBy._id,
            name: r.lastEditedBy.profile?.name || "",
            role: r.lastEditedBy.role,
          }
        : null,
      lastEditedAt: r.lastEditedAt,
      orderIndex: r.orderIndex,
    }));

    return res.json({
      page: pageNum,
      limit: limitNum,
      totalRecords: total,
      totalPages: Math.ceil(total / limitNum),
      records: formatted,
    });
  } catch (err) {
    console.error("listMisRecordsEmployee error:", err);
    return res.status(500).json({ message: "Server error while listing MIS records" });
  }
}

/**
 * GET /api/employee/mis/records/:id
 */
export async function getMisRecordEmployee(req, res) {
  try {
    const adminId = getAdminScopeFromUser(req.user);
    if (!adminId) {
      return res.status(403).json({ message: "Admin scope missing" });
    }

    const { id } = req.params;

    const record = await MisRecord.findOne({
      _id: id,
      visibleToAdmin: adminId,
    })
      .populate("createdByUser", "profile.name role")
      .populate("lastEditedBy", "profile.name role")
      .lean();

    if (!record || record.isDeleted) {
      return res.status(404).json({ message: "MIS record not found" });
    }

    return res.json(record);
  } catch (err) {
    console.error("getMisRecordEmployee error:", err);
    return res.status(500).json({ message: "Server error while fetching MIS record" });
  }
}

/**
 * PATCH /api/employee/mis/records/:id
 * Requires MIS_MANAGE
 */
export async function updateMisRecordEmployee(req, res) {
  try {
    const adminId = getAdminScopeFromUser(req.user);
    if (!adminId) {
      return res.status(403).json({ message: "Admin scope missing" });
    }

    const { id } = req.params;
    const { rowDataUpdates = {}, moveAfterId, moveBeforeId } = req.body || {};

    const record = await MisRecord.findOne({
      _id: id,
      visibleToAdmin: adminId,
      isDeleted: false,
    });

    if (!record) {
      return res.status(404).json({ message: "MIS record not found" });
    }

    const changedFields = {};

    for (const [heading, newValue] of Object.entries(rowDataUpdates)) {
      if (!MIS_MASTER_HEADINGS.includes(heading)) continue;

      const prev = record.rowData.get(heading);
      const val =
        newValue === undefined || newValue === null || newValue === ""
          ? "NA"
          : String(newValue).trim();

      if (prev !== val) {
        record.rowData.set(heading, val);
        changedFields[heading] = { old: prev, new: val };
      }
    }

    const filters = extractFilterFields(Object.fromEntries(record.rowData));
    Object.assign(record, filters);

    // Optional move logic (same as admin if you want)
    if (moveAfterId || moveBeforeId) {
      let newOrderIndex = record.orderIndex;

      if (moveAfterId) {
        const after = await MisRecord.findOne({
          _id: moveAfterId,
          visibleToAdmin: adminId,
          isDeleted: false,
        }).lean();

        if (!after) {
          return res.status(400).json({ message: "Invalid moveAfterId" });
        }

        const next = await MisRecord.findOne({
          visibleToAdmin: adminId,
          isDeleted: false,
          orderIndex: { $gt: after.orderIndex },
        })
          .sort({ orderIndex: 1 })
          .lean();

        if (!next) newOrderIndex = after.orderIndex + 1;
        else newOrderIndex = (after.orderIndex + next.orderIndex) / 2;
      } else if (moveBeforeId) {
        const before = await MisRecord.findOne({
          _id: moveBeforeId,
          visibleToAdmin: adminId,
          isDeleted: false,
        }).lean();

        if (!before) {
          return res.status(400).json({ message: "Invalid moveBeforeId" });
        }

        const prev = await MisRecord.findOne({
          visibleToAdmin: adminId,
          isDeleted: false,
          orderIndex: { $lt: before.orderIndex },
        })
          .sort({ orderIndex: -1 })
          .lean();

        if (!prev) newOrderIndex = before.orderIndex - 1;
        else newOrderIndex = (before.orderIndex + prev.orderIndex) / 2;
      }

      record.orderIndex = newOrderIndex;
    }

    record.lastEditedBy = req.user._id;
    record.lastEditedAt = new Date();

    await record.save();

    await logActivity({
      misRecordId: record._id,
      user: req.user,
      action: "update",
      changedFields: Object.keys(changedFields).length ? changedFields : null,
    });

    return res.json({ message: "MIS record updated successfully" });
  } catch (err) {
    console.error("updateMisRecordEmployee error:", err);
    return res.status(500).json({ message: "Server error while updating MIS record" });
  }
}
