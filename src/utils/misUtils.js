// C:\NexPulse\backend\src\utils\misUtils.js

import { MIS_MASTER_HEADINGS } from "../constants/misHeadings.js";

/**
 * Build a normalized rowData object from a raw row (keyed by Excel headers).
 * - Only keep master headings
 * - For missing headings, store "NA"
 */
export function buildRowDataFromExcelRow(rawRow) {
  const rowData = {};

  MIS_MASTER_HEADINGS.forEach((heading) => {
    const value =
      rawRow[heading] === undefined || rawRow[heading] === null || rawRow[heading] === ""
        ? "NA"
        : String(rawRow[heading]).trim();

    rowData[heading] = value;
  });

  return rowData;
}

/**
 * Extract filter fields from a normalized rowData.
 */
export function extractFilterFields(rowData) {
  const batchId = rowData["Batch Id"] || null;
  const schemeProgramModel = rowData["Scheme/Program/Model"] || null;
  const sectorSSCName = rowData["Sector /SSC Name"] || null;
  const assessorArId = rowData["Assessor AR ID"] || null;
  const batchStartDateRaw = rowData["Batch Start Date"] || null;
  const batchEndDateRaw = rowData["Batch End Date"] || null;
  const assessorName = rowData["Assessor Name"] || null;
  const assessmentStatus = rowData["Assessment Status"] || null;
  const resultStatus = rowData["Result Status"] || null;

  // basic date parsing – you can improve later
  const batchStartDate = batchStartDateRaw && batchStartDateRaw !== "NA"
    ? new Date(batchStartDateRaw)
    : null;

  const batchEndDate = batchEndDateRaw && batchEndDateRaw !== "NA"
    ? new Date(batchEndDateRaw)
    : null;

  return {
    batchId,
    schemeProgramModel,
    sectorSSCName,
    assessorArId,
    batchStartDate,
    batchEndDate,
    assessorName,
    assessmentStatus,
    resultStatus,
  };
}

/**
 * Derive admin scope from a user.
 * ADMIN  -> adminId = user._id
 * EMPLOYEE -> adminId = user.createdBy
 */
export function getAdminScopeFromUser(user) {
  if (user.role === "ADMIN") {
    return user._id;
  }
  if (user.role === "EMPLOYEE") {
    return user.createdBy;
  }
  return null;
}
