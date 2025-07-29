import { Request, Response } from 'express';
import { query } from '../database';
import { handleControllerError } from '../utils/errorHandler';

/**
 * @route GET /api/dashboard/data
 * @desc Get dashboard data (member count, total projects, pending projects)
 * @access Private (Team Leader, Admin)
 */
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // Fetch member count
    const memberCountResult = await query('SELECT COUNT(*) FROM users');
    const memberCount = parseInt(memberCountResult.rows[0].count, 10);

    // Fetch total projects count
    const totalProjectsResult = await query('SELECT COUNT(*) FROM projects');
    const totalProjects = parseInt(totalProjectsResult.rows[0].count, 10);

    // Fetch pending projects count
    const pendingProjectsResult = await query("SELECT COUNT(*) FROM projects WHERE status = 'pending'");
    const pendingProjects = parseInt(pendingProjectsResult.rows[0].count, 10);

    res.status(200).json({
      memberCount,
      totalProjects,
      pendingProjects,
    });

  } catch (error: any) {
    handleControllerError(res, error, 'Error fetching dashboard data');
  }
};

/**
 * @route GET /api/dashboard/public-overview
 * @desc Get public overview data (member count, total projects)
 * @access Public
 */
export const getPublicOverviewData = async (req: Request, res: Response) => {
  try {
    // Fetch member count
    const memberCountResult = await query('SELECT COUNT(*) FROM users');
    const memberCount = parseInt(memberCountResult.rows[0].count, 10);

    // Fetch total projects count
    const totalProjectsResult = await query('SELECT COUNT(*) FROM projects');
    const totalProjects = parseInt(totalProjectsResult.rows[0].count, 10);

    res.status(200).json({
      memberCount,
      totalProjects,
    });

  } catch (error: any) {
    handleControllerError(res, error, 'Error fetching public overview data');
  }
};
