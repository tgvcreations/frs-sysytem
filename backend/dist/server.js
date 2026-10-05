"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("./config/database");
const seedService_1 = require("./services/seedService");
// Route imports
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const staffRoutes_1 = __importDefault(require("./routes/staffRoutes"));
const geofenceRoutes_1 = __importDefault(require("./routes/geofenceRoutes"));
const biometricRoutes_1 = __importDefault(require("./routes/biometricRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const leaveRoutes_1 = __importDefault(require("./routes/leaveRoutes"));
const shiftRoutes_1 = __importDefault(require("./routes/shiftRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
// Static uploads directory
const uploadsDir = path_1.default.resolve(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'Staff FRS & Attendance System',
        timestamp: new Date().toISOString(),
    });
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/staff', staffRoutes_1.default);
app.use('/api/campuses', geofenceRoutes_1.default);
app.use('/api/biometrics', biometricRoutes_1.default);
app.use('/api/attendance', attendanceRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/leaves', leaveRoutes_1.default);
app.use('/api/shifts', shiftRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
// Static frontend production files (served directly from backend on :5000)
const frontendDist = path_1.default.resolve(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDist)) {
    app.use(express_1.default.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        const indexHtml = path_1.default.join(frontendDist, 'index.html');
        if (fs_1.default.existsSync(indexHtml)) {
            res.sendFile(indexHtml);
        }
        else {
            next();
        }
    });
}
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error occurred.',
    });
});
// Initialize Database, Seed, and Start Server
async function startServer() {
    try {
        console.log('🚀 Booting Vuppala Staff FRS & Attendance Server...');
        await (0, database_1.initDatabase)();
        await (0, seedService_1.seedInitialData)();
        app.listen(PORT, () => {
            console.log(` Server is running and listening on http://localhost:${PORT}`);
            console.log(` Health check available at: http://localhost:${PORT}/api/health`);
        });
    }
    catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}
startServer();
