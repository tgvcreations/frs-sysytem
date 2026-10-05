"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
exports.checkStaffOwnershipOrAdmin = checkStaffOwnershipOrAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'vuppala_prathamika_patashala_kalashala_super_secret_jwt_key_2026';
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        res.status(401).json({ error: 'Authentication required. Please log in.' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            staff_id: decoded.staff_id,
        };
        next();
    }
    catch (err) {
        res.status(403).json({ error: 'Invalid or expired session token. Please log in again.' });
    }
}
/**
 * Role-Based Access Control (RBAC) Guard.
 * Accepts one or more roles permitted to access the endpoint.
 * Super Admin always has full access.
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }
        // Super Admin has universal access
        if (req.user.role === 'super_admin') {
            return next();
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: `Access denied. Role '${req.user.role}' does not possess required privileges for this action.`,
            });
            return;
        }
        next();
    };
}
/**
 * Checks if the requesting user is either an authorized staff manager/admin
 * or the specific staff member whose resource is being accessed.
 */
function checkStaffOwnershipOrAdmin(req, targetStaffId) {
    if (!req.user)
        return false;
    if (['super_admin', 'admin', 'principal', 'attendance_manager'].includes(req.user.role)) {
        return true;
    }
    return req.user.role === 'staff' && req.user.staff_id === targetStaffId;
}
