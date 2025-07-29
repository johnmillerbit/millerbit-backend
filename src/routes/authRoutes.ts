/**
 * @file Defines the authentication routes for the application.
 * These routes handle user login and password management.
 */

import { Router } from 'express';
import { login, forgotPassword, resetPassword } from '../controllers/authController';

const router = Router();

// Route to handle user login.
router.post('/login', login);

// Public route to request a password reset email.
router.post('/forgot-password', forgotPassword); // Public route to request password reset

// Public route to reset a user's password using a token from email.
router.patch('/reset-password/:token', resetPassword); // Public route to reset password with token

export default router;
