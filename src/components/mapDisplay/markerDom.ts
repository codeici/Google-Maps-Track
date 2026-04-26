import markerImage from "../../../marker.svg";
import {
    DEFAULT_MARKER_COLOUR,
    MARKER_SCALE_FACTOR,
    MARKER_SCALE_MAX,
    MARKER_SCALE_MIN,
    MARKER_SCALE_REF_ZOOM
} from "./constants";
import { altitudeColour } from "./kinematics";

export function markerScaleForZoom(zoom: number): number {
    const scale = Math.pow(MARKER_SCALE_FACTOR, zoom - MARKER_SCALE_REF_ZOOM);
    return Math.min(Math.max(scale, MARKER_SCALE_MIN), MARKER_SCALE_MAX);
}

export function resolveIconInfo(
    category: string | undefined,
    categoryIconsMap: Map<string, { url: string; scale: number }> | undefined,
    defaultIconUrl: string | undefined,
    defaultScale: number
): { url?: string; scale: number } {
    if (category && categoryIconsMap) {
        const mapped = categoryIconsMap.get(category);
        if (mapped) return mapped;
    }
    return { url: defaultIconUrl, scale: defaultScale };
}

function applyInlineSvg(icon: HTMLElement, svgText: string, iconUrl: string): void {
    if (icon.dataset.svgSource !== iconUrl) {
        icon.innerHTML = svgText;
        icon.dataset.svgSource = iconUrl;
        const svgEl = icon.querySelector("svg");
        if (svgEl) {
            svgEl.setAttribute("width", "100%");
            svgEl.setAttribute("height", "100%");
            svgEl.style.cssText = "width:100%;height:100%;display:block;";
        }
    }
}

// Resolve the marker fill colour. Returns the altitude-driven colour when colourByAltitude
// is on and an altitude is present, otherwise the neutral default.
function markerColour(
    altitude: string | undefined,
    isSatellite: boolean | undefined,
    colourByAltitude: boolean | undefined
): string {
    return colourByAltitude && altitude ? altitudeColour(altitude, isSatellite) : DEFAULT_MARKER_COLOUR;
}

// Single source of truth for marker icon styling. Picks one of four rendering modes based
// on whether colourByAltitude is on, whether an iconUrl is provided, and whether the SVG
// text has been pre-fetched. Replaces the old duplicated branches in createMarkerElement
// and updateMarkerElement.
function applyMarkerIconStyle(
    icon: HTMLElement,
    heading: number,
    altitude: string | undefined,
    colourByAltitude: boolean | undefined,
    iconUrl: string | undefined,
    svgText: string | undefined,
    isSatellite: boolean | undefined,
    iconScale: number | undefined,
    markerSize: number | undefined
): void {
    const sz = `${markerSize ?? 32}px`;
    const transform = `transform:rotate(${heading}deg) scale(calc(var(--marker-scale,1) * var(--icon-scale,1)));`;
    const base = `width:${sz};height:${sz};--icon-scale:${iconScale ?? 1};`;
    const useInlineSvg = !!(colourByAltitude && svgText && iconUrl);

    // When switching out of inline-SVG mode, the previous SVG markup needs to be torn
    // down before the new mask/background-image cssText takes over. Fresh elements have
    // no svgSource so this is a no-op for createMarkerElement.
    if (!useInlineSvg && icon.dataset.svgSource) {
        icon.innerHTML = "";
        delete icon.dataset.svgSource;
    }

    if (useInlineSvg) {
        const colour = markerColour(altitude, isSatellite, colourByAltitude);
        icon.style.cssText = `${base}--marker-fill:${colour};${transform}`;
        applyInlineSvg(icon, svgText!, iconUrl!);
    } else if (iconUrl && colourByAltitude) {
        const colour = markerColour(altitude, isSatellite, colourByAltitude);
        const mask = `mask:url("${iconUrl}") center/contain no-repeat;-webkit-mask:url("${iconUrl}") center/contain no-repeat;`;
        icon.style.cssText = `${base}background-color:${colour};${mask}${transform}`;
    } else if (iconUrl) {
        icon.style.cssText = `${base}background-image:url("${iconUrl}");background-size:contain;background-repeat:no-repeat;background-position:center;${transform}`;
    } else {
        const colour = markerColour(altitude, isSatellite, colourByAltitude);
        const mask = `mask:url("${markerImage}") center/contain no-repeat;-webkit-mask:url("${markerImage}") center/contain no-repeat;`;
        icon.style.cssText = `${base}background-color:${colour};${mask}${transform}`;
    }
}

export function createMarkerElement(
    heading: number,
    altitude?: string,
    colourByAltitude?: boolean,
    iconUrl?: string,
    svgText?: string,
    isSatellite?: boolean,
    iconScale?: number,
    markerSize?: number
): HTMLElement {
    const div = document.createElement("div");
    div.style.cssText =
        "position:absolute;display:none;flex-direction:column;align-items:center;transform:translate(-50%,-50%);transition:none;";

    // Transparent hit area extending beyond the icon so nearby clicks register
    const hitArea = document.createElement("div");
    hitArea.style.cssText = "position:absolute;inset:-12px;cursor:inherit;";
    div.appendChild(hitArea);

    const icon = document.createElement("div");
    icon.className = "marker-icon";
    applyMarkerIconStyle(
        icon,
        heading,
        altitude,
        colourByAltitude,
        iconUrl,
        svgText,
        isSatellite,
        iconScale,
        markerSize
    );
    div.appendChild(icon);

    return div;
}

export function updateMarkerElement(
    element: HTMLElement,
    heading: number,
    altitude?: string,
    colourByAltitude?: boolean,
    iconUrl?: string,
    svgText?: string,
    isSatellite?: boolean,
    iconScale?: number,
    markerSize?: number
): void {
    const icon = element.querySelector(".marker-icon") as HTMLElement | null;
    if (icon) {
        applyMarkerIconStyle(
            icon,
            heading,
            altitude,
            colourByAltitude,
            iconUrl,
            svgText,
            isSatellite,
            iconScale,
            markerSize
        );
    }
}

// Set the --marker-stroke CSS variable on a marker host element. The stroke colour
// adapts to the current map type (terrain vs satellite) and is applied via inline SVG
// markers that reference var(--marker-stroke).
export function applyMarkerStroke(host: HTMLElement, stroke: string): void {
    (host.querySelector(".marker-icon") as HTMLElement | null)?.style.setProperty("--marker-stroke", stroke);
}
