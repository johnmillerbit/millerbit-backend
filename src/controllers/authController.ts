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

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    // 1. Find user by email
    const userResult = await query('SELECT user_id, email FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      // Even if user not found, send a generic success message to prevent email enumeration
      return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent to your email address.' });
    }

    // 2. Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // 3. Save token and expiry to database
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE user_id = $3',
      [resetToken, passwordResetExpires, user.user_id]
    );

    // 4. Send reset email
    const resetURL = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const text = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetURL}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;
    const html = `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p><p>Please click on the following link, or paste this into your browser to complete the process:</p><p><a href="${resetURL}">${resetURL}</a></p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`;

    await sendEmail(user.email, subject, text, html);

    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent to your email address.' });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // 1. Find user by token and check expiry
    const userResult = await query(
      'SELECT user_id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Update user's password and clear reset token fields
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE user_id = $2',
      [hashedPassword, user.user_id]
    );

    res.status(200).json({ message: 'Password has been reset successfully.' });

  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
