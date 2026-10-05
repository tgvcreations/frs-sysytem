"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getCurrentUser = getCurrentUser;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const JWT_SECRET = process.env.JWT_SECRET || 'vuppala_prathamika_patashala_kalashala_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }
        const userRes = await (0, database_1.query)(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [email.trim()]);
        if (userRes.rows.length === 0) {
            res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
            return;
        }
        const user = userRes.rows[0];
        const passwordValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!passwordValid) {
            res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
            return;
        }
        // Fetch associated staff profile if exists
        let staffProfile = null;
        if (user.staff_id) {
            const staffRes = await (0, database_1.query)(`SELECT * FROM staff WHERE id = $1`, [user.staff_id]);
            if (staffRes.rows.length > 0) {
                staffProfile = staffRes.rows[0];
            }
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
            staff_id: user.staff_id,
        }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                staff_id: user.staff_id,
                staff: staffProfile,
            },
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'An error occurred during authentication.' });
    }
}
async function getCurrentUser(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const userRes = await (0, database_1.query)(`SELECT id, email, role, staff_id, created_at FROM users WHERE id = $1`, [req.user.id]);
        if (userRes.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const user = userRes.rows[0];
        let staffProfile = null;
        if (user.staff_id) {
            const staffRes = await (0, database_1.query)(`SELECT s.*, c.name as campus_name, sh.name as shift_name, sh.start_time as shift_start, sh.end_time as shift_end
         FROM staff s
         LEFT JOIN campuses c ON s.assigned_campus_id = c.id
         LEFT JOIN shifts sh ON s.assigned_shift_id = sh.id
         WHERE s.id = $1`, [user.staff_id]);
            if (staffRes.rows.length > 0) {
                staffProfile = staffRes.rows[0];
            }
        }
        res.json({
            user: {
                ...user,
                staff: staffProfile,
            },
        });
    }
    catch (err) {
        console.error('Get current user error:', err);
        res.status(500).json({ error: 'Failed to retrieve user profile.' });
    }
}
async function changePassword(req, res) {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            res.status(400).json({ error: 'Both current and new passwords are required.' });
            return;
        }
        const userRes = await (0, database_1.query)(`SELECT password_hash FROM users WHERE id = $1`, [req.user?.id]);
        if (userRes.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(current_password, userRes.rows[0].password_hash);
        if (!isMatch) {
            res.status(400).json({ error: 'Current password is incorrect.' });
            return;
        }
        const newHash = await bcryptjs_1.default.hash(new_password, 10);
        await (0, database_1.query)(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newHash, req.user?.id]);
        res.json({ message: 'Password successfully updated.' });
    }
    catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password.' });
    }
}
