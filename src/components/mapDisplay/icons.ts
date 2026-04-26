// Monochrome white SVG icons used in the selected-marker info panel
export const INFO_ICON_DIR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12"><circle cx="6" cy="6" r="5" fill="none" stroke="white" stroke-width="1"/><polygon points="6,1.5 4.8,6 6,5.2 7.2,6" fill="white"/><polygon points="6,10.5 4.8,6 6,6.8 7.2,6" fill="white" fill-opacity="0.4"/></svg>`;
export const INFO_ICON_SPD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12"><path d="M1.5,9.5 A5.5,5.5 0 0,1 10.5,9.5" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round"/><line x1="6" y1="8.5" x2="9" y2="4.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="8.5" r="1.2" fill="white"/></svg>`;
export const INFO_ICON_ALT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12"><line x1="6" y1="9.5" x2="6" y2="2" stroke="white" stroke-width="1.5" stroke-linecap="round"/><polyline points="3.5,4.5 6,2 8.5,4.5" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><line x1="2.5" y1="9.5" x2="9.5" y2="9.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`;

// 8 candidate label directions in screen coords (dy positive = down), preferred order: up first
const LABEL_DIRS: [number, number][] = [
    [0, -1],
    [-1 / Math.SQRT2, -1 / Math.SQRT2],
    [1 / Math.SQRT2, -1 / Math.SQRT2],
    [-1, 0],
    [1, 0],
    [-1 / Math.SQRT2, 1 / Math.SQRT2],
    [1 / Math.SQRT2, 1 / Math.SQRT2],
    [0, 1]
];

// Pick the 45° label direction that points most away from all other selected markers.
// Uses max-min scoring: maximise the minimum "away-ness" across all others.
export function chooseLabelDirection(x: number, y: number, others: { x: number; y: number }[]): [number, number] {
    if (others.length === 0) return LABEL_DIRS[0]; // default: up
    let bestDir = LABEL_DIRS[0];
    let bestScore = -Infinity;
    for (const dir of LABEL_DIRS) {
        let score = Infinity;
        for (const other of others) {
            const dx = other.x - x;
            const dy = other.y - y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) continue;
            const dot = (dir[0] * dx) / len + (dir[1] * dy) / len;
            score = Math.min(score, -dot); // -dot: +1 = dir points away, -1 = dir points toward
        }
        if (!isFinite(score)) score = 1;
        if (score > bestScore) {
            bestScore = score;
            bestDir = dir;
        }
    }
    return bestDir;
}
