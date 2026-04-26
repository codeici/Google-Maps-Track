import { SpeedUnitEnum } from "../../../typings/GoogleMapsTrackProps";
import {
    ALTITUDE_COLOURS,
    ALTITUDE_COLOURS_SATELLITE,
    CORRECTION_DURATION_MS,
    HEADING_SMOOTH_ALPHA,
    M_PER_DEG_LAT,
    MAX_CORRECTION_DURATION_MS,
    MAX_SNAP_DISTANCE_M,
    POS_FILTER_DEADBAND_M,
    POS_FILTER_MIN_GAIN,
    POS_FILTER_RANGE_M,
    STALE_FULL_DR_MS,
    STALE_MIN_OPACITY,
    STALE_REMOVE_MS
} from "./constants";
import { MarkerState } from "./types";

export function formatSpeed(kts: number, unit: SpeedUnitEnum): string {
    switch (unit) {
        case "mph":
            return `${Math.round(kts * 1.15078)} mph`;
        case "kmh":
            return `${Math.round(kts * 1.852)} km/h`;
        default:
            return `${Math.round(kts)} kts`;
    }
}

export function altitudeColour(altitude: string | number, satellite?: boolean): string {
    const palette = satellite ? ALTITUDE_COLOURS_SATELLITE : ALTITUDE_COLOURS;
    const step = 2000;
    if (typeof altitude === "number") {
        const index = Math.min(Math.floor(Math.max(0, altitude) / step), palette.length - 1);
        return palette[index];
    }
    if (altitude.toLowerCase() === "ground") return satellite ? "#ffffff" : "#808080";
    const value = parseFloat(altitude);
    if (isNaN(value)) return palette[0];
    const index = Math.min(Math.floor(Math.max(0, value) / step), palette.length - 1);
    return palette[index];
}

export function lerpHeading(a: number, b: number, t: number): number {
    const delta = ((((b - a) % 360) + 540) % 360) - 180; // shortest arc in [-180, 180]
    return (((a + delta * t) % 360) + 360) % 360;
}

export function headingDelta(from: number, to: number): number {
    return ((((to - from) % 360) + 540) % 360) - 180;
}

export function parseAltitude(alt: string | undefined): number {
    if (!alt) return NaN;
    if (alt.toLowerCase() === "ground") return 0;
    const v = parseFloat(alt);
    return isNaN(v) ? NaN : v;
}

// Dead-reckon a kinematic base forward by elapsedSec. Uses mean-track integration so that
// a curved path under non-zero trackRate averages the start and end headings — more accurate
// than just propagating at the start heading for the full interval.
export function deadReckonFromBase(
    baseLat: number,
    baseLng: number,
    baseTrackDeg: number,
    baseAltFt: number,
    groundSpeedMps: number,
    verticalRateFtMin: number,
    trackRateDps: number,
    elapsedSec: number
): { lat: number; lng: number; track: number; altFt: number } {
    const track = (((baseTrackDeg + trackRateDps * elapsedSec) % 360) + 360) % 360;
    const avgTrackDeg = baseTrackDeg + (trackRateDps * elapsedSec) / 2;
    const rad = (avgTrackDeg * Math.PI) / 180;
    const distanceM = groundSpeedMps * elapsedSec;
    const dNorthM = distanceM * Math.cos(rad);
    const dEastM = distanceM * Math.sin(rad);
    const lat = baseLat + dNorthM / M_PER_DEG_LAT;
    const cosLat = Math.cos((baseLat * Math.PI) / 180);
    const lng = baseLng + dEastM / (M_PER_DEG_LAT * Math.max(cosLat, 1e-6));
    const altFt = isNaN(baseAltFt) ? NaN : baseAltFt + (verticalRateFtMin / 60) * elapsedSec;
    return { lat, lng, track, altFt };
}

