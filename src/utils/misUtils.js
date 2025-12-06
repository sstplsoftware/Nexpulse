// C:\NexPulse\backend\src\utils\misUtils.js

import {
  RAW_MIS_HEADINGS,
  MIS_MASTER_HEADINGS,
  sanitizeHeading,
} from "../constants/misHeadings.js";

/**
 * Normalize for matching Excel column names
 * (sanitized + lowercased)
 */
function normalizeHeading(str = "") {
  return sanitizeHeading(str).toLowerCase();
}

/**
 * Converts an Excel row → Map(sanitizedHeading → value)
 * Example key: "Scheme_Program_Model"
 */
export function buildRowDataFromExcelRow(rawRow = {}) {
  const rowMap = new Map();

  // Build lookup: normalized (raw) → sanitized (canonical)
  const lookup = {};
  RAW_MIS_HEADINGS.forEach((h) => {
    lookup[normalizeHeading(h)] = sanitizeHeading(h);
  });

  // Map Excel → sanitized keys
  for (const [key, rawVal] of Object.entries(rawRow)) {
    if (!key) continue;

    const norm = normalizeHeading(key);
    const sanitized = lookup[norm];

    if (!sanitized) continue; // ignore unknown columns

    const value =
      rawVal === undefined || rawVal === null || rawVal === ""
        ? "NA"
        : String(rawVal).trim();

    rowMap.set(sanitized, value);
  }

  // Ensure all master headings exist
  MIS_MASTER_HEADINGS.forEach((h) => {
    if (!rowMap.has(h)) rowMap.set(h, "NA");
  });

  return rowMap;
}

/**
 * Read value from Map or plain object
 */
function getValue(source, key) {
  if (!source) return "";
  return source instanceof Map ? source.get(key) || "" : source[key] || "";
}

/**
 * Extract DB filter fields
 * Uses **sanitized** keys to read from rowData:
 *   Batch_Id, Scheme_Program_Model, Sector_SSC_Name, Assessor_AR_ID, etc.
 */
export function extractFilterFields(rowData) {
  const map = {
    Batch_Id: "batchId",
    Scheme_Program_Model: "schemeProgramModel",
    Sector_SSC_Name: "sectorSSCName",
    Assessor_AR_ID: "assessorArId",
    Batch_Start_Date: "batchStartDate",
    Batch_End_Date: "batchEndDate",
    Assessor_Name: "assessorName",
    Assessment_Status: "assessmentStatus",
    Result_Status: "resultStatus",
  };

  const filters = {};

  for (const [cleanKey, field] of Object.entries(map)) {
    const raw = getValue(rowData, cleanKey);

    if (field === "batchStartDate" || field === "batchEndDate") {
      if (!raw || raw === "NA") {
        filters[field] = null;
        continue;
      }

      // Try parse as normal date string
      let parsed = new Date(raw);

      // If invalid and looks like Excel serial (number-ish), convert
      if (isNaN(parsed.getTime()) && !isNaN(Number(raw))) {
        const excelSerial = Number(raw);
        // Excel serial date: days since 1899-12-30
        const jsMillis = (excelSerial - 25569) * 24 * 60 * 60 * 1000;
        parsed = new Date(jsMillis);
      }

      filters[field] = isNaN(parsed.getTime()) ? null : parsed;
    } else {
      filters[field] = raw ? String(raw).trim() : "";
    }
  }

  return filters;
}

/**
 * Determine admin scope
 * - ADMIN   → self _id
 * - EMPLOYEE → createdBy
 * - other   → null
 */
export function getAdminScopeFromUser(user) {
  if (!user) return null;
  if (user.role === "ADMIN") return user._id;
  if (user.role === "EMPLOYEE") return user.createdBy || null;
  return null;
}
