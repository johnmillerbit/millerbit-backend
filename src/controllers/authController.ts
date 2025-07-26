import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../database';
import { sendEmail } from '../utils/email';
import crypto from 'crypto';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email
    const userResult = await query('SELECT user_id, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: 'Login successful', token });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    // 1. Find user by email
    const userResult = await query('SELECT user_id, email FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Generate temporary password
    const temporaryPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // 3. Update user's password in database
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2', [hashedPassword, user.user_id]);

    // 4. Send temporary password via email
    const subject = 'Your Temporary Password for Web Access';
    const text = `Your temporary password is: ${temporaryPassword}\n\nPlease log in with this password and change it immediately.`;
    const html = `<p>Your temporary password is: <strong>${temporaryPassword}</strong></p><p>Please log in with this password and change it immediately.</p>`;

    await sendEmail(user.email, subject, text, html);

    res.status(200).json({ message: 'Temporary password sent to your email.' });

  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
