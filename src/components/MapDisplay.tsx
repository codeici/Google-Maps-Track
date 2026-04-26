import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Libraries } from "@react-google-maps/api";
import { ObjectItem } from "mendix";

import { MapDisplayProps, MarkerState, TrackOverlay } from "./mapDisplay/types";
import {
    APPEAR_DURATION,
    KNOTS_TO_MPS,
    MARKER_STROKE_SATELLITE,
    MARKER_STROKE_TERRAIN,
    MAX_POSITION_AGE_SEC,
    MAX_TRACK_RATE_DPS,
    MAX_VERTICAL_RATE_FTMIN,
    MONITORED_RING_COLOUR,
    STALE_REMOVE_MS
} from "./mapDisplay/constants";
import {
    altitudeColour,
    computePosition,
    formatSpeed,
    ingestReportUpdate,
    parseAltitude,
    staleOpacity
} from "./mapDisplay/kinematics";
import {
    applyMarkerStroke,
    createMarkerElement,
    markerScaleForZoom,
    resolveIconInfo,
    updateMarkerElement
} from "./mapDisplay/markerDom";
import { INFO_ICON_ALT, INFO_ICON_DIR, INFO_ICON_SPD, chooseLabelDirection } from "./mapDisplay/icons";
import { AltitudeLegend } from "./mapDisplay/AltitudeLegend";

const GOOGLE_MAPS_LIBRARIES: Libraries = ["marker"];

// Creates the OverlayView class lazily (google.maps must be available at call time).
// The overlay owns a container div added to the map's overlayMouseTarget pane so that
// marker click events are forwarded to the browser. It runs its own rAF loop, converting
// interpolated lat/lng to pixel coordinates via fromLatLngToDivPixel() every frame —
// this is why animation is smooth regardless of whether the map itself is re-rendering.
let OverlayClass: (new (states: Map<string, MarkerState>) => TrackOverlay) | null = null;

