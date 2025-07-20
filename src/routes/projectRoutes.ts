import { Router } from 'express';
import { createProject, approveProject, rejectProject, uploadProjectMedia, uploadProjectMediaMiddleware, getPortfolioProjects } from '../controllers/projectController';
import { authenticateToken } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorizeRoles';

const router = Router();

router.post('/', authenticateToken, createProject);
router.post('/:id/approve', authenticateToken, authorizeRoles(['team_leader']), approveProject);
router.post('/:id/reject', authenticateToken, authorizeRoles(['team_leader']), rejectProject);
router.post('/:id/media', authenticateToken, uploadProjectMediaMiddleware.single('project_media'), uploadProjectMedia);

// Public route for portfolio
router.get('/portfolio', getPortfolioProjects);

export default router;
