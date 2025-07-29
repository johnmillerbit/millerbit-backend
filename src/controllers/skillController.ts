import { Request, Response } from 'express';
import { query } from '../database';
import { handleControllerError } from '../utils/errorHandler';

/**
 * @route GET /api/skills
 * @desc Get all skills
 * @access Public
 */
export const getAllSkills = async (req: Request, res: Response) => {
  try {
    const skillsResult = await query('SELECT skill_id, skill_name FROM skills');
    res.status(200).json(skillsResult.rows);
  } catch (error: any) {
    handleControllerError(res, error, 'Error fetching all skills');
  }
};
