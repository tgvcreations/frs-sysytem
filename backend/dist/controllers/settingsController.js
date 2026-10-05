"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
const database_1 = require("../config/database");
async function getSettings(req, res) {
    try {
        const resSettings = await (0, database_1.query)(`SELECT * FROM institute_settings`);
        const settingsMap = {};
        for (const row of resSettings.rows) {
            settingsMap[row.key] = row.value;
        }
        // Return with defaults if not present
        res.json({
            settings: {
                institute_name: settingsMap['institute_name'] || 'Staff FRS & Attendance System',
                institute_code: settingsMap['institute_code'] || 'FRS-INST-01',
                contact_email: settingsMap['contact_email'] || 'contact@vuppala.edu',
                contact_phone: settingsMap['contact_phone'] || '+91 40 2765 4321',
                face_match_threshold: settingsMap['face_match_threshold'] || 0.48,
                liveness_strictness: settingsMap['liveness_strictness'] || 'standard',
                default_accuracy_threshold: settingsMap['default_accuracy_threshold'] || 50,
                default_tolerance_meters: settingsMap['default_tolerance_meters'] || 15,
                allow_early_checkout: settingsMap['allow_early_checkout'] !== false,
                present_min_hours: settingsMap['present_min_hours'] !== undefined ? Number(settingsMap['present_min_hours']) : 7.0,
                half_day_min_hours: settingsMap['half_day_min_hours'] !== undefined ? Number(settingsMap['half_day_min_hours']) : 4.0,
                absent_below_hours: settingsMap['absent_below_hours'] !== undefined ? Number(settingsMap['absent_below_hours']) : 2.0,
                grace_period_minutes: settingsMap['grace_period_minutes'] !== undefined ? Number(settingsMap['grace_period_minutes']) : 15,
            },
        });
    }
    catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ error: 'Failed to retrieve settings.' });
    }
}
async function updateSettings(req, res) {
    try {
        const updates = req.body;
        for (const [key, val] of Object.entries(updates)) {
            await (0, database_1.query)(`INSERT INTO institute_settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`, [key, JSON.stringify(val)]);
        }
        res.json({ message: 'Settings saved successfully.' });
    }
    catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: 'Failed to save settings.' });
    }
}
