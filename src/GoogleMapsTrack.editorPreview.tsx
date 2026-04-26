import { ReactElement } from "react";
import { GoogleMapsTrackPreviewProps } from "../typings/GoogleMapsTrackProps";

function Drone({ cx, cy }: { cx: number; cy: number }): ReactElement {
    const a = 9;
    const r = 5;
    return (
        <g>
            <line x1={cx - 2} y1={cy - 2} x2={cx - a} y2={cy - a} stroke="#1565C0" strokeWidth="2" strokeLinecap="round"/>
            <line x1={cx + 2} y1={cy - 2} x2={cx + a} y2={cy - a} stroke="#1565C0" strokeWidth="2" strokeLinecap="round"/>
            <line x1={cx - 2} y1={cy + 2} x2={cx - a} y2={cy + a} stroke="#1565C0" strokeWidth="2" strokeLinecap="round"/>
            <line x1={cx + 2} y1={cy + 2} x2={cx + a} y2={cy + a} stroke="#1565C0" strokeWidth="2" strokeLinecap="round"/>
            <circle cx={cx - a} cy={cy - a} r={r} fill="rgba(33,150,243,0.15)" stroke="#2196f3" strokeWidth="1.5"/>
            <circle cx={cx + a} cy={cy - a} r={r} fill="rgba(33,150,243,0.15)" stroke="#2196f3" strokeWidth="1.5"/>
            <circle cx={cx - a} cy={cy + a} r={r} fill="rgba(33,150,243,0.15)" stroke="#2196f3" strokeWidth="1.5"/>
            <circle cx={cx + a} cy={cy + a} r={r} fill="rgba(33,150,243,0.15)" stroke="#2196f3" strokeWidth="1.5"/>
            <circle cx={cx} cy={cy} r={3.5} fill="#2196f3" stroke="rgba(11,31,51,0.9)" strokeWidth="1.5"/>
        </g>
    );
}

