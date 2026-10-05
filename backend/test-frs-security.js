const BASE_URL = 'http://localhost:5000/api';

async function runSecurityTests() {
  console.log('🔒 Running Critical FRS Security & Liveness Test Suite...\n');

  // 1. Admin Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@vuppala.edu', password: 'Admin@12345' }),
  }).then(r => r.json());
  const token = loginRes.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. Fetch staff members
  const staffRes = await fetch(`${BASE_URL}/staff`, { headers: authHeaders }).then(r => r.json());
  const enrolledStaffList = staffRes.staff.filter(s => s.face_enrollment_status === 'Enrolled');
  // Fetch campuses
  const campusesRes = await fetch(`${BASE_URL}/campuses`, { headers: authHeaders }).then(r => r.json());
  const campus = campusesRes.campuses[0];

  // Create a dedicated fresh test staff member with enrolled biometrics
  const testTimestamp = Date.now();
  const testStaffCode = `TEST-${testTimestamp.toString().slice(-4)}`;
  const createRes = await fetch(`${BASE_URL}/staff`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      staff_id: testStaffCode,
      full_name: 'Security Evaluation Subject',
      gender: 'Female',
      date_of_birth: '1994-06-20',
      phone: '+91 98888 77777',
      email: `sec_${testTimestamp}@vuppala.edu`,
      address: 'Institutional Test Lab',
      designation: 'FRS Testing Specialist',
      department: 'Administration',
      joining_date: '2024-01-01',
      employment_status: 'Active',
      assigned_shift_id: 'shift_primary_morning',
      assigned_campus_id: campus.id,
      face_enrollment_status: 'Enrolled',
    }),
  }).then(r => r.json());
  const staffA = {
    id: createRes.staff_id,
    staff_id: testStaffCode,
    full_name: 'Security Evaluation Subject',
  };

  const seedA = 42;
  const descriptorA = Array.from({ length: 128 }, (_, idx) => Math.sin((idx + 1) * seedA) * 0.1);

  // Enroll template for staffA
  await fetch(`${BASE_URL}/biometrics/enroll`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      staff_id: staffA.id,
      face_descriptor: descriptorA,
      sample_count: 3,
      consent_given: true,
    }),
  });

  // Pick Staff B from existing enrolled staff
  const staffB = enrolledStaffList[0];
  const seedB = parseInt(staffB.staff_id.replace(/\D/g, '')) || 2;
  const descriptorB = Array.from({ length: 128 }, (_, idx) => Math.sin((idx + 1) * seedB) * 0.1);

  console.log(`Staff A (Target Subject): ${staffA.full_name} (${staffA.staff_id})`);
  console.log(`Staff B (Impersonator): ${staffB.full_name} (${staffB.staff_id})\n`);

  // =========================================================================
  // TEST 1: STATIC PHOTO / SCREEN REJECTION (FLAT EAR TELEMETRY)
  // =========================================================================
  console.log('--- TEST 1: STATIC PHOTO / SCREEN REJECTION ---');
  const session1Res = await fetch(`${BASE_URL}/attendance/verification/start`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ staff_id: staffA.id }),
  }).then(r => r.json());

  const flatEarTelemetry = {
    session_token: session1Res.session_token,
    ear_history: [0.30, 0.30, 0.30, 0.30, 0.30], // Invariant EAR = photo held up
    face_count: 1,
    blink_detected: false,
    is_centered: true,
    lighting_good: true,
    face_size_ok: true,
  };
  const liveFailRes = await fetch(`${BASE_URL}/attendance/verification/liveness`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(flatEarTelemetry),
  });
  const liveFailJson = await liveFailRes.json();
  const test1Passed = liveFailJson.error && liveFailJson.error.includes('Static photo');
  console.log(test1Passed ? '✅ PASS' : '❌ FAIL', 'Static Photo Detected & Rejected:', liveFailJson.error);

  // =========================================================================
  // TEST 2: MULTIPLE FACES REJECTION
  // =========================================================================
  console.log('\n--- TEST 2: MULTIPLE FACES REJECTION ---');
  const multiFaceTelemetry = {
    session_token: session1Res.session_token,
    ear_history: [0.32, 0.28, 0.16, 0.29, 0.31],
    face_count: 2, // 2 people visible
    blink_detected: true,
    is_centered: true,
    lighting_good: true,
    face_size_ok: true,
  };
  const multiFaceRes = await fetch(`${BASE_URL}/attendance/verification/liveness`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(multiFaceTelemetry),
  });
  const multiFaceJson = await multiFaceRes.json();
  const test2Expected = 'Only one person should be visible during attendance verification.';
  const test2Passed = multiFaceJson.error === test2Expected;
  console.log(test2Passed ? '✅ PASS' : '❌ FAIL', 'Multiple Faces Rejected:', multiFaceJson.error);

  // =========================================================================
  // TEST 3: FACE QUALITY (NOT CENTERED / POOR LIGHTING) REJECTION
  // =========================================================================
  console.log('\n--- TEST 3: FACE QUALITY REJECTION ---');
  const poorQualityTelemetry = {
    session_token: session1Res.session_token,
    ear_history: [0.32, 0.28, 0.16, 0.29, 0.31],
    face_count: 1,
    blink_detected: true,
    is_centered: false, // Not centered
    lighting_good: true,
    face_size_ok: true,
  };
  const poorQualityRes = await fetch(`${BASE_URL}/attendance/verification/liveness`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(poorQualityTelemetry),
  });
  const poorQualityJson = await poorQualityRes.json();
  const test3Expected = 'Face is not clear. Please position yourself in front of the camera.';
  const test3Passed = poorQualityJson.error === test3Expected;
  console.log(test3Passed ? '✅ PASS' : '❌ FAIL', 'Poor Quality Rejected:', poorQualityJson.error);

  // =========================================================================
  // TEST 4: VALID LIVENESS BLINK TRANSITION PASS
  // =========================================================================
  console.log('\n--- TEST 4: VALID LIVENESS BLINK TRANSITION PASS ---');
  const validBlinkTelemetry = {
    session_token: session1Res.session_token,
    ear_history: [0.32, 0.28, 0.15, 0.14, 0.29, 0.32], // Natural open -> closed -> open
    face_count: 1,
    blink_detected: true,
    blink_count: 2,
    is_centered: true,
    lighting_good: true,
    face_size_ok: true,
  };
  const validBlinkRes = await fetch(`${BASE_URL}/attendance/verification/liveness`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(validBlinkTelemetry),
  });
  const validBlinkJson = await validBlinkRes.json();
  const test4Passed = validBlinkJson.success === true;
  console.log(test4Passed ? '✅ PASS' : '❌ FAIL', 'Liveness Challenge Verified:', validBlinkJson.message);

  // =========================================================================
  // TEST 5: ANTI-WRONG-PERSON REJECTION (STAFF B BLINKED FOR STAFF A)
  // =========================================================================
  console.log('\n--- TEST 5: ANTI-WRONG-PERSON REJECTION ---');
  const wrongPersonRes = await fetch(`${BASE_URL}/attendance/verification/identity`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      session_token: session1Res.session_token,
      face_descriptor: descriptorB, // Staff B's face descriptor for Staff A's session!
    }),
  });
  const wrongPersonJson = await wrongPersonRes.json();
  const test5Expected = 'Face does not match the registered staff member.';
  const test5Passed = wrongPersonJson.error === test5Expected;
  console.log(test5Passed ? '✅ PASS' : '❌ FAIL', 'Wrong Person Rejected:', wrongPersonJson.error);

  // =========================================================================
  // TEST 6: LEGITIMATE IDENTITY MATCH PASS (STAFF A)
  // =========================================================================
  console.log('\n--- TEST 6: LEGITIMATE IDENTITY MATCH PASS ---');
  const correctPersonRes = await fetch(`${BASE_URL}/attendance/verification/identity`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      session_token: session1Res.session_token,
      face_descriptor: descriptorA, // Staff A's authentic descriptor
    }),
  });
  const correctPersonJson = await correctPersonRes.json();
  const test6Passed = correctPersonJson.success === true;
  console.log(test6Passed ? '✅ PASS' : '❌ FAIL', 'Identity Match Passed:', correctPersonJson.message, `Confidence: ${correctPersonJson.confidence}%`);

  // =========================================================================
  // TEST 7: GPS OUTSIDE CAMPUS REJECTION
  // =========================================================================
  console.log('\n--- TEST 7: GPS OUTSIDE CAMPUS REJECTION ---');
  const outsideLocRes = await fetch(`${BASE_URL}/attendance/verification/location`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      session_token: session1Res.session_token,
      latitude: 17.550000,
      longitude: 78.650000, // 15km away
      accuracy: 12.0,
    }),
  });
  const outsideLocJson = await outsideLocRes.json();
  const test7Expected = 'Attendance cannot be recorded because you are outside the authorized campus area.';
  const test7Passed = outsideLocJson.error === test7Expected;
  console.log(test7Passed ? '✅ PASS' : '❌ FAIL', 'Outside Campus Rejected:', outsideLocJson.error);

  // =========================================================================
  // TEST 8: GPS POOR ACCURACY REJECTION
  // =========================================================================
  console.log('\n--- TEST 8: GPS POOR ACCURACY REJECTION ---');
  const poorAccRes = await fetch(`${BASE_URL}/attendance/verification/location`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      session_token: session1Res.session_token,
      latitude: campus.center_latitude,
      longitude: campus.center_longitude,
      accuracy: 150.0, // > 50m
    }),
  });
  const poorAccJson = await poorAccRes.json();
  const test8Expected = 'Location accuracy is insufficient. Please move to an area with better GPS reception.';
  const test8Passed = poorAccJson.error === test8Expected;
  console.log(test8Passed ? '✅ PASS' : '❌ FAIL', 'Poor GPS Accuracy Rejected:', poorAccJson.error);

  // Now pass valid location
  await fetch(`${BASE_URL}/attendance/verification/location`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      session_token: session1Res.session_token,
      latitude: campus.center_latitude,
      longitude: campus.center_longitude,
      accuracy: 10.0,
    }),
  });

  // =========================================================================
  // TEST 9: FINALIZE ATTENDANCE (VALID SESSION)
  // =========================================================================
  console.log('\n--- TEST 9: FINALIZE ATTENDANCE ---');
  const finalizeRes = await fetch(`${BASE_URL}/attendance/verification/finalize`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      session_token: session1Res.session_token,
      latitude: campus.center_latitude,
      longitude: campus.center_longitude,
      accuracy: 10.0,
    }),
  });
  const finalizeJson = await finalizeRes.json();
  const test9Passed = finalizeJson.success === true;
  console.log(test9Passed ? '✅ PASS' : '❌ FAIL', 'Attendance Finalized:', finalizeJson.message);

  // =========================================================================
  // TEST 10: ONE-TIME TOKEN REPLAY PREVENTION
  // =========================================================================
  console.log('\n--- TEST 10: ONE-TIME TOKEN REPLAY PREVENTION ---');
  const replayRes = await fetch(`${BASE_URL}/attendance/verification/finalize`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      session_token: session1Res.session_token, // Re-submitting consumed token
      latitude: campus.center_latitude,
      longitude: campus.center_longitude,
      accuracy: 10.0,
    }),
  });
  const replayJson = await replayRes.json();
  const test10Passed = replayJson.error && replayJson.error.includes('already been used');
  console.log(test10Passed ? '✅ PASS' : '❌ FAIL', 'Replay Blocked:', replayJson.error);

  // =========================================================================
  // TEST 11: ADMIN DIAGNOSTICS & TELEMETRY API
  // =========================================================================
  console.log('\n--- TEST 11: ADMIN DIAGNOSTICS API ---');
  const diagRes = await fetch(`${BASE_URL}/attendance/verification/diagnostics`, {
    headers: authHeaders,
  }).then(r => r.json());
  const test11Passed = diagRes.sessions && diagRes.sessions.length > 0;
  console.log(test11Passed ? '✅ PASS' : '❌ FAIL', 'Admin Diagnostics Active:', `Retrieved ${diagRes.sessions?.length} sessions, ${diagRes.stats?.completed_attendances} completed attendances.`);

  console.log('\n🎉 ALL 11 SECURITY & ANTI-SPOOF TESTS EXECUTED SUCCESSFULLY!');
}

runSecurityTests().catch(err => {
  console.error('Security tests error:', err);
  process.exit(1);
});
