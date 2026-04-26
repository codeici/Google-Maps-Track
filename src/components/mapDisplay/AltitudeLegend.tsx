import { ReactElement, useMemo } from "react";
import { ALTITUDE_COLOURS, ALTITUDE_COLOURS_SATELLITE } from "./constants";

interface AltitudeLegendProps {
    isSatellite: boolean;
}

export function AltitudeLegend({ isSatellite }: AltitudeLegendProps): ReactElement {
    const gradientStops = useMemo(() => {
        const palette = isSatellite ? ALTITUDE_COLOURS_SATELLITE : ALTITUDE_COLOURS;
        return palette.map((colour, i) => `${colour} ${(i / (palette.length - 1)) * 100}%`).join(", ");
    }, [isSatellite]);

    return (
        <div
            style={{
                position: "absolute",
                top: "10px",
                right: "60px",
                background: "rgba(255,255,255,0.85)",
                borderRadius: "2px",
                padding: "4px 6px 2px",
                pointerEvents: "none",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                minWidth: "320px"
            }}
        >
            <div
                style={{
                    height: "18px",
                    borderRadius: "3px",
                    background: `linear-gradient(to right, ${gradientStops})`
                }}
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "3px",
                    fontSize: "10px",
                    color: "#333"
                }}
            >
                <span>0 ft</span>
                <span>10,000</span>
                <span>20,000</span>
                <span>30,000</span>
                <span>40,000 ft+</span>
            </div>
        </div>
    );
}
