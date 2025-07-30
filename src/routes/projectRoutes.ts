/**
 * @file Defines routes for managing projects.
 */

import { Router } from "express";
import {
  createProject,
  approveProject,
  rejectProject,
  uploadProjectMedia,
  uploadProjectMediaMiddleware,
  uploadProjectPictureMiddleware,
  getApprovedProjects,
  getPendingProjects,
  getAllProjects,
  getPublicProjectDetails,
  deleteProject,
  updateProject,
  getLandingProjects
} from "../controllers/projectController";
import { authenticateToken } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/authorizeRoles";

const router = Router();

// Create a new project. Requires authentication and appropriate role.
router.post(
  "/",
  authenticateToken,
  authorizeRoles(["team_member", "team_leader", "admin"]),
  uploadProjectPictureMiddleware,
  createProject
);

// Approve a pending project. Only team leaders can perform this action.
router.put(
  "/:id/approve",
  authenticateToken,
  authorizeRoles(["team_leader"]),
  approveProject
);

// Reject a pending project. Only team leaders can perform this action.
router.put(
  "/:id/reject",
  authenticateToken,
  authorizeRoles(["team_leader"]),
  rejectProject
);

// Upload media (images, videos) for a specific project.
router.post(
  "/:id/media",
  authenticateToken,
  uploadProjectMediaMiddleware,
  uploadProjectMedia
);

// Protected route to get all pending projects for review.
router.get(
  "/pending",
  authenticateToken,
  authorizeRoles(["team_leader"]),
  getPendingProjects
);

// Protected route to get a list of all projects.
router.get(
  "/",
  authenticateToken,
  authorizeRoles(["team_leader"]),
  getAllProjects
);

// Public route to get all approved projects for the public portfolio with pagination.
router.get("/public", getApprovedProjects);

router.get("/landingProjects", getLandingProjects);

// Public route to get the details of a single approved project.
router.get("/public/:id", getPublicProjectDetails);

// Update an existing project. Requires authentication and appropriate role.
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(["team_member", "team_leader"]),
  uploadProjectPictureMiddleware,
  updateProject
);

// Delete a project. Only team leaders can perform this action.
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles(["team_leader"]),
  deleteProject
);

export default router;
