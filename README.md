# VUPPALA CHARITABLE PRATHAMIKA PATASHALA KALASHALA – STAFF FRS & ATTENDANCE SYSTEM

A complete, production-ready full-stack web application for Facial Recognition System (FRS) and Geofenced Attendance Management, built specifically for **VUPPALA CHARITABLE PRATHAMIKA PATASHALA KALASHALA**.

---

## 🏛️ System Overview

The platform eliminates attendance fraud through strict multi-factor verification:
1. **Live Face Recognition with Anti-Spoof Liveness Verification**: Dynamic real-time challenge (blink, head yaw tracking) prevents photo uploads and screen spoofing.
2. **Cryptographic GPS Location Verification**: Independent backend verification ensures device coordinates are within authorized campus boundaries.
3. **Dual Geofence Support**: Circular geofences (center + radius) and custom multi-vertex Polygon geofences evaluated using the Haversine formula and the Ray-Casting Point-in-Polygon (PIP) algorithm.
4. **Shift & Late / Early Calculation Engine**: Automatic computation of Present, Late (grace window), Half Day, Full Day, and Early Departure.
5. **Role-Based Access Control (RBAC)**: Enforced across all API endpoints for Super Admin, Administrator, Principal / Head, Attendance Manager, and Staff.

---

## 🚀 Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, Canvas Confetti
- **Maps Engine**: Leaflet & React-Leaflet with OpenStreetMap tiles (Circle & Polygon drawing/editing with no proprietary billing token required)
- **Backend**: Node.js, Express, TypeScript, REST API architecture
- **Database**: PostgreSQL with dual-mode support (standard `pg` pool with automated local `@electric-sql/pglite` embedded fallback for instant setup)
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Biometric Security**: 128-dimensional facial descriptor vector matching (Euclidean distance threshold $\le 0.48$)

---

## 👥 User Roles & Pre-Seeded Credentials

All roles are pre-seeded with test accounts for instant evaluation:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@vuppala.edu` | `Admin@12345` | Universal full access to all system features, raw audit logs, and settings. |
| **Administrator** | `admin@vuppala.edu` | `Admin@12345` | Staff CRUD, Face Enrollment, Geofencing, Shifts, Leaves, Reports. |
| **Principal / Head** | `principal@vuppala.edu` | `Admin@12345` | Institutional analytics, muster roll, leave approvals, dispute reviews. |
| **Attendance Manager** | `manager@vuppala.edu` | `Admin@12345` | Real-time attendance monitoring, manual corrections, daily roll tracking. |
| **Staff (Headmaster)** | `suresh.k@vuppala.edu` | `Staff@12345` | Personal attendance verification (FRS+GPS), personal attendance log, leave applications. |
| **Staff (Lecturer)** | `lakshmi.p@vuppala.edu` | `Staff@12345` | Personal profile, attendance verification, leave applications. |

> **Note**: The application includes a **1-Click Quick Role Switcher** in the top navigation bar, allowing instant switching between any role during testing.

---

## 🏃 Running the Application

### 1. Prerequisites
- Node.js 18+ and npm installed.

### 2. Start Backend Server
```bash
cd backend
npm install
npm run dev
# Or run production build:
# npm run build && npm start
```
*Backend runs on `http://localhost:5000` (Health check: `http://localhost:5000/api/health`)*

### 3. Start Frontend App
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 🛡️ Key Features & Workflows

### 1. Face Recognition System (FRS) & Anti-Spoofing
- Accesses webcam/front camera.
- Alignment frame with golden oval and scanning line animation.
- Dynamic 4-step Anti-Spoof Liveness verification (Center $\to$ Blink eyes naturally $\to$ Turn head $\to$ Biometric cryptogram generation).
- Server-side Euclidean distance matching against enrolled 128D template.
- Exact error message on mismatch: `"Face verification failed. Please try again."`

