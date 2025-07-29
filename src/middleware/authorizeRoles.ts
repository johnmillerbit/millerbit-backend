/**
 * @file Role-based authorization middleware for Express.
 * This file provides a higher-order function to create middleware that restricts access to routes based on user roles.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request';

/**
 * Creates an Express middleware function that checks if the authenticated user's role
 * is included in the list of allowed roles.
 *
 * This should be used after the `authenticateToken` middleware.
 *
 * @param {string[]} roles - An array of role strings that are permitted to access the route.
 * @returns An Express middleware function.
 */
export const authorizeRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
