/** Donut, label and font sizing for the Pie chart. */

import {
	ArcGeometry,
	DonutGeometry,
	ScaledFontSizeArgs,
} from 'lib/visualization/charts/Pie/types';

// Leader-line + two-line label/value drawn outside the donut. `getArcGeometry`
// anchors the label at `radius * LABEL_RADIUS_RATIO`; `LABEL_TEXT_ALLOWANCE` is
// the px reserved beyond that anchor for the (10px, two-line) text so it never
// clips against the SVG edge.
const LABEL_RADIUS_RATIO = 1.3;
const LABEL_TEXT_ALLOWANCE = 22;
const INNER_RADIUS_RATIO = 0.6;

/**
 * Sizes the donut to fit inside a `width × height` box *with room for the
 * external leader labels*. The label anchor sits at `radius * 1.3`, so we solve
 * the outer radius back from the box's half-extent minus the text allowance —
 * guaranteeing the labels stay inside the SVG instead of being clipped (V1 used
 * a flat `0.35 * min(w,h)`, which left too little margin on small panels).
 */
export function getDonutGeometry(width: number, height: number): DonutGeometry {
	const half = Math.min(width, height) / 2;
	const radius = Math.max(0, (half - LABEL_TEXT_ALLOWANCE) / LABEL_RADIUS_RATIO);
	return {
		size: radius * 2,
		radius,
		innerRadius: radius * INNER_RADIUS_RATIO,
	};
}

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
	const labelRadius = radius * LABEL_RADIUS_RATIO;
	const lineEndRadius = radius * 1.1;
	return {
		labelX: Math.sin(angle) * labelRadius,
		labelY: -Math.cos(angle) * labelRadius,
		lineEndX: Math.sin(angle) * lineEndRadius,
		lineEndY: -Math.cos(angle) * lineEndRadius,
		textAnchor: Math.sin(angle) > 0 ? 'start' : 'end',
	};
}
