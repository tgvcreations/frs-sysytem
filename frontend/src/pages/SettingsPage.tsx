import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Save,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Building2,
  Clock,
  MapPin,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    institute_name: 'Staff FRS & Attendance System',
    institute_code: 'FRS-INST-01',
    contact_email: 'contact@vuppala.edu',
    contact_phone: '+91 40 2765 4321',
    face_match_threshold: 0.48,
    liveness_strictness: 'standard',
    default_accuracy_threshold: 50,
    default_tolerance_meters: 15,
    present_min_hours: 7.0,
    half_day_min_hours: 4.0,
    absent_below_hours: 2.0,
    grace_period_minutes: 15,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getSettings();
        if (data.settings) {
          setSettings((prev: any) => ({
            ...prev,
            ...data.settings,
            present_min_hours: data.settings.present_min_hours ?? 7.0,
            half_day_min_hours: data.settings.half_day_min_hours ?? 4.0,
            absent_below_hours: data.settings.absent_below_hours ?? 2.0,
            grace_period_minutes: data.settings.grace_period_minutes ?? 15,
          }));
        }
      } catch (err: any) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      await api.updateSettings(settings);
      setSuccessMsg('System configuration settings saved successfully.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Policies</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institutional profile, working hours thresholds, biometric parameters, and geofence standards.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors shrink-0 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SECTION 1: ATTENDANCE & WORKING HOURS THRESHOLDS (Primary Requested Feature) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Attendance & Working Hours Thresholds
              </h2>
              <p className="text-xs text-slate-500">
                Define the minimum work duration required for Full Day, Half Day, and Absent calculation.
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 hidden sm:inline-block">
            Auto-Calculation Policy
          </span>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <label className="block font-semibold text-slate-800">
              Full Day (Present) Minimum:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="1"
                max="16"
                value={settings.present_min_hours ?? 7.0}
                onChange={(e) =>
                  setSettings({ ...settings, present_min_hours: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-slate-500 font-semibold">Hours</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Staff working at least this duration will be marked as <strong className="text-emerald-700">Present</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <label className="block font-semibold text-slate-800">
              Half Day Minimum:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={settings.half_day_min_hours ?? 4.0}
                onChange={(e) =>
                  setSettings({ ...settings, half_day_min_hours: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-slate-500 font-semibold">Hours</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Working between this & full day qualifies as <strong className="text-amber-700">Half Day</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <label className="block font-semibold text-slate-800">
              Absent / Incomplete Threshold:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                max="8"
                value={settings.absent_below_hours ?? 2.0}
                onChange={(e) =>
                  setSettings({ ...settings, absent_below_hours: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-slate-500 font-semibold">Hours</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Working less than this duration is marked as <strong className="text-red-700">Absent</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <label className="block font-semibold text-slate-800">
              Check-in Grace Period:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                min="0"
                max="60"
                value={settings.grace_period_minutes ?? 15}
                onChange={(e) =>
                  setSettings({ ...settings, grace_period_minutes: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-slate-500 font-semibold">Mins</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Check-in within grace window is on-time; past it is marked <strong className="text-amber-700">Late</strong>.
            </p>
          </div>
        </div>

        {/* Institutional Policy Rule Breakdown Table */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-slate-800 mb-2">
            Active Working Hours Classification Matrix:
          </h3>
          <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Marked Status</th>
                  <th className="py-2.5 px-3">Required Time Span</th>
                  <th className="py-2.5 px-3">Payroll & Muster Roll Treatment</th>
                  <th className="py-2.5 px-3">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-semibold">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                      Present (Full Day)
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono font-medium text-slate-900">
                    ≥ {settings.present_min_hours ?? 7.0} hours
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    1.0 Full Day attendance credited to monthly muster roll.
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                    Total Time ≥ {settings.present_min_hours ?? 7.0}h
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-semibold">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                      Half Day
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono font-medium text-slate-900">
                    {settings.half_day_min_hours ?? 4.0} to {((settings.present_min_hours ?? 7.0) - 0.1).toFixed(1)} hours
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    0.5 Day attendance credited; deducted from leave/half-day quota.
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                    {settings.half_day_min_hours ?? 4.0}h ≤ Time &lt; {settings.present_min_hours ?? 7.0}h
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-semibold">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-800">
                      Absent / Incomplete
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono font-medium text-slate-900">
                    &lt; {settings.absent_below_hours ?? 2.0} hours
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    0.0 Attendance credited; requires administrative regularization.
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                    Time &lt; {settings.absent_below_hours ?? 2.0}h or No Checkout
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-semibold">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-800">
                      Late Arrival Flag
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono font-medium text-slate-900">
                    &gt; {settings.grace_period_minutes ?? 15} mins after shift
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    Flagged as Late; 3 consecutive late marks subject to half-day penalty.
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                    Check-in &gt; Shift Start + {settings.grace_period_minutes ?? 15}m
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: INSTITUTIONAL METADATA */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
          <Building2 className="w-4 h-4 text-slate-600" />
          <span>Institutional Profile & Identification</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institution Legal Name</label>
            <input
              type="text"
              value={settings.institute_name || ''}
              onChange={(e) => setSettings({ ...settings, institute_name: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institution Identification Code</label>
            <input
              type="text"
              value={settings.institute_code || ''}
              onChange={(e) => setSettings({ ...settings, institute_code: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Administrative Contact Email</label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={settings.contact_phone || ''}
              onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: BIOMETRIC FACIAL RECOGNITION (FRS) ENGINE */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Biometric Facial Recognition Engine Parameters</span>
        </h2>

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center font-semibold text-slate-800">
              <span>Euclidean Distance Match Threshold:</span>
              <span className="font-mono text-blue-700 font-bold text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
                {settings.face_match_threshold ?? 0.48}
              </span>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.65"
              step="0.01"
              value={settings.face_match_threshold || 0.48}
              onChange={(e) =>
                setSettings({ ...settings, face_match_threshold: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-700 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0.30 (Strict / Low Tolerance)</span>
              <span>0.48 (Recommended Standard)</span>
              <span>0.65 (Lenient / Higher Tolerance)</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Euclidean distance between live 128-dimensional biometric embeddings and registered reference face vector.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <label className="block font-semibold text-slate-800">
                Liveness Verification Mode:
              </label>
              <select
                value={settings.liveness_strictness || 'standard'}
                onChange={(e) => setSettings({ ...settings, liveness_strictness: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="standard">Active Eye Blink Detection (Standard Challenge)</option>
                <option value="strict">Active Blink + Micro-Movement Anti-Spoof (Strict)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Static photos, phone screens, and digital playback are rejected automatically.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <label className="block font-semibold text-slate-800">
                Challenge Session Time-To-Live:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  readOnly
                  value="90"
                  className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 font-mono text-slate-600 font-semibold cursor-not-allowed"
                />
                <span className="text-slate-500 font-semibold">Seconds</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Cryptographically signed one-time token expires after 90 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: CAMPUS GEOFENCING & GPS COORDINATES */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>Campus Geofencing & GPS Parameters</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <label className="block font-semibold text-slate-800">
              Primary Center Campus Coordinates:
            </label>
            <div className="font-mono text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1.5 font-medium">
              16.887333, 78.443028
            </div>
            <p className="text-[11px] text-slate-500">
              Configured campus geofence center point for attendance validation.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <label className="block font-semibold text-slate-800">
              Max Allowed Device GPS Accuracy:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.default_accuracy_threshold || 50}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_accuracy_threshold: parseInt(e.target.value, 10) || 50,
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-slate-500 font-semibold">Meters</span>
            </div>
            <p className="text-[11px] text-slate-500">
              GPS fixes exceeding ±50m accuracy error will be rejected to prevent mock locations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