### 2. GPS Location Verification & Geofencing
- Browser GPS coordinates (`latitude`, `longitude`, `accuracy`, `timestamp`) transmitted securely to backend.
- Backend independently verifies accuracy threshold. If poor ($> 50$m), rejects with exact message:
  > *"Location accuracy is insufficient. Please move to an area with better GPS reception."*
- Backend evaluates coordinates against campus boundary. If outside, rejects with exact message:
  > *"Attendance cannot be recorded because you are outside the authorized campus area."*
- Includes a **GPS Simulation Panel** directly in the attendance terminal to easily test `Inside Campus`, `Outside Campus`, and `Poor Accuracy` right from your desk!

### 3. Campus & Geofence Management Page
- Interactive Leaflet map centered at Vuppala Educational Complex.
- Click to set center coordinate or type exact latitude/longitude.
- Real-time radius slider ($50$m to $1500$m) with visual circular overlay.
- Interactive multi-vertex polygon perimeter drawing and editing.
- Built-in **Backend Geofence Test Sandbox** to simulate any coordinate.

### 4. Admin Dashboard & Analytics
- Live KPI cards: Total Staff, Present Today, Absent Today, Late Today, On Leave, Checked In, Checked Out, Attendance %, Cumulative Working Hours, FRS Attempts, Geofence Violations.
- Interactive charts: Daily attendance trend (past 7 days), Department-wise breakdown, Weekly & Monthly comparisons.
- Live Attendance Ticker: Real-time stream of employee check-ins and check-outs.
- Quick Actions: Add Staff, Register Face, View Attendance, Manage Geofence, Manage Leave, Generate Report.

### 5. Staff Management (Full CRUD)
- Complete CRUD: Add, Edit, View Profile, Activate/Deactivate, Delete staff.
- Search, Filter by Department, Filter by Campus, Filter by Employment Status, Filter by FRS Status, and Sort.
- All fields editable from dashboard: Staff ID, Full Name, Photo, Gender, DOB, Phone, Email, Address, Designation, Department, Joining Date, Shift, Campus, Status.

### 6. Face Enrollment Studio (Admin Only)
- Admin selects staff member from searchable list.
- Mandatory Biometric Privacy Consent disclosure agreement.
- Multi-sample capture studio (3 distinct angles).
- Encrypts and stores biometric template in dedicated `staff_biometrics` table.
- Re-enroll, update, or disable enrollment.

### 7. Shift Management & Attendance Engine
- Shifts: Primary Morning Shift (08:30–15:30), Kalashala Regular Shift (09:00–16:30), Administrative Shift.
- Configurable grace period (mins), half-day threshold (hrs), full-day threshold (hrs).
- Duplicate prevention: Only 1 check-in and 1 check-out allowed per shift cycle.

### 8. Leave Management & Approvals
- Staff can submit leave requests (Casual, Sick, Earned, Maternity).
- Principals and Administrators review with approval/rejection remarks.
- Approved leaves automatically update daily attendance status to `On Leave`.

### 9. Reports & Muster Roll Export
- Date range picker (Today, Yesterday, Last 7 Days, Custom range), department, campus filters.
- **Download CSV**: Direct CSV export formatted for administration and payroll.
- **Printable Muster Roll**: Official printable report sheet with institutional header and signature blocks for Attendance In-Charge, Administrative Officer, and Principal.

### 10. Security Audit Logs
- Complete telemetry logs for Face Verification attempts, Euclidean distance scores, Geofence violations, and Biometric enrollments with timestamps and IP records.

---

## 🧪 Automated End-to-End Verification

Run the built-in automated test suite:
```bash
node backend/test-e2e.js
```
Validates:
- Health check
- JWT authentication
- Dashboard analytics calculation
- Geofence coordinate math (inside vs outside)
- Exact error messages for Geofence rejection, Accuracy rejection, and Face mismatch
- Attendance check-in / check-out state transitions
- CSV muster roll generation

