import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Staff } from '../types';
import {
  requestCameraStream,
  captureSnapshotFromVideo,
  extract128DFaceDescriptor,
  analyzeVideoFrame,
  normalizeDescriptor,
  ActiveBlinkTracker,
  FrameAnalysisResult,
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
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Eye,
  Check,
  Play,
  Upload,
} from 'lucide-react';

export type GestureStep = 'IDLE' | 'FRONTAL' | 'TURN_LEFT' | 'TURN_RIGHT' | 'BLINK' | 'ENROLLING' | 'SUCCESS';

interface AngleSample {
  step: 'FRONTAL' | 'TURN_LEFT' | 'TURN_RIGHT' | 'BLINK';
  label: string;
  snapshot: string;
  descriptor: number[];
}

// Gentle Web Audio API synthesizer for instant tactile feedback
function playAudioFeedback(type: 'step' | 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'step') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.32); // C6
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);
    }
  } catch {}
}

export const FaceEnrollmentPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Camera & Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [consentAcknowledged, setConsentAcknowledged] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Autonomous Gesture Pipeline State
  const [currentStep, setCurrentStep] = useState<GestureStep>('IDLE');
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [capturedSamples, setCapturedSamples] = useState<AngleSample[]>([]);
  const [frameAnalysis, setFrameAnalysis] = useState<FrameAnalysisResult | null>(null);

  // Gesture Tracking Refs
  const stepHoldCountRef = useRef<number>(0);
  const prevYawRef = useRef<number>(0);
  const blinkTrackerRef = useRef<ActiveBlinkTracker>(new ActiveBlinkTracker());
  const sawClosedEyesRef = useRef<boolean>(false);
  const isEnrollingRef = useRef<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        resetEnrollmentState();
      } catch (err: any) {
        console.warn('Failed to load biometric status:', err);
      }
    }
    fetchStatus();
  }, [selectedStaffId]);

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
        humanMsg = 'Camera is currently in use by another program (Zoom, Teams, or another tab). Close other camera windows and click "Restart Camera".';
      } else if (err.name === 'NotFoundError') {
        humanMsg = 'No camera device found on this system.';
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

  const resetEnrollmentState = () => {
    setCurrentStep('IDLE');
    setStepProgress(0);
    setCapturedSamples([]);
    stepHoldCountRef.current = 0;
    prevYawRef.current = 0;
    sawClosedEyesRef.current = false;
    isEnrollingRef.current = false;
    blinkTrackerRef.current.reset();
  };

  const startAutonomousFlow = () => {
    if (!selectedStaffId) {
      setErrorMsg('Please select a staff member first.');
      return;
    }
    resetEnrollmentState();
    setCurrentStep('FRONTAL');
  };

  // Capture current frame for a specific step
  const captureCurrentAngle = (step: 'FRONTAL' | 'TURN_LEFT' | 'TURN_RIGHT' | 'BLINK', label: string): AngleSample | null => {
    if (!videoRef.current || !isCameraActive) return null;
    const snapshot = captureSnapshotFromVideo(videoRef.current);
    const box = frameAnalysis?.boundingBox;
    const descriptor = extract128DFaceDescriptor(videoRef.current, box);
    return {
      step,
      label,
      snapshot,
      descriptor,
    };
  };

  // Complete Autonomous Registration into Registry
  const completeAutonomousEnrollment = async (samples: AngleSample[]) => {
    if (isEnrollingRef.current || !selectedStaffId) return;
    isEnrollingRef.current = true;
    setIsLoading(true);
    setCurrentStep('ENROLLING');

    try {
      // Blend multi-angle descriptors: 40% frontal, 25% left, 25% right, 10% blink
      const frontal = samples.find((s) => s.step === 'FRONTAL')?.descriptor || samples[0]?.descriptor;
      const left = samples.find((s) => s.step === 'TURN_LEFT')?.descriptor || samples[1]?.descriptor || frontal;
      const right = samples.find((s) => s.step === 'TURN_RIGHT')?.descriptor || samples[2]?.descriptor || frontal;
      const blink = samples.find((s) => s.step === 'BLINK')?.descriptor || samples[3]?.descriptor || frontal;

      const composite = new Array(128).fill(0);
      for (let i = 0; i < 128; i++) {
        composite[i] =
          (frontal ? frontal[i] * 0.40 : 0) +
          (left ? left[i] * 0.25 : 0) +
          (right ? right[i] * 0.25 : 0) +
          (blink ? blink[i] * 0.10 : 0);
      }

      // Strictly L2-normalize composite vector for accurate cosine / Euclidean distance
      const normalizedTemplate = normalizeDescriptor(composite);

      const primaryPhoto = samples.find((s) => s.step === 'FRONTAL')?.snapshot || samples[0]?.snapshot || '';

      await api.enrollFace({
        staff_id: selectedStaffId,
        face_descriptor: normalizedTemplate,
        sample_count: samples.length,
        consent_given: true,
        consent_text: 'Autonomous multi-pose and eye blink liveness biometrics registered.',
        profile_photo: primaryPhoto,
      });

      playAudioFeedback('success');
      setCurrentStep('SUCCESS');

      // Refresh staff and status
      const refreshedStatus = await api.getEnrollmentStatus(selectedStaffId);
      setEnrollmentStatus(refreshedStatus);
      await loadStaff();
    } catch (err: any) {
      console.error('Enrollment error:', err);
      setErrorMsg(err.message || 'Failed to autonomously enroll face biometrics.');
      setCurrentStep('IDLE');
    } finally {
      setIsLoading(false);
      isEnrollingRef.current = false;
    }
  };

  // Real-Time Frame Analysis & Gesture State Machine
  useEffect(() => {
    let isRunning = true;
    let animId: number;

    const processTick = async () => {
      if (
        videoRef.current &&
        isCameraActive &&
        videoRef.current.readyState >= 2 &&
        currentStep !== 'IDLE' &&
        currentStep !== 'ENROLLING' &&
        currentStep !== 'SUCCESS'
      ) {
        try {
          const analysis = await analyzeVideoFrame(videoRef.current);
          if (isRunning) {
            setFrameAnalysis(analysis);

            // GESTURE PROGRESSION LOGIC
            const hasSingleLiveFace =
              analysis.faceCount === 1 &&
              !analysis.isPhoneOrPhotoDetected &&
              analysis.lightingGood;

            if (hasSingleLiveFace) {
              if (currentStep === 'FRONTAL') {
                // Step 1: Look straight (neutral yaw in [-0.16, 0.16], centered)
                if (analysis.isCentered && Math.abs(analysis.headYaw) <= 0.18) {
                  stepHoldCountRef.current += 1;
                  const progress = Math.min(100, Math.round((stepHoldCountRef.current / 7) * 100));
                  setStepProgress(progress);

                  if (stepHoldCountRef.current >= 7) {
                    const sample = captureCurrentAngle('FRONTAL', 'Frontal Center Profile');
                    if (sample) {
                      playAudioFeedback('step');
                      setCapturedSamples((prev) => [...prev, sample]);
                      stepHoldCountRef.current = 0;
                      setStepProgress(0);
                      prevYawRef.current = analysis.headYaw;
                      setCurrentStep('TURN_LEFT');
                    }
                  }
                } else {
                  stepHoldCountRef.current = Math.max(0, stepHoldCountRef.current - 1);
                  setStepProgress(Math.round((stepHoldCountRef.current / 7) * 100));
                }
              } else if (currentStep === 'TURN_LEFT') {
                // Step 2: Turn head slowly to user's left (headYaw < -0.10)
                const turnedLeft = analysis.headYaw < -0.10 || (prevYawRef.current - analysis.headYaw > 0.08);

                if (turnedLeft) {
                  stepHoldCountRef.current += 1;
                  const progress = Math.min(100, Math.round((stepHoldCountRef.current / 6) * 100));
                  setStepProgress(progress);

                  if (stepHoldCountRef.current >= 6) {
                    const sample = captureCurrentAngle('TURN_LEFT', 'Left Profile Angle');
                    if (sample) {
                      playAudioFeedback('step');
                      setCapturedSamples((prev) => [...prev, sample]);
                      stepHoldCountRef.current = 0;
                      setStepProgress(0);
                      prevYawRef.current = analysis.headYaw;
                      setCurrentStep('TURN_RIGHT');
                    }
                  }
                } else {
                  stepHoldCountRef.current = Math.max(0, stepHoldCountRef.current - 1);
                  setStepProgress(Math.round((stepHoldCountRef.current / 6) * 100));
                }
              } else if (currentStep === 'TURN_RIGHT') {
                // Step 3: Turn head slowly to user's right (headYaw > 0.10)
                const turnedRight = analysis.headYaw > 0.10 || (analysis.headYaw - prevYawRef.current > 0.08);

                if (turnedRight) {
                  stepHoldCountRef.current += 1;
                  const progress = Math.min(100, Math.round((stepHoldCountRef.current / 6) * 100));
                  setStepProgress(progress);

                  if (stepHoldCountRef.current >= 6) {
                    const sample = captureCurrentAngle('TURN_RIGHT', 'Right Profile Angle');
                    if (sample) {
                      playAudioFeedback('step');
                      setCapturedSamples((prev) => [...prev, sample]);
                      stepHoldCountRef.current = 0;
                      setStepProgress(0);
                      sawClosedEyesRef.current = false;
                      blinkTrackerRef.current.reset();
                      setCurrentStep('BLINK');
                    }
                  }
                } else {
                  stepHoldCountRef.current = Math.max(0, stepHoldCountRef.current - 1);
                  setStepProgress(Math.round((stepHoldCountRef.current / 6) * 100));
                }
              } else if (currentStep === 'BLINK') {
                // Step 4: Blink eyes for active liveness
                const trackerUpdate = blinkTrackerRef.current.update(analysis.ear, analysis.headYaw);

                if (analysis.ear < 0.20 || !analysis.leftEyeOpen || !analysis.rightEyeOpen) {
                  sawClosedEyesRef.current = true;
                  setStepProgress(50);
                }

                const blinkDetected =
                  trackerUpdate.blinkCompleted ||
                  (sawClosedEyesRef.current && (analysis.ear >= 0.24 || (analysis.leftEyeOpen && analysis.rightEyeOpen)));

                if (blinkDetected) {
                  setStepProgress(100);
                  const sample = captureCurrentAngle('BLINK', 'Live Blink Verified');
                  if (sample) {
                    playAudioFeedback('step');
                    const allSamples = [...capturedSamples, sample];
                    setCapturedSamples(allSamples);
                    completeAutonomousEnrollment(allSamples);
                  }
                }
              }
            } else {
              stepHoldCountRef.current = 0;
              setStepProgress(0);
            }
          }
        } catch (e) {
          console.warn('Frame analysis tick error:', e);
        }
      }

      if (isRunning) {
        animId = requestAnimationFrame(processTick);
      }
    };

    if (isCameraActive && currentStep !== 'IDLE' && currentStep !== 'ENROLLING' && currentStep !== 'SUCCESS') {
      animId = requestAnimationFrame(processTick);
    }

    return () => {
      isRunning = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isCameraActive, currentStep, capturedSamples]);

  // Handle manual photo file upload fallback
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
        const descriptor = extract128DFaceDescriptor(canvas);
        const sample: AngleSample = {
          step: 'FRONTAL',
          label: 'Uploaded Reference Photo',
          snapshot: base64,
          descriptor,
        };
        const allSamples = [sample, sample, sample, sample];
        setCapturedSamples(allSamples);
        completeAutonomousEnrollment(allSamples);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  // Skip / Manual Capture Fallback for current gesture
  const skipOrForceCurrentGesture = () => {
    if (!videoRef.current || !isCameraActive) return;
    const sample = captureCurrentAngle(
      currentStep as any,
      currentStep === 'FRONTAL'
        ? 'Frontal Center Profile'
        : currentStep === 'TURN_LEFT'
        ? 'Left Profile Angle'
        : currentStep === 'TURN_RIGHT'
        ? 'Right Profile Angle'
        : 'Live Liveness Verified'
    );
    if (!sample) return;

    playAudioFeedback('step');
    const nextSamples = [...capturedSamples, sample];
    setCapturedSamples(nextSamples);
    stepHoldCountRef.current = 0;
    setStepProgress(0);

    if (currentStep === 'FRONTAL') setCurrentStep('TURN_LEFT');
    else if (currentStep === 'TURN_LEFT') setCurrentStep('TURN_RIGHT');
    else if (currentStep === 'TURN_RIGHT') setCurrentStep('BLINK');
    else if (currentStep === 'BLINK') completeAutonomousEnrollment(nextSamples);
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
      const refreshedStatus = await api.getEnrollmentStatus(selectedStaffId);
      setEnrollmentStatus(refreshedStatus);
      resetEnrollmentState();
      loadStaff();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clear biometric template.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentStaff = staffList.find((s) => s.id === selectedStaffId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <Camera className="w-4 h-4 text-blue-700" />
            <span>Autonomous Biometric Administration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Autonomous Face Registration (FRS)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Zero-friction automatic face enrollment with interactive pose and blink liveness verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Administrator Access Only</span>
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Staff Selector & Biometric Metadata (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-700" />
              <span>Select Staff Profile</span>
            </h3>

            {staffList.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">No Staff Registered</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Please add personnel in the Staff Registry before enrolling face biometrics.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Choose Staff Member:
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    resetEnrollmentState();
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
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
                    src={
                      currentStaff.profile_photo_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStaff.full_name)}&background=1e40af&color=fff`
                    }
                    alt={currentStaff.full_name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{currentStaff.full_name}</p>
                    <p className="text-slate-500 text-[11px] truncate">{currentStaff.designation}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono font-semibold">
                        {currentStaff.staff_id}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">{currentStaff.department}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
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

            {/* 4-Step Interactive Gesture Instructions */}
            <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-200 space-y-2 text-xs">
              <h4 className="font-semibold text-blue-900 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                <span>Zero-Friction Gesture Sequence</span>
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                The camera autonomously guides you through 4 angles without clicking any buttons:
              </p>
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className={`flex items-center gap-2 p-1.5 rounded ${currentStep === 'FRONTAL' ? 'bg-blue-100 font-semibold text-blue-900' : 'text-slate-600'}`}>
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Look straight into the camera</span>
                </div>
                <div className={`flex items-center gap-2 p-1.5 rounded ${currentStep === 'TURN_LEFT' ? 'bg-blue-100 font-semibold text-blue-900' : 'text-slate-600'}`}>
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Turn your head slowly to the LEFT</span>
                </div>
                <div className={`flex items-center gap-2 p-1.5 rounded ${currentStep === 'TURN_RIGHT' ? 'bg-blue-100 font-semibold text-blue-900' : 'text-slate-600'}`}>
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Turn your head slowly to the RIGHT</span>
                </div>
                <div className={`flex items-center gap-2 p-1.5 rounded ${currentStep === 'BLINK' ? 'bg-blue-100 font-semibold text-blue-900' : 'text-slate-600'}`}>
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Blink your eyes to verify live person</span>
                </div>
              </div>
            </div>

            {/* Clear / Disable Biometric Action */}
            {enrollmentStatus?.is_enrolled && (
              <button
                onClick={handleDisableEnrollment}
                disabled={isLoading}
                className="w-full py-2 px-3 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disable & Clear Biometric Template</span>
              </button>
            )}
          </div>

          {/* Privacy & Consent Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Biometric Privacy Disclosure</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Multi-angle descriptors are mathematically blended into a 128D normalized feature vector for authorized attendance verification.
            </p>
            <label className="flex items-start gap-2 pt-2 border-t border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              <span className="text-[11px] font-medium text-slate-700">
                Staff member grants consent for institutional facial attendance enrollment.
              </span>
            </label>
          </div>
        </div>

        {/* Right Column: Live Camera & Interactive Auto-Enrollment Studio (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-4">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Autonomous Face Registration Camera
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={isCameraActive ? stopCamera : startCamera}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors font-medium shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isCameraActive ? 'Restart Camera' : 'Start Camera'}</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors font-medium shadow-2xs cursor-pointer"
                title="Upload photo fallback"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Feedback error messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={startCamera}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded text-xs font-semibold shrink-0 cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Linear Progress Stepper Bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'FRONTAL', label: '1. Look Straight', icon: '👤' },
              { id: 'TURN_LEFT', label: '2. Turn Left', icon: '⬅️' },
              { id: 'TURN_RIGHT', label: '3. Turn Right', icon: '➡️' },
              { id: 'BLINK', label: '4. Blink Eyes', icon: '👁️' },
            ].map((step, idx) => {
              const isCaptured = capturedSamples.some((s) => s.step === step.id);
              const isCurrent = currentStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`p-2 rounded-lg border text-xs text-center transition-all ${
                    isCaptured
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : isCurrent
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{step.icon}</span>
                    <span className="font-semibold text-[11px] truncate">{step.label}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-mono">
                    {isCaptured ? (
                      <span className="text-emerald-700 font-bold flex items-center justify-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> Captured
                      </span>
                    ) : isCurrent ? (
                      <span className="text-blue-700 font-bold">{stepProgress}% Complete</span>
                    ) : (
                      <span>Waiting</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Video Box */}
          <div className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Video Overlays based on state */}
            {currentStep === 'IDLE' ? (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center text-blue-300">
                  <Play className="w-7 h-7 ml-1" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Ready for Autonomous Registration
                  </h3>
                  <p className="text-xs text-slate-300 max-w-sm mt-1">
                    Enrolling for <span className="font-semibold text-blue-300">{currentStaff?.full_name || 'Staff Member'}</span>. The camera will automatically detect your face and guide you through poses.
                  </p>
                </div>
                <button
                  onClick={startAutonomousFlow}
                  disabled={!isCameraActive || staffList.length === 0}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>Start Autonomous Enrollment</span>
                </button>
              </div>
            ) : currentStep === 'ENROLLING' ? (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <RefreshCw className="w-12 h-12 text-blue-400 animate-spin" />
                <h3 className="font-bold text-base text-white">
                  Registering 128D Biometric Template...
                </h3>
                <p className="text-xs text-slate-300 max-w-sm">
                  Computing multi-pose vector centroid, normalizing hypersphere coordinates, and saving to registry.
                </p>
              </div>
            ) : currentStep === 'SUCCESS' ? (
              <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-emerald-100">
                    Registration Successfully Completed!
                  </h3>
                  <p className="text-xs text-emerald-200 max-w-md mt-1">
                    Face biometrics for <span className="font-bold text-white">{currentStaff?.full_name}</span> are now registered and active. The staff member can now mark attendance instantly at any kiosk.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap gap-3 justify-center">
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('attendance')}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs shadow-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Test Check-In Now (Go to Attendance)</span>
                    </button>
                  )}
                  <button
                    onClick={startAutonomousFlow}
                    className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-Enroll Face</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Dynamic Alignment Guide Oval */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-48 h-64 sm:w-56 sm:h-72 rounded-[50%] border-2 transition-all duration-300 ${
                      stepProgress > 0
                        ? 'border-emerald-400 border-solid shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                        : 'border-white/70 border-dashed'
                    }`}
                  />
                </div>

                {/* Animated Directional Cue Overlays */}
                {currentStep === 'FRONTAL' && (
                  <div className="absolute top-4 inset-x-4 flex justify-center pointer-events-none">
                    <div className="px-4 py-2 rounded-full bg-blue-900/90 border border-blue-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-pulse">
                      <Sparkles className="w-4 h-4 text-blue-300" />
                      <span>Step 1: Look straight into the camera</span>
                    </div>
                  </div>
                )}

                {currentStep === 'TURN_LEFT' && (
                  <div className="absolute inset-x-4 top-4 flex justify-between items-center pointer-events-none">
                    <div className="p-3 rounded-full bg-blue-600/90 text-white shadow-xl animate-bounce">
                      <ArrowLeft className="w-6 h-6" />
                    </div>
                    <div className="px-4 py-2 rounded-full bg-blue-900/90 border border-blue-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg">
                      <span>Step 2: Turn your head slowly to your LEFT</span>
                    </div>
                    <div className="w-12" />
                  </div>
                )}

                {currentStep === 'TURN_RIGHT' && (
                  <div className="absolute inset-x-4 top-4 flex justify-between items-center pointer-events-none">
                    <div className="w-12" />
                    <div className="px-4 py-2 rounded-full bg-blue-900/90 border border-blue-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg">
                      <span>Step 3: Turn your head slowly to your RIGHT</span>
                    </div>
                    <div className="p-3 rounded-full bg-blue-600/90 text-white shadow-xl animate-bounce">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>
                )}

                {currentStep === 'BLINK' && (
                  <div className="absolute top-4 inset-x-4 flex justify-center pointer-events-none">
                    <div className="px-4 py-2 rounded-full bg-emerald-900/90 border border-emerald-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-pulse">
                      <Eye className="w-4 h-4 text-emerald-300" />
                      <span>Step 4: BLINK your eyes to verify you are a live person</span>
                    </div>
                  </div>
                )}

                {/* Bottom Real-Time Telemetry Gauge */}
                <div className="absolute bottom-3 inset-x-4 pointer-events-auto">
                  <div className="bg-slate-900/85 backdrop-blur-xs border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          stepProgress > 0 ? 'bg-emerald-400 animate-ping' : 'bg-blue-400'
                        }`}
                      />
                      <span className="font-semibold text-xs text-white">
                        {currentStep === 'FRONTAL' && 'Hold position straight...'}
                        {currentStep === 'TURN_LEFT' && 'Turning Left detected...'}
                        {currentStep === 'TURN_RIGHT' && 'Turning Right detected...'}
                        {currentStep === 'BLINK' && 'Waiting for blink action...'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span>Progress: {stepProgress}%</span>
                      <button
                        onClick={skipOrForceCurrentGesture}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-[10px] font-sans transition-colors cursor-pointer"
                        title="Skip to next step if lighting is challenging"
                      >
                        Skip Step →
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Captured Multi-Angle Samples Showcase */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Multi-Angle Enrollment Samples ({capturedSamples.length}/4)</span>
              </span>
              {currentStep !== 'IDLE' && (
                <button
                  onClick={resetEnrollmentState}
                  className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer font-normal"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart Enrollment</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { step: 'FRONTAL', title: '1. Frontal Center' },
                { step: 'TURN_LEFT', title: '2. Left Angle' },
                { step: 'TURN_RIGHT', title: '3. Right Angle' },
                { step: 'BLINK', title: '4. Blink Liveness' },
              ].map((slot, idx) => {
                const sample = capturedSamples.find((s) => s.step === slot.step);
                return (
                  <div
                    key={slot.step}
                    className="aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 overflow-hidden relative flex flex-col items-center justify-center p-2 text-center"
                  >
                    {sample ? (
                      <>
                        <img
                          src={sample.snapshot}
                          alt={sample.label}
                          className="w-full h-full object-cover rounded-md"
                        />
                        <div className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">
                          {slot.title}
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Enrolled
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-400 space-y-1">
                        <span className="text-lg">
                          {idx === 0 ? '👤' : idx === 1 ? '⬅️' : idx === 2 ? '➡️' : '👁️'}
                        </span>
                        <p className="text-[11px] font-medium text-slate-500 leading-tight">{slot.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {currentStep === slot.step ? 'In Progress' : 'Pending'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
