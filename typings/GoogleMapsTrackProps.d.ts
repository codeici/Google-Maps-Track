/**
 * This file was generated from GoogleMapsTrack.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { DynamicValue, EditableValue, ListValue, ListActionValue, ListAttributeValue, ListExpressionValue, WebImage } from "mendix";
import { Big } from "big.js";

export type SpeedUnitEnum = "mph" | "kmh" | "kts";

export interface CategoryIconsType {
    categoryName: string;
    categoryIcon: DynamicValue<WebImage>;
    scale: Big;
}

export interface CategoryIconsPreviewType {
    categoryName: string;
    categoryIcon: { type: "static"; imageUrl: string; } | { type: "dynamic"; entity: string; } | null;
    scale: number | null;
}

export interface GoogleMapsTrackContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    apiKey: DynamicValue<string>;
    mapId: DynamicValue<string>;
    minWidth: number;
    minHeight: number;
    defaultZoom: number;
    defaultLatitude: Big;
    defaultLongitude: Big;
    showAltitudeLegend: boolean;
    showMapTypeControl: boolean;
    trackData?: ListValue;
    refreshInterval: number;
    latitude?: ListAttributeValue<Big>;
    longitude?: ListAttributeValue<Big>;
    direction?: ListAttributeValue<Big>;
    groundSpeed?: ListAttributeValue<Big>;
    speedUnit: SpeedUnitEnum;
    verticalRate?: ListAttributeValue<Big>;
    trackRate?: ListAttributeValue<Big>;
    positionAge?: ListAttributeValue<Big>;
    altitude?: ListAttributeValue<string>;
    category?: ListAttributeValue<string>;
    uniqueId?: ListAttributeValue<string>;
    markerIcon?: DynamicValue<WebImage>;
    markerSize: number;
    markerIconScale: Big;
    categoryIcons: CategoryIconsType[];
    colourByAltitude: boolean;
    markerLabel?: ListExpressionValue<string>;
    identId?: EditableValue<string>;
    proximityMarker?: EditableValue<string>;
    onClickAction?: ListActionValue;
    onDeselectAction?: ListActionValue;
    onTrackAction?: ListActionValue;
}

export interface GoogleMapsTrackPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    apiKey: string;
    mapId: string;
    minWidth: number | null;
    minHeight: number | null;
    defaultZoom: number | null;
    defaultLatitude: number | null;
    defaultLongitude: number | null;
    showAltitudeLegend: boolean;
    showMapTypeControl: boolean;
    trackData: {} | { caption: string } | { type: string } | null;
    refreshInterval: number | null;
    latitude: string;
    longitude: string;
    direction: string;
    groundSpeed: string;
    speedUnit: SpeedUnitEnum;
    verticalRate: string;
    trackRate: string;
    positionAge: string;
    altitude: string;
    category: string;
    uniqueId: string;
    markerIcon: { type: "static"; imageUrl: string; } | { type: "dynamic"; entity: string; } | null;
    markerSize: number | null;
    markerIconScale: number | null;
    categoryIcons: CategoryIconsPreviewType[];
    colourByAltitude: boolean;
    markerLabel: string;
    identId: string;
    proximityMarker: string;
    onClickAction: {} | null;
    onDeselectAction: {} | null;
    onTrackAction: {} | null;
}
