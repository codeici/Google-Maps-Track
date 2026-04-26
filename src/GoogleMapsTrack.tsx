import { ReactElement } from "react";
import { MapDisplay } from "./components/MapDisplay";
import { GoogleMapsTrackContainerProps } from "../typings/GoogleMapsTrackProps";

export function GoogleMapsTrack({ apiKey, mapId, minWidth, minHeight, defaultLatitude, defaultLongitude, defaultZoom, refreshInterval, trackData, latitude, longitude, markerLabel, uniqueId, direction, groundSpeed, speedUnit, verticalRate, trackRate, positionAge, altitude, colourByAltitude, showAltitudeLegend, showMapTypeControl, category, markerIcon, markerIconScale, markerSize, categoryIcons, identId, proximityMarker, onClickAction, onDeselectAction, onTrackAction }: GoogleMapsTrackContainerProps): ReactElement {
    const markerIconUrl = markerIcon?.status === "available" ? markerIcon.value?.uri : undefined;

    const categoryIconsMap = new Map<string, { url: string; scale: number }>();
    for (const entry of categoryIcons) {
        if (entry.categoryIcon.status === "available" && entry.categoryIcon.value?.uri) {
            categoryIconsMap.set(entry.categoryName, {
                url: entry.categoryIcon.value.uri,
                scale: entry.scale.toNumber()
            });
        }
    }

    return (
        <MapDisplay
            apiKey={apiKey.value ?? ""}
            mapId={mapId.value ?? ""}
            minWidth={minWidth}
            minHeight={minHeight}
            defaultLatitude={defaultLatitude.toNumber()}
            defaultLongitude={defaultLongitude.toNumber()}
            defaultZoom={defaultZoom}
            refreshInterval={refreshInterval}
            trackData={trackData}
            latitude={latitude}
            longitude={longitude}
            markerLabel={markerLabel}
            uniqueId={uniqueId}
            direction={direction}
            groundSpeed={groundSpeed}
            speedUnit={speedUnit}
            verticalRate={verticalRate}
            trackRate={trackRate}
            positionAge={positionAge}
            altitude={altitude}
            colourByAltitude={colourByAltitude}
            showAltitudeLegend={showAltitudeLegend}
            showMapTypeControl={showMapTypeControl}
            category={category}
            markerIconUrl={markerIconUrl}
            markerIconScale={markerIconScale.toNumber()}
            markerSize={markerSize}
            categoryIconsMap={categoryIconsMap}
            identId={identId}
            proximityMarker={proximityMarker}
            onClickAction={onClickAction}
            onDeselectAction={onDeselectAction}
            onTrackAction={onTrackAction}
        />
    );
}
