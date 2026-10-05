"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllStaff = getAllStaff;
exports.getStaffById = getStaffById;
exports.createStaff = createStaff;
exports.updateStaff = updateStaff;
exports.toggleStaffStatus = toggleStaffStatus;
exports.deleteStaff = deleteStaff;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
async function getAllStaff(req, res) {
    try {
        const { search, department, campus_id, employment_status, face_status, sort_by = 'full_name', sort_order = 'ASC' } = req.query;
        let sql = `
      SELECT 
        s.id, s.staff_id, s.full_name, s.profile_photo_url, s.gender, s.date_of_birth,
        s.phone, s.email, s.address, s.designation, s.department, s.joining_date,
        s.employment_status, s.assigned_shift_id, s.assigned_campus_id,
        s.face_enrollment_status, s.enrolled_at, s.created_at, s.updated_at,
        c.name as campus_name,
        sh.name as shift_name, sh.start_time as shift_start, sh.end_time as shift_end
      FROM staff s
      LEFT JOIN campuses c ON s.assigned_campus_id = c.id
      LEFT JOIN shifts sh ON s.assigned_shift_id = sh.id
      WHERE 1=1
    `;
        const params = [];
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (LOWER(s.full_name) LIKE LOWER($${params.length}) OR LOWER(s.staff_id) LIKE LOWER($${params.length}) OR LOWER(s.email) LIKE LOWER($${params.length}) OR LOWER(s.designation) LIKE LOWER($${params.length}))`;
        }
        if (department && department !== 'all') {
            params.push(department);
            sql += ` AND s.department = $${params.length}`;
        }
        if (campus_id && campus_id !== 'all') {
            params.push(campus_id);
            sql += ` AND s.assigned_campus_id = $${params.length}`;
        }
        if (employment_status && employment_status !== 'all') {
            params.push(employment_status);
            sql += ` AND s.employment_status = $${params.length}`;
        }
        if (face_status && face_status !== 'all') {
            params.push(face_status);
            sql += ` AND s.face_enrollment_status = $${params.length}`;
        }
        // Safe sorting
        const validSortCols = ['full_name', 'staff_id', 'department', 'designation', 'joining_date', 'face_enrollment_status', 'employment_status'];
        const col = validSortCols.includes(String(sort_by)) ? String(sort_by) : 'full_name';
        const order = String(sort_order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        sql += ` ORDER BY s.${col} ${order}`;
        const staffRes = await (0, database_1.query)(sql, params);
        res.json({ staff: staffRes.rows, total: staffRes.rows.length });
    }
    catch (err) {
        console.error('Get all staff error:', err);
        res.status(500).json({ error: 'Failed to retrieve staff records.' });
    }
}
async function getStaffById(req, res) {
    try {
        const { id } = req.params;
        const sql = `
      SELECT 
        s.*,
        c.name as campus_name, c.code as campus_code, c.geofence_type,
        sh.name as shift_name, sh.start_time as shift_start, sh.end_time as shift_end,
        (SELECT COUNT(*) FROM attendance_records a WHERE a.staff_id = s.id) as total_attendance_count,
        (SELECT COUNT(*) FROM attendance_records a WHERE a.staff_id = s.id AND a.status = 'Present') as present_count,
        (SELECT COUNT(*) FROM attendance_records a WHERE a.staff_id = s.id AND a.status = 'Late') as late_count
      FROM staff s
      LEFT JOIN campuses c ON s.assigned_campus_id = c.id
      LEFT JOIN shifts sh ON s.assigned_shift_id = sh.id
      WHERE s.id = $1 OR s.staff_id = $1
    `;
        const result = await (0, database_1.query)(sql, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Staff member not found.' });
            return;
        }
        res.json({ staff: result.rows[0] });
    }
    catch (err) {
        console.error('Get staff by id error:', err);
        res.status(500).json({ error: 'Failed to retrieve staff profile.' });
    }
}
async function createStaff(req, res) {
    try {
        const { staff_id, full_name, profile_photo_url, gender, date_of_birth, phone, email, address, designation, department, joining_date, employment_status = 'Active', assigned_shift_id, assigned_campus_id, } = req.body;
        if (!staff_id || !full_name || !email || !gender || !phone || !designation || !department) {
            res.status(400).json({ error: 'Missing required fields for staff profile.' });
            return;
        }
        // Check uniqueness
        const checkRes = await (0, database_1.query)(`SELECT id FROM staff WHERE staff_id = $1 OR LOWER(email) = LOWER($2)`, [staff_id, email]);
        if (checkRes.rows.length > 0) {
            res.status(400).json({ error: 'A staff member with this Staff ID or Email already exists.' });
            return;
        }
        const id = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await (0, database_1.query)(`INSERT INTO staff (
        id, staff_id, full_name, profile_photo_url, gender, date_of_birth, phone, email,
        address, designation, department, joining_date, employment_status,
        assigned_shift_id, assigned_campus_id, face_enrollment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Not Enrolled')`, [
            id,
            staff_id,
            full_name,
            profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(full_name)}&background=0c2240&color=fff`,
            gender,
            date_of_birth || new Date().toISOString().split('T')[0],
            phone,
            email,
            address || 'Hyderabad, Telangana',
            designation,
            department,
            joining_date || new Date().toISOString().split('T')[0],
            employment_status,
            assigned_shift_id || 'shift_primary_morning',
            assigned_campus_id || 'campus_main',
        ]);
        // Create user login account for staff with default password
        const defaultPasswordHash = await bcryptjs_1.default.hash('Staff@12345', 10);
        await (0, database_1.query)(`INSERT INTO users (id, email, password_hash, role, staff_id)
       VALUES ($1, $2, $3, 'staff', $4)
       ON CONFLICT (email) DO NOTHING`, [`user_${id}`, email, defaultPasswordHash, id]);
        // Audit log
        await (0, database_1.query)(`INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details)
       VALUES ($1, 'STAFF_UPDATE', $2, $3, 'SUCCESS', $4)`, [`audit_${Date.now()}`, id, req.user?.email, JSON.stringify({ action: 'CREATED', full_name, staff_id })]);
        res.status(201).json({
            message: 'Staff member registered successfully.',
            staff_id: id,
        });
    }
    catch (err) {
        console.error('Create staff error:', err);
        res.status(500).json({ error: 'Failed to create staff record.' });
    }
}
async function updateStaff(req, res) {
    try {
        const { id } = req.params;
        const { full_name, profile_photo_url, gender, date_of_birth, phone, email, address, designation, department, joining_date, employment_status, assigned_shift_id, assigned_campus_id, face_enrollment_status, } = req.body;
        const existing = await (0, database_1.query)(`SELECT id, email FROM staff WHERE id = $1`, [id]);
        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Staff record not found.' });
            return;
        }
        await (0, database_1.query)(`UPDATE staff SET
        full_name = COALESCE($1, full_name),
        profile_photo_url = COALESCE($2, profile_photo_url),
        gender = COALESCE($3, gender),
        date_of_birth = COALESCE($4, date_of_birth),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        address = COALESCE($7, address),
        designation = COALESCE($8, designation),
        department = COALESCE($9, department),
        joining_date = COALESCE($10, joining_date),
        employment_status = COALESCE($11, employment_status),
        assigned_shift_id = COALESCE($12, assigned_shift_id),
        assigned_campus_id = COALESCE($13, assigned_campus_id),
        face_enrollment_status = COALESCE($14, face_enrollment_status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $15`, [
            full_name, profile_photo_url, gender, date_of_birth, phone, email,
            address, designation, department, joining_date, employment_status,
            assigned_shift_id, assigned_campus_id, face_enrollment_status, id
        ]);
        // If email changed, update users table
        if (email && email !== existing.rows[0].email) {
            await (0, database_1.query)(`UPDATE users SET email = $1 WHERE staff_id = $2`, [email, id]);
        }
        res.json({ message: 'Staff profile updated successfully.' });
    }
    catch (err) {
        console.error('Update staff error:', err);
        res.status(500).json({ error: 'Failed to update staff record.' });
    }
}
async function toggleStaffStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Active' or 'Inactive'
        if (!['Active', 'Inactive', 'On Probation', 'Suspended'].includes(status)) {
            res.status(400).json({ error: 'Invalid employment status provided.' });
            return;
        }
        await (0, database_1.query)(`UPDATE staff SET employment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, id]);
        res.json({ message: `Staff status successfully updated to ${status}.` });
    }
    catch (err) {
        console.error('Toggle staff status error:', err);
        res.status(500).json({ error: 'Failed to update employment status.' });
    }
}
async function deleteStaff(req, res) {
    try {
        const { id } = req.params;
        // Check if staff exists (supports database PK or institutional staff_id)
        const existing = await (0, database_1.query)(`SELECT id, full_name, staff_id FROM staff WHERE id = $1 OR staff_id = $1`, [id]);
        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Staff member not found.' });
            return;
        }
        const targetStaff = existing.rows[0];
        const targetId = targetStaff.id;
        // Delete associated records across all related tables
        await (0, database_1.query)(`DELETE FROM verification_sessions WHERE staff_id = $1`, [targetId]);
        await (0, database_1.query)(`DELETE FROM staff_biometrics WHERE staff_id = $1`, [targetId]);
        await (0, database_1.query)(`DELETE FROM attendance_records WHERE staff_id = $1`, [targetId]);
        await (0, database_1.query)(`DELETE FROM leave_requests WHERE staff_id = $1`, [targetId]);
        await (0, database_1.query)(`DELETE FROM users WHERE staff_id = $1`, [targetId]);
        await (0, database_1.query)(`DELETE FROM staff WHERE id = $1`, [targetId]);
        // Audit log
        await (0, database_1.query)(`INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details)
       VALUES ($1, 'STAFF_UPDATE', $2, $3, 'SUCCESS', $4)`, [
            `audit_${Date.now()}`,
            targetId,
            req.user?.email || 'admin',
            JSON.stringify({ action: 'DELETED', full_name: targetStaff.full_name, staff_id: targetStaff.staff_id }),
        ]);
        res.json({ message: `Staff member ${targetStaff.full_name} (${targetStaff.staff_id}) and all associated records removed successfully.` });
    }
    catch (err) {
        console.error('Delete staff error:', err);
        res.status(500).json({ error: 'Failed to delete staff record.' });
    }
}