function getOverlayClass(): NonNullable<typeof OverlayClass> {
    if (!OverlayClass) {
        OverlayClass = class extends google.maps.OverlayView implements TrackOverlay {
            private container: HTMLDivElement;
            private states: Map<string, MarkerState>;
            private rafId: number | null = null;
            private selectionPanels: Map<
                string,
                {
                    ring: HTMLDivElement;
                    label: HTMLDivElement;
                    line: HTMLDivElement;
                    lastKey: string;
                    lastColour: string;
                }
            > = new Map();
            private ringColour: string = "#ff00ff";
            private currentZoomScale: number = 1;
            private markerBaseSize: number = 32;
            private colourByAltitude: boolean = false;
            private isSatellite: boolean = false;
            private trackCallback: ((state: MarkerState) => void) | null = null;
            private monitoredKey: string | null = null;
            private proximityKey: string | null = null;
            private proximityRing: { ring: HTMLDivElement; lastColour: string } | null = null;

            constructor(states: Map<string, MarkerState>) {
                super();
                this.states = states;
                this.container = document.createElement("div");
                this.container.style.cssText = "position:absolute;top:0;left:0;";
            }

            onAdd(): void {
                this.getPanes()!.overlayMouseTarget.appendChild(this.container);
                const tick = (): void => {
                    this.draw();
                    this.rafId = requestAnimationFrame(tick);
                };
                this.rafId = requestAnimationFrame(tick);
            }

            // Called by Google Maps on pan/zoom and by our own rAF loop every frame.
            // Converts current animated lat/lng to pixel coordinates and sets CSS directly.
            draw(): void {
                const proj = this.getProjection();
                if (!proj) return;
                const now = performance.now();

                // Pass 1: update all marker positions; collect selected markers with their pixel coords.
                // Also collect any markers whose age has exceeded STALE_REMOVE_MS so they can be
                // removed after the forEach — stale markers dead-reckon, fade, then disappear.
                const selectedPts = new Map<string, { state: MarkerState; x: number; y: number }>();
                const staleToRemove: string[] = [];
                this.states.forEach((state, id) => {
                    // Staleness is measured from the browser-side ingest, not the sensor
                    // timestamp — a transiently large positionAge from a single bad report
                    // shouldn't be enough to wipe out the marker.
                    const ingestAgeMs = now - state.reportedAtMs;
                    if (ingestAgeMs > STALE_REMOVE_MS) {
                        staleToRemove.push(id);
                        return;
                    }

                    const pos = computePosition(state, now);
                    const pt = proj.fromLatLngToDivPixel(new google.maps.LatLng(pos.lat, pos.lng));
                    if (pt) {
                        state.element.style.left = `${pt.x}px`;
                        state.element.style.top = `${pt.y}px`;
                        if (state.isNew) {
                            if (state.appearStart === 0) {
                                state.appearStart = now;
                                state.element.style.display = "flex";
                            }
                            const appearProgress = Math.min(1, (now - state.appearStart) / APPEAR_DURATION);
                            const eased = 1 - Math.pow(1 - appearProgress, 3);
                            state.element.style.opacity = String(eased);
                            state.element.style.transform = `translate(-50%,-50%) scale(${0.3 + 0.7 * eased})`;
                            if (appearProgress >= 1) {
                                state.isNew = false;
                                state.element.style.opacity = "";
                                state.element.style.transform = "translate(-50%,-50%)";
                            }
                        } else {
                            if (state.element.style.display === "none") {
                                state.element.style.display = "flex";
                            }
                            // Staleness fade: once outside the full-DR window, opacity linearly decays
                            // toward STALE_MIN_OPACITY. Only write the style when it changes to keep
                            // the per-frame DOM work minimal.
                            const targetOpacity = staleOpacity(ingestAgeMs);
                            if (Math.abs(targetOpacity - state.currentOpacity) > 0.01) {
                                state.element.style.opacity = targetOpacity >= 1 ? "" : String(targetOpacity);
                                state.currentOpacity = targetOpacity;
                            }
                        }

                        // Flash red drop-shadow for identified marker (identId set from Mendix)
                        const iconEl = state.element.querySelector(".marker-icon") as HTMLElement | null;
                        if (iconEl) {
                            if (this.monitoredKey !== null && state.stableKey === this.monitoredKey) {
                                const flashT = (Math.sin((now / 600) * Math.PI * 2) + 1) / 2;
                                const blur = 10 + flashT * 20;
                                const alpha = (0.7 + flashT * 0.3).toFixed(2);
                                iconEl.style.filter = `drop-shadow(0 0 ${blur.toFixed(
                                    1
                                )}px rgba(255,0,0,${alpha})) drop-shadow(0 0 ${(blur * 0.6).toFixed(
                                    1
                                )}px rgba(255,0,0,${alpha})) drop-shadow(0 0 ${(blur * 0.3).toFixed(
                                    1
                                )}px rgba(255,80,80,1))`;
                            } else if (iconEl.style.filter) {
                                iconEl.style.filter = "";
                            }
                        }

                        // Per-frame heading rotation and altitude colour
                        state.heading = pos.heading;
                        const icon = state.element.querySelector(".marker-icon") as HTMLElement | null;
                        if (icon) {
                            icon.style.transform = `rotate(${pos.heading}deg) scale(calc(var(--marker-scale,1) * var(--icon-scale,1)))`;
                            if (this.colourByAltitude && !isNaN(pos.alt)) {
                                const colour = altitudeColour(pos.alt, this.isSatellite);
                                if (icon.dataset.svgSource) {
                                    icon.style.setProperty("--marker-fill", colour);
                                } else {
                                    icon.style.backgroundColor = colour;
                                }
                            }
                        }

                        if (state.isSelected) selectedPts.set(state.stableKey, { state, x: pt.x, y: pt.y });
                    }
                });

                // Remove UI elements for markers that are no longer selected / off-screen
                const keysToRemove: string[] = [];
                this.selectionPanels.forEach((_, key) => {
                    if (!selectedPts.has(key)) keysToRemove.push(key);
                });
                keysToRemove.forEach(key => {
                    const e = this.selectionPanels.get(key)!;
                    e.ring.remove();
                    e.label.remove();
                    e.line.remove();
                    this.selectionPanels.delete(key);
                });

                const proximityState =
                    this.proximityKey === null
                        ? null
                        : [...this.states.values()].find(s => s.stableKey === this.proximityKey) ?? null;
                if (proximityState) {
                    if (!this.proximityRing) {
                        const ring = document.createElement("div");
                        ring.style.cssText =
                            "position:absolute;border:4px solid orange;border-radius:50%;cursor:pointer;box-sizing:border-box;box-shadow:0 0 6px 2px orange;z-index:90;";
                        this.container.appendChild(ring);
                        this.proximityRing = { ring, lastColour: "" };
                    }
                    const entry = this.proximityRing!;
                    const ringDiameter = this.markerBaseSize + 16;
                    const ringScale = this.currentZoomScale * proximityState.iconScale;
                    entry.ring.style.width = `${ringDiameter}px`;
                    entry.ring.style.height = `${ringDiameter}px`;
                    entry.ring.style.left = `${proximityState.element.offsetLeft}px`;
                    entry.ring.style.top = `${proximityState.element.offsetTop}px`;
                    entry.ring.style.transform = `translate(-50%,-50%) scale(${ringScale})`;
                    entry.ring.onclick = e => {
                        e.stopPropagation();
                        proximityState.element.click();
                    };
                } else if (this.proximityRing) {
                    this.proximityRing.ring.remove();
                    this.proximityRing = null;
                }

                // Pass 2: create/update ring, label, and line for each selected marker
                selectedPts.forEach(({ state, x, y }, key) => {
                    if (!this.selectionPanels.has(key)) {
                        const ring = document.createElement("div");
                        ring.style.cssText = `position:absolute;border:4px solid ${this.ringColour};border-radius:50%;cursor:pointer;box-sizing:border-box;box-shadow:0 0 6px 2px ${this.ringColour};z-index:100;`;
                        const label = document.createElement("div");
                        label.style.cssText = `position:absolute;cursor:pointer;background:rgba(0,0,0,0.72);color:#fff;border-radius:4px;padding:4px 8px;font-size:11px;font-family:sans-serif;white-space:nowrap;line-height:1.6;border:1px solid ${this.ringColour};z-index:102;`;
                        label.title = "Click to track";
                        const line = document.createElement("div");
                        line.style.cssText = `position:absolute;pointer-events:none;height:2px;background:${this.ringColour};transform-origin:left center;z-index:101;`;
                        this.container.appendChild(line);
                        this.container.appendChild(ring);
                        this.container.appendChild(label);
                        this.selectionPanels.set(key, { ring, label, line, lastKey: "", lastColour: "" });
                    }

                    const entry = this.selectionPanels.get(key)!;
                    const effectiveColour = state.isTracked ? MONITORED_RING_COLOUR : this.ringColour;
                    if (effectiveColour !== entry.lastColour) {
                        entry.ring.style.borderColor = effectiveColour;
                        entry.ring.style.boxShadow = `0 0 6px 2px ${effectiveColour}`;
                        entry.label.style.borderColor = effectiveColour;
                        entry.line.style.background = effectiveColour;
                        entry.lastColour = effectiveColour;
                    }

                    // Label click = make this marker the tracked one
                    entry.label.onclick = e => {
                        e.stopPropagation();
                        this.trackCallback?.(state);
                    };

                    const ringDiameter = this.markerBaseSize + 16; // 4px gap + 4px border each side
                    const ringScale = this.currentZoomScale * state.iconScale;
                    const ringRadius = Math.round((ringDiameter / 2) * ringScale);
                    entry.ring.style.width = `${ringDiameter}px`;
                    entry.ring.style.height = `${ringDiameter}px`;

                    // Ring centred on marker; clicking the ring forwards to the marker element
                    entry.ring.style.left = `${x}px`;
                    entry.ring.style.top = `${y}px`;
                    entry.ring.style.transform = `translate(-50%,-50%) scale(${ringScale})`;
                    entry.ring.onclick = e => {
                        e.stopPropagation();
                        state.element.click();
                    };

                    // Choose label direction: 45° increment that points most away from other selected markers
                    const otherPts: { x: number; y: number }[] = [];
                    selectedPts.forEach((other, otherKey) => {
                        if (otherKey !== key) otherPts.push(other);
                    });
                    const [ldx, ldy] = chooseLabelDirection(x, y, otherPts);

                    // Anchor the nearest edge/corner of the label just outside the ring.
                    // tx/ty map the direction to which edge of the label sits at the anchor point:
                    //   ldx > 0  → left edge at anchor  (translate 0%)
                    //   ldx < 0  → right edge at anchor (translate -100%)
                    //   ldx = 0  → horizontally centred  (translate -50%)
                    //   same logic for ldy / vertical
                    const gap = 16;
                    const anchorX = x + (ringRadius + gap) * ldx;
                    const anchorY = y + (ringRadius + gap) * ldy;
                    const tx = ldx > 0 ? "0%" : ldx < 0 ? "-100%" : "-50%";
                    const ty = ldy > 0 ? "0%" : ldy < 0 ? "-100%" : "-50%";
                    entry.label.style.left = `${anchorX}px`;
                    entry.label.style.top = `${anchorY}px`;
                    entry.label.style.transform = `translate(${tx},${ty})`;

                    // Line from ring edge to label anchor only
                    const ringEdgeX = x + ringRadius * ldx;
                    const ringEdgeY = y + ringRadius * ldy;
                    const lineDx = anchorX - ringEdgeX;
                    const lineDy = anchorY - ringEdgeY;
                    const lineLen = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
                    const lineAngle = (Math.atan2(lineDy, lineDx) * 180) / Math.PI;
                    entry.line.style.left = `${ringEdgeX}px`;
                    entry.line.style.top = `${ringEdgeY}px`;
                    entry.line.style.width = `${lineLen}px`;
                    entry.line.style.transform = `translate(0,-50%) rotate(${lineAngle}deg)`;

                    // Label content (only rewrite DOM when content changes; include isMonitored
                    // so the border colour update triggers when tracking state changes)
                    const dirVal = Math.round(state.heading);
                    const spdVal = state.speedDisplay;
                    const altVal = state.altDisplay;
                    const lblVal = state.labelDisplay;
                    const infoKey = `${lblVal ?? ""}|${dirVal}|${spdVal ?? ""}|${altVal ?? ""}|${state.isTracked}`;
                    if (infoKey !== entry.lastKey) {
                        const row = (icon: string, text: string): string =>
                            `<div style="display:flex;align-items:center;gap:5px;">${icon}<span>${text}</span></div>`;
                        let html = "";
                        if (lblVal) html += `<div style="font-weight:bold;margin-bottom:3px;">${lblVal}</div>`;
                        html += row(INFO_ICON_DIR, `${dirVal}°`);
                        if (spdVal) html += row(INFO_ICON_SPD, spdVal);
                        if (altVal !== undefined)
                            html += row(INFO_ICON_ALT, altVal.toLowerCase() === "ground" ? altVal : `${altVal} ft`);
                        entry.label.innerHTML = html;
                        entry.lastKey = infoKey;
                    }
                });

                // Remove markers that have aged beyond STALE_REMOVE_MS without new reports.
                staleToRemove.forEach(id => {
                    const state = this.states.get(id);
                    if (state) {
                        this.removeElement(state.element);
                        this.states.delete(id);
                        if (this.selectionPanels.has(state.stableKey)) {
                            const e = this.selectionPanels.get(state.stableKey)!;
                            e.ring.remove();
                            e.label.remove();
                            e.line.remove();
                            this.selectionPanels.delete(state.stableKey);
                        }
                    }
                });
            }

            onRemove(): void {
                if (this.rafId !== null) {
                    cancelAnimationFrame(this.rafId);
                }
                this.container.remove();
            }

            addElement(el: HTMLElement): void {
                this.container.appendChild(el);
            }

            removeElement(el: HTMLElement): void {
                el.remove();
            }

            setScale(scale: number): void {
                this.currentZoomScale = scale;
                this.container.style.setProperty("--marker-scale", String(scale));
            }

            setMarkerSize(size: number): void {
                this.markerBaseSize = size;
            }

            setRingColour(colour: string): void {
                this.ringColour = colour;
                // Reset lastColour so draw loop re-evaluates per-marker colours on next frame
                this.selectionPanels.forEach(entry => {
                    entry.lastColour = "";
                });
            }

            setColourByAltitude(enabled: boolean): void {
                this.colourByAltitude = enabled;
            }
            setSatellite(satellite: boolean): void {
                this.isSatellite = satellite;
            }
            setTrackCallback(cb: (state: MarkerState) => void): void {
                this.trackCallback = cb;
            }
            setMonitoredKey(key: string | null): void {
                this.monitoredKey = key;
            }
            setProximityKey(key: string | null): void {
                this.proximityKey = key;
            }
        } as unknown as new (states: Map<string, MarkerState>) => TrackOverlay;
    }
    return OverlayClass!;
}

