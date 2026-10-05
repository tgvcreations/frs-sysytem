"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaves = getLeaves;
exports.applyLeave = applyLeave;
exports.updateLeaveStatus = updateLeaveStatus;
const database_1 = require("../config/database");
async function getLeaves(req, res) {
    try {
        const { status, staff_id } = req.query;
        let sql = `
      SELECT 
        l.*,
        s.staff_id as staff_code, s.full_name, s.department, s.designation, s.profile_photo_url
      FROM leave_requests l
      JOIN staff s ON l.staff_id = s.id
      WHERE 1=1
    `;
        const params = [];
        // If role is staff, only see own leaves
        if (req.user?.role === 'staff') {
            params.push(req.user.staff_id);
            sql += ` AND l.staff_id = $${params.length}`;
        }
        else if (staff_id) {
            params.push(staff_id);
            sql += ` AND l.staff_id = $${params.length}`;
        }
        if (status && status !== 'all') {
            params.push(status);
            sql += ` AND l.status = $${params.length}`;
        }
        sql += ` ORDER BY l.created_at DESC`;
        const result = await (0, database_1.query)(sql, params);
        res.json({ leaves: result.rows });
    }
    catch (err) {
        console.error('Get leaves error:', err);
        res.status(500).json({ error: 'Failed to retrieve leave requests.' });
    }
}
async function applyLeave(req, res) {
    try {
        let { staff_id, leave_type, start_date, end_date, reason } = req.body;
        if (req.user?.role === 'staff') {
            staff_id = req.user.staff_id;
        }
        if (!staff_id || !leave_type || !start_date || !end_date || !reason) {
            res.status(400).json({ error: 'All fields (staff_id, leave_type, start_date, end_date, reason) are required.' });
            return;
        }
        const id = `leave_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await (0, database_1.query)(`INSERT INTO leave_requests (id, staff_id, leave_type, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending')`, [id, staff_id, leave_type, start_date, end_date, reason]);
        res.status(201).json({ message: 'Leave application submitted successfully.', leave_id: id });
    }
    catch (err) {
        console.error('Apply leave error:', err);
        res.status(500).json({ error: 'Failed to submit leave application.' });
    }
}
async function updateLeaveStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, reviewer_remarks } = req.body; // 'Approved' or 'Rejected'
        if (!['Approved', 'Rejected'].includes(status)) {
            res.status(400).json({ error: 'Status must be Approved or Rejected.' });
            return;
        }
        const leaveRes = await (0, database_1.query)(`SELECT * FROM leave_requests WHERE id = $1`, [id]);
        if (leaveRes.rows.length === 0) {
            res.status(404).json({ error: 'Leave request not found.' });
            return;
        }
        const leave = leaveRes.rows[0];
        await (0, database_1.query)(`UPDATE leave_requests SET
        status = $1,
        approved_by = $2,
        reviewer_remarks = $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`, [status, req.user?.email, reviewer_remarks || null, id]);
        // If approved, create/update attendance records for those dates to 'On Leave'
        if (status === 'Approved') {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 0)
                    continue; // Skip Sunday
                const dateStr = d.toISOString().split('T')[0];
                await (0, database_1.query)(`INSERT INTO attendance_records (id, staff_id, date, status, verification_method, notes)
           VALUES ($1, $2, $3, 'On Leave', 'Admin_Adjustment', $4)
           ON CONFLICT (staff_id, date) DO UPDATE SET status = 'On Leave', notes = $4`, [`att_${dateStr}_${leave.staff_id}`, leave.staff_id, dateStr, `Approved ${leave.leave_type}: ${reviewer_remarks || ''}`]);
            }
        }
        res.json({ message: `Leave request has been ${status.toLowerCase()}.` });
    }
    catch (err) {
        console.error('Update leave status error:', err);
        res.status(500).json({ error: 'Failed to update leave status.' });
    }
}
