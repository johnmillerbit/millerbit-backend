/**
 * @file Manages and validates environment variables for the application.
 * It ensures that all required environment variables are present at startup
 * and provides them in a type-safe manner.
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Reads, validates, and returns a type-safe configuration object from environment variables.
 * This function will exit the process if any required environment variables are missing.
 * @returns {object} A validated and type-safe configuration object.
 */
const getEnv = () => {
  const config = {
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };

  // Find all keys that have an undefined value.
  const missingVars = Object.entries(config)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);

  // If any required variables are missing, log an error and exit.
  if (missingVars.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  // The non-null assertion (!) is safe here because we've already validated their existence.
  return {
    PORT: parseInt(config.PORT!, 10),
    FRONTEND_URL: config.FRONTEND_URL!,
    JWT_SECRET: config.JWT_SECRET!,
    EMAIL_USER: config.EMAIL_USER!,
    EMAIL_PASS: config.EMAIL_PASS!,
    EMAIL_FROM: config.EMAIL_FROM!,
  };
};

/**
 * A type-safe, validated object containing all environment variables for the application.
 */
export const env = getEnv();
