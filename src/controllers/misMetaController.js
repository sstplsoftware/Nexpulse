import MisRecord from "../models/MisRecord.js";
import { getAdminScopeFromUser } from "../utils/misUtils.js";

export async function getMisMeta(req, res) {
  try {
    const adminId = getAdminScopeFromUser(req.user);
    if (!adminId) return res.status(403).json({ message: "Admin scope missing" });

    const pipeline = [
      { $match: { visibleToAdmin: adminId, isDeleted: false } },
      {
        $group: {
          _id: null,
          batchIds: { $addToSet: "$batchId" },
          arIds: { $addToSet: "$assessorArId" },
          sscList: { $addToSet: "$sectorSSCName" },
          assessmentStatuses: { $addToSet: "$assessmentStatus" },
          resultStatuses: { $addToSet: "$resultStatus" },
        },
      },
    ];

    const result = await MisRecord.aggregate(pipeline);

    return res.json(result[0] || {});
  } catch (err) {
    console.error("getMisMeta error:", err);
    return res.status(500).json({ message: "Failed to load MIS metadata" });
  }
}
