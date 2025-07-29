/**
 * @file Authentication middleware for Express.
 * This file contains middleware to verify JWT tokens from incoming requests.
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../types/request';

/**
 * Express middleware to authenticate a user by verifying a JWT token.
 * The token is expected in the 'Authorization' header in the 'Bearer TOKEN' format.
 * If the token is valid, it decodes the payload and attaches `userId` and `userRole` to the request object.
 *
 * @param {AuthenticatedRequest} req - The Express request object, augmented with user properties.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, env.JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.userId = user.userId;
    req.userRole = user.role;
    next();
  });
};
