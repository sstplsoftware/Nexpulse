// C:\NexPulse\backend\src\utils\misUtils.js

import {
  RAW_MIS_HEADINGS,
  MIS_MASTER_HEADINGS,
  sanitizeHeading,
} from "../constants/misHeadings.js";
import { mapExcelRowsToMisDocs } from "./misExcelMapper.js";

/**
 * Normalize Excel headers into canonical comparable form
 */
function normalizeHeading(str = "") {
  return sanitizeHeading(str).toLowerCase();
}

/**
 * Convert Excel date serial → JS Date
 * Example:
 *   45287 → 2023-12-12 (correct)
 */
export function excelToJSDate(serial) {
  const n = Number(serial);
  if (!n || isNaN(n)) return null;
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Build rowData from Excel row.
 * Now uses mapExcelRowsToMisDocs → consistent mapping across backend.
 */
export function buildRowDataFromExcelRow(rawRow = {}) {
  const mappedDocs = mapExcelRowsToMisDocs([rawRow]);
  return mappedDocs[0]; // single doc returned
}

/**
 * Helper for safely reading from Map OR plain object
 */
function getValue(source, key) {
  if (!source) return "";
  if (source instanceof Map) return source.get(key) || "";
  return source[key] || "";
}

/**
 * Extract DB-level searchable fields from rowData
 * rowData keys are SANITIZED, e.g.:
 *   Batch_Id
 *   Scheme_Program_Model
 *   Sector_SSC_Name
 *   Assessor_AR_ID
 *   Batch_Start_Date
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

  for (const [cleanKey, finalField] of Object.entries(map)) {
    const raw = getValue(rowData, cleanKey);

    // Handle dates
    if (finalField === "batchStartDate" || finalField === "batchEndDate") {
      if (!raw || raw === "NA") {
        filters[finalField] = null;
        continue;
      }

      // Excel serial date (e.g. "45287")
      if (!isNaN(Number(raw))) {
        filters[finalField] = excelToJSDate(raw);
        continue;
      }

      // Normal date string
      const parsed = new Date(raw);
      filters[finalField] = isNaN(parsed.getTime()) ? null : parsed;
      continue;
    }

    // Normal string field
    filters[finalField] = raw ? String(raw).trim() : "";
  }

  return filters;
}

/**
 * Determine admin scope
 *
 * ADMIN    → self._id
 * EMPLOYEE → createdBy (the admin who owns him)
 */
export function getAdminScopeFromUser(user) {
  if (!user) return null;
  if (user.role === "ADMIN") return user._id;
  if (user.role === "EMPLOYEE") return user.createdBy || null;
  return null;
}
