import { Router } from 'express';
import { getAllSkills } from '../controllers/skillController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getAllSkills);

export default router;
