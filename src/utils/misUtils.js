// C:\NexPulse\backend\src\utils\misUtils.js

import { MIS_MASTER_HEADINGS } from "../constants/misHeadings.js";

/**
 * Normalize a heading string to be more forgiving across Excel variants.
 * - lowercases
 * - trims
 * - collapses spaces
 * - removes non-alphanumeric characters
 *
 * So:
 *  "Sector /SSC Name" and "Sector / SSC  Name"
 * both become "sectorsscname"
 */
function normalizeHeading(str = "") {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w]+/g, "");
}

/**
 * Build a single rowData Map from one Excel JSON row.
 *
 * - For every MIS_MASTER_HEADINGS item, ensures a key in Map.
 * - If Excel has that column → use value (trimmed).
 * - If Excel missing it → store "NA".
 * - Extra Excel columns are ignored.
 *
 * @param {Object} rawRow - row from XLSX.utils.sheet_to_json
 * @returns {Map<string, string>}
 */
export function buildRowDataFromExcelRow(rawRow = {}) {
  const rowMap = new Map();

  // 1) Build a quick lookup: normalized heading → canonical heading
  const canonicalMap = {};
  MIS_MASTER_HEADINGS.forEach((h) => {
    const norm = normalizeHeading(h);
    if (!canonicalMap[norm]) {
      canonicalMap[norm] = h;
    }
  });

  // 2) First, map all values we find in Excel row
  for (const [excelKey, rawVal] of Object.entries(rawRow)) {
    if (!excelKey) continue;

    const norm = normalizeHeading(excelKey);
    const canonicalHeading = canonicalMap[norm];

    if (!canonicalHeading) {
      // Excel column that is not part of MIS_MASTER_HEADINGS → ignore
      continue;
    }

    const value =
      rawVal === undefined || rawVal === null || rawVal === ""
        ? "NA"
        : String(rawVal).trim();

    rowMap.set(canonicalHeading, value);
  }

  // 3) Ensure *all* master headings exist (fill missing ones as "NA")
  MIS_MASTER_HEADINGS.forEach((h) => {
    if (!rowMap.has(h)) {
      rowMap.set(h, "NA");
    }
  });

  return rowMap;
}

/**
 * Helper: safely read value from either Map or plain object.
 */
function getSourceValue(source, heading) {
  if (!source) return "";

  if (source instanceof Map) {
    return source.get(heading) || "";
  }

  // plain object case
  return source[heading] || "";
}

/**
 * Extracts filter-able fields from rowData.
 *
 * It supports:
 *  - rowData as Map<string, string>
 *  - rowData as plain object { heading: value, ... }
 *
 * Output fields stored directly in MisRecord:
 *  - batchId
 *  - schemeProgramModel
 *  - sectorSSCName
 *  - assessorArId
 *  - batchStartDate
 *  - batchEndDate
 *  - assessorName
 *  - assessmentStatus
 *  - resultStatus
 */
export function extractFilterFields(rowData) {
  // Map headings → filter keys
  const fieldMap = {
    "Batch Id": "batchId",
    "Scheme/Program/Model": "schemeProgramModel",
    "Sector /SSC Name": "sectorSSCName",
    "Assessor AR ID": "assessorArId",
    "Batch Start Date": "batchStartDate",
    "Batch End Date": "batchEndDate",
    "Assessor Name": "assessorName",
    "Assessment Status": "assessmentStatus",
    "Result Status": "resultStatus",
  };

  const filters = {};

  for (const [heading, fieldKey] of Object.entries(fieldMap)) {
    const raw = getSourceValue(rowData, heading);

    if (
      fieldKey === "batchStartDate" ||
      fieldKey === "batchEndDate"
    ) {
      // Try to parse date if present
      if (raw && raw !== "NA") {
        const parsed = new Date(raw);
        filters[fieldKey] = isNaN(parsed.getTime()) ? null : parsed;
      } else {
        filters[fieldKey] = null;
      }
    } else {
      filters[fieldKey] =
        raw === undefined || raw === null || raw === ""
          ? ""
          : String(raw).trim();
    }
  }

  return filters;
}

/**
 * Admin-scope helper
 * - If ADMIN → returns his own _id
 * - If EMPLOYEE → returns createdBy
 * - Otherwise → null
 */
export function getAdminScopeFromUser(user) {
  if (!user) return null;

  if (user.role === "ADMIN") {
    return user._id;
  }

  if (user.role === "EMPLOYEE") {
    return user.createdBy || null;
  }

  return null;
}
