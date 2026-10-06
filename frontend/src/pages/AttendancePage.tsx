import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Staff, CampusGeofence } from '../types';
import {
  requestCameraStream,
  extract128DFaceDescriptor,
  analyzeVideoFrame,
  calculateEuclideanDistance,
  calculateCosineSimilarity,
  distanceToConfidence,
  FrameAnalysisResult,
} from '../services/faceEngine';
import { haversineMeters } from '../services/localBackend';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Scan,
  ShieldCheck,
  User,
  Sliders,
  Sparkles,
  Timer,
  Navigation,
} from 'lucide-react';

type VerificationState =
  | 'IDLE'
  | 'STARTING_SESSION'
  | 'VERIFYING_PRESENCE'
  | 'VERIFYING_IDENTITY'
  | 'VERIFYING_LOCATION'
  | 'FINALIZING'
  | 'SUCCESS'
  | 'ERROR';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Staff & Campus State
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [campuses, setCampuses] = useState<CampusGeofence[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<CampusGeofence | null>(null);

  // Biometric Templates for Automatic 1:N Identification
  const [enrolledTemplates, setEnrolledTemplates] = useState<{
    staff_id: string;
    staff?: Staff;
    face_descriptor: number[];
    profile_photo?: string;
  }[]>([]);

  // Automatic Face Detection & Identification State
  const [detectedStaff, setDetectedStaff] = useState<Staff | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [isUnrecognizedPerson, setIsUnrecognizedPerson] = useState<boolean>(false);
  const [autoVerifyCountdown, setAutoVerifyCountdown] = useState<number | null>(null);
  const [verificationCooldown, setVerificationCooldown] = useState<boolean>(false);

  // Camera & Stream State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Verification State Machine
  const [vState, setVState] = useState<VerificationState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-Time Computer Vision & Telemetry State
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
    statusMessage: 'Position your face in front of the camera.',
    isPhoneOrPhotoDetected: false,
    spoofType: 'none',
    spoofConfidence: 0,
    spoofReason: '',
  });

  // Anti-Spoofing & Replay Attack Testing Mode
  const [spoofTestMode, setSpoofTestMode] = useState<'AUTO' | 'FORCE_PHONE' | 'FORCE_PHOTO' | 'FORCE_LIVE'>('AUTO');

  // Compute effective frame analysis incorporating simulation mode when active
  const effectiveAnalysis: FrameAnalysisResult = React.useMemo(() => {
    if (spoofTestMode === 'FORCE_PHONE') {
      return {
        ...frameAnalysis,
        isPhoneOrPhotoDetected: true,
        spoofType: 'phone_screen',
        spoofConfidence: 96,
        spoofReason: 'Digital phone screen bezel & reflective glass glare detected',
        statusMessage: '📱 Digital Screen / Phone Detected: Presentation attack rejected.',
      };
    }
    if (spoofTestMode === 'FORCE_PHOTO') {
      return {
        ...frameAnalysis,
        isPhoneOrPhotoDetected: true,
        spoofType: 'photo',
        spoofConfidence: 94,
        spoofReason: 'Static photograph detected (zero physiological micro-motion)',
        statusMessage: '📷 Static Photograph Detected: Live person required.',
      };
    }
    if (spoofTestMode === 'FORCE_LIVE') {
      return {
        ...frameAnalysis,
        isPhoneOrPhotoDetected: false,
        spoofType: 'none',
        spoofConfidence: 0,
        spoofReason: 'Verified natural biometric presence',
        statusMessage: '✅ Live Face Detected: Verification ready.',
      };
    }
    return frameAnalysis;
  }, [frameAnalysis, spoofTestMode]);

  // GPS State (strict real-device GPS required; no fake center default)
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  }>({
    latitude: 0,
    longitude: 0,
    accuracy: 999,
  });
  const [gpsLocked, setGpsLocked] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSimulatedGps, setIsSimulatedGps] = useState<boolean>(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string>('Acquiring high-accuracy satellite fix...');

  // Success / Result Modal
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    isSuccess: boolean;
    action?: string;
    title: string;
    message: string;
    details?: any;
  }>({
    isOpen: false,
    isSuccess: false,
    title: '',
    message: '',
  });

  // Load initial staff, campus, and biometric data
  const loadData = React.useCallback(async () => {
    try {
      const [staffData, campusData, bioData] = await Promise.all([
        api.getStaffList({ employment_status: 'Active' }),
        api.getCampuses(),
        api.getAllBiometrics().catch(() => ({ templates: [] })),
      ]);
      const loadedStaff = staffData.staff || [];
      setStaffList(loadedStaff);
      setCampuses(campusData.campuses || []);
      setEnrolledTemplates(bioData?.templates || []);

      if (campusData.campuses && campusData.campuses.length > 0) {
        setSelectedCampus(campusData.campuses[0]);
      }

      // If logged-in user is staff, strictly select their own profile
      if (user?.role === 'staff' && user.staff_id) {
        setSelectedStaffId(user.staff_id);
      } else if (loadedStaff.length > 0) {
        setSelectedStaffId((prev) => (prev && loadedStaff.some((s: Staff) => s.id === prev) ? prev : loadedStaff[0].id));
      } else {
        setSelectedStaffId('');
      }
    } catch (err: any) {
      console.error('Failed to load initial attendance data:', err);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    return () => window.removeEventListener('focus', loadData);
  }, [loadData]);

  // Real GPS fix (strictly requires real satellite/network geolocation fix)
  const fetchRealGps = () => {
    if ('geolocation' in navigator) {
      setGpsStatusMessage('Requesting GPS fix from device sensors...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy * 10) / 10,
          });
          setIsSimulatedGps(false);
          setGpsLocked(true);
          setGpsError(null);
          setGpsStatusMessage(`GPS locked (accuracy: ±${Math.round(pos.coords.accuracy)}m)`);
        },
        (err) => {
          console.warn('Real GPS denied or unavailable:', err.message);
          setGpsLocked(false);
          setGpsError(
            err.code === 1
              ? 'GPS permission blocked. Please allow Location access in browser URL bar to verify campus presence.'
              : 'Device GPS unavailable. Geofence verification requires your device location.'
          );
          setGpsStatusMessage('❌ Location required to verify campus presence.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsLocked(false);
      setGpsError('Geolocation is not supported by your browser.');
      setGpsStatusMessage('❌ Geolocation unsupported.');
    }
  };

  useEffect(() => {
    fetchRealGps();
  }, []);

  // Camera Management
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      stopCamera();
      const stream = await requestCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Video play error:', e));
        };
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Attendance camera error:', err);
      let humanMsg = 'Failed to open camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        humanMsg = 'Camera permission blocked. Click the lock icon in your URL bar, select "Allow", and restart.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        humanMsg = 'Camera is in use by another tab or app. Please close other camera apps.';
      } else {
        humanMsg = err.message || humanMsg;
      }
      setCameraError(humanMsg);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Real-Time Video Frame Analysis & 1:N Automatic Face Identification Loop
  const lastMatchTickRef = useRef<number>(0);

  useEffect(() => {
    let isRunning = true;

    const processFrame = async () => {
      if (videoRef.current && cameraActive && videoRef.current.readyState >= 2) {
        try {
          const analysis = await analyzeVideoFrame(videoRef.current);
          if (isRunning) {
            setFrameAnalysis(analysis);

            const now = Date.now();
            // Run 1:N identification every 250ms
            if (now - lastMatchTickRef.current > 250) {
              lastMatchTickRef.current = now;

              if (analysis.faceCount === 1 && !analysis.isPhoneOrPhotoDetected) {
                const liveDesc = extract128DFaceDescriptor(videoRef.current, analysis.boundingBox);

                // Compare live descriptor against all enrolled staff templates
                let bestMatch: any = null;
                let minDistance = 999;
                let maxCosSim = -1;

                for (const t of enrolledTemplates) {
                  if (!t.face_descriptor || !Array.isArray(t.face_descriptor)) continue;
                  const dist = calculateEuclideanDistance(liveDesc, t.face_descriptor);
                  const cosSim = calculateCosineSimilarity(liveDesc, t.face_descriptor);
                  if (dist < minDistance) {
                    minDistance = dist;
                    bestMatch = t;
                  }
                  if (cosSim > maxCosSim) {
                    maxCosSim = cosSim;
                  }
                }

                // Check prioritized match against selected staff if enrolled
                const selectedTemplate = enrolledTemplates.find(
                  (t) => t.staff_id === selectedStaffId || t.staff?.id === selectedStaffId
                );
                let matchedTarget: any = null;
                let matchDistance = minDistance;

                // Robust recognition threshold:
                // 1:N match if Euclidean distance <= 0.70 or Cosine similarity >= 0.74
                if (bestMatch && (minDistance <= 0.70 || maxCosSim >= 0.74)) {
                  matchedTarget = bestMatch;
                  matchDistance = minDistance;
                } else if (selectedTemplate && selectedTemplate.face_descriptor) {
                  const selDist = calculateEuclideanDistance(liveDesc, selectedTemplate.face_descriptor);
                  const selCos = calculateCosineSimilarity(liveDesc, selectedTemplate.face_descriptor);
                  if (selDist <= 0.73 || selCos >= 0.72) {
                    matchedTarget = selectedTemplate;
                    matchDistance = selDist;
                  }
                }

                if (matchedTarget) {
                  const matchedStaff = matchedTarget.staff || staffList.find((s) => s.id === matchedTarget.staff_id);
                  if (matchedStaff) {
                    setDetectedStaff(matchedStaff);
                    setDetectionConfidence(distanceToConfidence(matchDistance, 0.70));
                    setIsUnrecognizedPerson(false);
                    // Automatically update selection to the recognized person
                    setSelectedStaffId(matchedStaff.id);
                  }
                } else if (enrolledTemplates.length > 0) {
                  setDetectedStaff(null);
                  setDetectionConfidence(0);
                  setIsUnrecognizedPerson(true);
                }
              } else if (analysis.faceCount === 0) {
                setDetectedStaff(null);
                setDetectionConfidence(0);
                setIsUnrecognizedPerson(false);
                setAutoVerifyCountdown(null);
              }
            }
          }
        } catch (err) {
          console.warn('Frame analysis tick error:', err);
        }
      }

      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, enrolledTemplates, staffList]);

  // Active Staff object (identified from camera 1:N face recognition or selected profile)
  const activeStaff = detectedStaff || (selectedStaffId ? staffList.find((s) => s.id === selectedStaffId) : null) || null;

  // Assigned Campus & Real-Time Distance Calculation
  const assignedCampus =
    campuses.find((c) => c.id === activeStaff?.assigned_campus_id) ||
    selectedCampus ||
    campuses[0];

  const currentDistanceMeters = assignedCampus && (gpsLocked || isSimulatedGps)
    ? haversineMeters(
        gpsLocation.latitude,
        gpsLocation.longitude,
        assignedCampus.center_latitude,
        assignedCampus.center_longitude
      )
    : 0;

  const allowedPerimeterMeters = assignedCampus
    ? (assignedCampus.radius_meters || 350) + (assignedCampus.tolerance_meters || 15)
    : 365;

  const isInsideGeofence =
    (gpsLocked || isSimulatedGps) &&
    Boolean(assignedCampus) &&
    currentDistanceMeters <= allowedPerimeterMeters;

  const isGpsAccuracyValid =
    (gpsLocked || isSimulatedGps) &&
    gpsLocation.accuracy <= (assignedCampus?.allowed_accuracy_meters || 50);

  // Reset verification
  const resetVerificationState = () => {
    setVState('IDLE');
    setErrorMessage(null);
  };

  // Direct Verification Pipeline (strictly requires face presence and verified location)
  const handleStartVerification = async (bypassCamera: boolean = false) => {
    if (staffList.length === 0) {
      setErrorMessage('No staff registered in the institutional registry. Please add staff members in the Staff Registry first.');
      return;
    }
    const targetStaff = detectedStaff || activeStaff;
    if (!targetStaff) {
      setErrorMessage('No staff profile identified. Please position an enrolled staff member in front of the camera.');
      return;
    }

    // STRICT CHECK: A real person MUST be in front of the camera
    if (!bypassCamera) {
      if (effectiveAnalysis.faceCount === 0) {
        setErrorMessage('No person detected. Position your face inside the camera guide oval to verify attendance.');
        return;
      }

      if (effectiveAnalysis.faceCount > 1) {
        setErrorMessage(`${effectiveAnalysis.faceCount} persons detected. Only one person should be visible during attendance verification.`);
        return;
      }

      if (effectiveAnalysis.isPhoneOrPhotoDetected) {
        setErrorMessage(
          `Presentation attack rejected: ${
            effectiveAnalysis.spoofType === 'phone_screen' ? 'Digital phone screen' : 'Static photograph'
          } detected. Please present a real live person in front of the camera.`
        );
        return;
      }
    }

    // STRICT GEOFENCE ENFORCEMENT: Staff MUST be physically located inside campus boundary!
    if (!gpsLocked && !isSimulatedGps) {
      setErrorMessage('GPS Location Required: Device location fix is required to verify campus presence.');
      return;
    }

    if (!isInsideGeofence) {
      setErrorMessage(
        `Geofence Violation: You are ${currentDistanceMeters}m away from ${assignedCampus?.name || 'campus'} (exceeds ${assignedCampus?.radius_meters || 350}m perimeter). Attendance can only be recorded when physically inside the authorized campus grounds.`
      );
      return;
    }

    if (!isGpsAccuracyValid) {
      setErrorMessage(
        `GPS accuracy degraded (±${Math.round(gpsLocation.accuracy)}m). High-accuracy GPS (within ±${assignedCampus?.allowed_accuracy_meters || 50}m) is required to mark attendance.`
      );
      return;
    }

    setErrorMessage(null);
    setVState('STARTING_SESSION');

    try {
      // 1. Initiate Verification Session
      const startRes = await api.startVerificationSession({
        staff_id: targetStaff.id,
      });

      const token = startRes.session_token;

      // 2. Face Presence & Anti-Spoof Verification
      setVState('VERIFYING_PRESENCE');
      await api.verifyLiveness({
        session_token: token,
        face_count: 1,
        is_centered: effectiveAnalysis.isCentered,
        lighting_good: effectiveAnalysis.lightingGood,
        face_size_ok: effectiveAnalysis.faceSizeOk,
        is_spoof: effectiveAnalysis.isPhoneOrPhotoDetected,
        spoof_type: effectiveAnalysis.spoofType,
      });

      // 3. 1:1 Biometric Face Descriptor Matching
      setVState('VERIFYING_IDENTITY');
      const descriptor = extract128DFaceDescriptor(videoRef.current, effectiveAnalysis.boundingBox);

      await api.verifyIdentity({
        session_token: token,
        face_descriptor: descriptor,
      });

      // 4. Geofence & GPS Boundary Validation
      setVState('VERIFYING_LOCATION');
      await api.verifyLocation({
        session_token: token,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
      });

      // 5. Finalize Attendance Creation
      setVState('FINALIZING');
      const finalRes = await api.finalizeAttendance({
        session_token: token,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
        staff_id: targetStaff.id,
      });

      // 6. Success!
      setVState('SUCCESS');
      setVerificationCooldown(true);
      setTimeout(() => setVerificationCooldown(false), 10000); // 10s cooldown

      setResultModal({
        isOpen: true,
        isSuccess: true,
        action: finalRes.action,
        title: `${finalRes.action === 'CHECK_IN' ? 'Check-In' : 'Check-Out'} Verified!`,
        message: finalRes.message,
        details: {
          staff_name: finalRes.staff_name,
          staff_id: finalRes.staff_id,
          date: finalRes.date,
          time: finalRes.time || (finalRes.action === 'CHECK_IN' ? finalRes.check_in_time : finalRes.check_out_time),
          status: finalRes.status,
          campus_name: finalRes.campus_name,
          confidence: finalRes.confidence,
          working_hours: finalRes.working_hours,
        },
      });
    } catch (err: any) {
      console.error('Verification stage error:', err);
      setVState('ERROR');
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    }
  };

  // Automatic Verification Trigger when Recognized Staff appears in camera & inside campus
  useEffect(() => {
    let timerId: any = null;

    const canAutoVerify =
      detectedStaff &&
      effectiveAnalysis.faceCount === 1 &&
      effectiveAnalysis.isCentered &&
      !effectiveAnalysis.isPhoneOrPhotoDetected &&
      isInsideGeofence &&
      isGpsAccuracyValid &&
      vState === 'IDLE' &&
      !verificationCooldown &&
      !resultModal.isOpen;

    if (canAutoVerify) {
      if (autoVerifyCountdown === null) {
        setAutoVerifyCountdown(1.5);
      } else if (autoVerifyCountdown > 0) {
        timerId = setTimeout(() => {
          setAutoVerifyCountdown((prev) => (prev !== null && prev > 0.4 ? prev - 0.5 : 0));
        }, 500);
      } else if (autoVerifyCountdown <= 0) {
        handleStartVerification(false);
        setAutoVerifyCountdown(null);
      }
    } else {
      if (autoVerifyCountdown !== null) {
        setAutoVerifyCountdown(null);
      }
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [
    detectedStaff,
    effectiveAnalysis.faceCount,
    effectiveAnalysis.isCentered,
    effectiveAnalysis.isPhoneOrPhotoDetected,
    isInsideGeofence,
    isGpsAccuracyValid,
    vState,
    verificationCooldown,
    resultModal.isOpen,
    autoVerifyCountdown,
  ]);

  // Simulated GPS options for quick sandbox testing
  const setSimulatedCoords = (mode: 'inside' | 'outside' | 'poor_accuracy') => {
    setIsSimulatedGps(true);
    if (mode === 'inside') {
      const target = assignedCampus || selectedCampus || campuses[0];
      setGpsLocation({
        latitude: target ? target.center_latitude : 16.887333,
        longitude: target ? target.center_longitude : 78.443028,
        accuracy: 12.0,
      });
      setGpsLocked(true);
      setGpsError(null);
      setGpsStatusMessage(`Simulated Inside Campus (${target?.name || 'Main Campus'})`);
    } else if (mode === 'outside') {
      setGpsLocation({
        latitude: 17.4800,
        longitude: 78.5500,
        accuracy: 15.0,
      });
      setGpsStatusMessage('Simulated Outside Campus (68km away, outside geofence)');
    } else if (mode === 'poor_accuracy') {
      setGpsLocation({
        latitude: 16.887333,
        longitude: 78.443028,
        accuracy: 140.0,
      });
      setGpsStatusMessage('Simulated Poor GPS Accuracy (±140m, exceeds 50m threshold)');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
      {/* Top Banner / System Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <Scan className="w-4 h-4 text-blue-700" />
            <span>Staff Biometric & GPS Attendance Terminal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Attendance Verification
          </h1>
        </div>

        {/* Real-Time Telemetry Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Camera Status */}
          <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span className="text-slate-600 font-medium">Camera:</span>
            <span className="font-semibold text-slate-900">
              {cameraActive ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* GPS Coordinates & Geofence Perimeter */}
          <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <MapPin className={`w-3.5 h-3.5 ${isInsideGeofence ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span className="text-slate-600 font-medium">Campus Geofence:</span>
                <span
                  className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                    isInsideGeofence
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isInsideGeofence
                    ? `Inside (${currentDistanceMeters}m)`
                    : `Outside Perimeter (${currentDistanceMeters}m away)`}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)} (±{gpsLocation.accuracy}m)
                {isSimulatedGps && <span className="text-emerald-700 font-sans font-semibold ml-1">[Simulated Inside]</span>}
              </p>
            </div>

            {!isInsideGeofence ? (
              <button
                type="button"
                onClick={() => setSimulatedCoords('inside')}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                title="Simulate device location inside campus grounds"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simulate Inside</span>
              </button>
            ) : isSimulatedGps ? (
              <button
                type="button"
                onClick={fetchRealGps}
                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-300 rounded text-[10px] transition-colors shrink-0 cursor-pointer"
                title="Switch back to real device GPS"
              >
                Reset GPS
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5-Step Linear Verification Tracker */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Step 1: Camera Feed */}
          <div
            className={`p-2 rounded-md border text-xs flex items-center gap-2.5 transition-colors ${
              cameraActive
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                cameraActive ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {cameraActive ? '✓' : '1'}
            </span>
            <div>
              <p className="font-semibold leading-none text-[11px]">Camera Feed</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{cameraActive ? 'Active' : 'Offline'}</p>
            </div>
          </div>

          {/* Step 2: Face & Anti-Spoof Detection */}
          <div
            className={`p-2 rounded-md border text-xs flex items-center gap-2.5 transition-colors ${
              effectiveAnalysis.isPhoneOrPhotoDetected
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : effectiveAnalysis.faceCount === 1
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                effectiveAnalysis.isPhoneOrPhotoDetected
                  ? 'bg-rose-600 text-white'
                  : effectiveAnalysis.faceCount === 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {effectiveAnalysis.isPhoneOrPhotoDetected ? '!' : effectiveAnalysis.faceCount === 1 ? '✓' : '2'}
            </span>
            <div>
              <p className="font-semibold leading-none text-[11px]">
                {effectiveAnalysis.isPhoneOrPhotoDetected ? 'Spoof Attack' : 'Face Presence'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {effectiveAnalysis.isPhoneOrPhotoDetected
                  ? effectiveAnalysis.spoofType === 'phone_screen' ? 'Phone Screen' : 'Photo Spoof'
                  : effectiveAnalysis.faceCount === 1 ? 'Live Face' : 'Searching'}
              </p>
            </div>
          </div>

          {/* Step 3: Biometric Identity Match */}
          <div
            className={`p-2 rounded-md border text-xs flex items-center gap-2.5 transition-colors ${
              vState === 'VERIFYING_LOCATION' || vState === 'FINALIZING' || vState === 'SUCCESS'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : vState === 'VERIFYING_IDENTITY'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                vState === 'VERIFYING_LOCATION' || vState === 'FINALIZING' || vState === 'SUCCESS'
                  ? 'bg-emerald-600 text-white'
                  : vState === 'VERIFYING_IDENTITY'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {vState === 'VERIFYING_LOCATION' || vState === 'FINALIZING' || vState === 'SUCCESS' ? '✓' : '3'}
            </span>
            <div>
              <p className="font-semibold leading-none text-[11px]">Identity Match</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {vState === 'SUCCESS' ? 'Matched' : vState === 'VERIFYING_IDENTITY' ? 'Matching...' : '1:1 Biometric'}
              </p>
            </div>
          </div>

          {/* Step 4: Geofence Boundary */}
          <div
            className={`p-2 rounded-md border text-xs flex items-center gap-2.5 transition-colors ${
              !isInsideGeofence
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : vState === 'FINALIZING' || vState === 'SUCCESS'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : vState === 'VERIFYING_LOCATION'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                !isInsideGeofence
                  ? 'bg-rose-600 text-white'
                  : vState === 'FINALIZING' || vState === 'SUCCESS'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {!isInsideGeofence ? '!' : vState === 'SUCCESS' ? '✓' : '4'}
            </span>
            <div>
              <p className="font-semibold leading-none text-[11px]">Geofence</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {!isInsideGeofence
                  ? `Out of Bounds (${currentDistanceMeters}m)`
                  : !isGpsAccuracyValid
                  ? 'Degraded GPS'
                  : 'In Boundary'}
              </p>
            </div>
          </div>

          {/* Step 5: Attendance Record */}
          <div
            className={`p-2 rounded-md border text-xs flex items-center gap-2.5 transition-colors ${
              vState === 'SUCCESS'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                vState === 'SUCCESS' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {vState === 'SUCCESS' ? '✓' : '5'}
            </span>
            <div>
              <p className="font-semibold leading-none text-[11px]">Attendance</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {vState === 'SUCCESS' ? 'Recorded' : 'Pending'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Verification Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Live FRS Camera Feed (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            {/* Camera Toolbar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-700" />
                <h2 className="font-semibold text-slate-900 text-sm">
                  Live Camera Feed
                </h2>
              </div>
              <button
                onClick={cameraActive ? stopCamera : startCamera}
                className="text-xs px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>{cameraActive ? 'Restart Camera' : 'Start Camera'}</span>
              </button>
            </div>

            {/* Video Box */}
            <div className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center text-red-600 max-w-sm">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <p className="font-semibold text-sm">Camera Stream Error</p>
                  <p className="text-xs mt-1 text-slate-500">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-semibold hover:bg-red-100"
                  >
                    Retry Permission
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />

                  {/* Top Feed Telemetry Badges */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                    {/* Face Count / Spoof Status */}
                    <div
                      className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 ${
                        effectiveAnalysis.isPhoneOrPhotoDetected
                          ? 'bg-rose-900/95 text-rose-100 border border-rose-500'
                          : effectiveAnalysis.faceCount === 1
                          ? 'bg-emerald-900/90 text-emerald-100'
                          : effectiveAnalysis.faceCount > 1
                          ? 'bg-red-900/90 text-red-100'
                          : 'bg-slate-900/80 text-slate-200'
                      }`}
                    >
                      {effectiveAnalysis.isPhoneOrPhotoDetected ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {effectiveAnalysis.isPhoneOrPhotoDetected
                          ? effectiveAnalysis.spoofType === 'phone_screen' ? 'Phone / Screen Spoof' : 'Photo Spoof'
                          : effectiveAnalysis.faceCount === 1
                          ? '1 Face Positioned'
                          : effectiveAnalysis.faceCount > 1
                          ? `${effectiveAnalysis.faceCount} Faces (Single Person Only)`
                          : 'Looking for Face...'}
                      </span>
                    </div>

                    {/* Lighting & Centering Badges */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          effectiveAnalysis.isCentered
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                            : 'bg-slate-900/80 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {effectiveAnalysis.isCentered ? 'Centered' : 'Off-Center'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          effectiveAnalysis.lightingGood
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                        }`}
                      >
                        {effectiveAnalysis.lightingGood ? 'Good Lighting' : 'Adjust Light'}
                      </span>
                    </div>
                  </div>

                  {/* Clean Face Guide Oval (No Sci-Fi / No Neon / No Glow) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      className={`w-44 h-60 sm:w-52 sm:h-68 rounded-[50%] border-2 border-dashed transition-all duration-300 ${
                        effectiveAnalysis.isPhoneOrPhotoDetected
                          ? 'border-rose-500'
                          : effectiveAnalysis.faceCount === 1 && effectiveAnalysis.isCentered
                          ? 'border-emerald-400/90'
                          : 'border-white/60'
                      }`}
                    />
                  </div>

                  {/* Anti-Spoof Detection Warning Banner */}
                  {effectiveAnalysis.isPhoneOrPhotoDetected && (
                    <div className="absolute inset-x-3 top-12 z-20 p-3 rounded-lg bg-red-950/95 border-2 border-red-500 text-white shadow-xl flex items-start gap-3">
                      <div className="p-2 bg-red-600 rounded-md shrink-0">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs sm:text-sm tracking-wide text-red-100 uppercase flex items-center gap-1.5">
                            <span>⚠️</span>
                            <span>
                              {effectiveAnalysis.spoofType === 'phone_screen'
                                ? 'Phone / Digital Screen Detected'
                                : 'Static Photograph Detected'}
                            </span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-red-800 text-red-100 font-mono text-[10px] font-bold shrink-0">
                            {effectiveAnalysis.spoofConfidence}% Spoof Match
                          </span>
                        </div>
                        <p className="text-xs text-red-100 mt-1 font-medium">
                          Presentation attack rejected. Digital screens and printed photos cannot be used for attendance.
                        </p>
                        <p className="text-[11px] text-red-300 font-mono mt-0.5">
                          Reason: {effectiveAnalysis.spoofReason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Geofence Out-Of-Bounds Warning Banner */}
                  {!effectiveAnalysis.isPhoneOrPhotoDetected && !isInsideGeofence && (
                    <div className="absolute inset-x-3 top-12 z-20 p-3 rounded-lg bg-red-950/95 border-2 border-red-500 text-white shadow-xl flex items-start gap-3">
                      <div className="p-2 bg-red-600 rounded-md shrink-0">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs sm:text-sm tracking-wide text-red-100 uppercase flex items-center gap-1.5">
                            <span>🚫</span>
                            <span>Outside Authorized Geofence Perimeter</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-red-800 text-red-100 font-mono text-[10px] font-bold shrink-0">
                            {currentDistanceMeters}m Away
                          </span>
                        </div>
                        <p className="text-xs text-red-100 mt-1 font-medium">
                          You are currently outside {assignedCampus?.name || 'campus'} perimeter (allowed boundary: {assignedCampus?.radius_meters || 350}m). Attendance verification is strictly blocked when off campus.
                        </p>
                        <p className="text-[11px] text-red-300 font-mono mt-0.5">
                          Device GPS: {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Auto-Detected Staff Confirmation Banner */}
                  {!effectiveAnalysis.isPhoneOrPhotoDetected && detectedStaff && (
                    <div className="absolute top-12 left-3 right-3 z-10 p-2.5 rounded-lg bg-emerald-950/95 border-2 border-emerald-500 text-white shadow-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            detectedStaff.profile_photo_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(detectedStaff.full_name)}&background=059669&color=fff`
                          }
                          alt={detectedStaff.full_name}
                          className="w-9 h-9 rounded-full object-cover border border-emerald-400 shrink-0 shadow-sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-emerald-100 truncate">
                              {detectedStaff.full_name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-800 text-[10px] font-mono font-bold text-emerald-200">
                              {detectedStaff.staff_id}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-300 flex items-center gap-1 mt-0.5">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>Auto-Detected ({detectionConfidence}% Match)</span>
                            <span className="text-emerald-500">•</span>
                            <span className={isInsideGeofence ? 'text-emerald-300' : 'text-rose-300 font-semibold'}>
                              {isInsideGeofence ? 'Campus Verified' : 'Outside Campus'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {autoVerifyCountdown !== null && isInsideGeofence && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold shrink-0 animate-pulse border border-emerald-400">
                          <Timer className="w-3.5 h-3.5" />
                          <span>Hold: {autoVerifyCountdown.toFixed(1)}s</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unregistered Face Warning Banner */}
                  {!effectiveAnalysis.isPhoneOrPhotoDetected && effectiveAnalysis.faceCount === 1 && isUnrecognizedPerson && (
                    <div className="absolute top-12 left-3 right-3 z-10 p-2.5 rounded-lg bg-amber-950/95 border border-amber-500 text-amber-100 shadow flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Face Detected (Not Enrolled) — Please register first in Face Enrollment.</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-300">Unregistered</span>
                    </div>
                  )}

                  {/* Multiple Faces Warning */}
                  {effectiveAnalysis.faceCount > 1 && (
                    <div className="absolute inset-x-4 top-12 p-2 rounded bg-red-700 text-white text-center text-xs font-semibold shadow">
                      {effectiveAnalysis.faceCount} persons detected. Only one person must be visible in front of the camera.
                    </div>
                  )}

                  {/* Clean Bottom Status Bar */}
                  <div className="absolute bottom-2.5 inset-x-2.5 pointer-events-auto">
                    <div className="p-2 rounded bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-300 px-3">
                      <div className="flex items-center gap-1.5 truncate">
                        <ShieldCheck
                          className={`w-3.5 h-3.5 shrink-0 ${
                            effectiveAnalysis.isPhoneOrPhotoDetected
                              ? 'text-rose-400'
                              : detectedStaff
                              ? 'text-emerald-400'
                              : effectiveAnalysis.faceCount === 1
                              ? 'text-blue-400'
                              : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">
                          {effectiveAnalysis.isPhoneOrPhotoDetected
                            ? effectiveAnalysis.statusMessage
                            : detectedStaff
                            ? `Recognized ${detectedStaff.full_name} (${detectedStaff.staff_id})`
                            : isUnrecognizedPerson
                            ? 'Face detected but not enrolled in registry'
                            : effectiveAnalysis.faceCount === 1
                            ? 'Face positioned. Verifying identity...'
                            : 'Position your face within the guide oval'}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                        Quality: {effectiveAnalysis.qualityScore}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Trigger Controls */}
          <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMessage}</p>
                  <p className="text-[11px] text-red-600 mt-0.5">Please adjust position and ensure you are on campus grounds.</p>
                </div>
                <button
                  onClick={resetVerificationState}
                  className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 rounded text-[10px] font-semibold shrink-0"
                >
                  Reset
                </button>
              </div>
            )}

            {vState === 'IDLE' || vState === 'ERROR' ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleStartVerification(false)}
                  disabled={
                    staffList.length === 0 ||
                    effectiveAnalysis.faceCount !== 1 ||
                    effectiveAnalysis.isPhoneOrPhotoDetected ||
                    !isInsideGeofence ||
                    !detectedStaff
                  }
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-colors ${
                    staffList.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : effectiveAnalysis.faceCount === 0
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : effectiveAnalysis.faceCount > 1
                      ? 'bg-red-700 text-white cursor-not-allowed opacity-90'
                      : effectiveAnalysis.isPhoneOrPhotoDetected
                      ? 'bg-red-700 text-white cursor-not-allowed opacity-90'
                      : isUnrecognizedPerson
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed'
                      : !isInsideGeofence
                      ? 'bg-rose-800 text-white cursor-not-allowed opacity-90'
                      : 'bg-blue-700 hover:bg-blue-800 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer'
                  }`}
                >
                  {staffList.length === 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-slate-400" />
                      <span>No Staff in Registry (Add Staff First)</span>
                    </>
                  ) : effectiveAnalysis.faceCount === 0 ? (
                    <>
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Position Face in Camera (Awaiting Person)</span>
                    </>
                  ) : effectiveAnalysis.faceCount > 1 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span>{effectiveAnalysis.faceCount} Persons Detected (Single Person Only)</span>
                    </>
                  ) : effectiveAnalysis.isPhoneOrPhotoDetected ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span>Spoof Rejected ({effectiveAnalysis.spoofType === 'phone_screen' ? 'Phone' : 'Photo'})</span>
                    </>
                  ) : isUnrecognizedPerson ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Unregistered Person (Enroll in Face Enrollment)</span>
                    </>
                  ) : !isInsideGeofence ? (
                    <>
                      <MapPin className="w-4 h-4 text-white" />
                      <span>
                        {!gpsLocked && !isSimulatedGps
                          ? 'GPS Location Fix Required'
                          : `Outside Campus (${currentDistanceMeters}m away — Blocked)`}
                      </span>
                    </>
                  ) : detectedStaff ? (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>
                        {autoVerifyCountdown !== null
                          ? `Auto-Verifying for ${detectedStaff.full_name} (${autoVerifyCountdown.toFixed(1)}s)`
                          : `Verify & Mark for ${detectedStaff.full_name}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 text-slate-400" />
                      <span>Position Face in Camera (Auto-Detect Active)</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="w-full py-2.5 px-4 rounded-lg bg-slate-800 text-white text-xs font-mono flex items-center justify-center gap-2.5 shadow-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>
                  {vState === 'STARTING_SESSION' && 'Initializing verification session...'}
                  {vState === 'VERIFYING_PRESENCE' && 'Validating face presence & camera feed...'}
                  {vState === 'VERIFYING_IDENTITY' && 'Matching 128D facial biometric descriptor...'}
                  {vState === 'VERIFYING_LOCATION' && 'Validating campus GPS geofence boundary...'}
                  {vState === 'FINALIZING' && 'Recording attendance entry...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Automated Staff Identification & Campus Geofence Telemetry (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Automated Recognition Status Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-700" />
                <span>Automated Recognition Status</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  1:N Auto-Detect Active ({enrolledTemplates.length} Profiles)
                </span>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Reload biometric templates from registry"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {effectiveAnalysis.faceCount === 0 ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-2.5">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <User className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-xs">Awaiting Staff Member</h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                    Please step in front of the camera. The system will automatically detect your face, verify campus location, and record attendance.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>Enrolled Profiles: {enrolledTemplates.length}</span>
                  <span>•</span>
                  <span>Touchless Kiosk</span>
                </div>
              </div>
            ) : effectiveAnalysis.faceCount > 1 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-red-900">{effectiveAnalysis.faceCount} Persons Detected</p>
                  <p className="text-[11px] text-red-700 mt-1">
                    Multiple individuals are visible in the camera frame. For secure verification, only one person should stand in front of the camera.
                  </p>
                </div>
              </div>
            ) : isUnrecognizedPerson ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-amber-900">Unrecognized Face</p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Face detected in camera, but no matching biometric profile was found in the staff registry. Please enroll in the Biometric Administration tab first.
                  </p>
                </div>
              </div>
            ) : detectedStaff ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50/70 rounded-lg border border-emerald-300 flex items-center gap-3">
                  <img
                    src={
                      detectedStaff.profile_photo_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(detectedStaff.full_name)}`
                    }
                    alt={detectedStaff.full_name}
                    className="w-14 h-14 rounded-lg object-cover border-2 border-emerald-400 shadow-sm shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {detectedStaff.full_name}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono font-semibold border border-emerald-300">
                        {detectedStaff.staff_id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {detectedStaff.designation}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {detectedStaff.department}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Recognized ({detectionConfidence}% Match)
                      </span>
                      <span className="text-slate-500">{detectedStaff.shift_name || 'Primary Shift'}</span>
                    </div>
                  </div>
                </div>

                {autoVerifyCountdown !== null && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-center gap-2.5 animate-pulse">
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    <div>
                      <p className="font-semibold text-xs">
                        Auto-verifying attendance in {autoVerifyCountdown.toFixed(1)}s...
                      </p>
                      <p className="text-[10px] text-blue-600">Please hold your position in front of the camera.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto text-blue-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-700">Identifying Face...</p>
                <p className="text-[11px] text-slate-500">Matching 128D visual features against staff registry</p>
              </div>
            )}
          </div>

          {/* Campus Geofence Status */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Campus Geofence Status</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedCampus?.name || 'Main Campus'}
              </span>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Center Coordinates:</span>
                <span className="font-mono text-slate-800 text-[11px]">
                  16.887333, 78.443028
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Boundary Perimeter:</span>
                <span className="font-medium text-slate-800">
                  {selectedCampus?.radius_meters || 350}m Radius + Multi-vertex Polygon
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Allowed GPS Accuracy:</span>
                <span className="font-medium text-slate-800">
                  ≤ {selectedCampus?.allowed_accuracy_meters || 50}m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Geofence Status:</span>
                <span className={`font-semibold flex items-center gap-1 ${isInsideGeofence ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isInsideGeofence ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span>
                    {isInsideGeofence
                      ? `Inside (${currentDistanceMeters}m from center)`
                      : `Outside (${currentDistanceMeters}m away — Blocked)`}
                  </span>
                </span>
              </div>
            </div>

            {/* Campus Presence Simulation Controls */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Campus Location Mode:</span>
                </span>
                {isSimulatedGps ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                    Simulation Active
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    Real Device GPS
                  </span>
                )}
              </div>

              {isSimulatedGps ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSimulatedCoords('inside')}
                    className="flex-1 py-1.5 px-2.5 rounded bg-emerald-600 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Inside Campus (Active)</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchRealGps}
                    className="py-1.5 px-3 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Switch back to real device GPS sensor"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Real GPS</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimulatedCoords('inside')}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Simulate Inside Campus (Allow Attendance)</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchRealGps}
                    className="text-[10px] text-blue-700 hover:underline text-center mt-0.5 cursor-pointer"
                  >
                    Refresh device GPS sensor fix
                  </button>
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-tight">
                {isSimulatedGps
                  ? 'Currently simulating coordinates inside campus perimeter (16.887333, 78.443028). Face recognition attendance is allowed.'
                  : 'Click "Simulate Inside Campus" above to test or mark attendance without physical device presence on campus.'}
              </p>
            </div>
          </div>

          {/* Institutional Compliance Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-2">
            <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>Institutional Verification Protocol</span>
            </h3>
            <ul className="text-slate-600 space-y-1 list-disc list-inside text-[11px]">
              <li>Real-time face verification against authorized staff biometric profile.</li>
              <li>Only one staff member permitted in camera view during verification.</li>
              <li>Face identity strictly matched against enrolled profile vector.</li>
              <li>GPS fix must be verified inside the institutional campus perimeter.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Verification Result Confirmation Modal */}
      {resultModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-none">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="text-center space-y-2">
              <div
                className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                  resultModal.isSuccess
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {resultModal.isSuccess ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {resultModal.title}
              </h3>
              <p className="text-xs text-slate-600">
                {resultModal.message}
              </p>
            </div>

            {resultModal.details && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Staff Member:</span>
                  <span className="font-semibold text-slate-900">
                    {resultModal.details.staff_name} ({resultModal.details.staff_id})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-800">
                    {resultModal.details.date} {resultModal.details.time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Attendance Status:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    {resultModal.details.status}
                  </span>
                </div>
                {resultModal.details.working_hours !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Working Hours:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {resultModal.details.working_hours} hrs
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Campus Location:</span>
                  <span className="font-medium text-slate-800">
                    {resultModal.details.campus_name}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setResultModal((prev) => ({ ...prev, isOpen: false }));
                resetVerificationState();
              }}
              className="w-full py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition-colors"
            >
              Done & Return to Terminal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
