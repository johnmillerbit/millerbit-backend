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
// Create a new team member. Restricted to team leaders.
router.post('/create', authorizeRoles(['team_leader']), createMember); // Only Team Leaders can create members
// Delete a user. Restricted to team leaders.
router.delete('/:id', authorizeRoles(['team_leader']), deleteUser); // Only Team Leaders can delete users

// --- User-Specific Actions ---
// These actions can be performed by the user themselves, or by a team leader.
router.put('/:id', authorizeRoles(['team_member', 'team_leader']), updateUserProfile); // User can update their own profile (or TL can)
router.post('/:id/skills', authorizeRoles(['team_member', 'team_leader']), addSkillToUser); // User can add skills to their profile (or TL can)
router.delete('/:id/skills/:skillId', authorizeRoles(['team_member', 'team_leader']), removeSkillFromUser); // User can remove skills from their profile (or TL can)
router.post('/:id/profile-picture', upload.single('profile_picture'), uploadProfilePicture); // User can upload their profile picture (or TL can)

export default router;
