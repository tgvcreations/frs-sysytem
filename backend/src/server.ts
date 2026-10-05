import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './config/database';
import { seedInitialData } from './services/seedService';

// Route imports
import authRoutes from './routes/authRoutes';
import staffRoutes from './routes/staffRoutes';
import geofenceRoutes from './routes/geofenceRoutes';
import biometricRoutes from './routes/biometricRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import leaveRoutes from './routes/leaveRoutes';
import shiftRoutes from './routes/shiftRoutes';
import reportRoutes from './routes/reportRoutes';
import settingsRoutes from './routes/settingsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads directory
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Staff FRS & Attendance System',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/campuses', geofenceRoutes);
app.use('/api/biometrics', biometricRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Static frontend production files (served directly from backend on :5000)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    const indexHtml = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      next();
    }
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

// Initialize Database, Seed, and Start Server
async function startServer() {
  try {
    console.log('🚀 Booting Vuppala Staff FRS & Attendance Server...');
    await initDatabase();
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(` Server is running and listening on http://localhost:${PORT}`);
      console.log(` Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

