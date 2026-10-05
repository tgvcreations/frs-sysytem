"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCampuses = getAllCampuses;
exports.getCampusById = getCampusById;
exports.createCampus = createCampus;
exports.updateCampus = updateCampus;
exports.deleteCampus = deleteCampus;
exports.testCoordinate = testCoordinate;
const database_1 = require("../config/database");
const geofenceService_1 = require("../services/geofenceService");
async function getAllCampuses(req, res) {
    try {
        const result = await (0, database_1.query)(`SELECT c.*,
        (SELECT COUNT(*) FROM staff s WHERE s.assigned_campus_id = c.id) as staff_count
       FROM campuses c
       ORDER BY c.created_at ASC`);
        // Parse JSON polygon_coordinates
        const campuses = result.rows.map((row) => ({
            ...row,
            polygon_coordinates: typeof row.polygon_coordinates === 'string'
                ? JSON.parse(row.polygon_coordinates)
                : row.polygon_coordinates,
        }));
        res.json({ campuses });
    }
    catch (err) {
        console.error('Get campuses error:', err);
        res.status(500).json({ error: 'Failed to retrieve campuses.' });
    }
}
async function getCampusById(req, res) {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)(`SELECT * FROM campuses WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Campus not found.' });
            return;
        }
        const row = result.rows[0];
        res.json({
            campus: {
                ...row,
                polygon_coordinates: typeof row.polygon_coordinates === 'string'
                    ? JSON.parse(row.polygon_coordinates)
                    : row.polygon_coordinates,
            },
        });
    }
    catch (err) {
        console.error('Get campus by id error:', err);
        res.status(500).json({ error: 'Failed to retrieve campus.' });
    }
}
async function createCampus(req, res) {
    try {
        const { name, code, address, center_latitude, center_longitude, radius_meters = 350, geofence_type = 'both', polygon_coordinates = [], allowed_accuracy_meters = 50, tolerance_meters = 15, is_active = true, } = req.body;
        if (!name || !code || !center_latitude || !center_longitude) {
            res.status(400).json({ error: 'Campus name, unique code, latitude, and longitude are required.' });
            return;
        }
        const existing = await (0, database_1.query)(`SELECT id FROM campuses WHERE LOWER(code) = LOWER($1)`, [code]);
        if (existing.rows.length > 0) {
            res.status(400).json({ error: 'A campus with this code already exists.' });
            return;
        }
        const id = `campus_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const polyJson = JSON.stringify(polygon_coordinates);
        await (0, database_1.query)(`INSERT INTO campuses (
        id, name, code, address, center_latitude, center_longitude,
        radius_meters, geofence_type, polygon_coordinates,
        allowed_accuracy_meters, tolerance_meters, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
            id, name, code, address || 'Telangana, India', center_latitude, center_longitude,
            radius_meters, geofence_type, polyJson,
            allowed_accuracy_meters, tolerance_meters, is_active
        ]);
        // Audit log
        await (0, database_1.query)(`INSERT INTO audit_logs (id, event_type, user_email, status, details)
       VALUES ($1, 'GEOFENCE_UPDATE', $2, 'SUCCESS', $3)`, [`audit_${Date.now()}`, req.user?.email, JSON.stringify({ action: 'CREATED_CAMPUS', name, code })]);
        res.status(201).json({ message: 'Campus geofence created successfully.', campus_id: id });
    }
    catch (err) {
        console.error('Create campus error:', err);
        res.status(500).json({ error: 'Failed to create campus geofence.' });
    }
}
async function updateCampus(req, res) {
    try {
        const { id } = req.params;
        const { name, code, address, center_latitude, center_longitude, radius_meters, geofence_type, polygon_coordinates, allowed_accuracy_meters, tolerance_meters, is_active, } = req.body;
        const existing = await (0, database_1.query)(`SELECT id FROM campuses WHERE id = $1`, [id]);
        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Campus not found.' });
            return;
        }
        const polyJson = polygon_coordinates ? JSON.stringify(polygon_coordinates) : null;
        await (0, database_1.query)(`UPDATE campuses SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        address = COALESCE($3, address),
        center_latitude = COALESCE($4, center_latitude),
        center_longitude = COALESCE($5, center_longitude),
        radius_meters = COALESCE($6, radius_meters),
        geofence_type = COALESCE($7, geofence_type),
        polygon_coordinates = COALESCE($8, polygon_coordinates),
        allowed_accuracy_meters = COALESCE($9, allowed_accuracy_meters),
        tolerance_meters = COALESCE($10, tolerance_meters),
        is_active = COALESCE($11, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12`, [
            name, code, address, center_latitude, center_longitude,
            radius_meters, geofence_type, polyJson,
            allowed_accuracy_meters, tolerance_meters, is_active, id
        ]);
        // Audit log
        await (0, database_1.query)(`INSERT INTO audit_logs (id, event_type, user_email, status, details)
       VALUES ($1, 'GEOFENCE_UPDATE', $2, 'SUCCESS', $3)`, [`audit_${Date.now()}`, req.user?.email, JSON.stringify({ action: 'UPDATED_CAMPUS', id, name })]);
        res.json({ message: 'Campus geofence updated successfully.' });
    }
    catch (err) {
        console.error('Update campus error:', err);
        res.status(500).json({ error: 'Failed to update campus geofence.' });
    }
}
async function deleteCampus(req, res) {
    try {
        const { id } = req.params;
        // Check if staff are assigned
        const staffCheck = await (0, database_1.query)(`SELECT COUNT(*) as count FROM staff WHERE assigned_campus_id = $1`, [id]);
        if (parseInt(staffCheck.rows[0].count) > 0) {
            res.status(400).json({
                error: `Cannot delete campus because ${staffCheck.rows[0].count} staff member(s) are currently assigned to it. Please reassign staff first.`,
            });
            return;
        }
        await (0, database_1.query)(`DELETE FROM campuses WHERE id = $1`, [id]);
        res.json({ message: 'Campus geofence deleted successfully.' });
    }
    catch (err) {
        console.error('Delete campus error:', err);
        res.status(500).json({ error: 'Failed to delete campus.' });
    }
}
/**
 * Endpoint to test an arbitrary GPS coordinate against a campus geofence.
 * Provides immediate feedback on whether the coordinate is inside or outside.
 */
async function testCoordinate(req, res) {
    try {
        const { campus_id, latitude, longitude, accuracy = 10 } = req.body;
        if (!campus_id || latitude === undefined || longitude === undefined) {
            res.status(400).json({ error: 'campus_id, latitude, and longitude are required.' });
            return;
        }
        const campusRes = await (0, database_1.query)(`SELECT * FROM campuses WHERE id = $1`, [campus_id]);
        if (campusRes.rows.length === 0) {
            res.status(404).json({ error: 'Campus not found.' });
            return;
        }
        const campus = {
            ...campusRes.rows[0],
            polygon_coordinates: typeof campusRes.rows[0].polygon_coordinates === 'string'
                ? JSON.parse(campusRes.rows[0].polygon_coordinates)
                : campusRes.rows[0].polygon_coordinates,
        };
        const distance = (0, geofenceService_1.calculateHaversineDistance)(latitude, longitude, campus.center_latitude, campus.center_longitude);
        const inPoly = (0, geofenceService_1.isPointInPolygon)([latitude, longitude], campus.polygon_coordinates);
        const inCircle = distance <= campus.radius_meters + campus.tolerance_meters;
        let isInside = false;
        if (campus.geofence_type === 'circle')
            isInside = inCircle;
        else if (campus.geofence_type === 'polygon')
            isInside = inPoly;
        else
            isInside = inPoly || inCircle;
        res.json({
            campus_name: campus.name,
            test_coordinates: { latitude, longitude },
            distance_meters: Math.round(distance),
            inside_radius: inCircle,
            inside_polygon: inPoly,
            is_inside_geofence: isInside,
            accuracy_sufficient: accuracy <= campus.allowed_accuracy_meters,
            result_message: isInside
                ? '✅ Coordinates are INSIDE the authorized campus geofence boundary.'
                : '❌ Coordinates are OUTSIDE the authorized campus geofence boundary.',
        });
    }
    catch (err) {
        console.error('Test coordinate error:', err);
        res.status(500).json({ error: 'Failed to test coordinate.' });
    }
}
