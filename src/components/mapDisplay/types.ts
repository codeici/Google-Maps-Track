import { EditableValue, ListValue, ListAttributeValue, ListExpressionValue, ListActionValue, ObjectItem } from "mendix";
import { Big } from "big.js";
import { SpeedUnitEnum } from "../../../typings/GoogleMapsTrackProps";

export interface MapDisplayProps {
    apiKey: string;
    mapId: string;
    minWidth?: number;
    minHeight?: number;
    defaultLatitude: number;
    defaultLongitude: number;
    defaultZoom: number;
    refreshInterval: number;
    trackData?: ListValue;
    latitude?: ListAttributeValue<Big>;
    longitude?: ListAttributeValue<Big>;
    markerLabel?: ListExpressionValue<string>;
    uniqueId?: ListAttributeValue<string>;
    direction?: ListAttributeValue<Big>;
    groundSpeed?: ListAttributeValue<Big>;
    speedUnit?: SpeedUnitEnum;
    verticalRate?: ListAttributeValue<Big>;
    trackRate?: ListAttributeValue<Big>;
    positionAge?: ListAttributeValue<Big>;
    altitude?: ListAttributeValue<string>;
    colourByAltitude?: boolean;
    showAltitudeLegend?: boolean;
    showMapTypeControl?: boolean;
    category?: ListAttributeValue<string>;
    markerIconUrl?: string;
    markerIconScale?: number;
    markerSize?: number;
    categoryIconsMap?: Map<string, { url: string; scale: number }>;
    identId?: EditableValue<string>;
    proximityMarker?: EditableValue<string>;
    onClickAction?: ListActionValue;
    onDeselectAction?: ListActionValue;
    onTrackAction?: ListActionValue;
}

export interface Correction {
    startMs: number;
    durationMs: number;
    // Residual applied on top of the new-base dead reckoning so the display originates
    // at the old-base position at t=0 and converges to the new-base truth by t=durationMs.
    dLat: number;
    dLng: number;
    dAltFt: number;
    dTrack: number; // shortest-arc degrees (display_old - display_new) at correction start
}

export interface MarkerState {
    // --- Kinematic base (the most recent report, valid at reportTimestampMs) ---
    baseLat: number;
    baseLng: number;
    baseAltFt: number; // feet; NaN if unknown; 0 if reported as "ground"
    baseTrack: number; // degrees; smoothed reported track

    // --- Rates (last reported), used for forward dead reckoning from the base ---
    groundSpeedMps: number;
    verticalRateFtMin: number;
    trackRateDps: number;

    // --- Timing ---
    reportTimestampMs: number; // sensor-side instant the position was valid
    reportedAtMs: number; // browser-side ingest time of the latest report

    // --- Transition blend ---
    correction: Correction | null;

    // --- Display-only (written per-frame by draw() / on ingest) ---
    heading: number; // last displayed heading (for label panel)
    iconScale: number;
    stableKey: string;
    element: HTMLElement;
    isSelected: boolean;
    isTracked: boolean;
    isNew: boolean; // true until the appear animation completes
    appearStart: number; // performance.now() when appear animation began (0 = not started)
    currentOpacity: number; // last-applied staleness opacity
    speedDisplay?: string;
    altDisplay?: string; // raw altitude string — can be "ground"
    labelDisplay?: string;
    item: ObjectItem;
}

// Instance type for the overlay — used for typing the useState and method calls
export type TrackOverlay = google.maps.OverlayView & {
    addElement(el: HTMLElement): void;
    removeElement(el: HTMLElement): void;
    setScale(scale: number): void;
    setRingColour(colour: string): void;
    setMarkerSize(size: number): void;
    setColourByAltitude(enabled: boolean): void;
    setSatellite(satellite: boolean): void;
    setTrackCallback(cb: (state: MarkerState) => void): void;
    setMonitoredKey(key: string | null): void;
    setProximityKey(key: string | null): void;
};
