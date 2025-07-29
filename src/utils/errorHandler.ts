import { Response } from 'express';

export const handleControllerError = (res: Response, error: any, message: string = 'Server error') => {
  console.error(`${message}:`, error);
  res.status(500).json({ message, error: error.message });
};

export const handleAuthError = (res: Response, message: string = 'Invalid credentials', status: number = 401) => {
  res.status(status).json({ message });
};
