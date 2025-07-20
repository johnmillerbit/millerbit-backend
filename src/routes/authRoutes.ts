import { Router } from 'express';
import { login, resetPassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorizeRoles';

const router = Router();

router.post('/login', login);
router.post('/reset-password', authenticateToken, authorizeRoles(['team_leader']), resetPassword);

export default router;
