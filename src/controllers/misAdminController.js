// C:\NexPulse\backend\src\controllers\misAdminController.js

import MisRecord from "../models/MisRecord.js";
import MisActivityLog from "../models/MisActivityLog.js";
import { MIS_MASTER_HEADINGS } from "../constants/misHeadings.js";
import {
  buildRowDataFromExcelRow,
  extractFilterFields,
  getAdminScopeFromUser,
} from "../utils/misUtils.js";

import XLSX from "xlsx";

// ==========================================================
// 🔹 1) UPLOAD MIS (ADMIN)
// ==========================================================
export async function uploadMisExcelAdmin(req, res) {
  try {
    const adminId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const insertedRows = [];

    for (const rawRow of jsonRows) {
      const rowMap = buildRowDataFromExcelRow(rawRow);
      const filters = extractFilterFields(rowMap);

      const record = await MisRecord.create({
        createdByAdmin: adminId,
        createdByUser: req.user._id,
        visibleToAdmin: adminId,
        uploadSource: "excel",
        rowData: Object.fromEntries(rowMap),
        orderIndex: Date.now(),
        ...filters,
      });

      insertedRows.push(record._id);

      await MisActivityLog.create({
        misRecordId: record._id,
        performedBy: req.user._id,
        performedByRole: req.user.role,
        action: "create",
        changedFields: Object.fromEntries(rowMap),
      });
    }

    return res.json({
      inserted: insertedRows.length,
      insertedRows,
    });
  } catch (err) {
    console.error("uploadMisExcelAdmin error:", err);
    return res.status(500).json({ message: "Server error uploading MIS" });
  }
}

// ==========================================================
// 🔹 2) LIST MIS (ADMIN)
// ==========================================================
export async function listMisRecordsAdmin(req, res) {
  try {
    const adminId = req.user._id;

    let {
      page = 1,
      limit = 20,
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

    page = Number(page);
    limit = Number(limit);

    const query = {
      visibleToAdmin: adminId,
      isDeleted: false,
    };

    if (batchId) query.batchId = batchId;
    if (scheme) query.schemeProgramModel = scheme;
    if (ssc) query.sectorSSCName = ssc;
    if (arId) query.assessorArId = arId;
    if (assessmentStatus) query.assessmentStatus = assessmentStatus;
    if (resultStatus) query.resultStatus = resultStatus;

    if (assessorName) {
      query.assessorName = new RegExp(assessorName, "i");
    }

    if (startDate || endDate) {
      query.batchStartDate = {};
      if (startDate) query.batchStartDate.$gte = new Date(startDate);
      if (endDate) query.batchStartDate.$lte = new Date(endDate);
    }

    const total = await MisRecord.countDocuments(query);

    const records = await MisRecord.find(query)
      .sort({ orderIndex: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      records,
    });
  } catch (err) {
    console.error("listMisRecordsAdmin error:", err);
    return res.status(500).json({ message: "Server error listing MIS" });
  }
}

// ==========================================================
// 🔹 3) UPDATE MIS (ADMIN)
// ==========================================================
export async function updateMisRecordAdmin(req, res) {
  try {
    const adminId = req.user._id;
    const { id } = req.params;
    const { rowDataUpdates } = req.body;

    const record = await MisRecord.findOne({
      _id: id,
      visibleToAdmin: adminId,
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const updatedRowData = new Map(Object.entries(record.rowData));

    for (const [heading, value] of Object.entries(rowDataUpdates)) {
      updatedRowData.set(heading, value);
    }

    const filters = extractFilterFields(updatedRowData);

    record.rowData = Object.fromEntries(updatedRowData);
    record.lastEditedAt = new Date();
    record.lastEditedBy = req.user._id;
    Object.assign(record, filters);

    await record.save();

    await MisActivityLog.create({
      misRecordId: id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      action: "update",
      changedFields: rowDataUpdates,
    });

    return res.json({ message: "Record updated", record });
  } catch (err) {
    console.error("updateMisRecordAdmin error:", err);
    return res.status(500).json({ message: "Server error updating MIS" });
  }
}

// ==========================================================
// 🔹 4) SOFT DELETE MIS (ADMIN)
// ==========================================================
export async function deleteMisRecordAdmin(req, res) {
  try {
    const adminId = req.user._id;
    const { id } = req.params;

    const record = await MisRecord.findOne({
      _id: id,
      visibleToAdmin: adminId,
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = req.user._id;

    await record.save();

    await MisActivityLog.create({
      misRecordId: id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      action: "delete",
    });

    return res.json({ message: "Record soft deleted" });
  } catch (err) {
    console.error("deleteMisRecordAdmin error:", err);
    return res.status(500).json({ message: "Server error deleting MIS" });
  }
}

// ==========================================================
// 🔹 5) HISTORY (ADMIN)
// ==========================================================
export async function getMisRecordHistoryAdmin(req, res) {
  try {
    const adminId = req.user._id;
    const { id } = req.params;

    const record = await MisRecord.findOne({
      _id: id,
      visibleToAdmin: adminId,
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const history = await MisActivityLog.find({ misRecordId: id })
      .sort({ performedAt: 1 })
      .populate("performedBy", "profile.name role")
      .lean();

    return res.json({ history });
  } catch (err) {
    console.error("getMisRecordHistoryAdmin error:", err);
    return res.status(500).json({ message: "Server error fetching history" });
  }
}

// ==========================================================
// 🔹 6) EXPORT ALL MIS (ADMIN) — FIXED
// ==========================================================
export async function exportAllMisAdmin(req, res) {
  try {
    const adminId = req.user._id;

    const records = await MisRecord.find({
      visibleToAdmin: adminId,
      isDeleted: false,
    })
      .sort({ orderIndex: 1 })
      .lean();

    const rows = records.map((r) => Object.fromEntries(r.rowData || []));

    return res.json({
      adminId,
      count: rows.length,
      headings: MIS_MASTER_HEADINGS,
      rows,
    });
  } catch (err) {
    console.error("exportAllMisAdmin error:", err);
    return res.status(500).json({ message: "Server error exporting MIS" });
  }
}

// ==========================================================
// 🔹 7) EXPORT FILTERED MIS (ADMIN)
// ==========================================================
export async function exportFilteredMisAdmin(req, res) {
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
    } = req.query;

    const query = {
      visibleToAdmin: adminId,
      isDeleted: false,
    };

    if (batchId) query.batchId = batchId;
    if (scheme) query.schemeProgramModel = scheme;
    if (ssc) query.sectorSSCName = ssc;
    if (arId) query.assessorArId = arId;
    if (assessmentStatus) query.assessmentStatus = assessmentStatus;
    if (resultStatus) query.resultStatus = resultStatus;

    if (assessorName) {
      query.assessorName = new RegExp(assessorName, "i");
    }

    if (startDate || endDate) {
      query.batchStartDate = {};
      if (startDate) query.batchStartDate.$gte = new Date(startDate);
      if (endDate) query.batchStartDate.$lte = new Date(endDate);
    }

    const records = await MisRecord.find(query)
      .sort({ orderIndex: 1 })
      .lean();

    const rows = records.map((r) => Object.fromEntries(r.rowData || []));

    return res.json({
      filteredCount: rows.length,
      headings: MIS_MASTER_HEADINGS,
      rows,
    });
  } catch (err) {
    console.error("exportFilteredMisAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Server error exporting filtered MIS" });
  }
}