export function MapDisplay({
    apiKey,
    mapId,
    minWidth,
    minHeight,
    defaultLatitude,
    defaultLongitude,
    defaultZoom,
    refreshInterval,
    trackData,
    latitude,
    longitude,
    markerLabel,
    uniqueId,
    direction,
    groundSpeed,
    speedUnit,
    verticalRate,
    trackRate,
    positionAge,
    altitude,
    colourByAltitude,
    showAltitudeLegend,
    showMapTypeControl,
    category,
    markerIconUrl,
    markerIconScale,
    markerSize,
    categoryIconsMap,
    identId,
    proximityMarker,
    onClickAction,
    onDeselectAction,
    onTrackAction
}: MapDisplayProps): ReactElement {
    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: GOOGLE_MAPS_LIBRARIES });

    const markerStatesRef = useRef<Map<string, MarkerState>>(new Map());
    const selectedKeysRef = useRef<Set<string>>(new Set()); // stable keys of all selected markers
    const onClickActionRef = useRef(onClickAction);
    onClickActionRef.current = onClickAction;
    const onDeselectActionRef = useRef(onDeselectAction);
    onDeselectActionRef.current = onDeselectAction;
    const onTrackActionRef = useRef(onTrackAction);
    onTrackActionRef.current = onTrackAction;
    const monitoredStableKeyRef = useRef<string | null>(null);
    const trackedStableKeyRef = useRef<string | null>(null); // stableKey of the currently tracked marker

    // overlay is stored in state so the data effect re-runs when it becomes available
    const [overlay, setOverlay] = useState<TrackOverlay | null>(null);

    // When Mendix sets identId, tell the overlay which marker to flash red
    useEffect(() => {
        const newId = identId?.value ?? null;
        overlay?.setMonitoredKey(newId);
        monitoredStableKeyRef.current = newId;
    }, [overlay, identId?.value]);

    useEffect(() => {
        const newProximityId = proximityMarker?.value ?? null;
        overlay?.setProximityKey(newProximityId);
    }, [overlay, proximityMarker?.value]);
    const iconSvgTextRef = useRef<Map<string, string>>(new Map());
    const [iconCacheVersion, setIconCacheVersion] = useState(0);
    const markerStrokeRef = useRef<string>(MARKER_STROKE_TERRAIN);
    const [isSatellite, setIsSatellite] = useState(false);

    useEffect(() => {
        if (refreshInterval <= 0 || !trackData) {
            return;
        }
        const id = setInterval(() => trackData.reload(), refreshInterval * 1000);
        return () => clearInterval(id);
    }, [refreshInterval, trackData]);

    // Pre-fetch external SVG icon URLs and cache their text content so they can be inlined
    useEffect(() => {
        if (!colourByAltitude) return;

        const urls: string[] = [];
        if (markerIconUrl) urls.push(markerIconUrl);
        categoryIconsMap?.forEach(entry => urls.push(entry.url));

        const pending = urls.filter(url => !iconSvgTextRef.current.has(url));
        if (pending.length === 0) return;

        Promise.all(
            pending.map(url =>
                fetch(url)
                    .then(r => r.text())
                    .then(text => {
                        iconSvgTextRef.current.set(url, text);
                    })
                    .catch(() => {
                        iconSvgTextRef.current.set(url, "");
                    })
            )
        ).then(() => setIconCacheVersion(v => v + 1));
    }, [colourByAltitude, markerIconUrl, categoryIconsMap]);

    useEffect(() => {
        if (!overlay || !isLoaded || trackData?.status !== "available" || !latitude || !longitude) {
            return;
        }

        const now = performance.now();
        const currentIds = new Set<string>();

        trackData.items?.forEach((item: ObjectItem) => {
            const lat = latitude.get(item).value?.toNumber();
            const lng = longitude.get(item).value?.toNumber();
            if (lat === undefined || lng === undefined) {
                return;
            }

            const reportedTrack = direction?.get(item).value?.toNumber() ?? 0;
            const speedKts = groundSpeed?.get(item).value?.toNumber();
            const speedDisplay = speedKts !== undefined ? formatSpeed(speedKts, speedUnit ?? "kts") : undefined;
            const alt = altitude?.get(item).value;
            const altFt = parseAltitude(alt);
            const gsMps = (speedKts ?? 0) * KNOTS_TO_MPS;
            // Defensive clamps: protect dead reckoning from bad data, integer rounding
            // artefacts, or unit-mismatched attributes (e.g. positionAge in ms instead
            // of sec). All NaNs default to 0; values outside plausible aviation ranges
            // are bounded rather than passed through.
            const vrRaw = verticalRate?.get(item).value?.toNumber();
            const vrFtMin = Number.isFinite(vrRaw)
                ? Math.max(-MAX_VERTICAL_RATE_FTMIN, Math.min(MAX_VERTICAL_RATE_FTMIN, vrRaw as number))
                : 0;
            const trRaw = trackRate?.get(item).value?.toNumber();
            const trDps = Number.isFinite(trRaw)
                ? Math.max(-MAX_TRACK_RATE_DPS, Math.min(MAX_TRACK_RATE_DPS, trRaw as number))
                : 0;
            const ageRaw = positionAge?.get(item).value?.toNumber();
            const positionAgeSec = Number.isFinite(ageRaw)
                ? Math.max(0, Math.min(MAX_POSITION_AGE_SEC, ageRaw as number))
                : 0;

            const label = markerLabel?.get(item).value;
            const cat = category?.get(item).value;
            const id = item.id;
            const stableKey = uniqueId?.get(item).value ?? id;
            const shouldBeSelected = selectedKeysRef.current.has(stableKey);
            currentIds.add(id);

            const applyClickHandler = (state: MarkerState): void => {
                state.element.onclick = e => {
                    e.stopPropagation();
                    if (state.isSelected) {
                        selectedKeysRef.current.delete(state.stableKey);
                        state.isSelected = false;
                        if (trackedStableKeyRef.current === state.stableKey) trackedStableKeyRef.current = null;
                        state.isTracked = false;
                        if (selectedKeysRef.current.size === 1) {
                            const remainingKey = [...selectedKeysRef.current][0];
                            const remaining = [...markerStatesRef.current.values()].find(
                                s => s.stableKey === remainingKey
                            );
                            if (remaining) {
                                remaining.isTracked = true;
                                trackedStableKeyRef.current = remaining.stableKey;
                                const ta = onTrackActionRef.current?.get(remaining.item);
                                if (ta?.canExecute) ta.execute();
                            }
                        }
                        const da = onDeselectActionRef.current?.get(state.item);
                        if (da?.canExecute) da.execute();
                    } else {
                        selectedKeysRef.current.add(state.stableKey);
                        state.isSelected = true;
                        const a = onClickActionRef.current?.get(state.item);
                        if (a?.canExecute) a.execute();
                    }
                };
            };

            const applyDisplayFields = (state: MarkerState, iconInfoScale: number): void => {
                state.speedDisplay = speedDisplay;
                state.altDisplay = alt;
                state.labelDisplay = label;
                state.stableKey = stableKey;
                state.isSelected = shouldBeSelected;
                state.item = item;
                state.iconScale = iconInfoScale;
                state.isTracked = trackedStableKeyRef.current !== null && trackedStableKeyRef.current === stableKey;
                if (state.isTracked) {
                    const ta = onTrackActionRef.current?.get(item);
                    if (ta?.canExecute) ta.execute();
                }
                state.element.style.cursor = "pointer";
            };

            if (markerStatesRef.current.has(id)) {
                const state = markerStatesRef.current.get(id)!;

                // Dead-reckoning + correction blend: every update refreshes the kinematic base
                // and starts a short blend toward the new trajectory — no per-update MIN_POSITION
                // threshold because tiny corrections are effectively free with this model.
                ingestReportUpdate(state, now, lat, lng, altFt, reportedTrack, gsMps, vrFtMin, trDps, positionAgeSec);

                const iconInfo = resolveIconInfo(cat, categoryIconsMap, markerIconUrl, markerIconScale ?? 1);
                const svgText = iconInfo.url ? iconSvgTextRef.current.get(iconInfo.url) : undefined;
                updateMarkerElement(
                    state.element,
                    state.heading,
                    alt,
                    colourByAltitude,
                    iconInfo.url,
                    svgText,
                    isSatellite,
                    iconInfo.scale,
                    markerSize
                );
                applyMarkerStroke(state.element, markerStrokeRef.current);

                applyDisplayFields(state, iconInfo.scale);
                applyClickHandler(state);
            } else {
                // Mendix can reassign item.id on each datasource reload for non-persistent objects.
                // A prior state with the same stableKey means this is an id-change continuation —
                // carry the full kinematic state forward so dead reckoning and the correction blend
                // continue seamlessly across the id boundary.
                const priorState = [...markerStatesRef.current.values()].find(s => s.stableKey === stableKey);

                const iconInfo = resolveIconInfo(cat, categoryIconsMap, markerIconUrl, markerIconScale ?? 1);
                const svgText = iconInfo.url ? iconSvgTextRef.current.get(iconInfo.url) : undefined;
                const element = createMarkerElement(
                    reportedTrack,
                    alt,
                    colourByAltitude,
                    iconInfo.url,
                    svgText,
                    isSatellite,
                    iconInfo.scale,
                    markerSize
                );
                applyMarkerStroke(element, markerStrokeRef.current);
                element.style.cursor = "pointer";

                const newState: MarkerState = priorState
                    ? {
                          ...priorState,
                          element,
                          item,
                          isSelected: shouldBeSelected,
                          isNew: false
                      }
                    : {
                          baseLat: lat,
                          baseLng: lng,
                          baseAltFt: altFt,
                          baseTrack: reportedTrack,
                          groundSpeedMps: gsMps,
                          verticalRateFtMin: vrFtMin,
                          trackRateDps: trDps,
                          reportTimestampMs: now - positionAgeSec * 1000,
                          reportedAtMs: now,
                          correction: null,
                          heading: reportedTrack,
                          iconScale: iconInfo.scale,
                          stableKey,
                          element,
                          isSelected: shouldBeSelected,
                          isTracked: false,
                          isNew: true,
                          appearStart: 0,
                          currentOpacity: 1,
                          speedDisplay,
                          altDisplay: alt,
                          labelDisplay: label,
                          item
                      };

                // When continuing from a prior state, ingest the new report so the correction
                // blend smoothly links old and new trajectories. For truly new markers, the
                // base is already set and there's nothing to blend.
                if (priorState) {
                    ingestReportUpdate(
                        newState,
                        now,
                        lat,
                        lng,
                        altFt,
                        reportedTrack,
                        gsMps,
                        vrFtMin,
                        trDps,
                        positionAgeSec
                    );
                }

                // Pre-position at the first-frame display location so there's no visible
                // snap between DOM insertion and the first rAF tick.
                const initPos = computePosition(newState, now);
                const proj = overlay.getProjection();
                if (proj) {
                    const pt = proj.fromLatLngToDivPixel(new google.maps.LatLng(initPos.lat, initPos.lng));
                    if (pt) {
                        element.style.left = `${pt.x}px`;
                        element.style.top = `${pt.y}px`;
                    }
                }
                overlay.addElement(element);
                markerStatesRef.current.set(id, newState);

                applyDisplayFields(newState, iconInfo.scale);
                applyClickHandler(newState);
            }
        });

        markerStatesRef.current.forEach((state, id) => {
            if (!currentIds.has(id)) {
                overlay.removeElement(state.element);
                markerStatesRef.current.delete(id);
            }
        });
    }, [overlay, trackData?.status, trackData?.items, isLoaded, iconCacheVersion, isSatellite]);

    useEffect(() => {
        overlay?.setColourByAltitude(colourByAltitude ?? false);
    }, [overlay, colourByAltitude]);

    useEffect(() => {
        return () => {
            if (overlay) {
                overlay.setMap(null);
            }
        };
    }, [overlay]);

    useEffect(() => {
        const orig = console.warn.bind(console);
        console.warn = (...args: unknown[]) => {
            if (typeof args[0] === "string" && args[0].includes("preregistered map type")) return;
            orig(...args);
        };
        return () => {
            console.warn = orig;
        };
    }, []);

    useEffect(() => {
        const styleId = "gmt-maptype-control-style";
        if (document.getElementById(styleId)) return;
        const el = document.createElement("style");
        el.id = styleId;
        el.textContent = [
            `.gmt-map-inner .gm-style-mtc button,`,
            `.gmt-map-inner .gm-style-mtc ul li,`,
            `.gmt-map-inner .gm-style-mtc label`,
            `{ font-size: 10px !important; padding: 5px 10px !important; height: auto !important; line-height: 1 !important; }`
        ].join(" ");
        document.head.appendChild(el);
    }, []);

    const mapOptions = useMemo(
        () => ({
            mapId,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: showMapTypeControl ?? false,
            zoomControl: false
        }),
        [mapId, showMapTypeControl]
    );

    if (!isLoaded) return <div>Loading...</div>;

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: minWidth ? `${minWidth}px` : undefined,
                minHeight: minHeight ? `${minHeight}px` : undefined
            }}
        >
            <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                mapContainerClassName="gmt-map-inner"
                options={mapOptions}
                onLoad={map => {
                    map.setMapTypeId("terrain");
                    map.setCenter({ lat: defaultLatitude, lng: defaultLongitude });
                    map.setZoom(defaultZoom);
                    const newOverlay = new (getOverlayClass())(markerStatesRef.current) as TrackOverlay;
                    newOverlay.setMap(map);
                    newOverlay.setTrackCallback((state: MarkerState) => {
                        // Clear tracked flag from all other markers
                        markerStatesRef.current.forEach(s => {
                            if (s.stableKey !== state.stableKey) s.isTracked = false;
                        });
                        state.isTracked = true;
                        trackedStableKeyRef.current = state.stableKey;
                        const ta = onTrackActionRef.current?.get(state.item);
                        if (ta?.canExecute) ta.execute();
                    });
                    setOverlay(newOverlay);
                    newOverlay.setMarkerSize(markerSize ?? 32);
                    newOverlay.setScale(markerScaleForZoom(map.getZoom() ?? defaultZoom));
                    newOverlay.setColourByAltitude(colourByAltitude ?? false);
                    newOverlay.setSatellite(false);
                    map.addListener("zoom_changed", () => {
                        const z = map.getZoom() ?? defaultZoom;
                        newOverlay.setScale(markerScaleForZoom(z));
                    });
                    map.addListener("maptypeid_changed", () => {
                        const sat = map.getMapTypeId() === "satellite" || map.getMapTypeId() === "hybrid";
                        const stroke = sat ? MARKER_STROKE_SATELLITE : MARKER_STROKE_TERRAIN;
                        markerStrokeRef.current = stroke;
                        markerStatesRef.current.forEach(state => applyMarkerStroke(state.element, stroke));
                        newOverlay.setRingColour(sat ? "#ffff00" : "#ff00ff");
                        newOverlay.setSatellite(sat);
                        setIsSatellite(sat);
                    });
                }}
            />
            {colourByAltitude && showAltitudeLegend !== false && <AltitudeLegend isSatellite={isSatellite} />}
        </div>
    );
}
