export const LABEL_FONT_SIZE = 11;
export const LABEL_FONT = `500 ${LABEL_FONT_SIZE}px Inter, sans-serif`;

// Average glyph width of the label font, as a share of its size. Measuring the
// text would need a canvas, which tests don't have; the estimate errs wide.
const GLYPH_WIDTH = 0.6;
// Share of the shape's box a label may cover, so it never touches the border.
const FIT_SHARE = 0.8;

export function estimateLabelWidth(text: string): number {
	return text.length * LABEL_FONT_SIZE * GLYPH_WIDTH;
}

/**
 * Whether a name fits inside its shape at this resolution (map units per
 * pixel). Shapes too small now pass once zoomed in, so names appear on zoom.
 */
export function labelFits(
	text: string,
	[width, height]: [number, number],
	resolution: number,
): boolean {
	return (
		estimateLabelWidth(text) <= (width / resolution) * FIT_SHARE &&
		LABEL_FONT_SIZE * 1.4 <= (height / resolution) * FIT_SHARE
	);
}
