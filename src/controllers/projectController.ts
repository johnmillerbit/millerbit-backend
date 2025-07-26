import { Request, Response } from 'express';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '../utils/email';
import multer from 'multer';
import path from 'path';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  const { project_name, description, participants, skills, media } = req.body;
  const created_by_user_id = req.userId; // Get user ID from authenticated request

  if (!project_name || !created_by_user_id) {
    return res.status(400).json({ message: 'Project name and creator ID are required' });
  }

  try {
    // 1. Insert into projects table
    const projectResult = await query(
      'INSERT INTO projects (project_name, description, created_by_user_id) VALUES ($1, $2, $3) RETURNING project_id',
      [project_name, description, created_by_user_id]
    );
    const projectId = projectResult.rows[0].project_id;

    // 2. Add participants (if any)
    if (participants && Array.isArray(participants)) {
      for (const participantId of participants) {
        await query('INSERT INTO project_participants (project_id, user_id) VALUES ($1, $2) ON CONFLICT (project_id, user_id) DO NOTHING', [projectId, participantId]);
      }
    }
    // Add the creator as a participant by default
    await query('INSERT INTO project_participants (project_id, user_id) VALUES ($1, $2) ON CONFLICT (project_id, user_id) DO NOTHING', [projectId, created_by_user_id]);


    // 3. Add skills (if any)
    if (skills && Array.isArray(skills)) {
      for (const skillName of skills) {
        let skillResult = await query('SELECT skill_id FROM skills WHERE skill_name = $1', [skillName]);
        let skillId = skillResult.rows[0]?.skill_id;

        if (!skillId) {
          const newSkillResult = await query('INSERT INTO skills (skill_name) VALUES ($1) RETURNING skill_id', [skillName]);
          skillId = newSkillResult.rows[0].skill_id;
        }
        await query('INSERT INTO project_skills (project_id, skill_id) VALUES ($1, $2) ON CONFLICT (project_id, skill_id) DO NOTHING', [projectId, skillId]);
      }
    }

    // 4. Add media (if any)
    if (media && Array.isArray(media)) {
      for (const mediaItem of media) {
        const { media_type, url, description } = mediaItem;
        if (media_type && url) {
          await query(
            'INSERT INTO project_media (project_id, media_type, url, description) VALUES ($1, $2, $3, $4)',
            [projectId, media_type, url, description]
          );
        }
      }
    }

    res.status(201).json({ message: 'Project created successfully', projectId });

  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPortfolioProjects = async (req: AuthenticatedRequest, res: Response) => {
  const { memberId, skillName } = req.query;

  try {
    let queryText = `
      SELECT
        p.project_id,
        p.project_name,
        p.description,
        p.status,
        p.created_at,
        p.updated_at,
        json_build_object(
          'user_id', u.user_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email
        ) AS created_by,
        COALESCE(json_agg(DISTINCT s.skill_name) FILTER (WHERE s.skill_id IS NOT NULL), '[]') AS skills,
        COALESCE(json_agg(DISTINCT pm.url) FILTER (WHERE pm.media_id IS NOT NULL AND pm.media_type = 'image'), '[]') AS images,
        COALESCE(json_agg(DISTINCT pm.url) FILTER (WHERE pm.media_id IS NOT NULL AND pm.media_type = 'video'), '[]') AS videos,
        COALESCE(json_agg(DISTINCT pm.url) FILTER (WHERE pm.media_id IS NOT NULL AND pm.media_type = 'link'), '[]') AS links
      FROM projects p
      JOIN users u ON p.created_by_user_id = u.user_id
      LEFT JOIN project_skills ps ON p.project_id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.skill_id
      LEFT JOIN project_participants pp ON p.project_id = pp.project_id
      LEFT JOIN project_media pm ON p.project_id = pm.project_id
      WHERE p.status = 'approved'
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (memberId) {
      queryText += ` AND pp.user_id = $${paramIndex++}`;
      queryParams.push(memberId);
    }

    if (skillName) {
      queryText += ` AND s.skill_name ILIKE $${paramIndex++}`;
      queryParams.push(`%${skillName}%`);
    }

    queryText += `
      GROUP BY p.project_id, u.user_id
      ORDER BY p.created_at DESC
    `;

    const projectsResult = await query(queryText, queryParams);
    res.status(200).json(projectsResult.rows);

  } catch (error: any) {
    console.error('Error fetching portfolio projects:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const approveProject = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // project_id

  try {
    // Update project status to 'approved'
    const result = await query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE project_id = $2 RETURNING created_by_user_id, project_name',
      ['approved', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { created_by_user_id, project_name } = result.rows[0];

    // Fetch creator's email for notification
    const creatorResult = await query('SELECT email FROM users WHERE user_id = $1', [created_by_user_id]);
    const creatorEmail = creatorResult.rows[0]?.email;

    if (creatorEmail) {
      const subject = `Project Approved: ${project_name}`;
      const text = `Your project "${project_name}" has been approved by a Team Leader.`;
      const html = `<p>Your project "<strong>${project_name}</strong>" has been approved by a Team Leader.</p>`;
      await sendEmail(creatorEmail, subject, text, html);
    }

    res.status(200).json({ message: `Project ${id} approved successfully.` });

  } catch (error: any) {
    console.error('Error approving project:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const rejectProject = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // project_id
  const { reason } = req.body; // Optional reason for rejection

  try {
    // Update project status to 'rejected'
    const result = await query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE project_id = $2 RETURNING created_by_user_id, project_name',
      ['rejected', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { created_by_user_id, project_name } = result.rows[0];

    // Fetch creator's email for notification
    const creatorResult = await query('SELECT email FROM users WHERE user_id = $1', [created_by_user_id]);
    const creatorEmail = creatorResult.rows[0]?.email;

    if (creatorEmail) {
      const subject = `Project Rejected: ${project_name}`;
      let text = `Your project "${project_name}" has been rejected by a Team Leader.`;
      let html = `<p>Your project "<strong>${project_name}</strong>" has been rejected by a Team Leader.</p>`;

      if (reason) {
        text += `\nReason: ${reason}`;
        html += `<p>Reason: ${reason}</p>`;
      }
      await sendEmail(creatorEmail, subject, text, html);
    }

    res.status(200).json({ message: `Project ${id} rejected successfully.` });

  } catch (error: any) {
    console.error('Error rejecting project:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPendingProjects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const queryText = `
      SELECT
        p.project_id,
        p.project_name,
        p.description,
        p.status,
        p.created_at,
        p.updated_at,
        json_build_object(
          'user_id', u.user_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email
        ) AS created_by,
        COALESCE(json_agg(DISTINCT s.skill_name) FILTER (WHERE s.skill_id IS NOT NULL), '[]') AS skills,
        COALESCE(json_agg(DISTINCT pm.url) FILTER (WHERE pm.media_id IS NOT NULL AND pm.media_type = 'image'), '[]') AS images,
        COALESCE(json_agg(DISTINCT pm.url) FILTER (WHERE pm.media_id IS NOT NULL AND pm.media_type = 'video'), '[]') AS videos,
        COALESCE(json_agg(DISTINCT pm.url) FILTER (WHERE pm.media_id IS NOT NULL AND pm.media_type = 'link'), '[]') AS links
      FROM projects p
      JOIN users u ON p.created_by_user_id = u.user_id
      LEFT JOIN project_skills ps ON p.project_id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.skill_id
      LEFT JOIN project_media pm ON p.project_id = pm.project_id
      WHERE p.status = 'pending'
      GROUP BY p.project_id, u.user_id
      ORDER BY p.created_at DESC
    `;
    const projectsResult = await query(queryText);
    res.status(200).json(projectsResult.rows);
  } catch (error: any) {
    console.error('Error fetching pending projects:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Multer configuration for project media uploads
const projectMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/project_media/'); // Directory to store uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  },
});

const projectMediaFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image and video files
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'));
  }
};

export const uploadProjectMediaMiddleware = multer({ storage: projectMediaStorage, fileFilter: projectMediaFileFilter });

export const uploadProjectMedia = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // project_id

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const mediaUrl = `/uploads/project_media/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video'; // Determine type based on mimetype

    await query(
      'INSERT INTO project_media (project_id, media_type, url, description) VALUES ($1, $2, $3, $4)',
      [id, mediaType, mediaUrl, req.body.description || null] // description can be optional
    );

    res.status(200).json({ message: 'Project media uploaded successfully', media_url: mediaUrl, media_type: mediaType });

  } catch (error: any) {
    console.error('Error uploading project media:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
