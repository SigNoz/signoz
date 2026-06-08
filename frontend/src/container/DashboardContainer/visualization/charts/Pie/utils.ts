/**
 * Pure presentation helpers for the Pie chart. Kept out of the component file
 * so the renderer stays declarative (per the one-component-per-file rule).
 */

import { ArcGeometry, ParsedRgb, ScaledFontSizeArgs } from './types';

/**
 * Shrinks the centre-total font as the text gets longer so it never overflows
 * the donut hole. Ported from the V1 PiePanelWrapper.
 */
export function getScaledFontSize({
	text,
	baseSize,
	innerRadius,
}: ScaledFontSizeArgs): number {
	if (!text) {
		return baseSize;
	}

	const { length } = text;
	// More aggressive scaling for very long numbers.
	const scaleFactor = Math.max(0.3, 1 - (length - 3) * 0.09);
	// Don't use more than 90% of the inner radius.
	const maxSize = innerRadius * 0.9;

	return Math.min(baseSize * scaleFactor, maxSize);
}

/**
 * Computes the leader-line / label geometry for one arc from its angular span.
 * Pulled out of the render prop so the SVG markup stays declarative.
 */
export function getArcGeometry(
	startAngle: number,
	endAngle: number,
	radius: number,
): ArcGeometry {
	const angle = (startAngle + endAngle) / 2;
	const labelRadius = radius * 1.3;
	const lineEndRadius = radius * 1.1;
	return {
		labelX: Math.sin(angle) * labelRadius,
		labelY: -Math.cos(angle) * labelRadius,
		lineEndX: Math.sin(angle) * lineEndRadius,
		lineEndY: -Math.cos(angle) * lineEndRadius,
		textAnchor: Math.sin(angle) > 0 ? 'start' : 'end',
	};
}

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
