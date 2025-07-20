import { Router } from 'express';
import { getUserProfile, updateUserProfile, addSkillToUser, removeSkillFromUser, uploadProfilePicture, upload, getAllUsers } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/:id', authenticateToken, getUserProfile);
router.get('/', authenticateToken, getAllUsers); // New route to get all users
router.put('/:id', authenticateToken, updateUserProfile);
router.post('/:id/skills', authenticateToken, addSkillToUser);
router.delete('/:id/skills/:skillId', authenticateToken, removeSkillFromUser);
router.post('/:id/profile-picture', authenticateToken, upload.single('profile_picture'), uploadProfilePicture);

export default router;
