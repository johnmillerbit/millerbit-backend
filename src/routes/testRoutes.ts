/**
 * @file Defines routes for testing and health checks.
 * These routes are useful for development, debugging, and monitoring.
 */

import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authenticateToken } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../types/request';

const router = Router();

/**
 * @route GET /
 * @description A general health check or welcome route for the backend.
 */
router.get('/', (req: Request, res: Response) => {
  res.send('Hello from Backend!');
});

/**
 * @route GET /api/test-db
 * @description An endpoint to verify the database connection is active.
 */
router.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT NOW()');
    res.status(200).json({ message: 'Database connection successful!', time: result.rows[0].now });
  } catch (error: unknown) {
    console.error('Database test endpoint error:', error);
    // Type-safe error handling
    if (error instanceof Error) {
      res.status(500).json({ message: 'Database connection failed.', error: error.message });
    } else {
      res.status(500).json({ message: 'Database connection failed.', error: 'An unknown error occurred' });
    }
  }
});

/**
 * @route GET /api/protected
 * @description An example of a protected route that requires authentication.
 * It returns a welcome message with the authenticated user's ID and role.
 */
router.get('/api/protected', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ message: `Welcome, authenticated user ${req.userId} with role ${req.userRole}! This is a protected route.` });
});

export default router;