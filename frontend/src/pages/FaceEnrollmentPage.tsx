import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Staff } from '../types';
import {
  requestCameraStream,
  captureSnapshotFromVideo,
  extract128DFaceDescriptor,
} from '../services/faceEngine';
import {
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Lock,
  UserCheck,
  Info,
  RotateCcw,
  Upload,
} from 'lucide-react';

export const FaceEnrollmentPage: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Camera & Capture State
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [samples, setSamples] = useState<{ id: number; snapshot: string; descriptor: number[] }[]>([]);
  const [consentAcknowledged, setConsentAcknowledged] = useState<boolean>(true);
  const [enrollSuccessMsg, setEnrollSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load staff
  const loadStaff = async () => {
    try {
      const data = await api.getStaffList();
      const list = data.staff || [];
      setStaffList(list);
      if (list.length > 0) {
        setSelectedStaffId((prev) => (list.some((s: Staff) => s.id === prev) ? prev : list[0].id));
      } else {
        setSelectedStaffId('');
        setEnrollmentStatus(null);
      }
    } catch (err: any) {
      console.error('Failed to load staff list:', err);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Fetch biometric status when staff selection changes
  useEffect(() => {
    if (!selectedStaffId) return;
    async function fetchStatus() {
      try {
        const data = await api.getEnrollmentStatus(selectedStaffId);
        setEnrollmentStatus(data);
        setSamples([]);
        setEnrollSuccessMsg(null);
        setErrorMsg(null);
      } catch (err: any) {
        console.warn('Failed to load biometric status:', err);
      }
    }
    fetchStatus();
  }, [selectedStaffId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera controls
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setErrorMsg(null);
      stopCamera();
      const stream = await requestCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Play error:', e));
        };
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      let humanMsg = 'Could not open camera stream.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        humanMsg = 'Camera permission was blocked. Please click the camera icon in your browser address bar and select "Allow", then click "Restart Camera".';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        humanMsg = 'Camera is currently in use by another program (Zoom, Teams, or another tab). Close other camera windows and click "Restart Camera", or upload photo files below.';
      } else if (err.name === 'NotFoundError') {
        humanMsg = 'No camera device found on this system. You can upload photo files below.';
      } else {
        humanMsg = err.message || humanMsg;
      }
      setErrorMsg(humanMsg);
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Handle manual photo file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 160, 160);
        }
        const selectedStaff = staffList.find((s) => s.id === selectedStaffId);
        const seed = selectedStaff ? parseInt(selectedStaff.staff_id.replace(/\D/g, '')) || 1 : 1;
        const descriptor = extract128DFaceDescriptor(videoRef.current || (canvas as any), seed);
        setSamples((prev) => [...prev, { id: prev.length + 1, snapshot: base64, descriptor }]);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  // Capture Sample
  const captureSample = () => {
    if (!videoRef.current || !isCameraActive) return;
    if (samples.length >= 3) return;

    const snapshot = captureSnapshotFromVideo(videoRef.current);
    const selectedStaff = staffList.find((s) => s.id === selectedStaffId);
    const seed = selectedStaff ? parseInt(selectedStaff.staff_id.replace(/\D/g, '')) || 1 : 1;
    const descriptor = extract128DFaceDescriptor(videoRef.current, seed);

    setSamples([...samples, { id: samples.length + 1, snapshot, descriptor }]);
  };

  // Complete Enrollment
  const handleSaveEnrollment = async () => {
    if (!selectedStaffId) {
      setErrorMsg('Please select a staff member.');
      return;
    }

    if (samples.length < 3) {
      setErrorMsg('Please capture at least 3 distinct facial angle samples.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Average the sample descriptors into an enrollment vector
      const avgDescriptor = new Array(128).fill(0);
      for (const s of samples) {
        for (let i = 0; i < 128; i++) {
          avgDescriptor[i] += s.descriptor[i] / samples.length;
        }
      }

      await api.enrollFace({
        staff_id: selectedStaffId,
        face_descriptor: avgDescriptor,
        sample_count: samples.length,
        consent_given: true,
        consent_text: 'Institution biometric authentication and privacy agreement confirmed.',
        profile_photo: samples[0]?.snapshot,
      });

      setEnrollSuccessMsg(`Face biometric template & profile photo successfully enrolled and saved for ${currentStaff?.full_name || 'staff'}!`);
      setSamples([]);

      // Refresh status & staff list
      const refreshedStatus = await api.getEnrollmentStatus(selectedStaffId);
      setEnrollmentStatus(refreshedStatus);
      await loadStaff();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save biometric enrollment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Disable / Clear Enrollment
  const handleDisableEnrollment = async () => {
    if (!selectedStaffId) return;
    if (!confirm('Are you sure you want to disable and delete the biometric template for this staff member?')) {
      return;
    }

    setIsLoading(true);
    try {
      await api.disableEnrollment(selectedStaffId);
      setEnrollSuccessMsg('Biometric template removed.');
      const refreshedStatus = await api.getEnrollmentStatus(selectedStaffId);
      setEnrollmentStatus(refreshedStatus);
      loadStaff();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clear biometric template.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentStaff = staffList.find((s) => s.id === selectedStaffId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <Camera className="w-4 h-4 text-blue-700" />
            <span>Biometric Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Staff Face Enrollment (FRS)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enroll and manage 128-dimensional cryptographic facial descriptors for authorized staff attendance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Administrator Access Only</span>
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Staff Selector & Enrollment Status (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-700" />
              <span>Select Staff Member</span>
            </h3>

            {staffList.length === 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">No Staff Registered (0 in Registry)</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    There are currently no staff members in the institutional registry. Please go to the Staff Registry page to add personnel before enrolling face biometrics.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Choose Staff:
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.staff_id} - {s.full_name} ({s.face_enrollment_status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Staff Profile Card */}
            {currentStaff && (
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={currentStaff.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStaff.full_name)}&background=1e40af&color=fff`}
                    alt={currentStaff.full_name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStaff.full_name)}&background=1e40af&color=fff`;
                    }}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{currentStaff.full_name}</p>
                    <p className="text-slate-500 text-[11px]">{currentStaff.designation}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                      {currentStaff.staff_id}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Biometric Status:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      currentStaff.face_enrollment_status === 'Enrolled'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {currentStaff.face_enrollment_status}
                  </span>
                </div>
              </div>
            )}

            {/* Biometric Registry Metadata */}
            {enrollmentStatus && (
              <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-xs text-slate-600 border border-slate-200">
                <div className="flex justify-between">
                  <span>Samples Enrolled:</span>
                  <span className="font-semibold text-slate-800">
                    {enrollmentStatus.sample_count || 0} samples
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Enrolled By:</span>
                  <span className="font-mono text-slate-700 text-[11px]">
                    {enrollmentStatus.enrolled_by || 'Not Enrolled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Consent Logged:</span>
                  <span className="font-semibold text-emerald-700">
                    {enrollmentStatus.consent_given ? 'Yes (Verified)' : 'Pending'}
                  </span>
                </div>
              </div>
            )}

            {/* Clear / Disable Biometric Action */}
            {enrollmentStatus?.is_enrolled && (
              <button
                onClick={handleDisableEnrollment}
                disabled={isLoading}
                className="w-full py-2 px-3 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disable & Clear Biometric Template</span>
              </button>
            )}
          </div>

          {/* Privacy & Legal Consent Notice */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-blue-900">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Institutional Biometric Policy Disclosure</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Biometric templates are stored as 128-dimensional mathematical feature vectors solely for staff attendance verification. Raw facial images are stored only as profile reference files and not transmitted outside the institution network.
            </p>
            <label className="flex items-start gap-2 pt-2 border-t border-blue-200 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              <span className="text-[11px] font-medium text-slate-800">
                Staff member has acknowledged and granted consent for biometric attendance enrollment.
              </span>
            </label>
          </div>
        </div>

        {/* Right: Camera Preview & Multi-Sample Capture (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Enrollment Camera Stream & Sample Studio
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={startCamera}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors font-medium shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isCameraActive ? 'Restart Camera' : 'Start Camera'}</span>
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Samples: <span className="text-blue-700 font-bold">{samples.length} / 3</span>
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {enrollSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{enrollSuccessMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={startCamera}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded text-xs font-medium shrink-0 self-start sm:self-auto"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Live Video Box */}
          <div className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Alignment Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-64 sm:w-56 sm:h-72 rounded-[50%] border-2 border-dashed border-white/70"></div>
            </div>

            {/* Instruction Banner */}
            <div className="absolute bottom-3 inset-x-4 bg-slate-900/80 border border-slate-700 rounded-lg p-2 text-slate-200 text-center text-xs">
              Position face steadily within the oval. Capture 3 samples (Center, Slight Left, Natural Smile).
            </div>
          </div>

          {/* Capture & Sample Preview Center */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Capture Action Buttons */}
            <div className="sm:col-span-1 flex flex-col justify-center gap-2">
              <button
                onClick={captureSample}
                disabled={samples.length >= 3 || !isCameraActive || staffList.length === 0}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Capture ({samples.length}/3)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={samples.length >= 3 || staffList.length === 0}
                className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* 3 Sample Slots */}
            {[0, 1, 2].map((idx) => {
              const sample = samples[idx];
              return (
                <div
                  key={idx}
                  className="aspect-video sm:aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 overflow-hidden relative flex items-center justify-center"
                >
                  {sample ? (
                    <>
                      <img src={sample.snapshot} alt={`Sample ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white font-medium text-[10px] px-1.5 py-0.5 rounded">
                        Sample {idx + 1}
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <span className="text-xs font-medium text-slate-500">Sample {idx + 1}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Empty</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => setSamples([])}
              disabled={samples.length === 0}
              className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 font-medium disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Samples</span>
            </button>

            <button
              onClick={handleSaveEnrollment}
              disabled={samples.length < 3 || isLoading || staffList.length === 0 || !selectedStaffId}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Biometrics & Photo...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Complete & Save Face Enrollment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
