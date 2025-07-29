/**
 * @file Defines routes for managing skills.
 */

import { Router } from 'express';
import { getAllSkills } from '../controllers/skillController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Protected route to get a list of all available skills.
// Requires authentication to prevent unauthorized scraping.
router.get('/', authenticateToken, getAllSkills);

export default router;
