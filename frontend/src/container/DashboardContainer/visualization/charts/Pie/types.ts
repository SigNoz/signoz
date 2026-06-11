/**
 * Pie-local types. Kept out of the component / util files so each stays focused
 * (per the one-component-per-file + dedicated-types rules). Shared chart types
 * (PieSlice, PieChartProps) live in the parent charts/types.ts.
 */

export interface ScaledFontSizeArgs {
	text: string;
	baseSize: number;
	innerRadius: number;
}

export interface ArcGeometry {
	/** Outer point where the leader label sits. */
	labelX: number;
	labelY: number;
	/** Elbow point where the leader line bends toward the label. */
	lineEndX: number;
	lineEndY: number;
	/** Anchor the label left/right depending on which half of the circle it's in. */
	textAnchor: 'start' | 'end';
}

export interface ParsedRgb {
	r: number;
	g: number;
	b: number;
}

/** Resolved tooltip payload shown when a slice is hovered. */
export interface PieTooltipData {
	label: string;
	value: string;
	color: string;
}
