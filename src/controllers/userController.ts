import { Request, Response } from 'express';
import { query } from '../database';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Ensure the user can only fetch their own profile unless they are an admin/team_leader
  if (req.userId !== id && req.userRole !== 'team_leader') {
    return res.status(403).json({ message: 'Forbidden: You can only view your own profile.' });
  }

  try {
    const userResult = await query(
      `SELECT
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.position,
        u.bio,
        u.profile_picture_url,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        COALESCE(json_agg(s.skill_name) FILTER (WHERE s.skill_id IS NOT NULL), '[]') AS skills
      FROM users u
      LEFT JOIN user_skills us ON u.user_id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.skill_id
      WHERE u.user_id = $1
      GROUP BY u.user_id`,
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

export const createMember = async (req: Request, res: Response) => {
  const { email, password, first_name, last_name, position, bio, profile_picture_url, role } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ message: 'Email, password, first name, and last name are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserResult = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, position, bio, profile_picture_url, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING user_id, email, first_name, last_name, role`,
      [email, hashedPassword, first_name, last_name, position, bio, profile_picture_url, role || 'team_member']
    );

    res.status(201).json({ message: 'Member created successfully', user: newUserResult.rows[0] });

  } catch (error: any) {
    console.error('Error creating member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // user_id to delete

  // Prevent a user from deleting themselves or a team leader from deleting another team leader
  if (req.userId === id) {
    return res.status(403).json({ message: 'Forbidden: You cannot delete your own account.' });
  }

  try {
    // Check if the target user is a team_leader
    const targetUserResult = await query('SELECT role FROM users WHERE user_id = $1', [id]);
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (targetUserResult.rows[0].role === 'team_leader' && req.userRole !== 'admin') { // Assuming 'admin' can delete 'team_leader'
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
    const usersResult = await query('SELECT user_id, first_name, last_name, email, role FROM users');
    res.status(200).json(usersResult.rows);
  } catch (error: any) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { first_name, last_name, position, bio, profile_picture_url, skills } = req.body;

  // Ensure the user can only update their own profile unless they are an admin/team_leader
  if (req.userId !== id && req.userRole !== 'team_leader') {
    return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
  }

  try {
    // Update user basic info
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (first_name !== undefined) { updateFields.push(`first_name = $${paramIndex++}`); updateValues.push(first_name); }
    if (last_name !== undefined) { updateFields.push(`last_name = $${paramIndex++}`); updateValues.push(last_name); }
    if (position !== undefined) { updateFields.push(`position = $${paramIndex++}`); updateValues.push(position); }
    if (bio !== undefined) { updateFields.push(`bio = $${paramIndex++}`); updateValues.push(bio); }
    if (profile_picture_url !== undefined) { updateFields.push(`profile_picture_url = $${paramIndex++}`); updateValues.push(profile_picture_url); }

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex} RETURNING *`;
      updateValues.push(id);
      await query(updateQuery, updateValues);
    }

    // Update user skills
    if (skills !== undefined && Array.isArray(skills)) {
      // Remove existing skills for the user
      await query('DELETE FROM user_skills WHERE user_id = $1', [id]);

      // Add new skills
      for (const skillName of skills) {
        // Find skill_id or create new skill if it doesn't exist
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
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.position,
        u.bio,
        u.profile_picture_url,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        COALESCE(json_agg(s.skill_name) FILTER (WHERE s.skill_id IS NOT NULL), '[]') AS skills
      FROM users u
      LEFT JOIN user_skills us ON u.user_id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.skill_id
      WHERE u.user_id = $1
      GROUP BY u.user_id`,
      [id]
    );

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser.rows[0] });

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

  // Ensure the user can only update their own skills unless they are an admin/team_leader
  if (req.userId !== id && req.userRole !== 'team_leader') {
    return res.status(403).json({ message: 'Forbidden: You can only update your own skills.' });
  }

  try {
    // Find skill_id or create new skill if it doesn't exist
    let skillResult = await query('SELECT skill_id FROM skills WHERE skill_name = $1', [skill_name]);
    let skillId = skillResult.rows[0]?.skill_id;

    if (!skillId) {
      const newSkillResult = await query('INSERT INTO skills (skill_name) VALUES ($1) RETURNING skill_id', [skill_name]);
      skillId = newSkillResult.rows[0].skill_id;
    }

    // Add skill to user_skills
    await query('INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2) ON CONFLICT (user_id, skill_id) DO NOTHING', [id, skillId]);

    res.status(200).json({ message: `Skill '${skill_name}' added successfully to user ${id}` });

  } catch (error: any) {
    console.error('Error adding skill to user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const removeSkillFromUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id, skillId } = req.params; // Assuming skillId is passed as a URL parameter

  // Ensure the user can only update their own skills unless they are an admin/team_leader
  if (req.userId !== id && req.userRole !== 'team_leader') {
    return res.status(403).json({ message: 'Forbidden: You can only update your own skills.' });
  }

  try {
    // Remove skill from user_skills
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
    cb(null, 'uploads/profile_pictures/'); // Directory to store uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const upload = multer({ storage: storage, fileFilter: fileFilter });

export const uploadProfilePicture = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Ensure the user can only upload their own profile picture unless they are an admin/team_leader
  if (req.userId !== id && req.userRole !== 'team_leader') {
    return res.status(403).json({ message: 'Forbidden: You can only upload your own profile picture.' });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const profilePictureUrl = `/uploads/profile_pictures/${req.file.filename}`;

    await query('UPDATE users SET profile_picture_url = $1, updated_at = NOW() WHERE user_id = $2', [profilePictureUrl, id]);

    res.status(200).json({ message: 'Profile picture uploaded successfully', profile_picture_url: profilePictureUrl });

  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
