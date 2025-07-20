import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authorizeRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
