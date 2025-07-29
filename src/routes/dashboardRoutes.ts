/**
 * @file Defines routes related to dashboard data.
 */

import { Router } from 'express';
import { getDashboardData, getPublicOverviewData } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorizeRoles';

const router = Router();

// Protected route for team leaders to get detailed dashboard data.
router.get('/', authenticateToken, authorizeRoles(['team_leader']), getDashboardData);

// Public route to get a high-level overview, suitable for a public-facing landing page.
router.get('/overview', getPublicOverviewData); // Public route for landing page

export default router;
