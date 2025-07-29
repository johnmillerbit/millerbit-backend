import { Response } from 'express';

export function parseJsonField<T>(
  res: Response,
  field: any,
  fieldName: string,
  defaultValue: T
): T | null {
  if (field && typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch (e) {
      res.status(400).json({ message: `Invalid ${fieldName} data` });
      return null; // Indicate failure to parse
    }
  }
  return defaultValue;
}
