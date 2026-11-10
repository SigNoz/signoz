import { ParsedRgb } from 'lib/visualization/charts/Pie/types';

// Parses `#rrggbb` into its components. Returns null for anything else (e.g. an
// already-rgba string), letting callers fall back to the original colour.
function hexToRgb(color: string): ParsedRgb | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
}

/**
 * Returns an rgba() string for `color` at the given opacity. Used to dim the
 * non-hovered slices. Falls back to the original colour if it can't be parsed.
 */
export function lightenColor(color: string, opacity: number): string {
	const rgb = hexToRgb(color);
	if (!rgb) {
		return color;
	}
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Resolves the fill for a slice given the currently-hovered slice colour:
 * everything but the active slice dims to 40% opacity. With nothing hovered
 * (`activeColor === null`) every slice keeps its full colour.
 */
export function getFillColor(
	color: string,
	activeColor: string | null,
): string {
	if (activeColor === null) {
		return color;
	}
	return activeColor === color ? color : lightenColor(color, 0.4);
}
