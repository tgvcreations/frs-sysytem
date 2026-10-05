"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.query = query;
const pg_1 = require("pg");
const pglite_1 = require("@electric-sql/pglite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let pool = null;
let pgliteInstance = null;
let isUsingPGlite = false;
// Ensure local data directory exists for PGlite fallback
const dataDir = path_1.default.resolve(__dirname, '../../data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
async function initDatabase() {
    const dbUrl = process.env.DATABASE_URL;
    // First, attempt to connect to external PostgreSQL if configured
    if (dbUrl) {
        try {
            const testPool = new pg_1.Pool({
                connectionString: dbUrl,
                connectionTimeoutMillis: 2000,
            });
            const client = await testPool.connect();
            await client.query('SELECT 1');
            client.release();
            pool = testPool;
            isUsingPGlite = false;
            console.log(' Successfully connected to external PostgreSQL database at', dbUrl.split('@')[1] || 'localhost');
        }
        catch (err) {
            console.warn('⚠️ Could not connect to external PostgreSQL server:', err.message);
            console.log(' Switching to embedded high-performance PostgreSQL (PGlite) engine...');
            pool = null;
        }
    }
    // If external pool failed or no URL provided, initialize embedded PGlite
    if (!pool) {
        const pgDataPath = path_1.default.join(dataDir, 'pg_vuppala');
        pgliteInstance = new pglite_1.PGlite(pgDataPath);
        isUsingPGlite = true;
        console.log(' Initialized embedded PostgreSQL (PGlite) at:', pgDataPath);
    }
    // Create tables & indices
    await createSchema();
}
async function query(sql, params = []) {
    if (pool) {
        const result = await pool.query(sql, params);
        return { rows: result.rows, rowCount: result.rowCount || 0 };
    }
    else if (pgliteInstance) {
        const result = await pgliteInstance.query(sql, params);
        const affected = result.affectedRows !== undefined ? result.affectedRows : result.rows.length;
        return { rows: result.rows, rowCount: affected };
    }
    else {
        throw new Error('Database is not initialized. Call initDatabase() first.');
    }
}
async function createSchema() {
    console.log('⚙️ Checking and applying database schema migrations...');
    const schemaSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      staff_id VARCHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campuses (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      address TEXT NOT NULL,
      center_latitude DOUBLE PRECISION NOT NULL,
      center_longitude DOUBLE PRECISION NOT NULL,
      radius_meters DOUBLE PRECISION NOT NULL DEFAULT 350.0,
      geofence_type VARCHAR(20) NOT NULL DEFAULT 'both',
      polygon_coordinates JSONB NOT NULL,
      allowed_accuracy_meters DOUBLE PRECISION NOT NULL DEFAULT 50.0,
      tolerance_meters DOUBLE PRECISION NOT NULL DEFAULT 15.0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      grace_period_minutes INTEGER NOT NULL DEFAULT 15,
      half_day_threshold_hours DOUBLE PRECISION NOT NULL DEFAULT 4.0,
      full_day_threshold_hours DOUBLE PRECISION NOT NULL DEFAULT 6.5,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff (
      id VARCHAR(64) PRIMARY KEY,
      staff_id VARCHAR(64) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      profile_photo_url TEXT,
      gender VARCHAR(20) NOT NULL,
      date_of_birth VARCHAR(20) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      address TEXT NOT NULL,
      designation VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      joining_date VARCHAR(20) NOT NULL,
      employment_status VARCHAR(50) NOT NULL DEFAULT 'Active',
      assigned_shift_id VARCHAR(64) REFERENCES shifts(id),
      assigned_campus_id VARCHAR(64) REFERENCES campuses(id),
      face_enrollment_status VARCHAR(50) NOT NULL DEFAULT 'Not Enrolled',
      enrolled_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff_biometrics (
      id VARCHAR(64) PRIMARY KEY,
      staff_id VARCHAR(64) UNIQUE NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      face_descriptor JSONB NOT NULL,
      sample_count INTEGER NOT NULL DEFAULT 1,
      consent_given BOOLEAN NOT NULL DEFAULT true,
      consent_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      enrolled_by VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id VARCHAR(64) PRIMARY KEY,
      staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      date VARCHAR(20) NOT NULL,
      check_in_time VARCHAR(20),
      check_out_time VARCHAR(20),
      check_in_latitude DOUBLE PRECISION,
      check_in_longitude DOUBLE PRECISION,
      check_in_accuracy DOUBLE PRECISION,
      check_in_campus_id VARCHAR(64) REFERENCES campuses(id),
      check_out_latitude DOUBLE PRECISION,
      check_out_longitude DOUBLE PRECISION,
      check_out_accuracy DOUBLE PRECISION,
      check_out_campus_id VARCHAR(64) REFERENCES campuses(id),
      status VARCHAR(50) NOT NULL DEFAULT 'Present',
      verification_method VARCHAR(50) NOT NULL DEFAULT 'FRS_GPS',
      face_match_confidence DOUBLE PRECISION,
      working_hours DOUBLE PRECISION DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_staff_date UNIQUE (staff_id, date)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id VARCHAR(64) PRIMARY KEY,
      staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      leave_type VARCHAR(50) NOT NULL,
      start_date VARCHAR(20) NOT NULL,
      end_date VARCHAR(20) NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      approved_by VARCHAR(255),
      reviewer_remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      event_type VARCHAR(64) NOT NULL,
      staff_id VARCHAR(64),
      user_email VARCHAR(255),
      status VARCHAR(30) NOT NULL,
      details JSONB,
      ip_address VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS institute_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS verification_sessions;

    CREATE TABLE IF NOT EXISTS verification_sessions (
      id VARCHAR(64) PRIMARY KEY,
      session_token VARCHAR(128) UNIQUE NOT NULL,
      user_id VARCHAR(64),
      staff_id VARCHAR(64) REFERENCES staff(id) ON DELETE CASCADE,
      challenge_type VARCHAR(64) NOT NULL,
      challenge_params JSONB,
      liveness_verified BOOLEAN NOT NULL DEFAULT false,
      identity_verified BOOLEAN NOT NULL DEFAULT false,
      location_verified BOOLEAN NOT NULL DEFAULT false,
      telemetry JSONB,
      expires_at BIGINT NOT NULL,
      used BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
    // Execute schema commands
    const statements = schemaSQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
        await query(stmt + ';');
    }
    console.log('✅ PostgreSQL Schema initialization complete.');
}
