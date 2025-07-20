import express from 'express';
import { connectDb, query } from './database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import skillRoutes from './routes/skillRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5000;

// Configure CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow requests from your Next.js frontend
  credentials: true, // Allow cookies to be sent
};
app.use(cors(corsOptions));

app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Use auth routes
app.use('/api/auth', authRoutes);
// Use user routes
app.use('/api/users', userRoutes);
// Use project routes
app.use('/api/projects', projectRoutes);
// Use skill routes
app.use('/api/skills', skillRoutes);
// Use dashboard routes
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.send('Hello from Backend!');
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.status(200).json({ message: 'Database connection successful!', time: result.rows[0].now });
  } catch (error: any) {
    console.error('Database test endpoint error:', error);
    res.status(500).json({ message: 'Database connection failed.', error: error.message });
  }
});

// Protected endpoint example
import { authenticateToken } from './middleware/authMiddleware';

app.get('/api/protected', authenticateToken, (req: any, res) => {
  res.status(200).json({ message: `Welcome, authenticated user ${req.userId} with role ${req.userRole}! This is a protected route.` });
});

const startServer = async () => {
  await connectDb();
  app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
  });
};

startServer();
