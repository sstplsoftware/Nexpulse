// C:\NexPulse\backend\src\utils\misExcelMapper.js

// 1) Normalization helper → makes mapping tolerant to spaces, case, punctuation
function normalizeHeader(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")        // collapse spaces
    .replace(/[().,%]/g, "")     // remove dot, comma, brackets, %
    .replace(/-/g, " ")          // dash -> space
    .replace(/\//g, " ")         // slash -> space
    .replace(/\s+/g, " ");       // collapse again
}

// 2) Map "normalized header" → internal MIS field key
const HEADER_TO_FIELD = {
  // core identifiers
  "sr no": "srNo",
  "scheme program model": "schemeProgramModel",
  "sub scheme": "subScheme",
  "sector ssc name": "sscName",
  "batch type": "batchType",
  "batch id": "batchId",
  "sstpl spoc name": "sstplSpocName",
  "spoc name": "sstplSpocName", // some sheets use "Spoc Name"
  "batch name": "batchName",
  "assessment type": "assessmentType",
  "mode of assessment": "modeOfAssessment",

  "job role name": "jobRoleName",
  "job role code": "jobRoleCode",
  "job role level": "jobRoleLevel",
  "job role version": "jobRoleVersion",
  "job roleversion": "jobRoleVersion", // typo variant

  "preferred assessment language": "preferredAssessmentLanguage",
  "batch size": "batchSize",
  "enrolled candidates": "enrolledCandidates",
  "dropout candidates size": "dropoutCandidatesSize",
  "eligible candidates size": "eligibleCandidatesSize",
  "noof women learners enrolled": "womenLearnersEnrolled",

  "tp name": "tpName",
  "tp id": "tpId",
  "tc name": "tcName",
  "tc id": "tcId",
  "traning center address tc": "tcAddress",
  "training center address tc": "tcAddress",

  "tc district": "tcDistrict",
  "tc district city": "tcDistrict",
  "district": "tcDistrict",

  "tc state": "tcState",
  "state": "tcState",

  "tc pin code": "tcPinCode",
  "pin code": "tcPinCode",

  "tp spoc name": "tpSpocName",
  "tp spoc no": "tpSpocNo",
  "tp spoc email": "tpSpocEmail",

  "batch start date": "batchStartDate",
  "batch end date": "batchEndDate",
  "assessment date as per sidh": "sidhAssessmentDate",
  "final assessment date": "finalAssessmentDate",
  "batch duration": "batchDuration",
  "day of assessment": "dayOfAssessment",
  "source of batch received": "sourceOfBatchReceived",
  "date of batch received": "dateOfBatchReceived",

  "assessor name": "assessorName",
  "assessor contact no": "assessorContactNo",
  "assessor email id": "assessorEmail",
  "assessor ar id": "assessorArId",
  "ar id": "assessorArId",
  "ar password": "arPassword",

  "trainer name": "trainerName",
  "trainer id": "trainerId",

  "assessment status": "assessmentStatus",
  "assessment remarks": "assessmentRemarks",

  "present candidate": "presentCandidate",
  "absent candidate": "absentCandidate",
  "pass candidates": "passCandidates",
  "fail candidate": "failCandidate",

  "total male candidates to be assessed": "totalMaleCandidates",
  "total female candidates to be assessed": "totalFemaleCandidates",

  "passing percentage of result": "passingPercentageOfResult",
  "result status": "resultStatus",
  "resultremarks": "resultRemarks",
  "result remarks": "resultRemarks",

  "date of result upload on sidh": "dateOfResultUploadOnSidh",

  "council source": "councilSource",
  "batch received month": "batchReceivedMonth",
  "parent batch id": "parentBatchId",
  "theory ojt": "theoryOjt",
  "received through sip lms portal": "receivedThroughPortal",

  "batch category": "batchCategory",
  "project": "project",
  "course code": "courseCode",
  "course level": "courseLevel",
  "course category": "courseCategory",
  "vtp contact no": "vtpContactNo",

  "final scheduling date": "finalSchedulingDate",
  "month of assessed batch": "assessedBatchMonth",
  "revised date": "revisedDate",
  "assessment start time": "assessmentStartTime",
  "assessment end time": "assessmentEndTime",
  "candidates registered": "candidatesRegistered",

  // "Average % Marks Obtained (Less than or equal to 100% )" & variants
  "average marks obtained less than or equal to 100": "averageMarks",
  "average marks obtained lessthan or equal to 100": "averageMarks",
  "average marks obtainedless than or equal to 100": "averageMarks",
  "average marks obtained  less than or equal to 100": "averageMarks",
  "average  marks obtained lessthan or equal to 100": "averageMarks",
  "average  marks obtainedless than or equal to 100": "averageMarks",
  "average  marks obtained  less than or equal to 100": "averageMarks",

  "coordinator name": "coordinatorName",
  "coordinator contact": "coordinatorContact",
  "coordinator email": "coordinatorEmail",

  "assessor qualification": "assessorQualification",
  "proctor name": "proctorName",
  "proctor no": "proctorNo",

  "date result received from assessor": "dateResultReceivedFromAssessor",
  "result submission date": "resultSubmissionDate",
  "result approval date": "resultApprovalDate",
  "was there a certified trainer": "wasCertifiedTrainer",

  "upload date on sdms lms": "uploadDateOnSdms",

  "rate": "rate",
  "ab share": "abShare",
  "total": "total",

  "documents submit to finance for invoicing": "docsToFinance",
  "invoice reference": "invoiceReference",
  "invoice amount": "invoiceAmount",
  "date of invoice": "dateOfInvoice",
  "invoice to council": "invoiceToCouncil",
  "remarks": "remarks",

  "date payment received": "datePaymentReceived",
  "payment ref": "paymentRef",
  "amount received": "amountReceived",
  "tds amount": "tdsAmount",
  "pending payment": "pendingPayment",

  "assessors rate": "assessorRate",
  "assessor rate": "assessorRate",
  "assessor payment": "assessorPayment",
  "assessor invoice received status": "assessorInvoiceStatus",
  "assessor invoice to finance": "assessorInvoiceToFinance",
  "assessor invoice ref": "assessorInvoiceRef",
  "amount paid to assessor": "amountPaidToAssessor",
  "date amount paid": "dateAmountPaid",

  "date hard copies received": "dateHardCopiesReceived",
  "attendance sheet": "attendanceSheet",
  "documents": "documents",
  "evidences": "evidences",

  "remark": "remark2",
  "status as sip lms per portal": "statusAsSipPortal",
  "batch conducted on": "batchConductedOn",
  "lms batches": "lmsBatches",
  "audit status": "auditStatus",
  "dbms batches": "dbmsBatches",
  "status": "status",

  "uploaded person name": "uploadedPersonName",
  "uploaded date": "uploadedDate",
  "sdmis portal": "sdmisPortal",
  "audit link": "auditLink",
  "document status": "documentStatus",
};

// 3) List of ALL known MIS fields (for default "NA")
export const MIS_FIELDS = Array.from(new Set(Object.values(HEADER_TO_FIELD)));

// 4) Main mapper: Excel JSON rows -> MIS docs
export function mapExcelRowsToMisDocs(excelRows = [], meta = {}) {
  return excelRows.map((rawRow) => {
    const row = rawRow || {};

    // Start each doc with "NA" for all known fields
    const doc = {};
    MIS_FIELDS.forEach((field) => {
      doc[field] = "NA";
    });

    // Fill from Excel where headers match
    Object.entries(row).forEach(([rawHeader, value]) => {
      const norm = normalizeHeader(rawHeader);
      const fieldKey = HEADER_TO_FIELD[norm];

      if (!fieldKey) {
        // Extra column → ignore silently
        return;
      }

      if (value === null || value === undefined || value === "") {
        // Keep as "NA"
        return;
      }

      doc[fieldKey] = String(value).trim();
    });

    // Meta fields: createdByAdmin, createdByUser, etc.
    if (meta.createdByAdmin) doc.createdByAdmin = meta.createdByAdmin;
    if (meta.createdByUser) doc.createdByUser = meta.createdByUser;
    if (meta.visibleToAdmin) doc.visibleToAdmin = meta.visibleToAdmin;
    if (meta.sourceFileName) doc.sourceFileName = meta.sourceFileName;

    // Soft delete flags & history base
    doc.isDeleted = false;
    doc.deletedAt = null;
    doc.deletedBy = null;

    return doc;
  });
}
