import { handleLocalApi } from './localBackend';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('vuppala_auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('vuppala_auth_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('vuppala_auth_token');
}

let backendAvailable: boolean | null = null;
let backendCheckPromise: Promise<boolean> | null = null;

export async function isBackendServerOnline(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  if (backendCheckPromise) return backendCheckPromise;

  backendCheckPromise = (async () => {
    try {
      const isLiveServer =
        window.location.port === '5500' ||
        window.location.port === '5501' ||
        window.location.protocol === 'file:';
      const testUrl = isLiveServer ? 'http://localhost:5000/api/health' : `${API_BASE}/health`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 200);

      const res = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      backendAvailable = res.ok && contentType.includes('application/json');
    } catch {
      backendAvailable = false;
    }
    return backendAvailable;
  })();

  return backendCheckPromise;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isOnline = await isBackendServerOnline();

  if (isOnline) {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      };

      const isLiveServer =
        window.location.port === '5500' ||
        window.location.port === '5501' ||
        window.location.protocol === 'file:';
      const targetUrl = isLiveServer ? `http://localhost:5000/api${endpoint}` : `${API_BASE}${endpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(targetUrl, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';

      if (response.ok) {
        if (contentType.includes('text/csv')) {
          return (await response.text()) as any;
        }
        if (contentType.includes('application/json')) {
          return await response.json();
        }
      }

      if (response.status < 500 && contentType.includes('application/json')) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || response.statusText);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('abort') && !err.message.includes('Failed')) {
        throw err;
      }
      backendAvailable = false;
    }
  }

  // Instant local execution
  return (await handleLocalApi(endpoint, options)) as T;
}

// API Service modules
export const api = {
  // Auth
  login: (credentials: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => apiRequest('/auth/me'),
  changePassword: (data: any) => apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Staff
  getStaffList: (params: Record<string, string> = {}) => {
    const queryStr = new URLSearchParams(params).toString();
    return apiRequest(`/staff${queryStr ? `?${queryStr}` : ''}`);
  },
  getStaffById: (id: string) => apiRequest(`/staff/${id}`),
  createStaff: (data: any) => apiRequest('/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => apiRequest(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleStaffStatus: (id: string, status: string) =>
    apiRequest(`/staff/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteStaff: (id: string) => apiRequest(`/staff/${id}`, { method: 'DELETE' }),

  // Campuses / Geofence
  getCampuses: () => apiRequest('/campuses'),
  getCampusById: (id: string) => apiRequest(`/campuses/${id}`),
  createCampus: (data: any) => apiRequest('/campuses', { method: 'POST', body: JSON.stringify(data) }),
  updateCampus: (id: string, data: any) => apiRequest(`/campuses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCampus: (id: string) => apiRequest(`/campuses/${id}`, { method: 'DELETE' }),
  testCoordinate: (data: any) => apiRequest('/campuses/test-coordinate', { method: 'POST', body: JSON.stringify(data) }),

  // Biometrics
  enrollFace: (data: any) => apiRequest('/biometrics/enroll', { method: 'POST', body: JSON.stringify(data) }),
  getEnrollmentStatus: (staffId: string) => apiRequest(`/biometrics/status/${staffId}`),
  disableEnrollment: (staffId: string) => apiRequest(`/biometrics/${staffId}`, { method: 'DELETE' }),
  getAllBiometrics: () => apiRequest('/biometrics/all'),

  // Attendance
  identifyFace: (data: { face_descriptor: number[] }) =>
    apiRequest('/attendance/identify', { method: 'POST', body: JSON.stringify(data) }),
  verifyAttendance: (data: any) => apiRequest('/attendance/verify', { method: 'POST', body: JSON.stringify(data) }),
  startVerificationSession: (data: { staff_id?: string; preferred_challenge?: string } = {}) =>
    apiRequest('/attendance/verification/start', { method: 'POST', body: JSON.stringify(data) }),
  verifyLiveness: (data: any) =>
    apiRequest('/attendance/verification/liveness', { method: 'POST', body: JSON.stringify(data) }),
  verifyIdentity: (data: any) =>
    apiRequest('/attendance/verification/identity', { method: 'POST', body: JSON.stringify(data) }),
  verifyLocation: (data: any) =>
    apiRequest('/attendance/verification/location', { method: 'POST', body: JSON.stringify(data) }),
  finalizeAttendance: (data: any) =>
    apiRequest('/attendance/verification/finalize', { method: 'POST', body: JSON.stringify(data) }),
  getDiagnostics: () =>
    apiRequest('/attendance/verification/diagnostics'),
  getTodayAttendance: (params: Record<string, string> = {}) => {
    const queryStr = new URLSearchParams(params).toString();
    return apiRequest(`/attendance/today${queryStr ? `?${queryStr}` : ''}`);
  },
  getAttendanceHistory: (params: Record<string, string> = {}) => {
    const queryStr = new URLSearchParams(params).toString();
    return apiRequest(`/attendance/history${queryStr ? `?${queryStr}` : ''}`);
  },
  manualCorrection: (id: string, data: any) =>
    apiRequest(`/attendance/manual-correction/${id}`, { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getDashboardStats: () => apiRequest('/dashboard/stats'),
  getDashboardCharts: () => apiRequest('/dashboard/charts'),
  getRecentFeed: () => apiRequest('/dashboard/recent-feed'),

  // Leaves
  getLeaves: (params: Record<string, string> = {}) => {
    const queryStr = new URLSearchParams(params).toString();
    return apiRequest(`/leaves${queryStr ? `?${queryStr}` : ''}`);
  },
  applyLeave: (data: any) => apiRequest('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveStatus: (id: string, data: any) =>
    apiRequest(`/leaves/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Shifts
  getShifts: () => apiRequest('/shifts'),
  createShift: (data: any) => apiRequest('/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => apiRequest(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => apiRequest(`/shifts/${id}`, { method: 'DELETE' }),

  // Reports
  getMusterRoll: (params: Record<string, string> = {}) => {
    const queryStr = new URLSearchParams(params).toString();
    return apiRequest(`/reports/muster-roll${queryStr ? `?${queryStr}` : ''}`);
  },
  getAuditLogs: (params: Record<string, string> = {}) => {
    const queryStr = new URLSearchParams(params).toString();
    return apiRequest(`/reports/audit-logs${queryStr ? `?${queryStr}` : ''}`);
  },
  getExportCsvUrl: (params: Record<string, string> = {}) => {
    const queryStr = new URLSearchParams(params).toString();
    return `${API_BASE}/reports/export-csv${queryStr ? `?${queryStr}` : ''}`;
  },
  exportCsv: async (params: Record<string, string> = {}) => {
    const queryStr = new URLSearchParams(params).toString();
    return apiRequest(`/reports/export-csv${queryStr ? `?${queryStr}` : ''}`);
  },

  // Settings
  getSettings: () => apiRequest('/settings'),
  updateSettings: (data: any) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
