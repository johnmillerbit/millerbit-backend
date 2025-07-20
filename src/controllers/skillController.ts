import { Request, Response } from 'express';
import { query } from '../database';

export const getAllSkills = async (req: Request, res: Response) => {
  try {
    const skillsResult = await query('SELECT skill_id, skill_name FROM skills');
    res.status(200).json(skillsResult.rows);
  } catch (error: any) {
    console.error('Error fetching all skills:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
