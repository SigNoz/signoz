// Source-of-truth doc: ./COLOR_PALETTE.md
//
// Color system for TraceDetailsV3 (waterfall + flamegraph). Returns a base
// color (deterministic per group name) plus a darkened variant used as the
// light-mode foreground / fill. Reuses the shared djb2 `hashFn`.

import { hashFn } from 'lib/uPlotLib/utils/generateColor';

// 28 colors from the doc's "Updated Colour Palette" (Section 1), in doc order.
// Hash output `% PALETTE.length` adjusts automatically if entries are added.
export const PALETTE_V3: readonly string[] = [
	'#4D6BD8', // Slate blue
	'#84B270', // Sage
	'#EB9E40', // Amber
	'#D58998', // Dusty pink
	'#8278D5', // Lavender
	'#E69C6F', // Peach
	'#3CB4DA', // Sky teal
	'#E85DA8', // Fuchsia
	'#D4694A', // Terracotta
	'#4FCC8E', // Forest
	'#5BA2D6', // Cornflower
	'#9D57D0', // Iris
	'#D4B638', // Olive gold
	'#6CC4A4', // Mint
	'#D188CB', // Mauve
	'#2FB59B', // Dusty teal
	'#E68340', // Burnt orange
	'#B8C474', // Pistachio
	'#3C84E5', // Periwinkle
	'#E29F8E', // Coral blush
	'#C56330', // Sienna
	'#4E8CF8', // Robin
	'#E8B752', // Sandy gold
	'#8DBEDF', // Powder blue
	'#8B7544', // Umber
	'#23E0E8', // Aqua
	'#CB874A', // Warm tan
	'#C886A9', // Antique rose
];

// Reserved status colors per spec section 8. Error is wired today;
// warning + OK are exported for future use (no render path consumes them yet).
export const RESERVED_ERROR = '#FC4E4E';
export const RESERVED_WARNING = '#fbbf24';
export const RESERVED_OK = '#4ade80';

function hexToHsl(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	const r = ((n >> 16) & 255) / 255;
	const g = ((n >> 8) & 255) / 255;
	const b = (n & 255) / 255;
	const mx = Math.max(r, g, b);
	const mn = Math.min(r, g, b);
	const d = mx - mn;
	const l = (mx + mn) / 2;
	const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
	let h: number;
	if (d === 0) {
		h = 0;
	} else if (mx === r) {
		h = 60 * (((g - b) / d) % 6);
	} else if (mx === g) {
		h = 60 * ((b - r) / d + 2);
	} else {
		h = 60 * ((r - g) / d + 4);
	}
	return [(h + 360) % 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
	const S = s / 100;
	const L = l / 100;
	const k = (n: number): number => (n + h / 30) % 12;
	const a = S * Math.min(L, 1 - L);
	const f = (n: number): number =>
		Math.round(
			255 * (L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))),
		);
	return `#${[f(0), f(8), f(4)]
		.map((v) => v.toString(16).padStart(2, '0'))
		.join('')}`;
}

// Gentle darken: compress lightness relatively (l reduced by ~amount*0.45 of
// itself) and barely bump saturation. hexToHsl here returns 0–100, so the
// spec's 0–1 saturation step (`amount * 0.06`) is scaled by 100.
export function darkenHex(hex: string, amount: number): string {
	const [h, s, l] = hexToHsl(hex);
	const newL = Math.max(0, l - l * amount * 0.45);
	const newS = Math.min(100, s + amount * 6);
	return hslToHex(h, newS, newL);
}

export interface ColorPair {
	color: string;
	colorDark: string;
}

// Distinct-name cardinality is bounded by deployment service count (~10s, not 1000s),
// so unbounded growth is not a concern.
const cache = new Map<string, ColorPair>();

export function generateColorPair(name: string): ColorPair {
	const hit = cache.get(name);
	if (hit) {
		return hit;
	}
	const base = PALETTE_V3[hashFn(name) % PALETTE_V3.length];
	const result: ColorPair = {
		color: base,
		colorDark: darkenHex(base, 0.22),
	};
	cache.set(name, result);
	return result;
}
