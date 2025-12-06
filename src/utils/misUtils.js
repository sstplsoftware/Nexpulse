// C:\NexPulse\backend\src\utils\misUtils.js

import { RAW_MIS_HEADINGS, MIS_MASTER_HEADINGS } from "../constants/misHeadings.js";

/**
 * Sanitize heading so MongoDB map can accept it
 * Removes ".", "(", ")", "/", spaces etc.
 */
export function sanitizeHeading(heading = "") {
  return heading
    .replace(/\./g, "")       // remove dots
    .replace(/\(/g, "")       // remove (
    .replace(/\)/g, "")       // remove )
    .replace(/\//g, "_")      // replace /
    .replace(/\s+/g, "_")     // convert spaces -> _
    .replace(/__+/g, "_")     // avoid double _
    .trim();
}

/**
 * Normalize for matching Excel column names
 */
function normalizeHeading(str = "") {
  return sanitizeHeading(str).toLowerCase();
}

/**
 * Converts an Excel row → Map(sanitizedHeading → value)
 */
export function buildRowDataFromExcelRow(rawRow = {}) {
  const rowMap = new Map();

  // Build lookup: normalized → sanitized
  const lookup = {};
  RAW_MIS_HEADINGS.forEach(h => {
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
  MIS_MASTER_HEADINGS.forEach(h => {
    if (!rowMap.has(h)) rowMap.set(h, "NA");
  });

  return rowMap;
}

/**
 * Read value from Map or object
 */
function getValue(source, key) {
  if (!source) return "";
  return source instanceof Map ? source.get(key) || "" : source[key] || "";
}

/**
 * Extract DB filter fields
 */
export function extractFilterFields(rowData) {
  const map = {
    "Batch_Id": "batchId",
    "SchemeProgramModel": "schemeProgramModel",
    "Sector_SSC_Name": "sectorSSCName",
    "Assessor_AR_ID": "assessorArId",
    "Batch_Start_Date": "batchStartDate",
    "Batch_End_Date": "batchEndDate",
    "Assessor_Name": "assessorName",
    "Assessment_Status": "assessmentStatus",
    "Result_Status": "resultStatus",
  };

  const filters = {};

  for (const [cleanKey, field] of Object.entries(map)) {
    const raw = getValue(rowData, cleanKey);

    if (field.includes("Date")) {
      const d = new Date(raw);
      filters[field] = isNaN(d.getTime()) ? null : d;
    } else {
      filters[field] = raw || "";
    }
  }

  return filters;
}

/**
 * Determine admin scope (ADMIN → self, EMPLOYEE → createdBy)
 */
export function getAdminScopeFromUser(user) {
  if (!user) return null;
  if (user.role === "ADMIN") return user._id;
  if (user.role === "EMPLOYEE") return user.createdBy || null;
  return null;
}
