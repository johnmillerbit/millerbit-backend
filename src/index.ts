/**
 * @file Main entry point for the Miller-Bit backend Express application.
 * This file is responsible for setting up the Express server, configuring middleware,
 * mounting API routes, and connecting to the database before starting the server.
 */

// --- Configuration ---
// Must be the first import to ensure environment variables are loaded and validated.
import { env } from './config/env';

// --- Core Modules ---
import express from 'express';
import cors from 'cors';

// --- Application Modules ---
import { connectDb } from './database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import skillRoutes from './routes/skillRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import testRoutes from './routes/testRoutes';

// --- Server Setup ---
const app = express();

// --- Middleware Configuration ---

/**
 * Configure Cross-Origin Resource Sharing (CORS).
 * This allows the frontend application (running on a different origin)
 * to make requests to this backend API.
 */
const corsOptions = {
  origin: env.FRONTEND_URL, // Allow requests only from the specified frontend URL.
  credentials: true, // Allow cookies and authorization headers to be sent.
};
app.use(cors(corsOptions));

// Enable the Express app to parse JSON-formatted request bodies.
app.use(express.json());

// Serve static files (like uploaded images) from the 'uploads' directory.
// This makes files in the 'uploads' folder accessible via URLs like `http://<host>:<port>/uploads/<filename>`.
app.use('/uploads', express.static('uploads'));

// --- API Route Mounting ---

// Mount authentication-related routes (login, password reset, etc.).
app.use('/api/auth', authRoutes);
// Mount user-related routes (profiles, skills, etc.).
app.use('/api/users', userRoutes);
// Mount project-related routes.
app.use('/api/projects', projectRoutes);
// Mount skill-related routes.
app.use('/api/skills', skillRoutes);
// Mount dashboard-related routes.
app.use('/api/dashboard', dashboardRoutes);
// Mount test and example routes (e.g., health checks).
app.use('/', testRoutes);

// --- Server Initialization ---

/**
 * Initializes the server by first connecting to the database and then
 * starting the Express app to listen for incoming requests on the configured port.
 */
const startServer = async () => {
  try {
    await connectDb();
    app.listen(env.PORT, () => {
      console.log(`✅ Backend server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server.
startServer();