// Compute the displayed position at time `now` from the kinematic base plus any active
// correction blend. Pure function — state is only mutated by ingestion, not by this call.
// Past STALE_FULL_DR_MS (measured from browser ingest, not sensor time), the propagation
// rates decay linearly toward zero so dead reckoning slows and halts by STALE_REMOVE_MS
// rather than accumulating error forever.
export function computePosition(
    state: MarkerState,
    now: number
): { lat: number; lng: number; heading: number; alt: number } {
    const ingestAgeMs = now - state.reportedAtMs;

    let effectiveGs = state.groundSpeedMps;
    let effectiveVr = state.verticalRateFtMin;
    let effectiveTr = state.trackRateDps;
    if (ingestAgeMs > STALE_FULL_DR_MS) {
        const staleT = Math.min(1, (ingestAgeMs - STALE_FULL_DR_MS) / (STALE_REMOVE_MS - STALE_FULL_DR_MS));
        const decay = Math.max(0, 1 - staleT);
        effectiveGs *= decay;
        effectiveVr *= decay;
        effectiveTr *= decay;
    }

    const elapsedSec = Math.max(0, (now - state.reportTimestampMs) / 1000);
    const base = deadReckonFromBase(
        state.baseLat,
        state.baseLng,
        state.baseTrack,
        state.baseAltFt,
        effectiveGs,
        effectiveVr,
        effectiveTr,
        elapsedSec
    );

    let lat = base.lat,
        lng = base.lng,
        track = base.track;
    let alt = base.altFt;

    if (state.correction) {
        const tLin = Math.min(1, Math.max(0, (now - state.correction.startMs) / state.correction.durationMs));
        // Cubic ease-in-out: smooth at both ends of the blend
        const eased = tLin < 0.5 ? 4 * tLin * tLin * tLin : 1 - Math.pow(-2 * tLin + 2, 3) / 2;
        const residual = 1 - eased; // 1 at t=0, 0 at t=dur
        lat += state.correction.dLat * residual;
        lng += state.correction.dLng * residual;
        if (!isNaN(alt) && !isNaN(state.correction.dAltFt)) {
            alt += state.correction.dAltFt * residual;
        }
        track = (((track + state.correction.dTrack * residual) % 360) + 360) % 360;
    }

    return { lat, lng, heading: track, alt };
}

// Staleness opacity: 1.0 below STALE_FULL_DR_MS, linear fade to STALE_MIN_OPACITY at
// STALE_REMOVE_MS. Above that the marker is removed entirely.
export function staleOpacity(ageMs: number): number {
    if (ageMs <= STALE_FULL_DR_MS) return 1;
    if (ageMs >= STALE_REMOVE_MS) return STALE_MIN_OPACITY;
    const t = (ageMs - STALE_FULL_DR_MS) / (STALE_REMOVE_MS - STALE_FULL_DR_MS);
    return 1 - (1 - STALE_MIN_OPACITY) * t;
}

