import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getSingleEmployee,
} from "../controllers/adminController.js";
import { getAllTasksForAdmin, deleteTaskByAdmin } from "../controllers/adminTaskController.js";

const router = express.Router();

// Only ADMINs allowed
router.use(authMiddleware, roleMiddleware("ADMIN"));

router.get("/employees", getEmployees);
router.post("/employees", createEmployee);
router.put("/employees/:id", updateEmployee);
router.delete("/employees/:id", deleteEmployee);
// 👇 ADD THIS NEW ROUTE
router.get("/employees/:id", getSingleEmployee);

router.get("/tasks/all", authMiddleware, roleMiddleware("ADMIN"), getAllTasksForAdmin);

router.delete("/task/:taskId", authMiddleware, roleMiddleware("ADMIN"), deleteTaskByAdmin);

export default router;
