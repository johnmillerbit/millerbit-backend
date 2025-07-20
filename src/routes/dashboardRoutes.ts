import { Router } from 'express';
import { getDashboardData, getPublicOverviewData } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorizeRoles';

const router = Router();

router.get('/', authenticateToken, authorizeRoles(['team_leader']), getDashboardData);
router.get('/overview', getPublicOverviewData); // Public route for landing page

export default router;
