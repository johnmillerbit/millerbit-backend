// my-backend-api/src/controllers/userController.ts
import { Request, Response } from 'express';
import { query } from '../database';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import fs from 'fs'; // Import fs for directory creation

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

// --- New/Modified Controller Functions ---

// GET /api/users/:id - Get basic user profile details
export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const userResult = await query(
      `SELECT
        user_id,
        email,
        first_name,
        last_name,
        position,
        bio,
        profile_picture_url,
        role,
        status,
        created_at,
        updated_at
      FROM users
      WHERE user_id = $1`,
      [id]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);

  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/users/:id/skills - Get skills associated with a user
export const getUserSkills = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const skillsResult = await query(
      `SELECT s.skill_id, s.skill_name
       FROM skills s
       JOIN user_skills us ON s.skill_id = us.skill_id
       WHERE us.user_id = $1`,
      [id]
    );

    res.status(200).json(skillsResult.rows);

  } catch (error: any) {
    console.error('Error fetching user skills:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/users/:id/projects - Get projects associated with a user
export const getUserProjects = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const projectsResult = await query(
      `SELECT
        p.project_id,
        p.project_name,
        p.description,
        p.status,
        p.created_by_user_id,
        p.created_at,
        p.updated_at
      FROM projects p
      LEFT JOIN project_participants pp ON p.project_id = pp.project_id
      WHERE p.created_by_user_id = $1 OR pp.user_id = $1
      GROUP BY p.project_id
      ORDER BY p.created_at DESC`,
      [id]
    );

    res.status(200).json(projectsResult.rows);

  } catch (error: any) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Existing Controller Functions (included for completeness, no changes here unless specified) ---

export const createMember = async (req: Request, res: Response) => {
  const { email, password, first_name, last_name, position, bio, profile_picture_url, role } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ message: 'Email, password, first name, and last name are required.' });
  }

  try {
    const existingUser = await query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserResult = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, position, bio, profile_picture_url, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING user_id, email, first_name, last_name, position, bio, profile_picture_url, role, status, created_at, updated_at`,
      [email, hashedPassword, first_name, last_name, position, bio, profile_picture_url, role || 'team_member']
    );

    res.status(201).json(newUserResult.rows[0]);

  } catch (error: any) {
    console.error('Error creating member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (req.userId === id) {
    return res.status(403).json({ message: 'Forbidden: You cannot delete your own account.' });
  }

  try {
    const targetUserResult = await query('SELECT role FROM users WHERE user_id = $1', [id]);
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (targetUserResult.rows[0].role === 'team_leader' && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only an admin can delete another Team Leader.' });
    }

    const deleteResult = await query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: `User ${id} deleted successfully.` });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const usersResult = await query('SELECT user_id, first_name, last_name, email, role, position, status, profile_picture_url FROM users');
    res.status(200).json(usersResult.rows);
  } catch (error: any) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { first_name, last_name, position, bio, profile_picture_url, skills, email } = req.body;

  if (req.userId !== id && req.userRole !== 'team_leader' && req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: You can only update your own profile unless you are a Team Leader or Admin.' });
  }

  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (first_name !== undefined) { updateFields.push(`first_name = $${paramIndex++}`); updateValues.push(first_name); }
    if (last_name !== undefined) { updateFields.push(`last_name = $${paramIndex++}`); updateValues.push(last_name); }
    if (position !== undefined) { updateFields.push(`position = $${paramIndex++}`); updateValues.push(position); }
    if (bio !== undefined) { updateFields.push(`bio = $${paramIndex++}`); updateValues.push(bio); }
    if (profile_picture_url !== undefined) { updateFields.push(`profile_picture_url = $${paramIndex++}`); updateValues.push(profile_picture_url); }
    if (email !== undefined) { updateFields.push(`email = $${paramIndex++}`); updateValues.push(email); }

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex} RETURNING *`;
      updateValues.push(id);
      await query(updateQuery, updateValues);
    }

    if (skills !== undefined && Array.isArray(skills)) {
      await query('DELETE FROM user_skills WHERE user_id = $1', [id]);

      for (const skillName of skills) {
        let skillResult = await query('SELECT skill_id FROM skills WHERE skill_name = $1', [skillName]);
        let skillId = skillResult.rows[0]?.skill_id;

        if (!skillId) {
          const newSkillResult = await query('INSERT INTO skills (skill_name) VALUES ($1) RETURNING skill_id', [skillName]);
          skillId = newSkillResult.rows[0].skill_id;
        }
        await query('INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2) ON CONFLICT (user_id, skill_id) DO NOTHING', [id, skillId]);
      }
    }

    const updatedUser = await query(
      `SELECT
        user_id,
        email,
        first_name,
        last_name,
        position,
        bio,
        profile_picture_url,
        role,
        status,
        created_at,
        updated_at
      FROM users
      WHERE user_id = $1`,
      [id]
    );

    res.status(200).json(updatedUser.rows[0]);

  } catch (error: any) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addSkillToUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { skill_name } = req.body;

  if (!skill_name) {
    return res.status(400).json({ message: 'Skill name is required' });
  }

  if (req.userId !== id && req.userRole !== 'team_leader' && req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: You can only update your own skills unless you are a Team Leader or Admin.' });
  }

  try {
    let skillResult = await query('SELECT skill_id FROM skills WHERE skill_name = $1', [skill_name]);
    let skillId = skillResult.rows[0]?.skill_id;

    if (!skillId) {
      const newSkillResult = await query('INSERT INTO skills (skill_name) VALUES ($1) RETURNING skill_id', [skill_name]);
      skillId = newSkillResult.rows[0].skill_id;
    }

    await query('INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2) ON CONFLICT (user_id, skill_id) DO NOTHING', [id, skillId]);

    // Return the specific skill just added/confirmed
    res.status(200).json({ message: `Skill '${skill_name}' added successfully to user ${id}`, skill: { skill_id: skillId, skill_name: skill_name } });

  } catch (error: any) {
    console.error('Error adding skill to user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const removeSkillFromUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id, skillId } = req.params;

  if (req.userId !== id && req.userRole !== 'team_leader' && req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: You can only update your own skills unless you are a Team Leader or Admin.' });
  }

  try {
    const deleteResult = await query('DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2 RETURNING *', [id, skillId]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Skill not found for this user' });
    }

    res.status(200).json({ message: `Skill ${skillId} removed successfully from user ${id}` });

  } catch (error: any) {
    console.error('Error removing skill from user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'profile_pictures'); // Adjusted path for Multer
    // Ensure the directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const upload = multer({ storage: storage, fileFilter: fileFilter });

export const uploadProfilePicture = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (req.userId !== id && req.userRole !== 'team_leader' && req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: You can only upload your own profile picture unless you are a Team Leader or Admin.' });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // This URL needs to be accessible from the frontend.
    // Ensure your Express server is serving static files from the 'uploads' directory.
    const profilePictureUrl = `/uploads/profile_pictures/${req.file.filename}`;

    await query('UPDATE users SET profile_picture_url = $1, updated_at = NOW() WHERE user_id = $2', [profilePictureUrl, id]);

    res.status(200).json({ message: 'Profile picture uploaded successfully', profile_picture_url: profilePictureUrl });

  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};