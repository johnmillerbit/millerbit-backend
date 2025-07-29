/**
 * @file Defines routes for user-related actions, such as profiles, skills, and projects.
 */

import { Router } from 'express';
import {
  getUserProfile,
  getUserSkills, // New import
  getUserProjects, // New import
  updateUserProfile,
  addSkillToUser,
  removeSkillFromUser,
  uploadProfilePicture,
  upload,
  getAllUsers,
  createMember,
  deleteUser
} from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorizeRoles';

const router = Router();

// --- Publicly Accessible User Routes ---
// These routes do not require authentication and are used for public profile pages.

// Get a user's public profile information.
router.get('/:id', getUserProfile);
// Get the skills associated with a user.
router.get('/:id/skills', getUserSkills);
// Get the projects associated with a user.
router.get('/:id/projects', getUserProjects);

// --- Authenticated Routes ---
// All routes below this line require a valid JWT token.
router.use(authenticateToken); // Apply authentication middleware to all routes below this line

// Get a list of all users (e.g., for an admin dashboard).
router.get('/', getAllUsers);
// Create a new team member. Restricted to team leaders and admins.
router.post('/create', authorizeRoles(['team_leader', 'admin']), createMember); // Only Team Leaders and Admins can create members
// Delete a user. Restricted to team leaders and admins.
router.delete('/:id', authorizeRoles(['team_leader', 'admin']), deleteUser); // Only Team Leaders and Admins can delete users

// --- User-Specific Actions ---
// These actions can be performed by the user themselves, or by a team leader/admin.
router.put('/:id', authorizeRoles(['team_member', 'team_leader', 'admin']), updateUserProfile); // User can update their own profile (or TL/Admin can)
router.post('/:id/skills', addSkillToUser); // User can add skills to their profile (or TL/Admin can)
router.delete('/:id/skills/:skillId', removeSkillFromUser); // User can remove skills from their profile (or TL/Admin can)
router.post('/:id/profile-picture', upload.single('profile_picture'), uploadProfilePicture); // User can upload their profile picture (or TL/Admin can)

export default router;
