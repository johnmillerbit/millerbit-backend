import { Router } from 'express';
import { createProject, approveProject, rejectProject, uploadProjectMedia, uploadProjectMediaMiddleware, uploadProjectPictureMiddleware, getPortfolioProjects, getPendingProjects, getAllProjects, getPublicProjectDetails, deleteProject } from '../controllers/projectController';
import { authenticateToken } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorizeRoles';

const router = Router();

router.post('/', authenticateToken, authorizeRoles(['team_member', 'team_leader', 'admin']), uploadProjectPictureMiddleware, createProject);
router.post('/:id/approve', authenticateToken, authorizeRoles(['team_leader']), approveProject);
router.post('/:id/reject', authenticateToken, authorizeRoles(['team_leader']), rejectProject);
router.post('/:id/media', authenticateToken, uploadProjectMediaMiddleware.single('project_media'), uploadProjectMedia);

// Admin route for pending projects
router.get('/pending', authenticateToken, authorizeRoles(['team_leader']), getPendingProjects);

// Admin route for all projects
router.get('/', authenticateToken, authorizeRoles(['team_leader']), getAllProjects);

// Public route for portfolio
router.get('/portfolio', getPortfolioProjects);

// Public route for single project details (no authentication required)
router.get('/public/:id', getPublicProjectDetails);

router.delete('/:id', authenticateToken, authorizeRoles(['team_leader']), deleteProject);

export default router;
