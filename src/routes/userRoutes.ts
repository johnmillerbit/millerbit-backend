// my-backend-api/src/routes/userRoutes.ts
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

// Publicly accessible routes (no authentication required)
// Anyone can view a user's basic profile, skills, and projects
router.get('/:id', getUserProfile);
router.get('/:id/skills', getUserSkills);
router.get('/:id/projects', getUserProjects);

// Authenticated routes (require a valid JWT token)
router.use(authenticateToken); // Apply authentication middleware to all routes below this line

router.get('/', getAllUsers); // Get all users (e.g., for admin dashboard) - requires auth now
router.post('/create', authorizeRoles(['team_leader', 'admin']), createMember); // Only Team Leaders and Admins can create members
router.delete('/:id', authorizeRoles(['team_leader', 'admin']), deleteUser); // Only Team Leaders and Admins can delete users

// User-specific actions (can be done by self, team_leader, or admin)
router.put('/:id', updateUserProfile); // User can update their own profile (or TL/Admin can)
router.post('/:id/skills', addSkillToUser); // User can add skills to their profile (or TL/Admin can)
router.delete('/:id/skills/:skillId', removeSkillFromUser); // User can remove skills from their profile (or TL/Admin can)
router.post('/:id/profile-picture', upload.single('profile_picture'), uploadProfilePicture); // User can upload their profile picture (or TL/Admin can)


export default router;