// C:\NexPulse\backend\src\utils\misUtils.js

import {
  RAW_MIS_HEADINGS,
  MIS_MASTER_HEADINGS,
  sanitizeHeading,
} from "../constants/misHeadings.js";
import { mapExcelRowsToMisDocs } from "./misExcelMapper.js";

/**
 * Excel serial / string → JS Date (or null)
 */
export function excelToJSDate(raw) {
  if (!raw) return null;

  // Already a Date
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  // Number or numeric string → Excel serial
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && String(raw).trim() === String(asNumber)) {
    // Excel serial: days since 1899-12-30
    const jsMillis = (asNumber - 25569) * 24 * 60 * 60 * 1000;
    const d = new Date(jsMillis);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback: normal date string
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Build rowData object from raw Excel row
 * Uses misExcelMapper (normalized header → internal keys)
 * and also fills a few important aliases from the original headers.
 */
export function buildRowDataFromExcelRow(rawRow = {}) {
  // mapExcelRowsToMisDocs returns [{ ...fields }]
  const mapped = mapExcelRowsToMisDocs([rawRow]);
  const doc = mapped[0] || {};

  // ---- IMPORTANT ALIASES (for safety with old sheets) ----
  if (!doc.batchId && rawRow.Batch_Id != null) {
    doc.batchId = String(rawRow.Batch_Id).trim();
  }

  if (!doc.schemeProgramModel && rawRow.Scheme_Program_Model != null) {
    doc.schemeProgramModel = String(rawRow.Scheme_Program_Model).trim();
  }

  if (!doc.sscName && rawRow.Sector_SSC_Name != null) {
    doc.sscName = String(rawRow.Sector_SSC_Name).trim();
  }

  if (!doc.assessorArId && rawRow.Assessor_AR_ID != null) {
    doc.assessorArId = String(rawRow.Assessor_AR_ID).trim();
  }

  if (!doc.assessorName && rawRow.Assessor_Name != null) {
    doc.assessorName = String(rawRow.Assessor_Name).trim();
  }

  if (!doc.assessmentStatus && rawRow.Assessment_Status != null) {
    doc.assessmentStatus = String(rawRow.Assessment_Status).trim();
  }

  if (!doc.resultStatus && rawRow.Result_Status != null) {
    doc.resultStatus = String(rawRow.Result_Status).trim();
  }

  // ---- DATE FIELDS ----
  // Prefer new internal fields if present, else excel headers
  const bs =
    excelToJSDate(doc.batchStartDate) ||
    excelToJSDate(rawRow.Batch_Start_Date);
  const be =
    excelToJSDate(doc.batchEndDate) || excelToJSDate(rawRow.Batch_End_Date);

  if (bs) doc.batchStartDate = bs;
  if (be) doc.batchEndDate = be;

  return doc;
}

/**
 * Helper to pick first non-empty value from rowData
 */
function pick(rowData, ...keys) {
  for (const k of keys) {
    const v = rowData?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "" && v !== "NA") {
      return String(v).trim();
    }
  }
  return "";
}

/**
 * Helper to pick date
 */
function pickDate(rowData, ...keys) {
  for (const k of keys) {
    const v = rowData?.[k];
    const d = excelToJSDate(v);
    if (d) return d;
  }
  return null;
}

/**
 * Extract DB filter fields from a rowData object.
 * Supports BOTH:
 *   - new internal keys: batchId, schemeProgramModel, sscName, ...
 *   - old sanitized Excel keys: Batch_Id, Scheme_Program_Model, Sector_SSC_Name, ...
 */
export function extractFilterFields(rowData = {}) {
  const filters = {
    batchId: pick(rowData, "batchId", "Batch_Id"),

    schemeProgramModel: pick(
      rowData,
      "schemeProgramModel",
      "Scheme_Program_Model"
    ),

    // sectorSSCName in DB, but Excel mapper used "sscName" internally
    sectorSSCName: pick(rowData, "sectorSSCName", "sscName", "Sector_SSC_Name"),

    assessorArId: pick(rowData, "assessorArId", "Assessor_AR_ID"),

    assessorName: pick(rowData, "assessorName", "Assessor_Name"),

    assessmentStatus: pick(
      rowData,
      "assessmentStatus",
      "Assessment_Status"
    ),

    resultStatus: pick(rowData, "resultStatus", "Result_Status"),

    batchStartDate: pickDate(
      rowData,
      "batchStartDate",
      "Batch_Start_Date"
    ),

    batchEndDate: pickDate(rowData, "batchEndDate", "Batch_End_Date"),
  };

  return filters;
}

/**
 * Determine admin scope
 * - ADMIN    → self _id
 * - EMPLOYEE → createdBy
 * - OTHER    → null
 */
export function getAdminScopeFromUser(user) {
  if (!user) return null;
  if (user.role === "ADMIN") return user._id;
  if (user.role === "EMPLOYEE") return user.createdBy || null;
  return null;
}