// Apply a new report to an existing marker's state. Captures where the display is right
// now under the old base, swings the base over to the new report, and starts a correction
// blend so the display smoothly converges to the new dead-reckoning trajectory over
// CORRECTION_DURATION_MS. When the implied correction is larger than MAX_SNAP_DISTANCE_M
// (bad data, GPS reset), snaps to the new base instead to avoid a long visible glide.
export function ingestReportUpdate(
    state: MarkerState,
    now: number,
    newLat: number,
    newLng: number,
    newAltFt: number,
    newReportedTrack: number,
    newGsMps: number,
    newVrFtMin: number,
    newTrackRateDps: number,
    positionAgeSec: number
): void {
    const displayBefore = computePosition(state, now);

    // Low-pass filter on reported track before it becomes the anchor — kills ADSB
    // heading jitter at the input stage. The correction blend then smooths the
    // remaining transition over CORRECTION_DURATION_MS.
    const smoothedTrack = lerpHeading(state.baseTrack, newReportedTrack, HEADING_SMOOTH_ALPHA);

    const newReportTimestampMs = now - Math.max(0, positionAgeSec) * 1000;
    const elapsedNewSec = Math.max(0, (now - newReportTimestampMs) / 1000);

    // Predict-then-correct filter on the new base position. GPS noise is uncorrelated
    // between reports — averaging cancels it. Real motion is correlated — averaging
    // preserves it. Adaptive gain trades smoothing for responsiveness based on the
    // size of the innovation:
    //   small innovation (≈ noise): low gain, heavy smoothing → no visible wobble on straight tracks
    //   large innovation (real maneuver): gain → 1.0, no smoothing → marker tracks the maneuver
    let filteredLat = newLat;
    let filteredLng = newLng;
    const predictAtSensorSec = (newReportTimestampMs - state.reportTimestampMs) / 1000;
    if (predictAtSensorSec > 0.05 && predictAtSensorSec < 10) {
        const predicted = deadReckonFromBase(
            state.baseLat,
            state.baseLng,
            state.baseTrack,
            state.baseAltFt,
            state.groundSpeedMps,
            state.verticalRateFtMin,
            state.trackRateDps,
            predictAtSensorSec
        );
        const innovDLat = newLat - predicted.lat;
        const innovDLng = newLng - predicted.lng;
        const innovM = Math.hypot(
            innovDLat * M_PER_DEG_LAT,
            innovDLng * M_PER_DEG_LAT * Math.cos((newLat * Math.PI) / 180)
        );
        const ramp = Math.max(0, (innovM - POS_FILTER_DEADBAND_M) / POS_FILTER_RANGE_M);
        const gain = Math.min(1, POS_FILTER_MIN_GAIN + (1 - POS_FILTER_MIN_GAIN) * ramp);
        filteredLat = predicted.lat + innovDLat * gain;
        filteredLng = predicted.lng + innovDLng * gain;
    }

    const displayAfter = deadReckonFromBase(
        filteredLat,
        filteredLng,
        smoothedTrack,
        newAltFt,
        newGsMps,
        newVrFtMin,
        newTrackRateDps,
        elapsedNewSec
    );

    const dLat = displayBefore.lat - displayAfter.lat;
    const dLng = displayBefore.lng - displayAfter.lng;
    const dAltFt = !isNaN(displayBefore.alt) && !isNaN(displayAfter.altFt) ? displayBefore.alt - displayAfter.altFt : 0;
    const dTrack = headingDelta(displayAfter.track, displayBefore.heading);

    const dNorthM = dLat * M_PER_DEG_LAT;
    const dEastM = dLng * M_PER_DEG_LAT * Math.cos((newLat * Math.PI) / 180);
    const correctionDistM = Math.hypot(dNorthM, dEastM);

    // Correction blend duration scales to the observed update interval. Without this,
    // a 500ms blend against 5-second updates produces a visible 0.5s of faster motion
    // every time an ingest lands; stretching the blend to ≈40% of the interval spreads
    // the same correction across a much wider window so the velocity delta drops under
    // the perception threshold.
    const updateIntervalMs = Math.max(100, now - state.reportedAtMs);
    let durationMs = Math.max(CORRECTION_DURATION_MS, Math.min(MAX_CORRECTION_DURATION_MS, updateIntervalMs * 0.4));

    // Symmetric along-track cap: the magnitude of the along-track correction velocity
    // stays ≤ gs/2 regardless of direction.
    //   - Positive along-track (display overshot): correction drags backwards at ≤ gs/2
    //     → net motion stays forward (≥ gs/2).
    //   - Negative along-track (display behind truth): correction adds forward at ≤ gs/2
    //     → display moves at ≤ 1.5·gs → no visible forward jump during catch-up.
    if (newGsMps > 0.5 && correctionDistM > 1) {
        const trackRad = (smoothedTrack * Math.PI) / 180;
        const alongTrackM = dNorthM * Math.cos(trackRad) + dEastM * Math.sin(trackRad);
        const absAlongTrackM = Math.abs(alongTrackM);
        if (absAlongTrackM > 1) {
            const minDurMs = (absAlongTrackM / (newGsMps * 0.5)) * 1000;
            durationMs = Math.min(MAX_CORRECTION_DURATION_MS, Math.max(durationMs, minDurMs));
        }
    }

    state.baseLat = filteredLat;
    state.baseLng = filteredLng;
    state.baseAltFt = newAltFt;
    state.baseTrack = smoothedTrack;
    state.groundSpeedMps = newGsMps;
    state.verticalRateFtMin = newVrFtMin;
    state.trackRateDps = newTrackRateDps;
    state.reportTimestampMs = newReportTimestampMs;
    state.reportedAtMs = now;
    state.correction =
        correctionDistM > MAX_SNAP_DISTANCE_M
            ? null
            : {
                  startMs: now,
                  durationMs,
                  dLat,
                  dLng,
                  dAltFt,
                  dTrack
              };
}
