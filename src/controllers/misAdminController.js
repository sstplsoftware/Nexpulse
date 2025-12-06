// C:\NexPulse\backend\src\controllers\misAdminController.js

import XLSX from "xlsx";
import MisRecord from "../models/MisRecord.js";
import MisActivityLog from "../models/MisActivityLog.js";
import { MIS_MASTER_HEADINGS } from "../constants/misHeadings.js";
import {
  buildRowDataFromExcelRow,
  extractFilterFields,
  getAdminScopeFromUser,
  excelToJSDate,
} from "../utils/misUtils.js";

/**
 * Helper: create activity log
 */
async function logActivity({
  misRecordId,
  user,
  action,
  changedFields = null,
}) {
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
 * POST /api/admin/mis/upload
 * Admin Excel upload
 */
export async function uploadMisExcelAdmin(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const adminId = req.user._id;
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // array of objects

    let inserted = 0;

    // find current max orderIndex for this admin
    const lastRecord = await MisRecord.findOne({
      visibleToAdmin: adminId,
    })
      .sort({ orderIndex: -1 })
      .lean();

    let currentOrderIndex = lastRecord ? lastRecord.orderIndex : 0;

    for (const rawRow of jsonRows) {
      // 🔹 Build rich rowData (Option B part: map + excel dates inside)
      const rowData = buildRowDataFromExcelRow(rawRow);

      // 🔹 Extract top-level filters (Option A part)
      const filters = extractFilterFields(rowData);

      currentOrderIndex += 1;

      const record = await MisRecord.create({
        createdByAdmin: adminId,
        createdByUser: adminId,
        visibleToAdmin: adminId,
        uploadSource: "excel",
        orderIndex: currentOrderIndex,
        ...filters,
        rowData, // plain object with all fields
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
    console.error("uploadMisExcelAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while uploading MIS" });
  }
}

/**
 * POST /api/admin/mis/records
 * Manual create MIS row (with optional insertAfter/insertBefore)
 */
export async function createMisRecordAdmin(req, res) {
  try {
    const adminId = req.user._id;
    const { rowData: partialRowData = {}, insertAfterId, insertBeforeId } =
      req.body || {};

    // Normalize rowData: every master heading present, NA if missing
    const rowData = {};
    MIS_MASTER_HEADINGS.forEach((heading) => {
      const value = partialRowData[heading];
      rowData[heading] =
        value === undefined || value === null || value === ""
          ? "NA"
          : String(value).trim();
    });

    // Compute orderIndex
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

    const filters = extractFilterFields(rowData);

    const record = await MisRecord.create({
      createdByAdmin: adminId,
      createdByUser: req.user._id,
      visibleToAdmin: adminId,
      uploadSource: "manual",
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
    console.error("createMisRecordAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while creating MIS record" });
  }
}

/**
 * GET /api/admin/mis/records
 * List MIS with filters & pagination
 */
export async function listMisRecordsAdmin(req, res) {
  try {
    const adminId = req.user._id;
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
    console.error("listMisRecordsAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while listing MIS records" });
  }
}

/**
 * GET /api/admin/mis/records/:id
 */
export async function getMisRecordAdmin(req, res) {
  try {
    const adminId = req.user._id;
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
    console.error("getMisRecordAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching MIS record" });
  }
}

/**
 * PATCH /api/admin/mis/records/:id
 */
export async function updateMisRecordAdmin(req, res) {
  try {
    const adminId = req.user._id;
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

    // Ensure rowData is plain object
    if (!record.rowData || typeof record.rowData !== "object") {
      record.rowData = {};
    }

    const changedFields = {};

    // Update rowData from updates (these keys will be internal ones you choose)
    for (const [heading, newValue] of Object.entries(rowDataUpdates)) {
      const prev = record.rowData[heading];

      const val =
        newValue === undefined || newValue === null || newValue === ""
          ? "NA"
          : String(newValue).trim();

      if (prev !== val) {
        record.rowData[heading] = val;
        changedFields[heading] = { old: prev, new: val };
      }
    }

    // Re-extract filter fields from updated rowData
    const filters = extractFilterFields(record.rowData);
    Object.assign(record, filters);

    // Move position if requested
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
    console.error("updateMisRecordAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while updating MIS record" });
  }
}

/**
 * DELETE /api/admin/mis/records/:id
 * Soft delete
 */
export async function deleteMisRecordAdmin(req, res) {
  try {
    const adminId = req.user._id;
    const { id } = req.params;

    const record = await MisRecord.findOne({
      _id: id,
      visibleToAdmin: adminId,
      isDeleted: false,
    });

    if (!record) {
      return res.status(404).json({ message: "MIS record not found" });
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = req.user._id;
    record.lastEditedBy = req.user._id;
    record.lastEditedAt = new Date();

    await record.save();

    await logActivity({
      misRecordId: record._id,
      user: req.user,
      action: "delete",
    });

    return res.json({ message: "MIS record deleted (soft delete)" });
  } catch (err) {
    console.error("deleteMisRecordAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while deleting MIS record" });
  }
}

/**
 * GET /api/admin/mis/records/:id/history
 */
export async function getMisRecordHistoryAdmin(req, res) {
  try {
    const adminId = req.user._id;
    const { id } = req.params;

    const record = await MisRecord.findOne({
      _id: id,
      visibleToAdmin: adminId,
    }).lean();

    if (!record) {
      return res.status(404).json({ message: "MIS record not found" });
    }

    const history = await MisActivityLog.find({ misRecordId: id })
      .sort({ performedAt: 1 })
      .populate("performedBy", "profile.name role")
      .lean();

    return res.json({ history });
  } catch (err) {
    console.error("getMisRecordHistoryAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching MIS history" });
  }
}

/**
 * GET /api/admin/mis/export-filtered
 * Returns only filtered rows (for UI export button)
 */
export async function exportFilteredMisAdmin(req, res) {
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

    const records = await MisRecord.find(query)
      .sort({ orderIndex: 1 })
      .lean();

    const rows = records.map((r) =>
      r.rowData instanceof Map
        ? Object.fromEntries(r.rowData)
        : r.rowData || {}
    );

    return res.json({
      filteredCount: rows.length,
      headings: MIS_MASTER_HEADINGS,
      rows,
    });
  } catch (err) {
    console.error("exportFilteredMisAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while exporting filtered MIS" });
  }
}

/**
 * GET /api/admin/mis/export-all
 * Download entire MIS DB for this admin scope (as JSON rows)
 */
export async function exportAllMisAdmin(req, res) {
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

    const records = await MisRecord.find(query)
      .sort({ orderIndex: 1 })
      .lean();

    const rows = records.map((r) =>
      r.rowData instanceof Map
        ? Object.fromEntries(r.rowData)
        : r.rowData || {}
    );

    return res.json({
      adminId,
      count: rows.length,
      headings: MIS_MASTER_HEADINGS,
      rows,
    });
  } catch (err) {
    console.error("exportAllMisAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while exporting MIS" });
  }
}
