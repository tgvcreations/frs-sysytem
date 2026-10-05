import { Response } from 'express';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export async function getMusterRoll(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { start_date, end_date, department, campus_id } = req.query;

    let sql = `
      SELECT 
        a.id, a.date, a.check_in_time, a.check_out_time, a.status, a.working_hours,
        a.verification_method, a.face_match_confidence, a.notes,
        s.staff_id as staff_code, s.full_name, s.department, s.designation,
        c.name as campus_name
      FROM attendance_records a
      JOIN staff s ON a.staff_id = s.id
      LEFT JOIN campuses c ON a.check_in_campus_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (start_date) {
      params.push(start_date);
      sql += ` AND a.date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      sql += ` AND a.date <= $${params.length}`;
    }

    if (department && department !== 'all') {
      params.push(department);
      sql += ` AND s.department = $${params.length}`;
    }

    if (campus_id && campus_id !== 'all') {
      params.push(campus_id);
      sql += ` AND s.assigned_campus_id = $${params.length}`;
    }

    sql += ` ORDER BY a.date DESC, s.full_name ASC`;

    const result = await query(sql, params);
    res.json({ records: result.rows, total: result.rows.length });
  } catch (err: any) {
    console.error('Get muster roll error:', err);
    res.status(500).json({ error: 'Failed to generate muster roll.' });
  }
}

export async function exportCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { start_date, end_date, department, campus_id } = req.query;

    let sql = `
      SELECT 
        a.date,
        s.staff_id as "Staff ID",
        s.full_name as "Full Name",
        s.department as "Department",
        s.designation as "Designation",
        c.name as "Campus",
        COALESCE(a.check_in_time, '-') as "Check In",
        COALESCE(a.check_out_time, '-') as "Check Out",
        COALESCE(a.working_hours, 0) as "Hours",
        a.status as "Status",
        a.verification_method as "Method",
        COALESCE(a.face_match_confidence::text, '-') as "FRS Confidence %"
      FROM attendance_records a
      JOIN staff s ON a.staff_id = s.id
      LEFT JOIN campuses c ON a.check_in_campus_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (start_date) {
      params.push(start_date);
      sql += ` AND a.date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      sql += ` AND a.date <= $${params.length}`;
    }

    if (department && department !== 'all') {
      params.push(department);
      sql += ` AND s.department = $${params.length}`;
    }

    if (campus_id && campus_id !== 'all') {
      params.push(campus_id);
      sql += ` AND s.assigned_campus_id = $${params.length}`;
    }

    sql += ` ORDER BY a.date DESC, s.full_name ASC`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      res.status(404).send('No attendance records found for specified range.');
      return;
    }

    // Build CSV string
    const headers = Object.keys(result.rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const values = headers.map(header => {
        const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="VUPPALA_ATTENDANCE_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Failed to export attendance CSV.' });
  }
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { event_type, status, limit = 100 } = req.query;

    let sql = `
      SELECT 
        l.*,
        s.staff_id as staff_code, s.full_name as staff_name
      FROM audit_logs l
      LEFT JOIN staff s ON l.staff_id = s.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (event_type && event_type !== 'all') {
      params.push(event_type);
      sql += ` AND l.event_type = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND l.status = $${params.length}`;
    }

    sql += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    res.json({ logs: result.rows });
  } catch (err: any) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
}

