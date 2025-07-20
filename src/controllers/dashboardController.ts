import { Request, Response } from 'express';
import { query } from '../database';

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
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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
    console.error('Error fetching public overview data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
