import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { CampusGeofence } from '../types';
import { MapContainer, TileLayer, Circle, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Compass,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Sparkles,
  Layers,
  Crosshair,
  Building,
} from 'lucide-react';

// Fix Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Map click handler component to capture clicks for center or polygon vertex
function MapClickHandler({
  mode,
  onMapClick,
}: {
  mode: 'none' | 'set_center' | 'add_vertex';
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (mode !== 'none') {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export const GeofencePage: React.FC = () => {
  const [campuses, setCampuses] = useState<CampusGeofence[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Editor State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [centerLat, setCenterLat] = useState<number>(16.887333);
  const [centerLng, setCenterLng] = useState<number>(78.443028);
  const [radiusMeters, setRadiusMeters] = useState<number>(350);
  const [geofenceType, setGeofenceType] = useState<'circle' | 'polygon' | 'both'>('both');
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>([]);
  const [allowedAccuracy, setAllowedAccuracy] = useState<number>(50);
  const [toleranceMeters, setToleranceMeters] = useState<number>(15);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Interactive Click Mode on Map: 'none' | 'set_center' | 'add_vertex'
  const [clickMode, setClickMode] = useState<'none' | 'set_center' | 'add_vertex'>('none');

  // Test Coordinate Sandbox State
  const [testLat, setTestLat] = useState<number>(16.887333);
  const [testLng, setTestLng] = useState<number>(78.443028);
  const [testAccuracy, setTestAccuracy] = useState<number>(12);
  const [testResult, setTestResult] = useState<any>(null);

  // Load campuses
  const loadCampuses = async () => {
    try {
      const data = await api.getCampuses();
      setCampuses(data.campuses || []);
      if (data.campuses && data.campuses.length > 0) {
        if (!selectedCampusId) {
          selectCampus(data.campuses[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load campuses:', err);
    }
  };

  useEffect(() => {
    loadCampuses();
  }, []);

  const selectCampus = (campus: CampusGeofence) => {
    setSelectedCampusId(campus.id);
    setName(campus.name);
    setCode(campus.code);
    setAddress(campus.address || '');
    setCenterLat(campus.center_latitude);
    setCenterLng(campus.center_longitude);
    setRadiusMeters(campus.radius_meters);
    setGeofenceType(campus.geofence_type);
    setPolygonCoords(campus.polygon_coordinates || []);
    setAllowedAccuracy(campus.allowed_accuracy_meters);
    setToleranceMeters(campus.tolerance_meters);
    setIsActive(campus.is_active);
    setTestResult(null);
  };

  const handleCreateNewCampus = () => {
    setSelectedCampusId('new');
    setName('New Institution Campus');
    setCode(`VPP-${Date.now().toString().slice(-4)}`);
    setAddress('Telangana Educational Zone');
    setCenterLat(16.887333);
    setCenterLng(78.443028);
    setRadiusMeters(300);
    setGeofenceType('both');
    setPolygonCoords([
      [16.890833, 78.439528],
      [16.890833, 78.446528],
      [16.883833, 78.446528],
      [16.883833, 78.439528],
    ]);
    setAllowedAccuracy(50);
    setToleranceMeters(15);
    setIsActive(true);
    setTestResult(null);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (clickMode === 'set_center') {
      setCenterLat(Math.round(lat * 1000000) / 1000000);
      setCenterLng(Math.round(lng * 1000000) / 1000000);
      setClickMode('none');
      setMessage({ type: 'success', text: `Campus center coordinate updated to [${lat.toFixed(6)}, ${lng.toFixed(6)}]` });
    } else if (clickMode === 'add_vertex') {
      setPolygonCoords([...polygonCoords, [Math.round(lat * 1000000) / 1000000, Math.round(lng * 1000000) / 1000000]]);
      setMessage({ type: 'success', text: `Added vertex [${lat.toFixed(6)}, ${lng.toFixed(6)}]. Click again for more, or finish.` });
    }
  };

  const removeVertex = (index: number) => {
    setPolygonCoords(polygonCoords.filter((_, idx) => idx !== index));
  };

  const handleSaveCampus = async () => {
    if (!name || !code || !centerLat || !centerLng) {
      setMessage({ type: 'error', text: 'Name, code, and valid coordinates are required.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const payload = {
      name,
      code,
      address,
      center_latitude: centerLat,
      center_longitude: centerLng,
      radius_meters: radiusMeters,
      geofence_type: geofenceType,
      polygon_coordinates: polygonCoords,
      allowed_accuracy_meters: allowedAccuracy,
      tolerance_meters: toleranceMeters,
      is_active: isActive,
    };

    try {
      if (selectedCampusId === 'new') {
        const res = await api.createCampus(payload);
        setMessage({ type: 'success', text: 'New campus geofence created successfully.' });
        setSelectedCampusId(res.campus_id);
      } else {
        await api.updateCampus(selectedCampusId, payload);
        setMessage({ type: 'success', text: 'Campus geofence updated successfully.' });
      }
      await loadCampuses();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save campus geofence.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCampus = async () => {
    if (selectedCampusId === 'new') {
      if (campuses.length > 0) selectCampus(campuses[0]);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete the geofence for '${name}'?`)) {
      return;
    }

    setIsLoading(true);
    try {
      await api.deleteCampus(selectedCampusId);
      setMessage({ type: 'success', text: 'Campus geofence deleted.' });
      const data = await api.getCampuses();
      setCampuses(data.campuses || []);
      if (data.campuses && data.campuses.length > 0) {
        selectCampus(data.campuses[0]);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete campus.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Run Backend Coordinate Validation Test
  const handleTestCoordinate = async () => {
    if (!selectedCampusId || selectedCampusId === 'new') {
      alert('Please save the campus before testing coordinates.');
      return;
    }

    try {
      const res = await api.testCoordinate({
        campus_id: selectedCampusId,
        latitude: testLat,
        longitude: testLng,
        accuracy: testAccuracy,
      });
      setTestResult(res);
    } catch (err: any) {
      alert(err.message || 'Test failed');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Campus Geofence Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic perimeter definition, polygon boundary vertices, and device GPS accuracy validation rules.
          </p>
        </div>

        <button
          onClick={handleCreateNewCampus}
          className="px-3.5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Campus</span>
        </button>
      </div>

      {/* Campus Selector Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {campuses.map((c) => (
          <button
            key={c.id}
            onClick={() => selectCampus(c)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors border ${
              selectedCampusId === c.id
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>{c.name}</span>
              <span className={`text-[10px] ${selectedCampusId === c.id ? 'text-blue-100' : 'text-slate-400'}`}>
                ({c.radius_meters}m)
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Leaflet Map (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h2 className="font-semibold text-slate-900 text-sm">
                  Campus Perimeter Map View
                </h2>
              </div>

              {/* Map Interaction Mode Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setClickMode(clickMode === 'set_center' ? 'none' : 'set_center')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors border ${
                    clickMode === 'set_center'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{clickMode === 'set_center' ? 'Click Map for Center' : 'Set Center'}</span>
                </button>

                <button
                  onClick={() => setClickMode(clickMode === 'add_vertex' ? 'none' : 'add_vertex')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors border ${
                    clickMode === 'add_vertex'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{clickMode === 'add_vertex' ? 'Click Map for Vertex' : 'Add Vertex'}</span>
                </button>
              </div>
            </div>

            {/* Click Mode Hint */}
            {clickMode !== 'none' && (
              <div className="mb-2 p-2 rounded bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center justify-between">
                <span>
                  {clickMode === 'set_center'
                    ? '🎯 Click anywhere on the map to set the campus center coordinate.'
                    : '📐 Click on the map to place boundary perimeter polygon points.'}
                </span>
                <button onClick={() => setClickMode('none')} className="font-semibold underline ml-2">
                  Done
                </button>
              </div>
            )}

            {/* Leaflet Map Frame */}
            <div className="h-[400px] w-full rounded-md overflow-hidden border border-slate-300 shadow-inner z-10">
              <MapContainer
                center={[centerLat, centerLng]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Event Click Listener */}
                <MapClickHandler mode={clickMode} onMapClick={handleMapClick} />

                {/* Campus Center Marker */}
                <Marker position={[centerLat, centerLng]}>
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold text-slate-900">{name}</p>
                      <p className="text-slate-600">Center: {centerLat.toFixed(5)}, {centerLng.toFixed(5)}</p>
                      <p className="text-blue-700 font-semibold">Radius: {radiusMeters}m</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Circular Geofence Overlay */}
                {(geofenceType === 'circle' || geofenceType === 'both') && (
                  <Circle
                    center={[centerLat, centerLng]}
                    radius={radiusMeters}
                    pathOptions={{
                      color: '#1d4ed8',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.15,
                      weight: 2,
                      dashArray: '4, 4',
                    }}
                  />
                )}

                {/* Polygon Geofence Overlay */}
                {(geofenceType === 'polygon' || geofenceType === 'both') && polygonCoords.length >= 3 && (
                  <Polygon
                    positions={polygonCoords}
                    pathOptions={{
                      color: '#059669',
                      fillColor: '#10b981',
                      fillOpacity: 0.2,
                      weight: 2.5,
                    }}
                  />
                )}

                {/* Test Coordinate Marker if tested */}
                {testResult && (
                  <Marker position={[testLat, testLng]}>
                    <Popup>
                      <div className="text-xs">
                        <p className="font-bold">Test Location</p>
                        <p>{testResult.result_message}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Polygon Vertices Chips */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Polygon Perimeter Vertices ({polygonCoords.length})
              </span>
              <button
                onClick={() => setPolygonCoords([])}
                className="text-[11px] text-red-600 hover:underline font-medium"
              >
                Clear Polygon
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {polygonCoords.map((coord, idx) => (
                <div
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200 flex items-center gap-1.5"
                >
                  <span>P{idx + 1}: [{coord[0].toFixed(5)}, {coord[1].toFixed(5)}]</span>
                  <button
                    onClick={() => removeVertex(idx)}
                    className="text-slate-400 hover:text-red-600 ml-1 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Geofence Parameter Controls & Coordinate Sandbox (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Parameter Form */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="font-bold text-slate-900 text-sm">
                Campus Geofence Parameters
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {isActive ? 'Active' : 'Disabled'}
              </span>
            </div>

            {/* Notification message */}
            {message && (
              <div
                className={`p-2.5 rounded text-xs font-semibold flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Campus Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campus Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Geofence Type</label>
                <select
                  value={geofenceType}
                  onChange={(e) => setGeofenceType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="both">Both (Circle + Polygon)</option>
                  <option value="circle">Circular Only</option>
                  <option value="polygon">Polygon Only</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Center Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={centerLat}
                  onChange={(e) => setCenterLat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Center Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={centerLng}
                  onChange={(e) => setCenterLng(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Radius Slider */}
              <div className="col-span-2 space-y-1">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Circle Radius:</span>
                  <span className="text-blue-700 font-mono font-bold">{radiusMeters}m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="25"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Allowed GPS Accuracy</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={allowedAccuracy}
                    onChange={(e) => setAllowedAccuracy(parseInt(e.target.value, 10) || 50)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <span className="text-slate-500 font-semibold">m</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Boundary Tolerance</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={toleranceMeters}
                    onChange={(e) => setToleranceMeters(parseInt(e.target.value, 10) || 15)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <span className="text-slate-500 font-semibold">m</span>
                </div>
              </div>

              <div className="col-span-2 pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span className="font-semibold text-slate-700">Geofence Active for Attendance</span>
                </label>

                {selectedCampusId !== 'new' && (
                  <button
                    onClick={handleDeleteCampus}
                    className="text-red-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveCampus}
              disabled={isLoading}
              className="w-full mt-2 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{selectedCampusId === 'new' ? 'Save New Campus' : 'Update Campus Geofence'}</span>
            </button>
          </div>

          {/* Coordinate Test Sandbox */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-emerald-600" />
              <span>Backend Geofence Test Sandbox</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Simulate any GPS point to verify backend Haversine distance and Ray-Casting calculations.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Test Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={testLat}
                  onChange={(e) => setTestLat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Test Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={testLng}
                  onChange={(e) => setTestLng(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              onClick={handleTestCoordinate}
              className="w-full py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Evaluate Coordinate on Server</span>
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-md text-xs space-y-1 border ${
                  testResult.is_inside_geofence
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <p className="font-bold">{testResult.result_message}</p>
                <p className="text-[11px] text-slate-600">
                  Distance to Center: <span className="font-mono font-bold text-slate-900">{testResult.distance_meters}m</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Circle Check: {testResult.inside_radius ? 'Inside' : 'Outside'} | Polygon Check:{' '}
                  {testResult.inside_polygon ? 'Inside' : 'Outside'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