export function preview({}: GoogleMapsTrackPreviewProps): ReactElement {
    return (
        <div style={{ width: "100%", height: "100%", minHeight: "300px", position: "relative", overflow: "hidden", background: "#F2EDE7" }}>
            <svg viewBox="0 0 400 300" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}
                xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">

                {/* ── Base terrain ── */}
                <rect x="0" y="0" width="400" height="300" fill="#F2EDE7"/>

                {/* ── Land cover ── */}
                <polygon points="0,0 120,0 102,82 0,95" fill="#A8D5A2"/>
                <polygon points="198,78 372,74 390,212 190,222" fill="#EDE8E2"/>
                <polygon points="14,154 86,146 100,208 54,232 8,224" fill="#CEEAD6"/>
                <ellipse cx="255" cy="25" rx="42" ry="22" fill="#CEEAD6"/>
                <polygon points="286,238 348,226 372,272 308,286 270,268" fill="#CEEAD6"/>

                {/* ── River – bank then water ── */}
                <path d="M 306,0 C 288,28 270,52 252,76 S 216,110 197,133 C 178,155 158,170 139,188 S 103,219 79,243 C 57,261 29,279 0,297"
                    fill="none" stroke="#80B6C6" strokeWidth="14" strokeLinecap="round"/>
                <path d="M 306,0 C 288,28 270,52 252,76 S 216,110 197,133 C 178,155 158,170 139,188 S 103,219 79,243 C 57,261 29,279 0,297"
                    fill="none" stroke="#AAD3DF" strokeWidth="9" strokeLinecap="round"/>

                {/* ── Lake ── */}
                <polygon points="304,246 322,232 344,229 364,241 373,261 361,277 334,283 307,275 291,258" fill="#80B6C6"/>
                <polygon points="308,249 325,237 342,234 360,244 368,261 357,274 332,279 309,271 295,258" fill="#AAD3DF"/>

                {/* ── Building footprints ── */}
                <rect x="210" y="94" width="18" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="234" y="92" width="23" height="13" fill="#DDD6CC" rx="1"/>
                <rect x="264" y="90" width="17" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="288" y="93" width="21" height="13" fill="#DDD6CC" rx="1"/>
                <rect x="316" y="89" width="25" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="348" y="91" width="18" height="11" fill="#DDD6CC" rx="1"/>
                <rect x="209" y="113" width="16" height="11" fill="#DDD6CC" rx="1"/>
                <rect x="232" y="112" width="21" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="260" y="111" width="23" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="290" y="112" width="18" height="11" fill="#DDD6CC" rx="1"/>
                <rect x="316" y="109" width="21" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="344" y="111" width="26" height="11" fill="#DDD6CC" rx="1"/>
                <rect x="208" y="163" width="22" height="13" fill="#DDD6CC" rx="1"/>
                <rect x="238" y="161" width="19" height="14" fill="#DDD6CC" rx="1"/>
                <rect x="264" y="163" width="21" height="13" fill="#DDD6CC" rx="1"/>
                <rect x="293" y="161" width="17" height="13" fill="#DDD6CC" rx="1"/>
                <rect x="318" y="162" width="23" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="349" y="161" width="19" height="13" fill="#DDD6CC" rx="1"/>
                <rect x="208" y="184" width="21" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="237" y="183" width="26" height="11" fill="#DDD6CC" rx="1"/>
                <rect x="271" y="182" width="19" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="299" y="183" width="21" height="12" fill="#DDD6CC" rx="1"/>
                <rect x="329" y="182" width="16" height="11" fill="#DDD6CC" rx="1"/>
                <rect x="353" y="183" width="22" height="12" fill="#DDD6CC" rx="1"/>

                {/* ── Railway ── */}
                <path d="M 0,66 C 58,64 118,62 162,60 S 244,56 304,53 L 400,50"
                    fill="none" stroke="#AAAAAA" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M 0,66 C 58,64 118,62 162,60 S 244,56 304,53 L 400,50"
                    fill="none" stroke="#F2EDE7" strokeWidth="1" strokeDasharray="5 5" strokeLinecap="round"/>

                {/* ── Road casings (back to front) ── */}
                {/* Street grid */}
                <line x1="222" y1="78" x2="220" y2="222" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="248" y1="78" x2="245" y2="222" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="274" y1="77" x2="271" y2="222" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="302" y1="76" x2="300" y2="222" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="334" y1="76" x2="332" y2="222" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="360" y1="76" x2="359" y2="212" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="203" y1="106" x2="375" y2="103" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="202" y1="128" x2="374" y2="125" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="202" y1="177" x2="376" y2="173" stroke="#D0CCC4" strokeWidth="2.8"/>
                <line x1="201" y1="200" x2="378" y2="196" stroke="#D0CCC4" strokeWidth="2.8"/>
                {/* B-roads */}
                <path d="M 165,152 C 136,147 92,138 44,126 L 0,117" fill="none" stroke="#C4C4C4" strokeWidth="5.5" strokeLinecap="round"/>
                <path d="M 165,152 C 192,166 224,176 262,179 S 334,182 400,180" fill="none" stroke="#C4C4C4" strokeWidth="5.5" strokeLinecap="round"/>
                <path d="M 0,215 C 56,203 110,180 150,165 S 164,154 165,152" fill="none" stroke="#C4C4C4" strokeWidth="5.5" strokeLinecap="round"/>
                <path d="M 220,78 C 236,62 255,44 274,26 S 298,8 314,0" fill="none" stroke="#C4C4C4" strokeWidth="5.5" strokeLinecap="round"/>
                {/* A-roads */}
                <path d="M 0,149 C 54,150 106,151 165,152 S 264,153 334,150 L 400,147" fill="none" stroke="#B4B4B4" strokeWidth="9" strokeLinecap="round"/>
                <path d="M 165,36 C 165,74 165,112 165,152 S 164,216 162,280 L 161,300" fill="none" stroke="#B4B4B4" strokeWidth="9" strokeLinecap="round"/>
                {/* Motorway */}
                <path d="M 0,33 C 50,31 108,31 165,35 S 258,41 322,39 L 400,37" fill="none" stroke="#A87C00" strokeWidth="13" strokeLinecap="round"/>

                {/* ── Road fills (back to front) ── */}
                {/* Street grid */}
                <line x1="222" y1="78" x2="220" y2="222" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="248" y1="78" x2="245" y2="222" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="274" y1="77" x2="271" y2="222" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="302" y1="76" x2="300" y2="222" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="334" y1="76" x2="332" y2="222" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="360" y1="76" x2="359" y2="212" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="203" y1="106" x2="375" y2="103" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="202" y1="128" x2="374" y2="125" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="202" y1="177" x2="376" y2="173" stroke="#FFFFFF" strokeWidth="1.8"/>
                <line x1="201" y1="200" x2="378" y2="196" stroke="#FFFFFF" strokeWidth="1.8"/>
                {/* B-roads */}
                <path d="M 165,152 C 136,147 92,138 44,126 L 0,117" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M 165,152 C 192,166 224,176 262,179 S 334,182 400,180" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M 0,215 C 56,203 110,180 150,165 S 164,154 165,152" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M 220,78 C 236,62 255,44 274,26 S 298,8 314,0" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round"/>
                {/* A-roads */}
                <path d="M 0,149 C 54,150 106,151 165,152 S 264,153 334,150 L 400,147" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round"/>
                <path d="M 165,36 C 165,74 165,112 165,152 S 164,216 162,280 L 161,300" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round"/>
                {/* Motorway fill + centre line */}
                <path d="M 0,33 C 50,31 108,31 165,35 S 258,41 322,39 L 400,37" fill="none" stroke="#FFC107" strokeWidth="9" strokeLinecap="round"/>
                <path d="M 0,33 C 50,31 108,31 165,35 S 258,41 322,39 L 400,37" fill="none" stroke="#E6A000" strokeWidth="0.8" strokeDasharray="10 8"/>

                {/* ── Junctions ── */}
                {/* Motorway / A-road junction */}
                <circle cx="165" cy="35" r="7" fill="#A87C00"/>
                <circle cx="165" cy="35" r="5" fill="#FFC107"/>
                {/* A-road roundabout */}
                <circle cx="165" cy="152" r="10" fill="#B4B4B4"/>
                <circle cx="165" cy="152" r="7" fill="#CEEAD6"/>

                {/* ── Labels ── */}
                {/* Motorway shield */}
                <rect x="176" y="27" width="30" height="14" fill="#003087" rx="2.5"/>
                <text x="191" y="38" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial,sans-serif" fontWeight="bold">M11</text>
                {/* A-road shield */}
                <rect x="28" y="143" width="22" height="12" fill="#2E7D32" rx="2"/>
                <text x="39" y="152.5" textAnchor="middle" fill="white" fontSize="7.5" fontFamily="Arial,sans-serif" fontWeight="bold">A12</text>
                {/* Town name */}
                <text x="292" y="140" textAnchor="middle" fill="#5F6368" fontSize="9.5" fontFamily="Arial,sans-serif" letterSpacing="0.5">Highfield</text>
                {/* Park labels */}
                <text x="50" y="185" textAnchor="middle" fill="#3A6B3A" fontSize="7.5" fontFamily="Arial,sans-serif" fontStyle="italic">Riverside</text>
                <text x="50" y="195" textAnchor="middle" fill="#3A6B3A" fontSize="7.5" fontFamily="Arial,sans-serif" fontStyle="italic">Park</text>
                <text x="256" y="23" textAnchor="middle" fill="#3A6B3A" fontSize="7" fontFamily="Arial,sans-serif" fontStyle="italic">Elmwood Common</text>
                {/* River label */}
                <text fill="#4A8FA0" fontSize="7" fontFamily="Arial,sans-serif" fontStyle="italic">
                    <textPath href="#riverPath" startOffset="28%">River Ash</textPath>
                </text>
                <defs>
                    <path id="riverPath" d="M 306,0 C 288,28 270,52 252,76 S 216,110 197,133 C 178,155 158,170 139,188"/>
                </defs>

                {/* ── Drones ── */}
                <Drone cx={80} cy={190}/>
                <Drone cx={258} cy={26}/>
                <Drone cx={316} cy={252}/>

            </svg>

            <div style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                background: "rgba(255,255,255,0.9)",
                borderRadius: "3px",
                padding: "4px 8px",
                fontSize: "11px",
                fontFamily: "'Roboto', Arial, sans-serif",
                fontWeight: "bold",
                color: "#333",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)"
            }}>
                Google Maps Track
            </div>
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/GoogleMapsTrack.css");
}
