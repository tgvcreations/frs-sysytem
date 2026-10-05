import { CampusGeofence } from '../types';

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the high-precision Haversine formula (in meters).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180.0;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Ray-Casting algorithm for determining if a point (lat, lng) is inside
 * a multi-point polygon boundary.
 * @param point [latitude, longitude]
 * @param polygon Array of [latitude, longitude] vertices
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (!polygon || polygon.length < 3) {
    return false;
  }

  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

export interface GeofenceValidationResult {
  isValid: boolean;
  error?: string;
  distanceMeters: number;
  campusName: string;
  geofenceType: string;
  accuracyProvided: number;
  accuracyAllowed: number;
}

/**
 * Comprehensive Backend Geofence Verification.
 * Never trusts frontend geofencing checks alone.
 */
export function verifyLocationAgainstCampus(
  latitude: number,
  longitude: number,
  accuracy: number,
  campus: CampusGeofence
): GeofenceValidationResult {
  if (!campus.is_active) {
    return {
      isValid: false,
      error: 'Assigned campus geofence is currently inactive. Contact administrator.',
      distanceMeters: 0,
      campusName: campus.name,
      geofenceType: campus.geofence_type,
      accuracyProvided: accuracy,
      accuracyAllowed: campus.allowed_accuracy_meters,
    };
  }

  // 1. Evaluate GPS Accuracy
  if (accuracy > campus.allowed_accuracy_meters) {
    return {
      isValid: false,
      error: 'Location accuracy is insufficient. Please move to an area with better GPS reception.',
      distanceMeters: 0,
      campusName: campus.name,
      geofenceType: campus.geofence_type,
      accuracyProvided: accuracy,
      accuracyAllowed: campus.allowed_accuracy_meters,
    };
  }

  // 2. Compute distance from campus center
  const distance = calculateHaversineDistance(
    latitude,
    longitude,
    campus.center_latitude,
    campus.center_longitude
  );

  let isInside = false;

  // 3. Evaluate by geofence type
  if (campus.geofence_type === 'circle') {
    // Circle boundary check (radius + tolerance buffer)
    isInside = distance <= campus.radius_meters + campus.tolerance_meters;
  } else if (campus.geofence_type === 'polygon') {
    // Polygon boundary check via Ray-Casting
    const inPoly = isPointInPolygon([latitude, longitude], campus.polygon_coordinates);
    isInside = inPoly;
  } else if (campus.geofence_type === 'both') {
    // Allowed if inside polygon OR within circular radius + tolerance
    const inPoly = isPointInPolygon([latitude, longitude], campus.polygon_coordinates);
    const inCircle = distance <= campus.radius_meters + campus.tolerance_meters;
    isInside = inPoly || inCircle;
  }

  if (!isInside) {
    return {
      isValid: false,
      error: 'Attendance cannot be recorded because you are outside the authorized campus area.',
      distanceMeters: Math.round(distance),
      campusName: campus.name,
      geofenceType: campus.geofence_type,
      accuracyProvided: accuracy,
      accuracyAllowed: campus.allowed_accuracy_meters,
    };
  }

  return {
    isValid: true,
    distanceMeters: Math.round(distance),
    campusName: campus.name,
    geofenceType: campus.geofence_type,
    accuracyProvided: accuracy,
    accuracyAllowed: campus.allowed_accuracy_meters,
  };
}

