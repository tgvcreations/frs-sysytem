import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  requestCameraStream,
  analyzeVideoFrame,
  ActiveBlinkTracker,
  FrameAnalysisResult,
} from '../services/faceEngine';
import {
  ShieldCheck,
  Eye,
  Camera,
  RefreshCw,
  Terminal,
} from 'lucide-react';

export const AdminDebugPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blinkTrackerRef = useRef<ActiveBlinkTracker>(new ActiveBlinkTracker());
  const animFrameRef = useRef<number | null>(null);

  // Diagnostics Data from Server
  const [diagnosticsData, setDiagnosticsData] = useState<{
    sessions: any[];
    stats: any;
    recent_audits: any[];
    thresholds: any;
  } | null>(null);
  const [isLoadingDiag, setIsLoadingDiag] = useState<boolean>(false);

  // Camera & Stream State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [frameAnalysis, setFrameAnalysis] = useState<FrameAnalysisResult>({
    faceCount: 0,
    isCentered: false,
    lightingGood: false,
    faceSizeOk: false,
    qualityScore: 0,
    ear: 0.30,
    headYaw: 0,
    leftEyeOpen: true,
    rightEyeOpen: true,
    statusMessage: 'Camera off',
    isPhoneOrPhotoDetected: false,
    spoofType: 'none',
    spoofConfidence: 0,
    spoofReason: '',
  });
  const [earHistory, setEarHistory] = useState<number[]>([]);
  const [blinkCount, setBlinkCount] = useState<number>(0);
  const [isStaticSpoof, setIsStaticSpoof] = useState<boolean>(false);

  // Load diagnostics data from API
  const fetchDiagnostics = async () => {
    setIsLoadingDiag(true);
    try {
      const data = await api.getDiagnostics();
      setDiagnosticsData(data);
    } catch (err) {
      console.error('Failed to load diagnostics data:', err);
    } finally {
      setIsLoadingDiag(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 8000);
    return () => clearInterval(interval);
  }, []);

  // Camera Management
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await requestCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.warn);
        };
      }
      setCameraActive(true);
      blinkTrackerRef.current.reset();
    } catch (err) {
      console.error('Admin debug camera error:', err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Frame processing tick
  useEffect(() => {
    let running = true;
    const tick = async () => {
      if (videoRef.current && cameraActive && videoRef.current.readyState >= 2) {
        try {
          const res = await analyzeVideoFrame(videoRef.current);
          if (running) {
            setFrameAnalysis(res);
            const bRes = blinkTrackerRef.current.update(res.ear, res.headYaw);
            setEarHistory(bRes.earHistory);
            setBlinkCount(bRes.blinkCount);
            setIsStaticSpoof(bRes.isStaticSpoof);
          }
        } catch (e) {
          console.warn('Debug frame error:', e);
        }
      }
      if (running) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    if (cameraActive) {
      animFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraActive]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <Terminal className="w-4 h-4 text-blue-700" />
            <span>Administrator Security Telemetry & Biometrics Monitor</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            FRS Anti-Spoof Diagnostics Panel
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Real-time optical telemetry, Eye Aspect Ratio (EAR) waveform analysis, active cryptographic challenge sessions, and audit inspection.
          </p>
        </div>

        <button
          onClick={fetchDiagnostics}
          disabled={isLoadingDiag}
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDiag ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Real-time KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verification Sessions</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {diagnosticsData?.stats?.total_sessions || 0}
          </p>
          <span className="text-xs text-slate-400">Total generated today</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Liveness Pass Rate</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {diagnosticsData?.stats && diagnosticsData.stats.total_sessions > 0
              ? `${Math.round(
                  (diagnosticsData.stats.liveness_passed / diagnosticsData.stats.total_sessions) * 100
                )}%`
              : '100%'}
          </p>
          <span className="text-xs text-slate-400">
            {diagnosticsData?.stats?.liveness_passed || 0} passed challenges
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identity Verified</span>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {diagnosticsData?.stats?.identity_passed || 0}
          </p>
          <span className="text-xs text-slate-400">1:1 Biometric matches</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Attendances</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {diagnosticsData?.stats?.completed_attendances || 0}
          </p>
          <span className="text-xs text-slate-400">Dual FRS + GPS validated</span>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Real-Time Optical Telemetry (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-700" />
              <span>Real-Time Sensor & EAR Waveform</span>
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                cameraActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {cameraActive ? 'Camera Active' : 'Camera Idle'}
            </span>
          </div>

          {/* Video Preview */}
          <div className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-300">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Real-Time Telemetry Overlay */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono font-medium text-white">
              <span className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700">
                Faces: {frameAnalysis.faceCount}
              </span>
              <span className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700">
                Yaw: {frameAnalysis.headYaw}
              </span>
              <span className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700 text-blue-300 font-bold">
                EAR: {frameAnalysis.ear.toFixed(2)}
              </span>
            </div>

            {/* Static Spoof Warning */}
            {isStaticSpoof && (
              <div className="absolute bottom-2 inset-x-2 p-1.5 rounded bg-rose-700 text-white text-center text-xs font-semibold">
                Flat EAR variance detected (Possible static photo or screen)
              </div>
            )}
          </div>

          {/* Live EAR Waveform Visualizer */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-700" />
                <span>Eye Aspect Ratio (EAR) Dynamic Sequence</span>
              </span>
              <span className="font-mono text-blue-700 font-bold">
                Blinks: {blinkCount}
              </span>
            </div>

            {/* Sparkline Bar Representation */}
            <div className="h-16 flex items-end gap-1 pt-2 px-1 bg-slate-900 rounded border border-slate-800">
              {earHistory.map((earVal, idx) => {
                const heightPercent = Math.min(100, Math.max(10, (earVal / 0.40) * 100));
                const isBlinkLow = earVal < 0.20;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-t transition-all duration-100"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: isBlinkLow ? '#f59e0b' : '#10b981',
                    }}
                    title={`Frame ${idx}: EAR ${earVal}`}
                  />
                );
              })}
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Thresholds: Closed &lt; 0.20 | Open &gt; 0.25</span>
              <span>Samples: {earHistory.length}</span>
            </div>
          </div>

          {/* Optical Quality Meters */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block mb-0.5">Single Person</span>
              <span
                className={`font-semibold text-xs ${
                  frameAnalysis.faceCount === 1
                    ? 'text-emerald-700'
                    : frameAnalysis.faceCount > 1
                    ? 'text-rose-700 font-bold'
                    : 'text-slate-400'
                }`}
              >
                {frameAnalysis.faceCount === 1 ? 'PASS (1 Face)' : frameAnalysis.faceCount > 1 ? 'FAIL (>1 Face)' : 'No Face'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block mb-0.5">Centering</span>
              <span
                className={`font-semibold text-xs ${
                  frameAnalysis.isCentered ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {frameAnalysis.isCentered ? 'Centered' : 'Off-Center'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block mb-0.5">Lighting</span>
              <span
                className={`font-semibold text-xs ${
                  frameAnalysis.lightingGood ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {frameAnalysis.lightingGood ? 'Adequate' : 'Poor / Uneven'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Active Challenge Sessions Table (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Live Verification Sessions (Audited)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              TTL: 90s One-Time
            </span>
          </div>

          {/* Sessions List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Staff</th>
                  <th className="py-2.5 px-3">Challenge</th>
                  <th className="py-2.5 px-3">Liveness</th>
                  <th className="py-2.5 px-3">Identity</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {diagnosticsData?.sessions && diagnosticsData.sessions.length > 0 ? (
                  diagnosticsData.sessions.slice(0, 8).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">
                        {s.full_name || s.staff_code}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-sans">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                          {s.challenge_type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {s.liveness_verified ? (
                          <span className="text-emerald-700 font-semibold">PASS</span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {s.identity_verified ? (
                          <span className="text-emerald-700 font-semibold">MATCH</span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {s.location_verified ? (
                          <span className="text-emerald-700 font-semibold">INSIDE</span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {s.used ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-sans font-semibold">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-sans font-semibold">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      No active verification sessions. Start a verification from Attendance page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Institutional Thresholds */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
              System Biometric Parameters
            </h4>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px] mb-0.5">Match Threshold</span>
                <span className="font-mono font-semibold text-slate-800">
                  D &le; 0.48 (Euclidean)
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px] mb-0.5">Max GPS Drift</span>
                <span className="font-mono font-semibold text-slate-800">
                  &le; 50.0m accuracy
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px] mb-0.5">Session Lifetime</span>
                <span className="font-mono font-semibold text-slate-800">
                  90s (One-Time)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
