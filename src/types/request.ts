/**
 * @file Defines custom extensions to the Express Request object.
 */

import { Request } from 'express';

/**
 * Extends the default Express `Request` interface to include properties
 * that are added by authentication middleware.
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}
