import { Response } from 'express';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export async function getShifts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM staff st WHERE st.assigned_shift_id = s.id) as staff_count
      FROM shifts s
      ORDER BY s.start_time ASC
    `);

    res.json({ shifts: result.rows });
  } catch (err: any) {
    console.error('Get shifts error:', err);
    res.status(500).json({ error: 'Failed to retrieve shifts.' });
  }
}

export async function createShift(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      code,
      start_time,
      end_time,
      grace_period_minutes = 15,
      half_day_threshold_hours = 4.0,
      full_day_threshold_hours = 6.5,
      is_active = true,
    } = req.body;

    if (!name || !code || !start_time || !end_time) {
      res.status(400).json({ error: 'Shift name, code, start time, and end time are required.' });
      return;
    }

    const id = `shift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    await query(
      `INSERT INTO shifts (id, name, code, start_time, end_time, grace_period_minutes, half_day_threshold_hours, full_day_threshold_hours, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, name, code, start_time, end_time, grace_period_minutes, half_day_threshold_hours, full_day_threshold_hours, is_active]
    );

    res.status(201).json({ message: 'Shift created successfully.', shift_id: id });
  } catch (err: any) {
    console.error('Create shift error:', err);
    res.status(500).json({ error: 'Failed to create shift.' });
  }
}

export async function updateShift(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      start_time,
      end_time,
      grace_period_minutes,
      half_day_threshold_hours,
      full_day_threshold_hours,
      is_active,
    } = req.body;

    await query(
      `UPDATE shifts SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        grace_period_minutes = COALESCE($5, grace_period_minutes),
        half_day_threshold_hours = COALESCE($6, half_day_threshold_hours),
        full_day_threshold_hours = COALESCE($7, full_day_threshold_hours),
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [name, code, start_time, end_time, grace_period_minutes, half_day_threshold_hours, full_day_threshold_hours, is_active, id]
    );

    res.json({ message: 'Shift updated successfully.' });
  } catch (err: any) {
    console.error('Update shift error:', err);
    res.status(500).json({ error: 'Failed to update shift.' });
  }
}

export async function deleteShift(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const check = await query(`SELECT COUNT(*) as count FROM staff WHERE assigned_shift_id = $1`, [id]);
    if (parseInt(check.rows[0].count) > 0) {
      res.status(400).json({ error: 'Cannot delete shift assigned to existing staff members. Please reassign them first.' });
      return;
    }

    await query(`DELETE FROM shifts WHERE id = $1`, [id]);
    res.json({ message: 'Shift deleted successfully.' });
  } catch (err: any) {
    console.error('Delete shift error:', err);
    res.status(500).json({ error: 'Failed to delete shift.' });
  }
}

