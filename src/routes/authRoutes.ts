import { Router } from 'express';
import { login, forgotPassword, resetPassword } from '../controllers/authController';
// No authentication middleware needed for forgot/reset password routes
// import { authenticateToken } from '../middleware/authMiddleware';
// import { authorizeRoles } from '../middleware/authorizeRoles';

const router = Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword); // Public route to request password reset
router.patch('/reset-password/:token', resetPassword); // Public route to reset password with token

export default router;
