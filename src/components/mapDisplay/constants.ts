export const APPEAR_DURATION = 400; // ms for scale/fade-in on truly new markers

// --- Dead-reckoning animation constants ---
export const CORRECTION_DURATION_MS = 500; // baseline blend window for a new report into the display
export const MAX_CORRECTION_DURATION_MS = 3000; // upper bound — adaptive stretch never exceeds this
export const STALE_FULL_DR_MS = 15000; // < this: full dead reckoning at last gs/track
export const STALE_REMOVE_MS = 60000; // > this: remove marker
export const STALE_MIN_OPACITY = 0.3; // opacity at STALE_REMOVE_MS (linear fade)
export const HEADING_SMOOTH_ALPHA = 0.2; // per-report low-pass on reported track to kill ADSB jitter
export const KNOTS_TO_MPS = 0.514444;
export const M_PER_DEG_LAT = 111320;
// If a new report implies a correction delta larger than this, snap rather than blend —
// guards against GPS resets, transponder mix-ups, and stale data reset.
export const MAX_SNAP_DISTANCE_M = 2000;

// --- Position low-pass filter (predict-then-correct) constants ---
export const POS_FILTER_MIN_GAIN = 0.3; // floor on gain — always accept ≥30% of new info
export const POS_FILTER_DEADBAND_M = 5; // innovation below this is treated as pure noise
export const POS_FILTER_RANGE_M = 50; // linear ramp from MIN_GAIN to 1.0 over this range above the deadband

// Defensive clamps on data attributes — guards against bad source data, integer rounding,
// or accidental unit-mismatch from the Mendix entity (e.g. ms instead of seconds).
export const MAX_POSITION_AGE_SEC = 5;
export const MAX_VERTICAL_RATE_FTMIN = 6000;
export const MAX_TRACK_RATE_DPS = 10;

// --- Marker scaling ---
export const MARKER_SCALE_REF_ZOOM = 10;
export const MARKER_SCALE_FACTOR = 1.2;
export const MARKER_SCALE_MIN = 0.25;
export const MARKER_SCALE_MAX = 3.0;

// --- Marker colours ---
export const DEFAULT_MARKER_COLOUR = "#2196f3";
export const MONITORED_RING_COLOUR = "#00ff00";
// Stroke colour applied to inline-SVG markers via the --marker-stroke CSS variable.
// Switches with map type so outlines stay legible against road/terrain vs aerial imagery.
export const MARKER_STROKE_TERRAIN = "rgba(11, 31, 51, 0.9)";
export const MARKER_STROKE_SATELLITE = "rgba(0, 0, 0, 0.65)";

// Linear gradient default view from #005c00 (dark green, 0 ft) to #00fffb (cyan, 40,000 ft+), one step per 2,000 ft
export const ALTITUDE_COLOURS = [
    "#005c00", //  0
    "#00640d", //  2 000
    "#006c19", //  4 000
    "#007426", //  6 000
    "#007d32", //  8 000
    "#00853f", // 10 000
    "#008d4b", // 12 000
    "#009558", // 14 000
    "#009d64", // 16 000
    "#00a571", // 18 000
    "#00ae7e", // 20 000
    "#00b68a", // 22 000
    "#00be97", // 24 000
    "#00c6a3", // 26 000
    "#00ceb0", // 28 000
    "#00d6bc", // 30 000
    "#00dec9", // 32 000
    "#00e7d5", // 34 000
    "#00efe2", // 36 000
    "#00f7ee", // 38 000
    "#00fffb" // 40 000+
];

// Linear gradient satellite view from red (0 ft) to cyan (40,000 ft+), one step per 2,000 ft.
// Brighter palette so colours remain visible against dark aerial imagery.
export const ALTITUDE_COLOURS_SATELLITE = [
    "#FF2A2A", // 0 ft
    "#FF4024", // 2,000 ft
    "#FF571F", // 4,000 ft
    "#FF6D19", // 6,000 ft
    "#FF8414", // 8,000 ft
    "#FF9A0E", // 10,000 ft
    "#FFB008", // 12,000 ft
    "#FFC703", // 14,000 ft
    "#F5D20A", // 16,000 ft
    "#E0D11F", // 18,000 ft
    "#CCD033", // 20,000 ft
    "#B8CF47", // 22,000 ft
    "#A3CE5C", // 24,000 ft
    "#8FCE70", // 26,000 ft
    "#7ACD85", // 28,000 ft
    "#66CC99", // 30,000 ft
    "#52CBAD", // 32,000 ft
    "#3DCAC2", // 34,000 ft
    "#29CAD6", // 36,000 ft
    "#14C9EB", // 38,000 ft
    "#00C8FF" // 40,000+ ft
];
