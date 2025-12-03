import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  requestLeave,
  myLeaves,
  adminLeaveRequests,
  approveLeave,
} from "../controllers/leaveController.js";

const router = express.Router();

router.post("/request", authMiddleware, requestLeave);
router.get("/my", authMiddleware, myLeaves);
router.get("/requests", authMiddleware, adminLeaveRequests);
router.put("/approve/:id", authMiddleware, approveLeave);

export default router;
